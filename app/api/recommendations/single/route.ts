import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { enrichMovieWithMetadata } from '@/lib/movie-metadata-fetcher';
import { fetchMovieFromTMDB, searchMovieOnTMDB } from '@/lib/tmdb-helper';

// POST - Generate a single AI recommendation
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        languages: true,
        genres: true,
        aiInstructions: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    logger.info('SINGLE_RECOMMENDATION', '🎯 Generating single movie recommendation', {
      userId: user.id,
      userEmail: user.email,
    });

    // Get user's ratings to inform recommendations
    const userRatings = await prisma.movieRating.findMany({
      where: { userId: user.id },
      select: {
        movieId: true,
        movieTitle: true,
        movieYear: true,
        rating: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Last 50 ratings
    });

    // Separate ratings by type
    const amazing = userRatings.filter((r) => r.rating === 'amazing');
    const good = userRatings.filter((r) => r.rating === 'good');
    const meh = userRatings.filter((r) => r.rating === 'meh');
    const awful = userRatings.filter((r) => r.rating === 'awful');
    const notInterested = userRatings.filter((r) => r.rating === 'not-interested');

    // Get all rated movie IDs to exclude
    const ratedMovieIds = userRatings.map((r) => r.movieId);

    // Construct prompt for single movie
    let userPrompt = `I need you to recommend exactly 1 NEW movie that this user would love based on their taste.\n\n`;
    userPrompt += `USER PROFILE:\n`;
    userPrompt += `Preferred Languages: ${user.languages.join(', ')}\n`;
    if (user.genres && user.genres.length > 0) {
      userPrompt += `Preferred Genres: ${user.genres.join(', ')}\n`;
    }
    if (user.aiInstructions && user.aiInstructions.trim()) {
      userPrompt += `Special Instructions: ${user.aiInstructions.trim()}\n`;
    }
    userPrompt += `\n`;

    // Add rating context (limited to prevent token overflow)
    if (amazing.length > 0) {
      userPrompt += `MOVIES THEY LOVED:\n${amazing.slice(0, 10).map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }
    if (good.length > 0) {
      userPrompt += `MOVIES THEY ENJOYED:\n${good.slice(0, 10).map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }
    if (notInterested.length > 0) {
      userPrompt += `MOVIES THEY'RE NOT INTERESTED IN:\n${notInterested.slice(0, 10).map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }

    userPrompt += `🚨 CRITICAL RULES:\n`;
    userPrompt += `1. Recommend EXACTLY 1 movie\n`;
    userPrompt += `2. DO NOT recommend ANY movies listed above\n`;
    userPrompt += `3. Focus on newer movies (2020-2024) or highly acclaimed classics\n`;
    userPrompt += `4. The movie MUST match their preferred languages\n`;
    userPrompt += `5. Format: "Movie Title (Year)"\n\n`;
    userPrompt += `Recommend 1 movie:`;

    logger.info('SINGLE_RECOMMENDATION', '📤 Calling Perplexity API', {
      promptLength: userPrompt.length,
    });

    // Generate recommendation using Perplexity Sonar API
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a movie recommendation expert. Provide personalized movie suggestions based on user preferences. Format your response as: "Movie Title (Year)"',
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      logger.error('SINGLE_RECOMMENDATION', 'Perplexity API error', {
        status: perplexityResponse.status,
        error: errorText,
      });
      return NextResponse.json({ error: 'Failed to generate recommendation' }, { status: 500 });
    }

    const perplexityData = await perplexityResponse.json();
    const recommendation = perplexityData.choices?.[0]?.message?.content;

    if (!recommendation) {
      logger.error('SINGLE_RECOMMENDATION', 'Empty response from Perplexity');
      return NextResponse.json({ error: 'Failed to generate recommendation' }, { status: 500 });
    }

    logger.info('SINGLE_RECOMMENDATION', '📥 Perplexity response received', {
      response: recommendation,
    });

    // Parse movie title and year
    const movieMatch = recommendation.match(/^(.*?)\s*\((\d{4})\)/);
    if (!movieMatch) {
      logger.error('SINGLE_RECOMMENDATION', 'Failed to parse movie from response', {
        response: recommendation,
      });
      return NextResponse.json({ error: 'Failed to parse recommendation' }, { status: 500 });
    }

    const [_, title, yearStr] = movieMatch;
    const year = parseInt(yearStr);

    // Check if movie already exists in DB
    let movie = await prisma.movie.findFirst({
      where: {
        title: { contains: title.trim(), mode: 'insensitive' },
        year,
      },
    });

    // If not in DB, fetch from TMDB and add
    if (!movie) {
      logger.info('SINGLE_RECOMMENDATION', 'Movie not in DB, fetching from TMDB', {
        title: title.trim(),
        year,
      });

      const tmdbMovie = await searchMovieOnTMDB(title.trim(), year);
      if (tmdbMovie) {
        movie = await prisma.movie.create({
          data: {
            id: tmdbMovie.id,
            title: tmdbMovie.title || tmdbMovie.name || title.trim(),
            originalTitle: tmdbMovie.original_title || tmdbMovie.original_name,
            overview: tmdbMovie.overview,
            posterPath: tmdbMovie.poster_path,
            backdropPath: tmdbMovie.backdrop_path,
            releaseDate: tmdbMovie.release_date,
            year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : year,
            voteAverage: tmdbMovie.vote_average,
            voteCount: tmdbMovie.vote_count,
            popularity: tmdbMovie.popularity,
            language: tmdbMovie.original_language || 'en',
            genres: tmdbMovie.genre_ids ? tmdbMovie.genre_ids.map((id: number) => `Genre_${id}`) : [],
          },
        });
        logger.info('SINGLE_RECOMMENDATION', '✅ Movie added to DB from TMDB', {
          movieId: movie.id,
          title: movie.title,
        });
      } else {
        logger.error('SINGLE_RECOMMENDATION', 'Movie not found on TMDB', {
          title: title.trim(),
          year,
        });
        return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
      }
    }

    // Enrich movie with metadata if needed
    await enrichMovieWithMetadata(movie.id, movie.title, movie.year);

    // Re-fetch movie to get updated metadata
    const updatedMovie = await prisma.movie.findUnique({
      where: { id: movie.id },
    });

    if (!updatedMovie) {
      return NextResponse.json({ error: 'Movie not found after creation' }, { status: 500 });
    }

    // Format poster URL
    const formatPosterUrl = (posterPath: string | null): string => {
      if (!posterPath) return '';
      if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) {
        return posterPath;
      }
      if (posterPath.startsWith('/')) {
        return `https://image.tmdb.org/t/p/w500${posterPath}`;
      }
      return '';
    };

    // Transform movie for frontend
    const transformedMovie = {
      id: updatedMovie.id,
      title: updatedMovie.title,
      year: updatedMovie.year,
      poster: formatPosterUrl(updatedMovie.posterPath),
      lang: updatedMovie.language,
      langs: updatedMovie.genres || [],
      imdb: updatedMovie.imdbRating || updatedMovie.voteAverage,
      rt: updatedMovie.rtRating,
      voteCount: updatedMovie.voteCount || 0,
      summary: updatedMovie.overview || 'No summary available',
      overview: updatedMovie.overview || 'No summary available',
      category: updatedMovie.genres?.[0] || 'Unknown',
      language: updatedMovie.language,
      languages: updatedMovie.genres || [],
      genres: updatedMovie.genres || [],
      matchPercent: 85,
      imdbVoterCount: updatedMovie.imdbVoterCount || updatedMovie.voteCount || 0,
      userReviewSummary: updatedMovie.userReviewSummary || null,
      budget: updatedMovie.budget ? Number(updatedMovie.budget) : null,
      boxOffice: updatedMovie.boxOffice ? Number(updatedMovie.boxOffice) : null,
    };

    const duration = Date.now() - startTime;
    logger.info('SINGLE_RECOMMENDATION', '✅ Single movie recommendation generated', {
      duration: `${duration}ms`,
      movie: `${transformedMovie.title} (${transformedMovie.year})`,
    });

    return NextResponse.json({
      movie: transformedMovie,
      duration,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('SINGLE_RECOMMENDATION', '❌ Error generating single recommendation', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
    });
    return NextResponse.json(
      { error: 'Failed to generate recommendation' },
      { status: 500 }
    );
  }
}

