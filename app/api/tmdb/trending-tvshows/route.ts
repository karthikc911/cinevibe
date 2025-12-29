import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { tmdbRateLimiter } from '@/lib/rate-limiter';
import { prisma } from '@/lib/prisma';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * GET /api/tmdb/trending-tvshows
 * Fetch trending TV shows from TMDB (today or this week)
 * Query params: timeWindow=day|week
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const timeWindow = searchParams.get('time_window') || searchParams.get('timeWindow') || 'day';

    if (!TMDB_API_KEY) {
      logger.error('TMDB_TRENDING_TV', 'TMDB API key not configured');
      return NextResponse.json({ error: 'TMDB API not configured' }, { status: 500 });
    }

    logger.info('TMDB_TRENDING_TV', `Fetching trending TV shows (${timeWindow})`);

    // Fetch from TMDB with rate limiting
    const tmdbResponse = await tmdbRateLimiter.execute(
      async () => {
        const response = await fetch(
          `${TMDB_BASE_URL}/trending/tv/${timeWindow}?api_key=${TMDB_API_KEY}`
        );
        if (!response.ok) {
          throw new Error(`TMDB API error: ${response.status}`);
        }
        return response.json();
      },
      'TRENDING_TV'
    );

    const tvShows = tmdbResponse.results || [];

    logger.info('TMDB_TRENDING_TV', `Fetched ${tvShows.length} trending TV shows from TMDB`);

    // Add TV shows to database if they don't exist
    const addedCount = await addTvShowsToDatabase(tvShows);

    logger.info('TMDB_TRENDING_TV', `Added ${addedCount} new TV shows to database`);

    // Transform for frontend
    const transformedShows = tvShows.map((show: any) => ({
      id: show.id,
      name: show.name,
      title: show.name, // For compatibility
      year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : null,
      poster: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : '',
      backdrop: show.backdrop_path ? `https://image.tmdb.org/t/p/w1280${show.backdrop_path}` : '',
      lang: show.original_language,
      langs: [],
      imdb: show.vote_average || 0,
      voteCount: show.vote_count || 0,
      rt: null,
      summary: show.overview || 'No summary available',
      overview: show.overview || 'No summary available',
      category: 'Trending',
      language: show.original_language,
      languages: [],
      genres: [],
      matchPercent: 75,
    }));

    const duration = Date.now() - startTime;

    logger.info('TMDB_TRENDING_TV', 'Trending TV shows fetched successfully', {
      timeWindow,
      count: transformedShows.length,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      tvShows: transformedShows,
      timeWindow,
      total: transformedShows.length,
    });
  } catch (error: any) {
    logger.error('TMDB_TRENDING_TV', 'Error fetching trending TV shows', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to fetch trending TV shows' },
      { status: 500 }
    );
  }
}

async function addTvShowsToDatabase(tvShows: any[]): Promise<number> {
  let addedCount = 0;

  for (const show of tvShows) {
    try {
      // Check if TV show exists
      const existing = await prisma.tvShow.findUnique({
        where: { id: show.id },
      });

      if (!existing) {
        await prisma.tvShow.create({
          data: {
            id: show.id,
            name: show.name,
            originalName: show.original_name,
            overview: show.overview,
            posterPath: show.poster_path,
            backdropPath: show.backdrop_path,
            firstAirDate: show.first_air_date,
            year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : null,
            voteAverage: show.vote_average,
            voteCount: show.vote_count,
            popularity: show.popularity,
            language: show.original_language,
            genres: [],
            imdbRating: show.vote_average,
          },
        });
        addedCount++;
      }
    } catch (error: any) {
      logger.warn('TMDB_TRENDING_TV', `Failed to add TV show ${show.id} to database`, {
        error: error.message,
      });
    }
  }

  return addedCount;
}

