import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { enrichMovieWithMetadata } from '@/lib/movie-metadata-fetcher';
import { formatPosterUrl } from '@/lib/poster-utils';
import { getCurrentUser } from '@/lib/mobile-auth';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const authHeader = request.headers.get("authorization");
    const currentUser = await getCurrentUser(session, authHeader);
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const movieId = parseInt(id);
    if (isNaN(movieId)) {
      return NextResponse.json({ error: 'Invalid movie ID' }, { status: 400 });
    }

    logger.info('GET_MOVIE', `Fetching movie details`, {
      movieId,
      userEmail: currentUser.email,
    });

    // Step 1: Check local database
    let movie = await prisma.movie.findUnique({
      where: { id: movieId },
    });

    // Check if we need to refresh from TMDB (for data quality)
    const needsRefresh = movie && (!movie.language || movie.language === '' || !movie.posterPath);

    if (movie && !needsRefresh) {
      logger.info('GET_MOVIE', 'Movie found in database', {
        movieId,
        title: movie.title,
        language: movie.language,
      });

      // Enrich if missing metadata
      if (!movie.imdbRating || !movie.userReviewSummary) {
        await enrichMovieWithMetadata(movie.id, movie.title, movie.year || undefined);
        // Re-fetch after enrichment
        movie = await prisma.movie.findUnique({
          where: { id: movieId },
        });
      }
    } else if (needsRefresh) {
      logger.info('GET_MOVIE', 'Movie needs refresh from TMDB', {
        movieId,
        reason: !movie?.language ? 'missing language' : 'missing poster',
      });
      // Fall through to TMDB fetch to refresh data
      movie = null;
    }
    
    if (!movie) {
      // Step 2: Fetch from TMDB if not in database
      logger.info('GET_MOVIE', 'Movie not in database, fetching from TMDB', {
        movieId,
      });

      if (!TMDB_API_KEY) {
        return NextResponse.json({ error: 'TMDB API key not configured' }, { status: 500 });
      }

      const tmdbResponse = await fetch(
        `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}`
      );

      if (!tmdbResponse.ok) {
        logger.error('GET_MOVIE', 'Movie not found in TMDB', { movieId });
        return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
      }

      const tmdbMovie = await tmdbResponse.json();

      logger.info('GET_MOVIE', 'TMDB movie data fetched', {
        movieId: tmdbMovie.id,
        title: tmdbMovie.title,
        original_language: tmdbMovie.original_language,
        genres: tmdbMovie.genres?.map((g: any) => g.name),
      });

      // Step 3: Save/Update database with fresh TMDB data
      const movieData = {
        id: tmdbMovie.id,
        title: tmdbMovie.title || 'Untitled',
        originalTitle: tmdbMovie.original_title,
        overview: tmdbMovie.overview,
        posterPath: tmdbMovie.poster_path,
        backdropPath: tmdbMovie.backdrop_path,
        releaseDate: tmdbMovie.release_date || null,
        year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : null,
        voteAverage: tmdbMovie.vote_average || 0,
        voteCount: tmdbMovie.vote_count || 0,
        popularity: tmdbMovie.popularity || 0,
        language: tmdbMovie.original_language || 'en',
        genres: tmdbMovie.genres?.map((g: any) => g.name) || [],
        runtime: tmdbMovie.runtime,
        tagline: tmdbMovie.tagline,
        imdbRating: null,
        rtRating: null,
        imdbVoterCount: null,
        userReviewSummary: null,
        budget: tmdbMovie.budget ? BigInt(tmdbMovie.budget) : null,
        boxOffice: tmdbMovie.revenue ? BigInt(tmdbMovie.revenue) : null,
      };

      movie = await prisma.movie.upsert({
        where: { id: movieId },
        create: movieData,
        update: movieData, // Update with fresh data if exists
      });

      logger.info('GET_MOVIE', 'Movie saved to database', {
        movieId: movie.id,
        title: movie.title,
      });

      // Step 4: Enrich with Perplexity metadata
      await enrichMovieWithMetadata(movie.id, movie.title, movie.year || undefined);

      // Re-fetch after enrichment
      movie = await prisma.movie.findUnique({
        where: { id: movieId },
      });
    }

    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    // Transform to frontend format
    const posterUrl = formatPosterUrl(movie.posterPath);
    
    const transformedMovie = {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      poster: posterUrl,
      lang: movie.language,
      langs: [movie.language],
      imdb: movie.imdbRating || movie.voteAverage,
      imdbVoterCount: movie.imdbVoterCount || movie.voteCount || 0,
      userReviewSummary: movie.userReviewSummary || null,
      rt: movie.rtRating || null,
      voteCount: movie.voteCount || 0,
      summary: movie.overview || 'No summary available',
      overview: movie.overview || 'No summary available',
      category: movie.genres?.[0] || 'Unknown',
      language: movie.language,
      languages: movie.genres || [],
      genres: movie.genres || [],
      budget: movie.budget ? Number(movie.budget) : null,
      boxOffice: movie.boxOffice ? Number(movie.boxOffice) : null,
    };

    logger.info('GET_MOVIE', 'Movie details returned successfully', {
      movieId: transformedMovie.id,
      title: transformedMovie.title,
      language: transformedMovie.language,
      lang: transformedMovie.lang,
      posterPath: movie.posterPath,
      formattedPoster: posterUrl,
      genres: transformedMovie.genres,
    });

    return NextResponse.json({ movie: transformedMovie });
  } catch (error: any) {
    logger.error('GET_MOVIE', 'Error fetching movie', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to fetch movie details' },
      { status: 500 }
    );
  }
}
