import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * Force refresh movie data from TMDB
 * Use this to fix incorrect movie details (wrong language, missing data, etc.)
 */
export async function POST(
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

    logger.info('REFRESH_MOVIE', 'Force refreshing movie from TMDB', {
      movieId,
      userEmail: session.user.email,
    });

    if (!TMDB_API_KEY) {
      return NextResponse.json({ error: 'TMDB API key not configured' }, { status: 500 });
    }

    // Fetch fresh data from TMDB
    const tmdbResponse = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}`
    );

    if (!tmdbResponse.ok) {
      logger.error('REFRESH_MOVIE', 'Movie not found in TMDB', { movieId });
      return NextResponse.json({ error: 'Movie not found in TMDB' }, { status: 404 });
    }

    const tmdbMovie = await tmdbResponse.json();

    logger.info('REFRESH_MOVIE', 'Fresh TMDB data fetched', {
      movieId: tmdbMovie.id,
      title: tmdbMovie.title,
      original_language: tmdbMovie.original_language,
      genres: tmdbMovie.genres?.map((g: any) => g.name),
    });

    // Update database with fresh data
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
      budget: tmdbMovie.budget ? BigInt(tmdbMovie.budget) : null,
      boxOffice: tmdbMovie.revenue ? BigInt(tmdbMovie.revenue) : null,
    };

    const movie = await prisma.movie.upsert({
      where: { id: movieId },
      create: {
        ...movieData,
        imdbRating: null,
        rtRating: null,
        imdbVoterCount: null,
        userReviewSummary: null,
      },
      update: movieData, // Force update all fields
    });

    logger.info('REFRESH_MOVIE', 'Movie refreshed successfully', {
      movieId: movie.id,
      title: movie.title,
      language: movie.language,
      genres: movie.genres,
    });

    return NextResponse.json({
      success: true,
      movie: {
        id: movie.id,
        title: movie.title,
        language: movie.language,
        genres: movie.genres,
      },
      message: 'Movie data refreshed from TMDB',
    });
  } catch (error: any) {
    logger.error('REFRESH_MOVIE', 'Error refreshing movie', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to refresh movie details' },
      { status: 500 }
    );
  }
}

