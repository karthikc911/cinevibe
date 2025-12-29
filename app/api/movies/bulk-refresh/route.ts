import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * Bulk refresh multiple movies from TMDB
 * POST /api/movies/bulk-refresh
 * Body: { movieIds: [603, 550, ...] }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { movieIds } = await request.json();

    if (!movieIds || !Array.isArray(movieIds)) {
      return NextResponse.json({ error: 'movieIds array required' }, { status: 400 });
    }

    logger.info('BULK_REFRESH', 'Starting bulk refresh', {
      count: movieIds.length,
      movieIds,
    });

    const results = [];

    for (const movieId of movieIds) {
      try {
        logger.info('BULK_REFRESH', `Refreshing movie ${movieId}...`);

        // Fetch from TMDB
        const tmdbResponse = await fetch(
          `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}`
        );

        if (!tmdbResponse.ok) {
          logger.warn('BULK_REFRESH', `Movie ${movieId} not found in TMDB`);
          results.push({
            movieId,
            status: 'not_found',
            error: 'Not found in TMDB',
          });
          continue;
        }

        const tmdbMovie = await tmdbResponse.json();

        logger.info('BULK_REFRESH', `TMDB data for ${movieId}`, {
          title: tmdbMovie.title,
          original_language: tmdbMovie.original_language,
        });

        // Update database
        const movieData = {
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

        await prisma.movie.update({
          where: { id: movieId },
          data: movieData,
        });

        logger.info('BULK_REFRESH', `✅ Movie ${movieId} updated`);

        results.push({
          movieId,
          status: 'success',
          title: tmdbMovie.title,
          language: tmdbMovie.original_language,
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        logger.error('BULK_REFRESH', `Error refreshing movie ${movieId}`, {
          error: error.message,
        });
        results.push({
          movieId,
          status: 'error',
          error: error.message,
        });
      }
    }

    logger.info('BULK_REFRESH', 'Bulk refresh completed', {
      total: movieIds.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status !== 'success').length,
    });

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: movieIds.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status !== 'success').length,
      },
    });
  } catch (error: any) {
    logger.error('BULK_REFRESH', 'Bulk refresh failed', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to refresh movies' },
      { status: 500 }
    );
  }
}

