import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { enrichMovieWithMetadata } from '@/lib/movie-metadata-fetcher';
import OpenAI from 'openai';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

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

/**
 * Use OpenAI to extract movie details from natural language input
 */
async function extractMovieDetailsFromNaturalLanguage(userInput: string): Promise<{
  movieName: string | null;
  language?: string;
  year?: number;
  genre?: string;
} | null> {
  try {
    logger.info('SEARCH_MOVIE_NLP', '🤖 Processing natural language input with OpenAI', {
      userInput,
    });

    const prompt = `Extract movie information from the following user input: "${userInput}"

Analyze the input and extract:
1. Movie name (the actual title of the movie)
2. Language (if mentioned: English, Hindi, Kannada, Tamil, Telugu, Malayalam, Korean, Japanese, Italian, etc.)
3. Year (if mentioned)
4. Genre (if mentioned: action, comedy, drama, thriller, etc.)

Return ONLY a JSON object in this exact format:
{
  "movieName": "extracted movie title" or null if no clear movie name,
  "language": "language" or null,
  "year": year_number or null,
  "genre": "genre" or null
}

Examples:
- "Super Kannada Movie" -> {"movieName": "Super", "language": "Kannada", "year": null, "genre": null}
- "Baahubali Telugu 2015" -> {"movieName": "Baahubali", "language": "Telugu", "year": 2015, "genre": null}
- "Kantara action thriller" -> {"movieName": "Kantara", "language": null, "year": null, "genre": "action thriller"}
- "RRR Hindi version" -> {"movieName": "RRR", "language": "Hindi", "year": null, "genre": null}

IMPORTANT: Return ONLY valid JSON, no explanations.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a movie information extraction assistant. Extract movie details from user input and return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content?.trim();
    
    if (!content) {
      logger.warn('SEARCH_MOVIE_NLP', 'No content from OpenAI');
      return null;
    }

    logger.info('SEARCH_MOVIE_NLP', '📥 OpenAI Response', {
      rawResponse: content,
    });

    // Parse JSON response
    const extracted = JSON.parse(content);
    
    logger.info('SEARCH_MOVIE_NLP', '✅ Extracted movie details', {
      movieName: extracted.movieName,
      language: extracted.language,
      year: extracted.year,
      genre: extracted.genre,
    });

    return extracted;
  } catch (error: any) {
    logger.error('SEARCH_MOVIE_NLP', '❌ Error processing natural language', {
      error: error.message,
      stack: error.stack,
    });
    return null;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { movieName } = await request.json();

    if (!movieName || !movieName.trim()) {
      return NextResponse.json({ error: 'Movie name is required' }, { status: 400 });
    }

    logger.info('SEARCH_MOVIE', '🔍 Searching for movie', {
      movieName,
      userEmail: session.user.email,
    });

    // Step 1: Search in local database
    logger.info('SEARCH_MOVIE', '📂 Searching local database');
    const dbMovie = await prisma.movie.findFirst({
      where: {
        OR: [
          { title: { contains: movieName, mode: 'insensitive' } },
          { originalTitle: { contains: movieName, mode: 'insensitive' } },
        ],
      },
      orderBy: {
        popularity: 'desc',
      },
    });

    if (dbMovie) {
      logger.info('SEARCH_MOVIE', '✅ Found movie in local database', {
        movieId: dbMovie.id,
        title: dbMovie.title,
      });

      // Enrich with metadata if missing
      await enrichMovieWithMetadata(dbMovie.id, dbMovie.title, dbMovie.year || undefined);

      // Re-fetch to get updated data
      const enrichedMovie = await prisma.movie.findUnique({
        where: { id: dbMovie.id },
      });

      if (enrichedMovie) {
        const transformedMovie = {
          id: enrichedMovie.id,
          title: enrichedMovie.title,
          year: enrichedMovie.year,
          poster: formatPosterUrl(enrichedMovie.posterPath),
          lang: enrichedMovie.language,
          langs: [enrichedMovie.language],
          imdb: enrichedMovie.imdbRating || enrichedMovie.voteAverage,
          imdbVoterCount: enrichedMovie.imdbVoterCount || enrichedMovie.voteCount || 0,
          userReviewSummary: enrichedMovie.userReviewSummary || null,
          rt: enrichedMovie.rtRating || null,
          voteCount: enrichedMovie.voteCount || 0,
          summary: enrichedMovie.overview || 'No summary available',
          overview: enrichedMovie.overview || 'No summary available',
          category: enrichedMovie.genres?.[0] || 'Unknown',
          language: enrichedMovie.language,
          languages: enrichedMovie.genres || [],
          genres: enrichedMovie.genres || [],
          budget: enrichedMovie.budget ? Number(enrichedMovie.budget) : null,
          boxOffice: enrichedMovie.boxOffice ? Number(enrichedMovie.boxOffice) : null,
          matchPercent: 85,
        };

        const duration = Date.now() - startTime;
        logger.info('SEARCH_MOVIE', '✅ Movie search completed (from DB)', {
          duration: `${duration}ms`,
          source: 'database',
        });

        return NextResponse.json({ movie: transformedMovie, source: 'database' });
      }
    }

    // Step 2: Search TMDB if not found in database
    if (!TMDB_API_KEY) {
      logger.error('SEARCH_MOVIE', 'TMDB_API_KEY is not set');
      return NextResponse.json({ error: 'Movie search unavailable' }, { status: 500 });
    }

    logger.info('SEARCH_MOVIE', '🔍 Movie not found in DB, searching TMDB');
    const tmdbResponse = await fetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movieName)}&page=1`
    );

    if (!tmdbResponse.ok) {
      logger.error('SEARCH_MOVIE', 'TMDB API error', { status: tmdbResponse.status });
      return NextResponse.json({ error: 'Failed to search TMDB' }, { status: 500 });
    }

    const tmdbData = await tmdbResponse.json();
    let tmdbMovie = tmdbData.results?.[0];

    // If not found in TMDB, try using OpenAI to extract movie details from natural language
    if (!tmdbMovie && OPENAI_API_KEY) {
      logger.info('SEARCH_MOVIE', '🤖 Movie not found in TMDB, trying natural language processing');
      
      const extracted = await extractMovieDetailsFromNaturalLanguage(movieName);
      
      if (extracted && extracted.movieName) {
        logger.info('SEARCH_MOVIE', '🔍 Retrying TMDB search with extracted movie name', {
          originalInput: movieName,
          extractedMovieName: extracted.movieName,
          extractedLanguage: extracted.language,
          extractedYear: extracted.year,
        });

        // Build search query with year if available
        const searchQuery = extracted.year 
          ? `${extracted.movieName} ${extracted.year}`
          : extracted.movieName;

        const retryResponse = await fetch(
          `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&page=1`
        );

        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          tmdbMovie = retryData.results?.[0];

          if (tmdbMovie) {
            logger.info('SEARCH_MOVIE', '✅ Found movie using extracted name', {
              movieId: tmdbMovie.id,
              title: tmdbMovie.title,
            });
          }
        }
      }
    }

    if (!tmdbMovie) {
      logger.info('SEARCH_MOVIE', '❌ Movie not found in TMDB (even after NLP extraction)');
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    logger.info('SEARCH_MOVIE', '✅ Found movie in TMDB', {
      movieId: tmdbMovie.id,
      title: tmdbMovie.title,
    });

    // Step 3: Add movie to database
    const newMovie = await prisma.movie.upsert({
      where: { id: tmdbMovie.id },
      create: {
        id: tmdbMovie.id,
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
        genres: [], // Will be updated by enrichment
        runtime: null,
        tagline: null,
        imdbRating: null,
        rtRating: null,
        imdbVoterCount: null,
        userReviewSummary: null,
        budget: null,
        boxOffice: null,
      },
      update: {},
    });

    logger.info('SEARCH_MOVIE', '💾 Added movie to database', {
      movieId: newMovie.id,
      title: newMovie.title,
    });

    // Step 4: Enrich with Perplexity metadata
    await enrichMovieWithMetadata(newMovie.id, newMovie.title, newMovie.year || undefined);

    // Re-fetch to get enriched data
    const enrichedMovie = await prisma.movie.findUnique({
      where: { id: newMovie.id },
    });

    if (enrichedMovie) {
      const transformedMovie = {
        id: enrichedMovie.id,
        title: enrichedMovie.title,
        year: enrichedMovie.year,
        poster: formatPosterUrl(enrichedMovie.posterPath),
        lang: enrichedMovie.language,
        langs: [enrichedMovie.language],
        imdb: enrichedMovie.imdbRating || enrichedMovie.voteAverage,
        imdbVoterCount: enrichedMovie.imdbVoterCount || enrichedMovie.voteCount || 0,
        userReviewSummary: enrichedMovie.userReviewSummary || null,
        rt: enrichedMovie.rtRating || null,
        voteCount: enrichedMovie.voteCount || 0,
        summary: enrichedMovie.overview || 'No summary available',
        overview: enrichedMovie.overview || 'No summary available',
        category: enrichedMovie.genres?.[0] || 'Unknown',
        language: enrichedMovie.language,
        languages: enrichedMovie.genres || [],
        genres: enrichedMovie.genres || [],
        budget: enrichedMovie.budget ? Number(enrichedMovie.budget) : null,
        boxOffice: enrichedMovie.boxOffice ? Number(enrichedMovie.boxOffice) : null,
        matchPercent: 80,
      };

      const duration = Date.now() - startTime;
      logger.info('SEARCH_MOVIE', '✅ Movie search completed (from TMDB + Perplexity)', {
        duration: `${duration}ms`,
        source: 'tmdb_new',
      });

      return NextResponse.json({ movie: transformedMovie, source: 'tmdb_new' });
    }

    return NextResponse.json({ error: 'Failed to process movie' }, { status: 500 });
  } catch (error: any) {
    logger.error('SEARCH_MOVIE', '❌ Error searching movie', {
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

