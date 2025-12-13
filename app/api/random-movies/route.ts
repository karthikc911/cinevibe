import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { autoFixMovieData } from '@/lib/tmdb-helper';

/**
 * POST /api/random-movies
 * Fetch random movies from DB that user hasn't rated or marked as not-interested
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('RANDOM_MOVIES', 'Fetching random movies for user', {
      userEmail: session.user.email,
    });

    // Get user's rated and not-interested movies, along with preferences
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        languages: true,
        recYearFrom: true,
        recYearTo: true,
        recMinImdb: true,
        recMinBoxOffice: true,
        recMaxBudget: true,
        ratings: {
          select: { movieId: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Extract movie IDs that user has already interacted with
    const excludedMovieIds = user.ratings.map(r => r.movieId);

    logger.info('RANDOM_MOVIES', 'Excluding rated/not-interested movies', {
      excludedCount: excludedMovieIds.length,
    });

    // Build where clause based on user preferences
    const whereClause: any = {
      AND: [
        { id: { notIn: excludedMovieIds } },
        {
          OR: [
            { language: { in: user.languages.length > 0 ? user.languages : undefined } },
            { voteAverage: { gte: 6.5 } }, // Fallback to highly rated movies
          ],
        },
        { voteCount: { gte: 100 } }, // Ensure movies have enough votes
      ],
    };

    // Apply year range filter
    const currentYear = new Date().getFullYear();
    const yearFrom = user.recYearFrom !== null && user.recYearFrom !== undefined ? user.recYearFrom : null;
    const yearTo = user.recYearTo !== null && user.recYearTo !== undefined ? user.recYearTo : currentYear;
    
    // Only apply yearFrom filter if it's set and greater than 1900 (not "Any Year")
    if (yearFrom && yearFrom > 1900) {
      whereClause.AND.push({ year: { gte: yearFrom } });
    }
    
    if (yearTo) {
      whereClause.AND.push({ year: { lte: yearTo } });
    }

    // Apply IMDB rating filter
    if (user.recMinImdb !== null && user.recMinImdb !== undefined) {
      whereClause.AND.push({ imdbRating: { gte: user.recMinImdb } });
    }

    // Apply box office filter if specified
    if (user.recMinBoxOffice !== null && user.recMinBoxOffice !== undefined) {
      whereClause.AND.push({ boxOffice: { gte: user.recMinBoxOffice } });
    }

    // Apply budget filter if specified
    if (user.recMaxBudget !== null && user.recMaxBudget !== undefined) {
      whereClause.AND.push({ budget: { lte: user.recMaxBudget } });
    }

    logger.info('RANDOM_MOVIES', 'Applying user preference filters', {
      yearFrom,
      yearTo,
      minImdb: user.recMinImdb || 'N/A',
      minBoxOffice: user.recMinBoxOffice || 'N/A',
      maxBudget: user.recMaxBudget || 'N/A',
    });

    // Fetch 12 random movies from DB that user hasn't rated
    // Prioritize movies in user's preferred languages
    const randomMovies = await prisma.movie.findMany({
      where: whereClause,
      orderBy: [
        { voteAverage: 'desc' },
        { popularity: 'desc' },
      ],
      take: 50, // Get 50 and then shuffle
    });

    // Shuffle and take 12
    let shuffled = randomMovies.sort(() => 0.5 - Math.random()).slice(0, 12);

    // Auto-fix movies with missing posters/backdrops
    const fixPromises = shuffled.map(movie => autoFixMovieData(movie));
    shuffled = await Promise.all(fixPromises);

    // Helper function to format poster URL with detailed logging
    const formatPosterUrl = (posterPath: string | null, movieId: number, movieTitle: string): string => {
      if (!posterPath) {
        logger.warn('RANDOM_MOVIES', '🖼️ No poster path in database', {
          movieId,
          movieTitle,
        });
        return '';
      }

      // If already a full URL, return as is
      if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) {
        logger.info('RANDOM_MOVIES', '🖼️ Poster is already a full URL', {
          movieId,
          movieTitle,
          posterPath,
        });
        return posterPath;
      }

      // If it's a TMDB path (starts with /), convert to full TMDB URL
      if (posterPath.startsWith('/')) {
        const fullUrl = `https://image.tmdb.org/t/p/w500${posterPath}`;
        logger.info('RANDOM_MOVIES', '🖼️ Converting TMDB path to full URL', {
          movieId,
          movieTitle,
          originalPath: posterPath,
          fullUrl,
        });
        return fullUrl;
      }

      // Custom path (doesn't start with / or http) - likely invalid
      logger.error('RANDOM_MOVIES', '⚠️ INVALID POSTER PATH - Not a TMDB path or full URL', {
        movieId,
        movieTitle,
        posterPath,
        pathType: 'CUSTOM/INVALID',
        recommendation: 'This movie needs poster path updated in database',
      });
      
      // Return empty string for invalid paths to show fallback
      return '';
    };

    // Transform to frontend format with detailed logging
    const movies = shuffled.map(movie => {
      const formattedPoster = formatPosterUrl(movie.posterPath, movie.id, movie.title);
      
      return {
        id: movie.id,
        title: movie.title,
        year: movie.year || new Date(movie.releaseDate || '').getFullYear() || 2023,
        poster: formattedPoster,
        lang: movie.language,
        langs: movie.genres || [],
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
        matchPercent: user.languages.includes(movie.language) ? 85 : 70,
      };
    });

    // Log summary of poster statuses
    const posterStats = {
      total: movies.length,
      withPosters: movies.filter(m => m.poster).length,
      withoutPosters: movies.filter(m => !m.poster).length,
      movies: movies.map(m => ({
        id: m.id,
        title: m.title,
        hasPoster: !!m.poster,
        posterUrl: m.poster || 'NO_POSTER',
      })),
    };

    logger.info('RANDOM_MOVIES', '📊 Poster Status Summary', posterStats);

    const duration = Date.now() - startTime;
    logger.info('RANDOM_MOVIES', 'Random movies fetched successfully', {
      count: movies.length,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      movies,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('RANDOM_MOVIES', 'Error fetching random movies', {
      error: error.message,
      duration: `${duration}ms`,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to fetch random movies' },
      { status: 500 }
    );
  }
}

