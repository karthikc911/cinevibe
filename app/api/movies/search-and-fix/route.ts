import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * Search for a movie by title and update the database with correct data
 * POST /api/movies/search-and-fix
 * Body: { movieId: number, expectedTitle: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { movieId, expectedTitle, expectedYear } = await request.json();

    if (!movieId || !expectedTitle) {
      return NextResponse.json(
        { error: 'movieId and expectedTitle required' },
        { status: 400 }
      );
    }

    logger.info('SEARCH_AND_FIX', 'Searching for correct movie', {
      movieId,
      expectedTitle,
      expectedYear,
    });

    // Search TMDB for the movie by title
    const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(expectedTitle)}${expectedYear ? `&year=${expectedYear}` : ''}`;
    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      return NextResponse.json({ error: 'TMDB search failed' }, { status: 500 });
    }

    const searchData = await searchResponse.json();
    const tmdbMovie = searchData.results?.[0];

    if (!tmdbMovie) {
      logger.warn('SEARCH_AND_FIX', 'Movie not found on TMDB', { expectedTitle });
      return NextResponse.json({ error: 'Movie not found on TMDB' }, { status: 404 });
    }

    logger.info('SEARCH_AND_FIX', 'Found movie on TMDB', {
      tmdbId: tmdbMovie.id,
      title: tmdbMovie.title,
      original_language: tmdbMovie.original_language,
    });

    // Fetch detailed info
    const detailsUrl = `${TMDB_BASE_URL}/movie/${tmdbMovie.id}?api_key=${TMDB_API_KEY}`;
    const detailsResponse = await fetch(detailsUrl);
    const details = await detailsResponse.json();

    // Update the movie in database
    const movieData = {
      title: tmdbMovie.title,
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
      genres: details.genres?.map((g: any) => g.name) || [],
      runtime: details.runtime,
      tagline: details.tagline,
      budget: details.budget ? BigInt(details.budget) : null,
      boxOffice: details.revenue ? BigInt(details.revenue) : null,
    };

    // Update watchlist with correct TMDB ID
    await prisma.watchlistItem.updateMany({
      where: { movieId: movieId },
      data: { 
        movieId: tmdbMovie.id,
        movieTitle: tmdbMovie.title,
        movieYear: tmdbMovie.release_date?.split('-')[0] || null,
      },
    });

    // Upsert movie data
    const movie = await prisma.movie.upsert({
      where: { id: tmdbMovie.id },
      create: {
        id: tmdbMovie.id,
        ...movieData,
        imdbRating: null,
        rtRating: null,
        imdbVoterCount: null,
        userReviewSummary: null,
      },
      update: movieData,
    });

    logger.info('SEARCH_AND_FIX', 'Movie fixed successfully', {
      oldId: movieId,
      newId: tmdbMovie.id,
      title: movie.title,
      language: movie.language,
    });

    return NextResponse.json({
      success: true,
      oldId: movieId,
      newId: tmdbMovie.id,
      movie: {
        id: movie.id,
        title: movie.title,
        language: movie.language,
        year: movie.year,
        poster: movie.posterPath ? `https://image.tmdb.org/t/p/w500${movie.posterPath}` : '',
      },
    });
  } catch (error: any) {
    logger.error('SEARCH_AND_FIX', 'Error fixing movie', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to fix movie' },
      { status: 500 }
    );
  }
}

