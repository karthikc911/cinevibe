import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { formatPosterUrl } from '@/lib/poster-utils';

// Initialize Perplexity API client
const perplexity = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: "https://api.perplexity.ai",
});

const PERPLEXITY_MODEL = "sonar-pro"; // sonar, sonar-pro, or sonar-reasoning

interface SearchFilters {
  query: string;
  languages?: string[];
  genres?: string[];
  yearRange?: [number, number];
  minRating?: number;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SearchFilters = await request.json();
    const { query, languages, genres, yearRange, minRating } = body;

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    logger.info('AI_SEARCH_PERPLEXITY', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('AI_SEARCH_PERPLEXITY', '🔍 NEW SEARCH REQUEST');
    logger.info('AI_SEARCH_PERPLEXITY', `User: ${session.user.email}`);
    logger.info('AI_SEARCH_PERPLEXITY', `Query: "${query}"`);
    logger.info('AI_SEARCH_PERPLEXITY', `Timestamp: ${new Date().toISOString()}`);

    // Build comprehensive search query for Perplexity
    let perplexitySearchQuery = `Search for movies matching this description: "${query}"

Please provide a list of movies with the following information for each:
1. Title (original and English if different)
2. Release year
3. IMDb rating (out of 10)
4. Rotten Tomatoes score (if available)
5. Genre(s)
6. Language
7. Plot summary (2-3 sentences)
8. TMDB poster path (format: /xyz123.jpg)
9. Why this movie matches the search query

FILTER REQUIREMENTS:`;

    if (languages && languages.length > 0) {
      perplexitySearchQuery += `\n- Languages: ${languages.join(', ')}`;
    }
    
    if (genres && genres.length > 0) {
      perplexitySearchQuery += `\n- Genres: ${genres.join(', ')}`;
    }
    
    if (yearRange) {
      perplexitySearchQuery += `\n- Year range: ${yearRange[0]} to ${yearRange[1]}`;
    }
    
    if (minRating && minRating > 0) {
      perplexitySearchQuery += `\n- Minimum IMDb rating: ${minRating}/10`;
    }

    perplexitySearchQuery += `\n\nProvide 10-20 movies that match these criteria. Focus on movies that are well-known and have accurate metadata.`;

    logger.info('AI_SEARCH_PERPLEXITY', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('AI_SEARCH_PERPLEXITY', '📤 PERPLEXITY API REQUEST');
    logger.info('AI_SEARCH_PERPLEXITY', `Model: ${PERPLEXITY_MODEL}`);
    logger.info('AI_SEARCH_PERPLEXITY', '');
    logger.info('AI_SEARCH_PERPLEXITY', '=== RAW SYSTEM PROMPT ===');
    logger.info('AI_SEARCH_PERPLEXITY', 'You are a movie database expert with access to real-time movie information. Provide accurate, detailed movie data including titles, ratings, genres, and metadata.');
    logger.info('AI_SEARCH_PERPLEXITY', '');
    logger.info('AI_SEARCH_PERPLEXITY', '=== RAW USER PROMPT ===');
    logger.info('AI_SEARCH_PERPLEXITY', perplexitySearchQuery);
    logger.info('AI_SEARCH_PERPLEXITY', '');
    logger.info('AI_SEARCH_PERPLEXITY', `Prompt length: ${perplexitySearchQuery.length} characters`);

    const startTime = Date.now();
    
    // Call Perplexity API
    logger.info('AI_SEARCH_PERPLEXITY', '⏳ Calling Perplexity Sonar API...');
    
    let perplexityResponse;
    try {
      perplexityResponse = await perplexity.chat.completions.create({
        model: PERPLEXITY_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a movie database expert with access to real-time movie information. Provide accurate, detailed movie data including titles, ratings, genres, and metadata.',
          },
          {
            role: 'user',
            content: perplexitySearchQuery,
          },
        ],
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('AI_SEARCH_PERPLEXITY', '❌ PERPLEXITY API ERROR');
      logger.error('AI_SEARCH_PERPLEXITY', `Duration before failure: ${duration}ms`);
      logger.error('AI_SEARCH_PERPLEXITY', `Error type: ${error.name || 'Unknown'}`);
      logger.error('AI_SEARCH_PERPLEXITY', `Error message: ${error.message}`);
      if (error.response) {
        logger.error('AI_SEARCH_PERPLEXITY', `Response status: ${error.response.status}`);
        logger.error('AI_SEARCH_PERPLEXITY', `Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }

    const duration = Date.now() - startTime;
    const movieDataText = perplexityResponse.choices[0].message.content || '';

    logger.info('AI_SEARCH_PERPLEXITY', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('AI_SEARCH_PERPLEXITY', '📥 PERPLEXITY API RESPONSE');
    logger.info('AI_SEARCH_PERPLEXITY', `✅ Success!`);
    logger.info('AI_SEARCH_PERPLEXITY', `Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    logger.info('AI_SEARCH_PERPLEXITY', `Model used: ${perplexityResponse.model}`);
    logger.info('AI_SEARCH_PERPLEXITY', `Finish reason: ${perplexityResponse.choices[0].finish_reason}`);
    
    if (perplexityResponse.usage) {
      logger.info('AI_SEARCH_PERPLEXITY', '');
      logger.info('AI_SEARCH_PERPLEXITY', '=== TOKEN USAGE ===');
      logger.info('AI_SEARCH_PERPLEXITY', `Prompt tokens: ${perplexityResponse.usage.prompt_tokens}`);
      logger.info('AI_SEARCH_PERPLEXITY', `Completion tokens: ${perplexityResponse.usage.completion_tokens}`);
      logger.info('AI_SEARCH_PERPLEXITY', `Total tokens: ${perplexityResponse.usage.total_tokens}`);
    }
    
    logger.info('AI_SEARCH_PERPLEXITY', '');
    logger.info('AI_SEARCH_PERPLEXITY', `Response length: ${movieDataText.length} characters`);
    logger.info('AI_SEARCH_PERPLEXITY', '');
    logger.info('AI_SEARCH_PERPLEXITY', '=== COMPLETE RAW OUTPUT ===');
    logger.info('AI_SEARCH_PERPLEXITY', movieDataText);
    logger.info('AI_SEARCH_PERPLEXITY', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Step 2: Parse movie titles from Perplexity response
    logger.info('AI_SEARCH_PERPLEXITY', '');
    logger.info('AI_SEARCH_PERPLEXITY', '🔍 PARSING RESPONSE FOR MOVIE TITLES...');
    
    // Extract movie titles using regex patterns
    // Common patterns: "Title (Year)", "Title - Year", "1. Title", etc.
    const titlePatterns = [
      /\d+\.\s+\*?\*?([A-Z][^(\n]*?)\*?\*?\s+\((\d{4})\)/g,  // "1. Title (2023)"
      /\d+\.\s+\*?\*?([A-Z][^(\n]*?)\*?\*?\s+-\s+(\d{4})/g,  // "1. Title - 2023"
      /\*\*([A-Z][^*]+)\*\*\s+\((\d{4})\)/g,                 // "**Title** (2023)"
      /^([A-Z][^\n(]{2,50})\s+\((\d{4})\)/gm,                // "Title (2023)" at line start
    ];

    const extractedTitles: Set<string> = new Set();
    for (const pattern of titlePatterns) {
      let match;
      while ((match = pattern.exec(movieDataText)) !== null) {
        const title = match[1].trim().replace(/\*\*/g, '');
        if (title.length > 2) {
          extractedTitles.add(title);
        }
      }
    }

    logger.info('AI_SEARCH_PERPLEXITY', `Extracted ${extractedTitles.size} potential movie titles`);
    logger.info('AI_SEARCH_PERPLEXITY', `Titles: ${Array.from(extractedTitles).join(', ')}`);

    // Step 3: Query database for movies matching extracted titles or original query
    logger.info('AI_SEARCH_PERPLEXITY', '');
    logger.info('AI_SEARCH_PERPLEXITY', '💾 QUERYING DATABASE...');
    
    const whereConditions: any = {};
    
    // Build OR conditions for all extracted titles + original query
    const searchTerms = Array.from(extractedTitles);
    searchTerms.push(...query.split(' ').filter(word => word.length > 3)); // Add significant words from query
    
    if (searchTerms.length > 0) {
      whereConditions.OR = [
        ...searchTerms.map((term: string) => ({
          title: { contains: term, mode: 'insensitive' as const },
        })),
        ...searchTerms.slice(0, 10).map((term: string) => ({
          overview: { contains: term, mode: 'insensitive' as const },
        })),
      ];
    }

    // Apply additional filters
    if (genres && genres.length > 0) {
      whereConditions.genres = { hasSome: genres };
    }

    if (yearRange) {
      whereConditions.year = {
        gte: yearRange[0],
        lte: yearRange[1],
      };
    }

    if (minRating && minRating > 0) {
      whereConditions.voteAverage = { gte: minRating };
    }

    if (languages && languages.length > 0) {
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
      const codes = languages.map(lang => languageMap[lang]).filter(Boolean);
      if (codes.length > 0) {
        whereConditions.language = { in: codes };
      }
    }

    logger.info('AI_SEARCH_PERPLEXITY', `Database query conditions: ${JSON.stringify(whereConditions, null, 2)}`);

    const movies = await prisma.movie.findMany({
      where: Object.keys(whereConditions).length > 0 ? whereConditions : undefined,
      orderBy: [
        { voteAverage: 'desc' },
        { voteCount: 'desc' },
      ],
      take: 50,
    });

    logger.info('AI_SEARCH_PERPLEXITY', `✅ Found ${movies.length} movies in database`);

    // Step 4: Transform to Movie format
    logger.info('AI_SEARCH_PERPLEXITY', '');
    logger.info('AI_SEARCH_PERPLEXITY', '🎬 FORMATTING RESULTS...');
    
    const transformedMovies = movies.map(movie => ({
      id: movie.id,
      title: movie.title,
      poster: formatPosterUrl(movie.posterPath) || '/placeholder-movie.jpg',
      imdb: movie.imdbRating || movie.voteAverage,
      rt: movie.rtRating,
      summary: movie.overview,
      category: movie.genres?.[0] || 'Unknown',
      year: movie.year,
      langs: [movie.language],
      genres: movie.genres || [],
      match: Math.round(((movie.voteAverage || 0) / 10) * 100),
      ottIcon: null,
    }));

    logger.info('AI_SEARCH_PERPLEXITY', `✅ Transformed ${transformedMovies.length} movies for response`);
    logger.info('AI_SEARCH_PERPLEXITY', '');
    logger.info('AI_SEARCH_PERPLEXITY', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('AI_SEARCH_PERPLEXITY', '✅ SEARCH COMPLETE');
    logger.info('AI_SEARCH_PERPLEXITY', `Total results: ${transformedMovies.length} movies`);
    logger.info('AI_SEARCH_PERPLEXITY', `Total duration: ${Date.now() - startTime}ms`);
    logger.info('AI_SEARCH_PERPLEXITY', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return NextResponse.json({
      success: true,
      movies: transformedMovies,
      perplexityResponse: movieDataText, // Include full Perplexity response
      extractedTitles: Array.from(extractedTitles),
      searchInfo: {
        query,
        filters: { languages, genres, yearRange, minRating },
        moviesFound: transformedMovies.length,
        duration: `${duration}ms`,
      },
    });

  } catch (error) {
    logger.error('AI_SEARCH_PERPLEXITY', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.error('AI_SEARCH_PERPLEXITY', '❌ SEARCH FAILED');
    logger.error('AI_SEARCH_PERPLEXITY', 'Error details:', error);
    logger.error('AI_SEARCH_PERPLEXITY', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return NextResponse.json(
      { 
        error: 'Failed to perform AI search with Perplexity', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

