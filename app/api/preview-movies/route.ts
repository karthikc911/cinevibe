import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { formatPosterUrl } from '@/lib/poster-utils';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    logger.info('PREVIEW_MOVIES', 'Fetching preview movies for landing page', {
      timestamp: new Date().toISOString(),
    });

    // Fetch 12 popular, high-quality movies across different languages
    const previewMovies = await prisma.movie.findMany({
      where: {
        voteAverage: { gte: 7.5 },
        voteCount: { gte: 1000 },
        year: { gte: 2020 },
      },
      orderBy: [
        { popularity: 'desc' },
        { voteAverage: 'desc' },
      ],
      take: 12,
    });

    logger.info('PREVIEW_MOVIES', 'Preview movies fetched', {
      count: previewMovies.length,
      movies: previewMovies.map(m => ({ id: m.id, title: m.title, rating: m.voteAverage })),
    });

    // Transform for frontend
    const transformedMovies = previewMovies.map((movie) => ({
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
      summary: movie.userReviewSummary || movie.overview || 'No summary available',
      overview: movie.overview || 'No summary available',
      category: movie.genres?.[0] || 'Unknown',
      language: movie.language,
      languages: movie.genres || [],
      genres: movie.genres || [],
      budget: movie.budget ? Number(movie.budget) : null,
      boxOffice: movie.boxOffice ? Number(movie.boxOffice) : null,
      matchPercent: Math.floor(80 + Math.random() * 15), // Random 80-95%
    }));

    const totalDuration = Date.now() - startTime;

    logger.info('PREVIEW_MOVIES', 'Preview movies generated successfully', {
      totalDuration: `${totalDuration}ms`,
      moviesReturned: transformedMovies.length,
    });

    return NextResponse.json({
      success: true,
      movies: transformedMovies,
      metadata: {
        duration: `${totalDuration}ms`,
        count: transformedMovies.length,
      },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('PREVIEW_MOVIES', 'Error generating preview movies', {
      error: error.message,
      duration: `${duration}ms`,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        error: 'Failed to generate preview movies',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

