import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * POST /api/tmdb/cache-daily
 * Fetches trending and popular content from TMDB and caches it in database
 * Should be called once per day (can be triggered by cron job or first request of the day)
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('TMDB_CACHE', 'Starting daily cache update');

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day

    const categories = [
      { type: 'movie', category: 'trending_day', endpoint: '/trending/movie/day' },
      { type: 'movie', category: 'popular', endpoint: '/movie/popular' },
      { type: 'tvshow', category: 'trending_day', endpoint: '/trending/tv/day' },
      { type: 'tvshow', category: 'popular', endpoint: '/tv/popular' },
    ];

    const results = [];

    for (const { type, category, endpoint } of categories) {
      // Check if already cached for today
      const existing = await prisma.dailyTrendingCache.findUnique({
        where: {
          date_contentType_category: {
            date: today,
            contentType: type,
            category,
          },
        },
      });

      if (existing) {
        logger.info('TMDB_CACHE', 'Already cached for today', { type, category });
        results.push({ type, category, status: 'already_cached', count: (existing.items as any[]).length });
        continue;
      }

      // Fetch from TMDB
      const url = `${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}&language=en-US&page=1`;
      
      logger.info('TMDB_CACHE', 'Fetching from TMDB', { type, category, url: endpoint });
      
      const response = await fetch(url);
      if (!response.ok) {
        logger.error('TMDB_CACHE', 'TMDB API error', { 
          status: response.status,
          type,
          category 
        });
        continue;
      }

      const data = await response.json();
      const items = data.results?.slice(0, 10) || []; // Top 10 only

      // Save full details to Movie or TvShow table
      for (const item of items) {
        if (type === 'movie') {
          await prisma.movie.upsert({
            where: { id: item.id },
            create: {
              id: item.id,
              title: item.title || 'Untitled',
              originalTitle: item.original_title,
              overview: item.overview,
              posterPath: item.poster_path,
              backdropPath: item.backdrop_path,
              releaseDate: item.release_date || null,
              year: item.release_date ? new Date(item.release_date).getFullYear() : null,
              voteAverage: item.vote_average || 0,
              voteCount: item.vote_count || 0,
              popularity: item.popularity || 0,
              language: item.original_language || 'en',
              genres: [], // Will be enriched later
            },
            update: {
              title: item.title || 'Untitled',
              overview: item.overview,
              posterPath: item.poster_path,
              backdropPath: item.backdrop_path,
              voteAverage: item.vote_average || 0,
              voteCount: item.vote_count || 0,
              popularity: item.popularity || 0,
            },
          });
        } else {
          await prisma.tvShow.upsert({
            where: { id: item.id },
            create: {
              id: item.id,
              name: item.name || 'Untitled',
              originalName: item.original_name,
              overview: item.overview,
              posterPath: item.poster_path,
              backdropPath: item.backdrop_path,
              firstAirDate: item.first_air_date || null,
              year: item.first_air_date ? new Date(item.first_air_date).getFullYear() : null,
              voteAverage: item.vote_average || 0,
              voteCount: item.vote_count || 0,
              popularity: item.popularity || 0,
              language: item.original_language || 'en',
              genres: [], // Will be enriched later
            },
            update: {
              name: item.name || 'Untitled',
              overview: item.overview,
              posterPath: item.poster_path,
              backdropPath: item.backdrop_path,
              voteAverage: item.vote_average || 0,
              voteCount: item.vote_count || 0,
              popularity: item.popularity || 0,
            },
          });
        }
      }

      // Cache the IDs
      const itemIds = items.map((item: any) => item.id);
      
      await prisma.dailyTrendingCache.create({
        data: {
          date: today,
          contentType: type,
          category,
          items: itemIds,
        },
      });

      logger.info('TMDB_CACHE', 'Cached successfully', { 
        type, 
        category, 
        count: itemIds.length 
      });

      results.push({ type, category, status: 'cached', count: itemIds.length });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    logger.info('TMDB_CACHE', 'Daily cache update complete', { results });

    return NextResponse.json({
      success: true,
      date: today.toISOString(),
      results,
    });
  } catch (error: any) {
    logger.error('TMDB_CACHE', 'Error updating daily cache', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to update cache' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tmdb/cache-daily
 * Get cached trending/popular content for today
 * If not cached, triggers the cache update
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get('contentType') || 'movie'; // 'movie' or 'tvshow'
    const category = searchParams.get('category') || 'trending_day'; // 'trending_day', 'popular'

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check cache
    let cache = await prisma.dailyTrendingCache.findUnique({
      where: {
        date_contentType_category: {
          date: today,
          contentType,
          category,
        },
      },
    });

    // If not cached, trigger cache update
    if (!cache) {
      logger.info('TMDB_CACHE', 'Cache miss, triggering update', { contentType, category });
      
      // Trigger POST endpoint
      await POST(request);
      
      // Fetch again
      cache = await prisma.dailyTrendingCache.findUnique({
        where: {
          date_contentType_category: {
            date: today,
            contentType,
            category,
          },
        },
      });
    }

    if (!cache) {
      return NextResponse.json(
        { error: 'Failed to fetch cache' },
        { status: 500 }
      );
    }

    const itemIds = cache.items as number[];

    // Fetch full details from database
    let items: any;
    if (contentType === 'movie') {
      items = await prisma.movie.findMany({
        where: { id: { in: itemIds } },
      });
      
      // Sort by original order
      items = itemIds.map(id => items.find((item: any) => item.id === id)).filter(Boolean);
    } else {
      items = await prisma.tvShow.findMany({
        where: { id: { in: itemIds } },
      });
      
      // Sort by original order
      items = itemIds.map(id => items.find((item: any) => item.id === id)).filter(Boolean);
    }

    logger.info('TMDB_CACHE', 'Retrieved cached items', {
      contentType,
      category,
      count: items.length,
    });

    return NextResponse.json({
      success: true,
      contentType,
      category,
      date: today.toISOString(),
      items,
    });
  } catch (error: any) {
    logger.error('TMDB_CACHE', 'Error fetching cached content', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to fetch cached content' },
      { status: 500 }
    );
  }
}

