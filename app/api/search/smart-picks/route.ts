import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import OpenAI from 'openai';
import { enrichMovieWithMetadata } from '@/lib/movie-metadata-fetcher';
import { 
  MOVIE_RECOMMENDATIONS_SYSTEM_PROMPT, 
  buildMovieRecommendationPrompt,
  LANGUAGE_DESCRIPTIONS 
} from '@/config/prompts';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_MODEL = 'sonar-pro';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body for custom query
    const body = await request.json().catch(() => ({}));
    const customUserQuery = body.userQuery;
    const count = Math.min(parseInt(request.nextUrl.searchParams.get('count') || '10'), 10); // Max 10 movies

    logger.info('SMART_PICKS', 'Generating smart picks for user', {
      userEmail: session.user.email,
      customQuery: customUserQuery || 'Using user preferences',
      count,
      timestamp: new Date().toISOString(),
    });

    // Get user with preferences, ratings, and watchlist
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        ratings: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        watchlist: {
          select: {
            movieId: true,
            movieTitle: true,
            movieYear: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    logger.info('SMART_PICKS', '🎯 User Preferences Loaded from Database', {
      languages: user.languages,
      genres: user.genres,
      aiInstructions: user.aiInstructions || 'None',
      recYearFrom: user.recYearFrom || 'Not set',
      recYearTo: user.recYearTo || 'Not set',
      recMinImdb: user.recMinImdb || 'Not set',
      recMinBoxOffice: user.recMinBoxOffice ? Number(user.recMinBoxOffice) : 'Not set',
      recMaxBudget: user.recMaxBudget ? Number(user.recMaxBudget) : 'Not set',
    });

    // Categorize ratings (exclude not-seen and not-interested from recommendations)
    const amazing = user.ratings.filter((r) => r.rating === 'amazing');
    const good = user.ratings.filter((r) => r.rating === 'good');
    const awful = user.ratings.filter((r) => r.rating === 'awful');
    const notInterested = user.ratings.filter((r) => r.rating === 'not-interested');
    const watchlistMovies = user.watchlist || [];
    
    // Get all rated/interacted movie IDs to exclude from recommendations
    const excludedMovieIds = [
      ...user.ratings.map(r => r.movieId),
      ...watchlistMovies.map(w => w.movieId),
    ];
    const notInterestedMovieIds = notInterested.map(r => r.movieId);

    logger.info('SMART_PICKS', 'User rating breakdown', {
      amazing: amazing.length,
      good: good.length,
      awful: awful.length,
      notInterested: notInterested.length,
      watchlist: watchlistMovies.length,
      totalRatings: user.ratings.length,
      totalExcluded: excludedMovieIds.length,
    });

    // Build Perplexity query
    const languagePrefs = (user.languages || [])
      .map((lang) => LANGUAGE_DESCRIPTIONS[lang] || lang)
      .join(', ');

    // Build user prompt using config
    const userPrompt = buildMovieRecommendationPrompt({
      count,
      amazing: amazing.map(r => ({ movieTitle: r.movieTitle, movieYear: parseInt(r.movieYear || '0') })),
      good: good.map(r => ({ movieTitle: r.movieTitle, movieYear: parseInt(r.movieYear || '0') })),
      awful: awful.map(r => ({ movieTitle: r.movieTitle, movieYear: parseInt(r.movieYear || '0') })),
      notInterested: notInterested.map(r => ({ movieTitle: r.movieTitle, movieYear: parseInt(r.movieYear || '0') })),
      watchlistMovies: watchlistMovies.map(w => ({ movieTitle: w.movieTitle, movieYear: parseInt(w.movieYear || '0') })),
      languagePrefs,
      genres: user.genres || undefined,
      aiInstructions: user.aiInstructions || undefined,
      customUserQuery,
    });

    const systemPrompt = MOVIE_RECOMMENDATIONS_SYSTEM_PROMPT;

    // Log complete prompts
    logger.info('SMART_PICKS', '📤 PERPLEXITY API REQUEST - SYSTEM PROMPT', {
      systemPrompt: systemPrompt,
      promptLength: systemPrompt.length,
    });

    logger.info('SMART_PICKS', '📤 PERPLEXITY API REQUEST - USER PROMPT', {
      userPrompt: userPrompt,
      promptLength: userPrompt.length,
    });

    logger.info('SMART_PICKS', '🔄 Calling Perplexity API', {
      model: PERPLEXITY_MODEL,
      baseURL: 'https://api.perplexity.ai',
      timestamp: new Date().toISOString(),
    });

    // Call Perplexity API
    const perplexity = new OpenAI({
      apiKey: PERPLEXITY_API_KEY,
      baseURL: 'https://api.perplexity.ai',
    });

    const perplexityStartTime = Date.now();
    const perplexityResponse = await perplexity.chat.completions.create({
      model: PERPLEXITY_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const perplexityDuration = Date.now() - perplexityStartTime;
    const rawResponse = perplexityResponse.choices[0]?.message?.content || '';

    logger.info('SMART_PICKS', '📥 PERPLEXITY API RESPONSE - METADATA', {
      duration: `${perplexityDuration}ms`,
      durationSeconds: (perplexityDuration / 1000).toFixed(2) + 's',
      model: perplexityResponse.model,
      finishReason: perplexityResponse.choices[0]?.finish_reason,
      usage: perplexityResponse.usage,
      responseLength: rawResponse.length,
    });

    logger.info('SMART_PICKS', '📥 PERPLEXITY API RESPONSE - COMPLETE RAW OUTPUT', {
      rawResponse: rawResponse,
      responsePreview: rawResponse.substring(0, 500) + '...',
    });

    // Parse movie titles from response with multiple patterns
    logger.info('SMART_PICKS', '🔍 PARSING MOVIE TITLES FROM RESPONSE', {
      responseLength: rawResponse.length,
    });

    const titlePatterns = [
      /\d+\.\s+\*?\*?([A-Z][^(\n]*?)\*?\*?\s+\((\d{4})\)/gi,
      /\d+\.\s+\*?\*?([A-Z][^(\n]*?)\*?\*?\s+-\s+(\d{4})/gi,
      /\*\*([A-Z][^*]+)\*\*\s+\((\d{4})\)/gi,
      /^([A-Z][^\n(]{2,50})\s+\((\d{4})\)/gmi,
    ];

    const extractedTitles: Array<{ title: string; year: number }> = [];
    const seenTitles = new Set<string>();

    for (const pattern of titlePatterns) {
      let match;
      const patternCopy = new RegExp(pattern);
      while ((match = patternCopy.exec(rawResponse)) !== null) {
        const title = match[1].trim().replace(/\*\*/g, '');
        const year = parseInt(match[2]);
        const key = `${title}|${year}`;
        
        if (!seenTitles.has(key) && title.length > 2) {
          seenTitles.add(key);
          extractedTitles.push({ title, year });
        }
      }
    }

    logger.info('SMART_PICKS', '📋 EXTRACTED MOVIE TITLES', {
      count: extractedTitles.length,
      titles: extractedTitles.map((t) => `${t.title} (${t.year})`),
    });

    // If we didn't extract enough titles, try to get more from high-rated movies in user's preferred languages
    if (extractedTitles.length < count) {
      logger.info('SMART_PICKS', '⚠️ Insufficient titles extracted, fetching additional movies from DB', {
        extractedCount: extractedTitles.length,
        needed: count - extractedTitles.length,
      });
    }

    // Query database for these movies with improved matching
    logger.info('SMART_PICKS', '🔎 QUERYING DATABASE FOR MOVIES', {
      extractedTitlesCount: extractedTitles.length,
    });

    let movies = [];

    // Try exact match first
    if (extractedTitles.length > 0) {
      const exactMatches = await prisma.movie.findMany({
        where: {
          AND: [
            {
              OR: extractedTitles.map((t) => ({
                AND: [
                  { title: { contains: t.title, mode: 'insensitive' as const } },
                  { year: t.year },
                ],
              })),
            },
            { id: { notIn: excludedMovieIds } }, // Exclude rated/not-interested
          ],
        },
        orderBy: [{ voteAverage: 'desc' }, { voteCount: 'desc' }],
      });

      movies.push(...exactMatches);

      logger.info('SMART_PICKS', '✅ EXACT MATCHES FOUND', {
        count: exactMatches.length,
        movies: exactMatches.map((m) => `${m.title} (${m.year})`),
      });
    }

    // If we don't have enough movies, try broader search
    if (movies.length < count && extractedTitles.length > 0) {
      logger.info('SMART_PICKS', '🔎 TRYING BROADER SEARCH (year range ±2)', {
        currentCount: movies.length,
      });

      const broaderMatches = await prisma.movie.findMany({
        where: {
          AND: [
            {
              OR: extractedTitles.map((t) => ({
                AND: [
                  { title: { contains: t.title, mode: 'insensitive' as const } },
                  { year: { gte: t.year - 2, lte: t.year + 2 } },
                ],
              })),
            },
            { id: { notIn: [...movies.map((m) => m.id), ...excludedMovieIds] } },
          ],
        },
        orderBy: [{ voteAverage: 'desc' }, { voteCount: 'desc' }],
        take: count - movies.length,
      });

      movies.push(...broaderMatches);

      logger.info('SMART_PICKS', '✅ BROADER MATCHES FOUND', {
        count: broaderMatches.length,
        totalNow: movies.length,
      });
    }

    // If still not enough, get top-rated movies from user's languages
    if (movies.length < count) {
      logger.info('SMART_PICKS', '🔎 FETCHING TOP-RATED MOVIES FROM USER LANGUAGES', {
        currentCount: movies.length,
        needed: count - movies.length,
        languages: user.languages,
        preferences: {
          yearFrom: user.recYearFrom,
          yearTo: user.recYearTo,
          minImdb: user.recMinImdb,
          minBoxOffice: user.recMinBoxOffice,
          maxBudget: user.recMaxBudget,
        },
      });

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

      const languageCodes = (user.languages || []).map(lang => languageMap[lang]).filter(Boolean);

      if (languageCodes.length > 0) {
        // Build filter based on user preferences
        const whereClause: any = {
          language: { in: languageCodes },
          id: { notIn: [...movies.map((m) => m.id), ...excludedMovieIds] },
        };

        // Apply year range filter
        if (user.recYearFrom !== null && user.recYearFrom !== undefined && user.recYearFrom > 1900) {
          whereClause.year = { ...whereClause.year, gte: user.recYearFrom };
        }
        // If recYearFrom is 1900 or not set, don't apply any minimum year filter (any year)

        if (user.recYearTo !== null && user.recYearTo !== undefined) {
          whereClause.year = { ...whereClause.year, lte: user.recYearTo };
        }

        // Apply IMDB rating filter
        if (user.recMinImdb !== null && user.recMinImdb !== undefined) {
          whereClause.imdbRating = { gte: user.recMinImdb };
        } else {
          whereClause.voteAverage = { gte: 7.0 }; // Default fallback
        }

        // Apply box office filter if specified
        if (user.recMinBoxOffice !== null && user.recMinBoxOffice !== undefined) {
          whereClause.boxOffice = { gte: user.recMinBoxOffice };
        }

        // Apply budget filter if specified
        if (user.recMaxBudget !== null && user.recMaxBudget !== undefined) {
          whereClause.budget = { lte: user.recMaxBudget };
        }

        const topRatedInLanguages = await prisma.movie.findMany({
          where: whereClause,
          orderBy: [{ voteAverage: 'desc' }, { voteCount: 'desc' }],
          take: count - movies.length,
        });

        movies.push(...topRatedInLanguages);

        logger.info('SMART_PICKS', '✅ TOP-RATED LANGUAGE MOVIES ADDED', {
          count: topRatedInLanguages.length,
          totalNow: movies.length,
          appliedFilters: {
            yearRange: `${whereClause.year?.gte || 'N/A'} - ${whereClause.year?.lte || 'N/A'}`,
            minImdb: whereClause.imdbRating?.gte || whereClause.voteAverage?.gte || 'N/A',
            minBoxOffice: whereClause.boxOffice?.gte || 'N/A',
            maxBudget: whereClause.budget?.lte || 'N/A',
          },
        });
      }
    }

    // For movies not in DB, fetch from TMDB
    logger.info('SMART_PICKS', '🎬 ENRICHING MOVIES WITH TMDB DATA', {
      totalMovies: movies.length,
      extractedTitles: extractedTitles.length,
    });

    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    let enrichedMovies: any[] = [];

    for (const extracted of extractedTitles.slice(0, count)) {
      // Check if we already have this movie in our list
      const existingMovie = movies.find(m => 
        m.title.toLowerCase().includes(extracted.title.toLowerCase()) && 
        m.year && Math.abs(m.year - extracted.year) <= 2
      );

      if (existingMovie) {
        enrichedMovies.push(existingMovie);
        continue;
      }

      // Fetch from TMDB if not in DB
      try {
        logger.info('SMART_PICKS', `🔍 Fetching from TMDB: ${extracted.title} (${extracted.year})`);
        
        const searchResponse = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(extracted.title)}&year=${extracted.year}`
        );
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const tmdbMovie = searchData.results?.[0];
          
          if (tmdbMovie) {
            // Get detailed movie info
            const detailsResponse = await fetch(
              `https://api.themoviedb.org/3/movie/${tmdbMovie.id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`
            );
            
            if (detailsResponse.ok) {
              const details = await detailsResponse.json();
              
              // Create movie object
              const newMovie = await prisma.movie.upsert({
                where: { id: tmdbMovie.id },
                update: {},
                create: {
                  id: tmdbMovie.id,
                  title: details.title,
                  originalTitle: details.original_title,
                  overview: details.overview || 'No summary available',
                  posterPath: details.poster_path,
                  backdropPath: details.backdrop_path,
                  releaseDate: details.release_date,
                  year: parseInt(details.release_date?.split('-')[0] || extracted.year.toString()),
                  voteAverage: details.vote_average || 0,
                  voteCount: details.vote_count || 0,
                  popularity: details.popularity || 0,
                  language: details.original_language,
                  genres: details.genres?.map((g: any) => g.name) || [],
                  runtime: details.runtime,
                  tagline: details.tagline,
                  imdbRating: details.vote_average || null,
                  rtRating: null,
                },
              });
              
              enrichedMovies.push(newMovie);
              logger.info('SMART_PICKS', `✅ Added from TMDB: ${newMovie.title}`);
            }
          }
        }
      } catch (error: any) {
        logger.error('SMART_PICKS', `❌ Failed to fetch ${extracted.title} from TMDB: ${error.message}`);
      }

      // Stop if we have enough movies
      if (enrichedMovies.length >= count) break;
    }

    // If still not enough, add from existing movies
    if (enrichedMovies.length < count) {
      const remaining = movies.filter(m => !enrichedMovies.find(em => em.id === m.id));
      enrichedMovies.push(...remaining.slice(0, count - enrichedMovies.length));
    }

    logger.info('SMART_PICKS', '📊 FINAL ENRICHED MOVIE SELECTION', {
      totalMovies: enrichedMovies.length,
      movies: enrichedMovies.map((m) => ({ id: m.id, title: m.title, year: m.year, rating: m.voteAverage })),
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

    // Calculate match percentage and reasons based on user preferences
    const calculateMatchPercentage = (movie: any) => {
      let match = 70; // Base match
      const reasons: any[] = [];
      
      // Language Match (0-15 points)
      const langMap: Record<string, string> = {
        'en': 'English', 'hi': 'Hindi', 'ta': 'Tamil', 'te': 'Telugu',
        'kn': 'Kannada', 'ml': 'Malayalam', 'ko': 'Korean', 'ja': 'Japanese', 'it': 'Italian'
      };
      const movieLangFull = langMap[movie.language] || movie.language;
      if (user.languages?.includes(movieLangFull)) {
        const langScore = 15;
        match += langScore;
        reasons.push({
          factor: "Language Match",
          score: langScore,
          description: `Available in your preferred language (${movieLangFull})`,
          icon: "globe"
        });
      }
      
      // High Rating (0-10 points)
      if (movie.imdbRating >= 8.0 || movie.voteAverage >= 8.0) {
        const ratingScore = 10;
        match += ratingScore;
        const rating = movie.imdbRating || movie.voteAverage;
        reasons.push({
          factor: "Highly Rated",
          score: ratingScore,
          description: `Excellent rating (${rating.toFixed(1)}/10 IMDB) like your favorite movies`,
          icon: "star"
        });
      } else if (movie.imdbRating >= 7.0 || movie.voteAverage >= 7.0) {
        const ratingScore = 5;
        match += ratingScore;
        const rating = movie.imdbRating || movie.voteAverage;
        reasons.push({
          factor: "Good Rating",
          score: ratingScore,
          description: `Well-rated movie (${rating.toFixed(1)}/10 IMDB)`,
          icon: "star"
        });
      }
      
      // Genre Match (0-20 points)
      if (movie.genres && user.genres) {
        const matchingGenres = movie.genres.filter((g: string) => 
          user.genres.some((ug: string) => ug.toLowerCase() === g.toLowerCase())
        );
        if (matchingGenres.length > 0) {
          const genreScore = Math.min(20, matchingGenres.length * 10);
          match += genreScore;
          reasons.push({
            factor: "Genre Match",
            score: genreScore,
            description: `Matches your taste in ${matchingGenres.join(', ')}`,
            icon: "heart"
          });
        }
      }
      
      // Recency Bonus (0-8 points)
      if (movie.year && movie.year >= 2023) {
        const recencyScore = 8;
        match += recencyScore;
        reasons.push({
          factor: "Recently Released",
          score: recencyScore,
          description: `Fresh content from ${movie.year}`,
          icon: "calendar"
        });
      } else if (movie.year && movie.year >= 2020) {
        const recencyScore = 5;
        match += recencyScore;
        reasons.push({
          factor: "Recent Release",
          score: recencyScore,
          description: `Released in ${movie.year}, matches your preference`,
          icon: "calendar"
        });
      }
      
      // Popularity Factor (0-12 points)
      if (movie.voteCount >= 10000) {
        const popScore = 12;
        match += popScore;
        reasons.push({
          factor: "Widely Acclaimed",
          score: popScore,
          description: `Loved by ${(movie.voteCount / 1000).toFixed(0)}K+ viewers worldwide`,
          icon: "trending"
        });
      } else if (movie.voteCount >= 5000) {
        const popScore = 7;
        match += popScore;
        reasons.push({
          factor: "Popular Choice",
          score: popScore,
          description: `Watched by ${(movie.voteCount / 1000).toFixed(0)}K+ viewers`,
          icon: "trending"
        });
      }
      
      // AI Personalization Bonus (0-10 points)
      if (amazing.length > 0 || good.length > 0) {
        const aiScore = 10;
        match += aiScore;
        reasons.push({
          factor: "AI Personalized",
          score: aiScore,
          description: `Selected based on your ${amazing.length + good.length} rated movies`,
          icon: "sparkles"
        });
      }
      
      // Cap at 95%
      const finalMatch = Math.min(95, match);
      
      return { matchPercent: finalMatch, matchReasons: reasons };
    };

    // Enrich AI-recommended movies with IMDB metadata from Perplexity
    logger.info('SMART_PICKS', '🔄 Enriching AI-recommended movies with IMDB metadata');
    const enrichmentBatchSize = 3;
    for (let i = 0; i < enrichedMovies.length; i += enrichmentBatchSize) {
      const batch = enrichedMovies.slice(i, i + enrichmentBatchSize);
      const enrichPromises = batch.map(movie => 
        enrichMovieWithMetadata(movie.id, movie.title, movie.year)
      );
      await Promise.all(enrichPromises);
    }

    // Re-fetch movies to get updated metadata
    const movieIds = enrichedMovies.map(m => m.id);
    enrichedMovies = await prisma.movie.findMany({
      where: { id: { in: movieIds } },
    });

    logger.info('SMART_PICKS', '✅ Movies enriched with IMDB metadata', {
      count: enrichedMovies.length,
    });

    // DOUBLE VALIDATION: Filter out ALL already-interacted movies (rated + watchlist)
    const beforeFilterCount = enrichedMovies.length;
    enrichedMovies = enrichedMovies.filter(movie => !excludedMovieIds.includes(movie.id));
    const filteredCount = beforeFilterCount - enrichedMovies.length;

    if (filteredCount > 0) {
      logger.warn('SMART_PICKS', '⚠️ DOUBLE VALIDATION: Perplexity recommended already-rated/watchlist movies!', {
        beforeCount: beforeFilterCount,
        afterCount: enrichedMovies.length,
        filteredOut: filteredCount,
        excludedCount: excludedMovieIds.length,
        breakdown: {
          totalRated: user.ratings.length,
          notInterested: notInterested.length,
          watchlist: watchlistMovies.length,
        },
      });
    }
    
    logger.info('SMART_PICKS', '✅ FINAL MOVIES AFTER EXCLUSION FILTER', {
      moviesReturning: enrichedMovies.length,
      totalExcluded: excludedMovieIds.length,
      verifiedNoOverlap: true,
    });

    // Transform movies for frontend
    const transformedMovies = enrichedMovies.map((movie) => {
      const matchData = calculateMatchPercentage(movie);
      return {
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
      summary: movie.overview || 'No summary available',
      overview: movie.overview || 'No summary available',
      category: movie.genres?.[0] || 'Unknown',
      language: movie.language,
      languages: movie.genres || [],
      genres: movie.genres || [],
      budget: movie.budget ? Number(movie.budget) : null,
      boxOffice: movie.boxOffice ? Number(movie.boxOffice) : null,
        matchPercent: matchData.matchPercent,
        matchReasons: matchData.matchReasons,
      };
    });

    const totalDuration = Date.now() - startTime;

    logger.info('SMART_PICKS', 'Smart picks generated successfully', {
      totalDuration: `${totalDuration}ms`,
      moviesReturned: transformedMovies.length,
    });

    return NextResponse.json({
      success: true,
      movies: transformedMovies,
      perplexityResponse: rawResponse,
      metadata: {
        userRatings: user.ratings.length,
        moviesFound: transformedMovies.length,
        duration: `${totalDuration}ms`,
      },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('SMART_PICKS', 'Error generating smart picks', {
      error: error.message,
      duration: `${duration}ms`,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        error: 'Failed to generate smart picks',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

