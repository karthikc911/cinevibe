import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { tmdbRateLimiter } from '@/lib/rate-limiter';
import { prisma } from '@/lib/prisma';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * GET /api/tmdb/popular
 * Fetch popular movies from TMDB
 * Query params: category=streaming|on_tv|for_rent|in_theaters
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'streaming';
    const page = parseInt(searchParams.get('page') || '1');

    if (!TMDB_API_KEY) {
      logger.error('TMDB_POPULAR', 'TMDB API key not configured');
      return NextResponse.json({ error: 'TMDB API not configured' }, { status: 500 });
    }

    logger.info('TMDB_POPULAR', `Fetching popular movies (${category}, page ${page})`);

    // For now, we'll use the discover endpoint with different filters for each category
    let endpoint = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&page=${page}&sort_by=popularity.desc`;

    // Customize based on category
    switch (category) {
      case 'streaming':
        endpoint += '&with_watch_providers=8|337|119|350'; // Netflix, Disney+, Prime, Apple TV+
        break;
      case 'on_tv':
        endpoint += '&with_watch_monetization_types=flatrate';
        break;
      case 'for_rent':
        endpoint += '&with_watch_monetization_types=rent';
        break;
      case 'in_theaters':
        // Movies currently in theaters (released in last 45 days)
        const today = new Date();
        const fortyFiveDaysAgo = new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000);
        endpoint += `&primary_release_date.gte=${fortyFiveDaysAgo.toISOString().split('T')[0]}&primary_release_date.lte=${today.toISOString().split('T')[0]}`;
        break;
    }

    // Fetch from TMDB with rate limiting
    const tmdbResponse = await tmdbRateLimiter.execute(
      async () => {
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`TMDB API error: ${response.status}`);
        }
        return response.json();
      },
      'POPULAR'
    );

    const movies = tmdbResponse.results || [];

    logger.info('TMDB_POPULAR', `Fetched ${movies.length} popular movies from TMDB`);

    // Add movies to database if they don't exist
    const addedCount = await addMoviesToDatabase(movies);

    logger.info('TMDB_POPULAR', `Added ${addedCount} new movies to database`);

    // Transform for frontend
    const transformedMovies = movies.map((movie: any) => ({
      id: movie.id,
      title: movie.title,
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
      backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : '',
      lang: movie.original_language,
      langs: [],
      imdb: movie.vote_average || 0,
      voteCount: movie.vote_count || 0,
      rt: null,
      summary: movie.overview || 'No summary available',
      overview: movie.overview || 'No summary available',
      category: 'Popular',
      language: movie.original_language,
      languages: [],
      genres: [],
      matchPercent: 75,
    }));

    const duration = Date.now() - startTime;

    logger.info('TMDB_POPULAR', 'Popular movies fetched successfully', {
      category,
      page,
      count: transformedMovies.length,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      movies: transformedMovies,
      category,
      page,
      total: transformedMovies.length,
    });
  } catch (error: any) {
    logger.error('TMDB_POPULAR', 'Error fetching popular movies', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to fetch popular movies' },
      { status: 500 }
    );
  }
}

async function addMoviesToDatabase(movies: any[]): Promise<number> {
  let addedCount = 0;

  for (const movie of movies) {
    try {
      // Check if movie exists
      const existing = await prisma.movie.findUnique({
        where: { id: movie.id },
      });

      if (!existing) {
        await prisma.movie.create({
          data: {
            id: movie.id,
            title: movie.title,
            originalTitle: movie.original_title,
            overview: movie.overview,
            posterPath: movie.poster_path,
            backdropPath: movie.backdrop_path,
            releaseDate: movie.release_date || null,
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
            voteAverage: movie.vote_average,
            voteCount: movie.vote_count,
            popularity: movie.popularity,
            language: movie.original_language,
            genres: [],
            imdbRating: movie.vote_average,
          },
        });
        addedCount++;
      }
    } catch (error: any) {
      logger.warn('TMDB_POPULAR', `Failed to add movie ${movie.id} to database`, {
        error: error.message,
      });
    }
  }

  return addedCount;
}

