import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { autoFixMovieData } from '@/lib/tmdb-helper';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('QUICK_PICKS', 'Fetching quick picks for instant display', {
      userEmail: session.user.email,
      timestamp: new Date().toISOString(),
    });

    // Get user preferences
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        ratings: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get rated movie IDs to exclude
    const ratedMovieIds = user.ratings.map((r) => r.movieId);

    // Language mapping
    const languageMap: Record<string, string> = {
      'English': 'en',
      'Hindi': 'hi',
      'Tamil': 'ta',
      'Telugu': 'te',
      'Kannada': 'kn',
      'Malayalam': 'ml',
      'Korean': 'ko',
      'Japanese': 'ja',
      'Italian': 'it',
    };

    const languageCodes = (user.languages || ['English']).map(lang => languageMap[lang]).filter(Boolean);

    logger.info('QUICK_PICKS', 'User preferences', {
      languages: user.languages,
      languageCodes,
      ratedMoviesCount: ratedMovieIds.length,
    });

    // Fetch 8 high-quality movies from user's preferred languages
    let quickMovies = await prisma.movie.findMany({
      where: {
        language: { in: languageCodes },
        voteAverage: { gte: 7.0 },
        year: { gte: 2018 },
        id: { notIn: ratedMovieIds },
      },
      orderBy: [
        { voteAverage: 'desc' },
        { voteCount: 'desc' },
      ],
      take: 8,
    });

    // Auto-fix movies with missing posters/backdrops
    const fixPromises = quickMovies.map(movie => autoFixMovieData(movie));
    quickMovies = await Promise.all(fixPromises);

    logger.info('QUICK_PICKS', 'Quick movies fetched', {
      count: quickMovies.length,
      movies: quickMovies.map(m => ({ id: m.id, title: m.title, rating: m.voteAverage })),
    });

    // Helper function to format poster URL
    const formatPosterUrl = (posterPath: string | null): string => {
      if (!posterPath) return '';
      // If already a full URL, return as is
      if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) {
        return posterPath;
      }
      // If it's a TMDB path (starts with /), convert to full TMDB URL
      if (posterPath.startsWith('/')) {
        return `https://image.tmdb.org/t/p/w500${posterPath}`;
      }
      // Otherwise, assume it's a custom path, return as is
      return posterPath;
    };

    // Calculate match percentage
    const calculateMatchPercentage = (movie: any) => {
      let match = 70;
      const movieLangFull = Object.keys(languageMap).find(
        key => languageMap[key] === movie.language
      ) || movie.language;
      
      if (user.languages?.includes(movieLangFull)) {
        match += 15;
      }
      
      if (movie.voteAverage >= 8.0) match += 10;
      else if (movie.voteAverage >= 7.0) match += 5;
      
      return Math.min(95, match);
    };

    // Transform for frontend
    const transformedMovies = quickMovies.map((movie) => ({
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
      matchPercent: calculateMatchPercentage(movie),
    }));

    const totalDuration = Date.now() - startTime;

    logger.info('QUICK_PICKS', 'Quick picks generated successfully', {
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
    logger.error('QUICK_PICKS', 'Error generating quick picks', {
      error: error.message,
      duration: `${duration}ms`,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        error: 'Failed to generate quick picks',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

