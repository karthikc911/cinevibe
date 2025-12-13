import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { enrichMovieWithMetadata } from '@/lib/movie-metadata-fetcher';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const formatPosterUrl = (posterPath: string | null): string => {
  if (!posterPath) return '';
  if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) {
    return posterPath;
  }
  if (posterPath.startsWith('/')) {
    return `https://image.tmdb.org/t/p/w500${posterPath}`;
  }
  return '';
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const movieId = parseInt(id);
    if (isNaN(movieId)) {
      return NextResponse.json({ error: 'Invalid movie ID' }, { status: 400 });
    }

    logger.info('GET_MOVIE', `Fetching movie details`, {
      movieId,
      userEmail: session.user.email,
    });

    // Step 1: Check local database
    let movie = await prisma.movie.findUnique({
      where: { id: movieId },
    });

    if (movie) {
      logger.info('GET_MOVIE', 'Movie found in database', {
        movieId,
        title: movie.title,
      });

      // Enrich if missing metadata
      if (!movie.imdbRating || !movie.userReviewSummary) {
        await enrichMovieWithMetadata(movie.id, movie.title, movie.year || undefined);
        // Re-fetch after enrichment
        movie = await prisma.movie.findUnique({
          where: { id: movieId },
        });
      }
    } else {
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

      // Step 3: Save to database
      movie = await prisma.movie.upsert({
        where: { id: movieId },
        create: {
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
        },
        update: {},
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
    const transformedMovie = {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      poster: formatPosterUrl(movie.posterPath),
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
