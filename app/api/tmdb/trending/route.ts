import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { tmdbRateLimiter } from '@/lib/rate-limiter';
import { prisma } from '@/lib/prisma';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * GET /api/tmdb/trending
 * Fetch trending movies from TMDB (today or this week)
 * Query params: timeWindow=day|week
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const timeWindow = searchParams.get('timeWindow') || 'day'; // day or week

    if (!TMDB_API_KEY) {
      logger.error('TMDB_TRENDING', 'TMDB API key not configured');
      return NextResponse.json({ error: 'TMDB API not configured' }, { status: 500 });
    }

    logger.info('TMDB_TRENDING', `Fetching trending movies (${timeWindow})`);

    // Fetch from TMDB with rate limiting
    const tmdbResponse = await tmdbRateLimiter.execute(
      async () => {
        const response = await fetch(
          `${TMDB_BASE_URL}/trending/movie/${timeWindow}?api_key=${TMDB_API_KEY}`
        );
        if (!response.ok) {
          throw new Error(`TMDB API error: ${response.status}`);
        }
        return response.json();
      },
      'TRENDING'
    );

    const movies = tmdbResponse.results || [];

    logger.info('TMDB_TRENDING', `Fetched ${movies.length} trending movies from TMDB`);

    // Add movies to database if they don't exist
    const addedCount = await addMoviesToDatabase(movies);

    logger.info('TMDB_TRENDING', `Added ${addedCount} new movies to database`);

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
      category: 'Trending',
      language: movie.original_language,
      languages: [],
      genres: [],
      matchPercent: 75,
    }));

    const duration = Date.now() - startTime;

    logger.info('TMDB_TRENDING', 'Trending movies fetched successfully', {
      timeWindow,
      count: transformedMovies.length,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      movies: transformedMovies,
      timeWindow,
      total: transformedMovies.length,
    });
  } catch (error: any) {
    logger.error('TMDB_TRENDING', 'Error fetching trending movies', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to fetch trending movies' },
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
            releaseDate: movie.release_date ? new Date(movie.release_date) : null,
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
      logger.warn('TMDB_TRENDING', `Failed to add movie ${movie.id} to database`, {
        error: error.message,
      });
    }
  }

  return addedCount;
}

