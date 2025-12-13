import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        languages: true,
        genres: true,
        moviePreference: true,
        recYearFrom: true,
        recYearTo: true,
        recMinImdb: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    logger.info('TV_SHOW_SMART_PICKS', '🎯 User Preferences Loaded from Database', {
      languages: user.languages,
      genres: user.genres,
      moviePreference: user.moviePreference || 'None',
      recYearFrom: user.recYearFrom || 'Not set',
      recYearTo: user.recYearTo || 'Not set',
      recMinImdb: user.recMinImdb || 'Not set',
    });

    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get('count') || '10');

    logger.info('TV_SHOW_SMART_PICKS', 'Generating TV show recommendations', {
      userId: user.id,
      count,
      userLanguages: user.languages,
    });

    // Get rated TV shows and watchlist to exclude
    const ratedTvShows = await prisma.tvShowRating.findMany({
      where: { userId: user.id },
      select: { tvShowId: true, rating: true },
    });
    const ratedTvShowIds = ratedTvShows.map(r => r.tvShowId);
    
    // Get TV shows in watchlist
    const watchlistTvShows = await prisma.tvShowWatchlistItem.findMany({
      where: { userId: user.id },
      select: { tvShowId: true },
    });
    const watchlistTvShowIds = watchlistTvShows.map(w => w.tvShowId);
    
    // Combine all excluded TV show IDs
    const excludedTvShowIds = [...ratedTvShowIds, ...watchlistTvShowIds];
    
    logger.info('TV_SHOW_SMART_PICKS', 'Exclusion lists', {
      ratedTvShows: ratedTvShowIds.length,
      watchlistTvShows: watchlistTvShowIds.length,
      totalExcluded: excludedTvShowIds.length,
    });

    // Get user's preferred languages (default to English and Hindi)
    const userLanguages = user.languages && user.languages.length > 0 
      ? user.languages 
      : ['English', 'Hindi'];

    // Map language names to ISO codes
    const languageCodes = userLanguages.map(lang => getLanguageCode(lang)).filter(Boolean);

    // Build where clause based on user preferences
    const whereClause: any = {
      AND: [
        { id: { notIn: excludedTvShowIds } }, // Exclude both rated and watchlist TV shows
        { language: { in: languageCodes } },
        { voteCount: { gte: 50 } },
      ],
    };

    // Apply year range filter based on first air date
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

    // Apply IMDB rating filter (allow null for newly added shows from TMDB)
    if (user.recMinImdb !== null && user.recMinImdb !== undefined) {
      whereClause.AND.push({
        OR: [
          { imdbRating: { gte: user.recMinImdb } },
          { imdbRating: null } // Allow shows without IMDB rating (newly fetched from TMDB)
        ]
      });
    }

    logger.info('TV_SHOW_SMART_PICKS', 'Applying user preference filters', {
      yearFrom,
      yearTo,
      minImdb: user.recMinImdb || 'N/A',
    });

    // Fetch TV shows from database
    let tvShows = await prisma.tvShow.findMany({
      where: whereClause,
      orderBy: [
        { voteAverage: 'desc' },
        { popularity: 'desc' },
      ],
      take: count * 2, // Get more to have variety
    });

    // If not enough, fetch from TMDB
    if (tvShows.length < count) {
      logger.info('TV_SHOW_SMART_PICKS', 'Not enough TV shows in DB, fetching from TMDB', {
        current: tvShows.length,
        needed: count,
        language: languageCodes[0] || 'en',
      });

      const tmdbShows = await fetchTvShowsFromTMDB(languageCodes[0] || 'en', count);
      
      logger.info('TV_SHOW_SMART_PICKS', 'Fetched TV shows from TMDB', {
        fetched: tmdbShows.length,
        sample: tmdbShows.slice(0, 3).map(s => ({ id: s.id, name: s.name, imdbRating: s.imdbRating })),
      });
      
      // Save to database and add to results
      let added = 0;
      for (const tmdbShow of tmdbShows) {
        if (!ratedTvShowIds.includes(tmdbShow.id) && !tvShows.find(s => s.id === tmdbShow.id)) {
          try {
            const savedShow = await prisma.tvShow.upsert({
              where: { id: tmdbShow.id },
              update: tmdbShow,
              create: tmdbShow,
            });
            tvShows.push(savedShow);
            added++;
            
            if (tvShows.length >= count) break;
          } catch (error) {
            logger.error('TV_SHOW_SMART_PICKS', 'Error saving TV show', { 
              error: error instanceof Error ? error.message : String(error),
              showId: tmdbShow.id,
              showName: tmdbShow.name,
            });
          }
        }
      }
      
      logger.info('TV_SHOW_SMART_PICKS', 'Added TMDB shows to results', {
        added,
        totalNow: tvShows.length,
      });
    }

    // DOUBLE VALIDATION: Filter out ALL already-interacted TV shows (rated + watchlist)
    const beforeFilterCount = tvShows.length;
    tvShows = tvShows.filter(show => !excludedTvShowIds.includes(show.id));
    const filteredCount = beforeFilterCount - tvShows.length;

    if (filteredCount > 0) {
      logger.warn('TV_SHOW_SMART_PICKS', '⚠️ DOUBLE VALIDATION: Found already-rated/watchlist TV shows!', {
        beforeCount: beforeFilterCount,
        afterCount: tvShows.length,
        filteredOut: filteredCount,
        excludedCount: excludedTvShowIds.length,
        breakdown: {
          totalRated: ratedTvShowIds.length,
          watchlist: watchlistTvShowIds.length,
        },
      });
    }
    
    logger.info('TV_SHOW_SMART_PICKS', '✅ FINAL TV SHOWS AFTER EXCLUSION FILTER', {
      tvShowsReturning: tvShows.length,
      totalExcluded: excludedTvShowIds.length,
      verifiedNoOverlap: true,
    });

    // Shuffle and limit to requested count
    const shuffledShows = tvShows.sort(() => Math.random() - 0.5).slice(0, count);

    // Transform to frontend format
    const transformedShows = shuffledShows.map(show => transformTvShowToFrontend(show, user, ratedTvShows));

    logger.info('TV_SHOW_SMART_PICKS', '✓ Generated recommendations', {
      count: transformedShows.length,
    });

    return NextResponse.json({ tvShows: transformedShows });

  } catch (error: any) {
    logger.error('TV_SHOW_SMART_PICKS', 'Error generating recommendations', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}

// Fetch TV shows from TMDB
async function fetchTvShowsFromTMDB(languageCode: string, count: number) {
  const shows: any[] = [];
  let page = 1;

  logger.info('TV_SHOW_SMART_PICKS', 'Starting TMDB fetch', {
    languageCode,
    requestedCount: count,
  });

  while (shows.length < count && page <= 3) {
    const url = `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&language=en&sort_by=vote_average.desc&vote_count.gte=50&with_original_language=${languageCode}&page=${page}`;
    
    logger.info('TV_SHOW_SMART_PICKS', `Fetching TMDB page ${page}`, {
      url: url.replace(TMDB_API_KEY || '', '[API_KEY]'),
    });
    
    try {
      const response = await fetch(url);
      const data = await response.json();

      logger.info('TV_SHOW_SMART_PICKS', `TMDB page ${page} response`, {
        resultsCount: data.results?.length || 0,
        totalResults: data.total_results,
        page: data.page,
      });

      if (data.results && data.results.length > 0) {
        // Fetch detailed info for each show
        for (const basicShow of data.results) {
          if (shows.length >= count) break;

          try {
            const detailUrl = `${TMDB_BASE_URL}/tv/${basicShow.id}?api_key=${TMDB_API_KEY}&language=en`;
            const detailResponse = await fetch(detailUrl);
            const detailData = await detailResponse.json();

            shows.push({
              id: detailData.id,
              name: detailData.name,
              originalName: detailData.original_name,
              overview: detailData.overview || null,
              posterPath: detailData.poster_path || null,
              backdropPath: detailData.backdrop_path || null,
              firstAirDate: detailData.first_air_date || null,
              year: detailData.first_air_date ? new Date(detailData.first_air_date).getFullYear() : null,
              voteAverage: detailData.vote_average || null,
              voteCount: detailData.vote_count || null,
              popularity: detailData.popularity || null,
              language: detailData.original_language,
              genres: (detailData.genres || []).map((g: any) => g.name),
              numberOfSeasons: detailData.number_of_seasons || null,
              numberOfEpisodes: detailData.number_of_episodes || null,
              episodeRunTime: detailData.episode_run_time || [],
              status: detailData.status || null,
              tagline: detailData.tagline || null,
              imdbRating: detailData.vote_average || null, // Use TMDB rating as fallback
            });

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            logger.error('TV_SHOW_SMART_PICKS', 'Error fetching show details', { error });
          }
        }
      }
      
      page++;
      await new Promise(resolve => setTimeout(resolve, 250));
    } catch (error) {
      logger.error('TV_SHOW_SMART_PICKS', 'Error fetching from TMDB', { 
        error: error instanceof Error ? error.message : String(error),
        page,
      });
      break;
    }
  }

  logger.info('TV_SHOW_SMART_PICKS', 'TMDB fetch complete', {
    totalFetched: shows.length,
    pagesChecked: page - 1,
    sample: shows.slice(0, 2).map(s => ({ id: s.id, name: s.name })),
  });

  return shows;
}

// Transform database TV show to frontend format
function transformTvShowToFrontend(dbShow: any, user: any, ratedTvShows: any[]) {
  const matchData = calculateTvShowMatchPercentage(dbShow, user, ratedTvShows);
  
  return {
    id: dbShow.id,
    name: dbShow.name,
    title: dbShow.name, // For compatibility
    lang: getLanguageName(dbShow.language),
    language: dbShow.language,
    year: dbShow.year,
    poster: dbShow.posterPath 
      ? `https://image.tmdb.org/t/p/w780${dbShow.posterPath}`
      : '/placeholder-poster.png',
    imdb: dbShow.imdbRating,
    imdbVoterCount: dbShow.imdbVoterCount,
    userReviewSummary: dbShow.userReviewSummary,
    rt: dbShow.rtRating,
    voteCount: dbShow.voteCount,
    overview: dbShow.overview,
    summary: dbShow.overview,
    genres: dbShow.genres,
    category: dbShow.genres?.join(', '),
    numberOfSeasons: dbShow.numberOfSeasons,
    numberOfEpisodes: dbShow.numberOfEpisodes,
    episodeRunTime: dbShow.episodeRunTime,
    status: dbShow.status,
    matchPercent: matchData.matchPercent,
    matchReasons: matchData.matchReasons,
  };
}

// Calculate match percentage and reasons for TV shows
function calculateTvShowMatchPercentage(tvShow: any, user: any, ratedTvShows: any[]) {
  let match = 70; // Base match
  const reasons: any[] = [];
  
  const amazingRated = ratedTvShows.filter(r => r.rating === 'amazing').length;
  const goodRated = ratedTvShows.filter(r => r.rating === 'good').length;
  
  // Language Match (0-15 points)
  const langMap: Record<string, string> = {
    'en': 'English', 'hi': 'Hindi', 'ta': 'Tamil', 'te': 'Telugu',
    'kn': 'Kannada', 'ml': 'Malayalam', 'ko': 'Korean', 'ja': 'Japanese', 'it': 'Italian'
  };
  const tvShowLangFull = langMap[tvShow.language] || tvShow.language;
  if (user.languages?.includes(tvShowLangFull)) {
    const langScore = 15;
    match += langScore;
    reasons.push({
      factor: "Language Match",
      score: langScore,
      description: `Available in your preferred language (${tvShowLangFull})`,
      icon: "globe"
    });
  }
  
  // High Rating (0-10 points)
  if (tvShow.imdbRating >= 8.0 || tvShow.voteAverage >= 8.0) {
    const ratingScore = 10;
    match += ratingScore;
    const rating = tvShow.imdbRating || tvShow.voteAverage;
    reasons.push({
      factor: "Highly Rated",
      score: ratingScore,
      description: `Excellent rating (${rating.toFixed(1)}/10 IMDB) like your favorite shows`,
      icon: "star"
    });
  } else if (tvShow.imdbRating >= 7.0 || tvShow.voteAverage >= 7.0) {
    const ratingScore = 5;
    match += ratingScore;
    const rating = tvShow.imdbRating || tvShow.voteAverage;
    reasons.push({
      factor: "Good Rating",
      score: ratingScore,
      description: `Well-rated show (${rating.toFixed(1)}/10 IMDB)`,
      icon: "star"
    });
  }
  
  // Genre Match (0-20 points)
  if (tvShow.genres && user.genres) {
    const matchingGenres = tvShow.genres.filter((g: string) => 
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
  if (tvShow.year && tvShow.year >= 2023) {
    const recencyScore = 8;
    match += recencyScore;
    reasons.push({
      factor: "Recently Released",
      score: recencyScore,
      description: `Fresh content from ${tvShow.year}`,
      icon: "calendar"
    });
  } else if (tvShow.year && tvShow.year >= 2020) {
    const recencyScore = 5;
    match += recencyScore;
    reasons.push({
      factor: "Recent Release",
      score: recencyScore,
      description: `Released in ${tvShow.year}, matches your preference`,
      icon: "calendar"
    });
  }
  
  // Popularity Factor (0-12 points)
  if (tvShow.voteCount >= 5000) {
    const popScore = 12;
    match += popScore;
    reasons.push({
      factor: "Widely Acclaimed",
      score: popScore,
      description: `Loved by ${(tvShow.voteCount / 1000).toFixed(0)}K+ viewers worldwide`,
      icon: "trending"
    });
  } else if (tvShow.voteCount >= 2000) {
    const popScore = 7;
    match += popScore;
    reasons.push({
      factor: "Popular Choice",
      score: popScore,
      description: `Watched by ${(tvShow.voteCount / 1000).toFixed(0)}K+ viewers`,
      icon: "trending"
    });
  }
  
  // AI Personalization Bonus (0-10 points)
  if (amazingRated > 0 || goodRated > 0) {
    const aiScore = 10;
    match += aiScore;
    reasons.push({
      factor: "AI Personalized",
      score: aiScore,
      description: `Selected based on your ${amazingRated + goodRated} rated TV shows`,
      icon: "sparkles"
    });
  }
  
  // Cap at 95%
  const finalMatch = Math.min(95, match);
  
  return { matchPercent: finalMatch, matchReasons: reasons };
}

// Helper to get language code from name
function getLanguageCode(name: string): string {
  const languageMap: { [key: string]: string } = {
    'English': 'en',
    'Hindi': 'hi',
    'Kannada': 'kn',
    'Tamil': 'ta',
    'Telugu': 'te',
    'Malayalam': 'ml',
    'Korean': 'ko',
    'Japanese': 'ja',
    'Spanish': 'es',
    'French': 'fr',
    'German': 'de',
    'Italian': 'it',
    'Portuguese': 'pt',
    'Russian': 'ru',
    'Arabic': 'ar',
    'Chinese': 'zh',
  };
  return languageMap[name] || 'en';
}

// Helper to get language name from code
function getLanguageName(code: string): string {
  const languageMap: { [key: string]: string } = {
    'en': 'English',
    'hi': 'Hindi',
    'kn': 'Kannada',
    'ta': 'Tamil',
    'te': 'Telugu',
    'ml': 'Malayalam',
    'ko': 'Korean',
    'ja': 'Japanese',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ar': 'Arabic',
    'zh': 'Chinese',
  };
  return languageMap[code] || code;
}

