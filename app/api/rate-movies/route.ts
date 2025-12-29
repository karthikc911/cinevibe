import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { formatPosterUrl } from '@/lib/poster-utils';
import OpenAI from 'openai';
import { getCurrentUser } from '@/lib/mobile-auth';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY!;
const PERPLEXITY_MODEL = 'sonar-pro';
const TMDB_API_KEY = process.env.TMDB_API_KEY!;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check authentication - support both web session and mobile token
    const session = await getServerSession(authOptions);
    const authHeader = request.headers.get("authorization");
    const currentUser = await getCurrentUser(session, authHeader);
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('RATE_MOVIES', 'Generating movies for rating', {
      userEmail: currentUser.email,
      timestamp: new Date().toISOString(),
    });

    // Get user with preferences, ratings, and watchlist
    const user = await prisma.user.findUnique({
      where: { email: currentUser.email },
      include: {
        ratings: {
          select: { movieId: true },
        },
        watchlist: {
          select: { movieId: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get already rated movie IDs
    const ratedMovieIds = user.ratings.map((r) => r.movieId);
    
    // Get watchlist movie IDs
    const watchlistMovieIds = user.watchlist.map((w) => w.movieId);
    
    // Combine both to exclude
    const excludeMovieIds = [...new Set([...ratedMovieIds, ...watchlistMovieIds])];
    
    logger.info('RATE_MOVIES', 'Excluding movies', {
      ratedCount: ratedMovieIds.length,
      watchlistCount: watchlistMovieIds.length,
      totalExcluded: excludeMovieIds.length,
    });

    // Build Perplexity query
    const languageDescriptions: Record<string, string> = {
      English: 'Hollywood/English',
      Hindi: 'Bollywood/Hindi',
      Kannada: 'Sandalwood/Kannada',
      Tamil: 'Kollywood/Tamil',
      Telugu: 'Tollywood/Telugu',
      Malayalam: 'Mollywood/Malayalam',
      Korean: 'K-Drama/Korean',
      Japanese: 'J-Drama/Japanese',
      Italian: 'Italian Cinema',
    };

    const languagePrefs = (user.languages || [])
      .map((lang) => languageDescriptions[lang] || lang)
      .join(', ');

    const currentYear = new Date().getFullYear();

    let userPrompt = `Recommend 12 highly-rated, critically acclaimed movies from the year 2000 to ${currentYear}.\n\n`;

    if (languagePrefs) {
      userPrompt += `Preferred Languages/Industries: ${languagePrefs}\n\n`;
    }

    if (user.moviePreference && user.moviePreference.trim()) {
      userPrompt += `User's Movie Preferences: ${user.moviePreference.trim()}\n\n`;
    }

    if (user.aiInstructions && user.aiInstructions.trim()) {
      userPrompt += `User's AI Instructions: ${user.aiInstructions.trim()}\n\n`;
    }

    userPrompt += `Provide a diverse selection across different genres, decades (2000-${currentYear}), and styles.\n`;
    userPrompt += `Include a mix of:\n`;
    userPrompt += `- Popular blockbusters and critically acclaimed indie films\n`;
    userPrompt += `- Different genres (drama, thriller, comedy, action, etc.)\n`;
    userPrompt += `- Movies from different years (2000 to ${currentYear})\n`;
    userPrompt += `- Both mainstream and lesser-known gems\n\n`;
    userPrompt += `For each movie, include:\n`;
    userPrompt += `- Movie title (original and English if different)\n`;
    userPrompt += `- Release year\n`;
    userPrompt += `- IMDb rating\n`;
    userPrompt += `- Genre(s)\n`;
    userPrompt += `- Language\n`;
    userPrompt += `- Brief description\n\n`;
    userPrompt += `Focus on movies that would help understand diverse tastes - from mainstream to artistic cinema.`;

    const systemPrompt = `You are a movie recommendation expert helping users discover their taste in cinema. Provide diverse movie suggestions from 2000 to ${currentYear} that span different genres, styles, and cultural backgrounds. Format your response as a numbered list with movie title and year in parentheses.`;

    // Log prompts
    logger.info('RATE_MOVIES', '📤 PERPLEXITY API REQUEST - SYSTEM PROMPT', {
      systemPrompt: systemPrompt,
      promptLength: systemPrompt.length,
    });

    logger.info('RATE_MOVIES', '📤 PERPLEXITY API REQUEST - USER PROMPT', {
      userPrompt: userPrompt,
      promptLength: userPrompt.length,
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

    logger.info('RATE_MOVIES', '📥 PERPLEXITY API RESPONSE - METADATA', {
      duration: `${perplexityDuration}ms`,
      model: perplexityResponse.model,
      finishReason: perplexityResponse.choices[0]?.finish_reason,
      usage: perplexityResponse.usage,
      responseLength: rawResponse.length,
    });

    logger.info('RATE_MOVIES', '📥 PERPLEXITY RESPONSE', {
      rawResponse: rawResponse,
    });

    // Parse movie titles
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
      while ((match = pattern.exec(rawResponse)) !== null) {
        const title = match[1].trim().replace(/\*\*/g, '');
        const year = parseInt(match[2]);
        const key = `${title.toLowerCase()}-${year}`;
        
        if (!seenTitles.has(key) && year >= 2000 && year <= currentYear) {
          seenTitles.add(key);
          extractedTitles.push({ title, year });
        }
      }
    }

    logger.info('RATE_MOVIES', '📋 EXTRACTED MOVIE TITLES', {
      count: extractedTitles.length,
      titles: extractedTitles.map(t => `${t.title} (${t.year})`),
    });

    // Query database for movies (exclude rated AND watchlist)
    const moviesInDb = await prisma.movie.findMany({
      where: {
        OR: extractedTitles.map(({ title, year }) => ({
          title: { contains: title, mode: 'insensitive' as const },
          year: { in: [year - 1, year, year + 1] },
        })),
        id: { notIn: excludeMovieIds }, // Exclude rated AND watchlist movies
      },
      take: 20,
    });

    logger.info('RATE_MOVIES', '✅ MOVIES FOUND IN DB', {
      count: moviesInDb.length,
    });

    // Fetch missing movies from TMDB
    const missingTitles = extractedTitles.filter(
      ({ title, year }) =>
        !moviesInDb.some(
          (m) =>
            m.title.toLowerCase().includes(title.toLowerCase()) ||
            title.toLowerCase().includes(m.title.toLowerCase())
        )
    );

    logger.info('RATE_MOVIES', '🔍 FETCHING MISSING MOVIES FROM TMDB', {
      count: missingTitles.length,
    });

    const newMovies: any[] = [];

    for (const { title, year } of missingTitles.slice(0, 12 - moviesInDb.length)) {
      try {
        const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (searchData.results && searchData.results.length > 0) {
          const movie = searchData.results[0];
          
          // Skip if this movie is already rated or in watchlist
          if (excludeMovieIds.includes(movie.id)) {
            logger.info('RATE_MOVIES', `Skipping ${movie.title} - already rated or in watchlist`);
            continue;
          }

          // Fetch detailed info
          const detailsUrl = `${TMDB_BASE_URL}/movie/${movie.id}?api_key=${TMDB_API_KEY}`;
          const detailsResponse = await fetch(detailsUrl);
          const details = await detailsResponse.json();

          // Add to database
          const newMovie = await prisma.movie.upsert({
            where: { id: movie.id },
            update: {},
            create: {
              id: movie.id,
              title: movie.title,
              originalTitle: movie.original_title,
              year: new Date(movie.release_date || `${year}-01-01`).getFullYear(),
              posterPath: movie.poster_path,
              backdropPath: movie.backdrop_path,
              overview: movie.overview,
              language: movie.original_language,
              voteAverage: movie.vote_average,
              voteCount: movie.vote_count,
              popularity: movie.popularity,
              genres: details.genres?.map((g: any) => g.name) || [],
              releaseDate: movie.release_date || null,
              runtime: details.runtime,
              budget: details.budget,
              imdbRating: movie.vote_average,
            },
          });

          newMovies.push(newMovie);
          logger.info('RATE_MOVIES', `✅ Added movie from TMDB: ${movie.title}`);
        }
      } catch (error: any) {
        logger.error('RATE_MOVIES', `Error fetching ${title} from TMDB`, {
          error: error.message,
        });
      }
    }

    // Combine movies
    const allMovies = [...moviesInDb, ...newMovies].slice(0, 12);

    // Transform for frontend
    const transformedMovies = allMovies.map((movie) => ({
      id: movie.id,
      title: movie.title,
      year: movie.year,
      poster: formatPosterUrl(movie.posterPath),
      lang: movie.language,
      langs: [movie.language],
      imdb: movie.imdbRating || movie.voteAverage,
      rt: movie.rtRating || null,
      summary: movie.overview || 'No summary available',
      overview: movie.overview || 'No summary available',
      category: movie.genres?.[0] || 'Unknown',
      language: movie.language,
      languages: movie.genres || [],
      genres: movie.genres || [],
    }));

    const totalDuration = Date.now() - startTime;
    logger.info('RATE_MOVIES', 'Rate movies generated successfully', {
      totalDuration: `${totalDuration}ms`,
      moviesReturned: transformedMovies.length,
      moviesFromDb: moviesInDb.length,
      moviesFromTmdb: newMovies.length,
    });

    return NextResponse.json({
      success: true,
      movies: transformedMovies,
      totalMovies: transformedMovies.length,
      fromDatabase: moviesInDb.length,
      fromTmdb: newMovies.length,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('RATE_MOVIES', 'Error generating rate movies', {
      error: error.message,
      duration: `${duration}ms`,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to generate movies', details: error.message },
      { status: 500 }
    );
  }
}

