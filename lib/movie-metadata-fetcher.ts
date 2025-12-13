import OpenAI from 'openai';
import { prisma } from './prisma';
import { logger } from './logger';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_MODEL = 'sonar-pro';

interface MovieMetadata {
  imdb: {
    rating: number | null;
    rating_count: number | null;
    genres: string[];
    user_reviews_ai_summary: string | null;
  };
  financials: {
    budget: number | null;
    box_office_worldwide: number | null;
  };
}

/**
 * Fetch movie metadata from Perplexity API
 * Returns IMDB rating, voter count, genres, user review summary, budget, and box office
 */
export async function fetchMovieMetadata(
  movieTitle: string,
  movieYear?: number | null
): Promise<MovieMetadata | null> {
  if (!PERPLEXITY_API_KEY) {
    logger.error('MOVIE_METADATA', 'Perplexity API key not configured');
    return null;
  }

  try {
    const perplexity = new OpenAI({
      apiKey: PERPLEXITY_API_KEY,
      baseURL: 'https://api.perplexity.ai',
    });

    const movieQuery = movieYear ? `${movieTitle} (${movieYear})` : movieTitle;

    const prompt = `Retrieve authoritative information for the movie ${movieQuery} ONLY from IMDB.

What to extract:
1. IMDB rating (decimal number, e.g., 8.1)
2. IMDB rating count (total number of votes)
3. AI-generated summary of IMDB user reviews (2 lines, capturing overall sentiment and key themes)
4. Genre list (all genres assigned by IMDB)
5. Production budget (in USD)
6. Worldwide box office collection (in USD)

RULES:
- All values must be real and grounded in IMDB or other authoritative financial sources (Box Office Mojo, Wikipedia, The Numbers).
- If a value cannot be confirmed through browsing, return null.
- Do NOT include Rotten Tomatoes.
- Do NOT hallucinate or estimate.
- For budget and box office, return raw numbers without currency symbols or formatting.

RETURN STRICT JSON IN THIS EXACT FORMAT:
{
  "imdb": {
    "rating": number or null,
    "rating_count": number or null,
    "genres": ["Genre1", "Genre2"],
    "user_reviews_ai_summary": "2-line summary based on IMDB user review sentiment"
  },
  "financials": {
    "budget": number or null,
    "box_office_worldwide": number or null
  }
}

REQUIREMENTS:
- Output ONLY valid JSON.
- No commentary, no extra text.
- Keep summaries factual and based strictly on IMDB user review sentiment.`;

    logger.info('MOVIE_METADATA', '📤 Fetching movie metadata from Perplexity', {
      movieTitle,
      movieYear,
      promptLength: prompt.length,
    });

    const startTime = Date.now();
    const response = await perplexity.chat.completions.create({
      model: PERPLEXITY_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a precise fact-retrieval assistant that returns only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const duration = Date.now() - startTime;
    const rawResponse = response.choices[0]?.message?.content || '';

    logger.info('MOVIE_METADATA', '📥 Perplexity API Response', {
      duration: `${duration}ms`,
      responseLength: rawResponse.length,
      responsePreview: rawResponse.substring(0, 200),
    });

    // Parse JSON response
    try {
      // Extract JSON from markdown code blocks if present
      let jsonStr = rawResponse.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '');
      }

      const metadata: MovieMetadata = JSON.parse(jsonStr);

      logger.info('MOVIE_METADATA', '✅ Successfully parsed movie metadata', {
        movieTitle,
        imdbRating: metadata.imdb.rating,
        imdbVoterCount: metadata.imdb.rating_count,
        genresCount: metadata.imdb.genres.length,
        hasBudget: !!metadata.financials.budget,
        hasBoxOffice: !!metadata.financials.box_office_worldwide,
      });

      return metadata;
    } catch (parseError: any) {
      logger.error('MOVIE_METADATA', 'Failed to parse JSON response', {
        error: parseError.message,
        rawResponse: rawResponse.substring(0, 500),
      });
      return null;
    }
  } catch (error: any) {
    logger.error('MOVIE_METADATA', 'Error fetching movie metadata', {
      error: error.message,
      stack: error.stack,
    });
    return null;
  }
}

/**
 * Enrich movie in database with metadata from Perplexity if missing
 * Returns the enriched movie data
 */
export async function enrichMovieWithMetadata(movieId: number, movieTitle: string, movieYear?: number | null) {
  try {
    // Check if movie already has complete metadata
    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      select: {
        imdbRating: true,
        imdbVoterCount: true,
        userReviewSummary: true,
        genres: true,
        budget: true,
        boxOffice: true,
      },
    });

    if (!movie) {
      logger.warn('MOVIE_METADATA', 'Movie not found in database', { movieId, movieTitle });
      return null;
    }

    // Check if we need to fetch metadata
    const needsMetadata =
      !movie.imdbRating ||
      !movie.imdbVoterCount ||
      !movie.userReviewSummary ||
      !movie.genres ||
      movie.genres.length === 0;

    if (!needsMetadata) {
      logger.info('MOVIE_METADATA', 'Movie already has complete metadata', { movieId, movieTitle });
      return movie;
    }

    logger.info('MOVIE_METADATA', '🔄 Fetching missing metadata for movie', { movieId, movieTitle });

    // Fetch metadata from Perplexity
    const metadata = await fetchMovieMetadata(movieTitle, movieYear);

    if (!metadata) {
      logger.warn('MOVIE_METADATA', 'Failed to fetch metadata from Perplexity', { movieId, movieTitle });
      return movie;
    }

    // Update movie in database
    const updateData: any = {};

    if (metadata.imdb.rating && !movie.imdbRating) {
      updateData.imdbRating = metadata.imdb.rating;
    }

    if (metadata.imdb.rating_count && !movie.imdbVoterCount) {
      updateData.imdbVoterCount = metadata.imdb.rating_count;
    }

    if (metadata.imdb.user_reviews_ai_summary && !movie.userReviewSummary) {
      updateData.userReviewSummary = metadata.imdb.user_reviews_ai_summary;
    }

    if (metadata.imdb.genres && metadata.imdb.genres.length > 0 && (!movie.genres || movie.genres.length === 0)) {
      updateData.genres = metadata.imdb.genres;
    }

    if (metadata.financials.budget && !movie.budget) {
      updateData.budget = BigInt(metadata.financials.budget);
    }

    if (metadata.financials.box_office_worldwide && !movie.boxOffice) {
      updateData.boxOffice = BigInt(metadata.financials.box_office_worldwide);
    }

    if (Object.keys(updateData).length > 0) {
      const updatedMovie = await prisma.movie.update({
        where: { id: movieId },
        data: updateData,
      });

      logger.info('MOVIE_METADATA', '✅ Successfully enriched movie with metadata', {
        movieId,
        movieTitle,
        updatedFields: Object.keys(updateData),
      });

      return updatedMovie;
    }

    return movie;
  } catch (error: any) {
    logger.error('MOVIE_METADATA', 'Error enriching movie with metadata', {
      error: error.message,
      movieId,
      movieTitle,
    });
    return null;
  }
}

/**
 * Fetch TV show metadata from Perplexity API
 * Returns IMDB rating, voter count, genres, user review summary
 */
export async function fetchTvShowMetadata(
  tvShowName: string,
  tvShowYear?: number | null
): Promise<MovieMetadata | null> {
  if (!PERPLEXITY_API_KEY) {
    logger.error('TV_SHOW_METADATA', 'Perplexity API key not configured');
    return null;
  }

  try {
    const perplexity = new OpenAI({
      apiKey: PERPLEXITY_API_KEY,
      baseURL: 'https://api.perplexity.ai',
    });

    const tvShowQuery = tvShowYear ? `${tvShowName} (${tvShowYear})` : tvShowName;

    const prompt = `Retrieve authoritative information for the TV show ${tvShowQuery} ONLY from IMDB.

What to extract:
1. IMDB rating (decimal number, e.g., 8.9)
2. IMDB rating count (total number of votes)
3. AI-generated summary of IMDB user reviews (2 lines, capturing overall sentiment and key themes)
4. Genre list (all genres assigned by IMDB)

RULES:
- All values must be real and grounded in IMDB or other authoritative sources.
- If a value cannot be confirmed through browsing, return null.
- Do NOT include Rotten Tomatoes.
- Do NOT hallucinate or estimate.

RETURN STRICT JSON IN THIS EXACT FORMAT:
{
  "imdb": {
    "rating": number or null,
    "rating_count": number or null,
    "genres": ["Genre1", "Genre2"],
    "user_reviews_ai_summary": "2-line summary based on IMDB user review sentiment"
  },
  "financials": {
    "budget": null,
    "box_office_worldwide": null
  }
}

REQUIREMENTS:
- Output ONLY valid JSON.
- No commentary, no extra text.
- Keep summaries factual and based strictly on IMDB user review sentiment.`;

    logger.info('TV_SHOW_METADATA', '📤 Fetching TV show metadata from Perplexity', {
      tvShowName,
      tvShowYear,
      promptLength: prompt.length,
    });

    const startTime = Date.now();
    const response = await perplexity.chat.completions.create({
      model: PERPLEXITY_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a precise fact-retrieval assistant that returns only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const duration = Date.now() - startTime;
    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      logger.warn('TV_SHOW_METADATA', 'No response from Perplexity');
      return null;
    }

    logger.info('TV_SHOW_METADATA', '📥 Received Perplexity response', {
      duration: `${duration}ms`,
      responseLength: content.length,
    });

    // Extract JSON from response (handle markdown code blocks)
    let jsonContent = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    const metadata: MovieMetadata = JSON.parse(jsonContent);

    logger.info('TV_SHOW_METADATA', '✅ Successfully parsed metadata', {
      tvShowName,
      imdbRating: metadata.imdb.rating,
      ratingCount: metadata.imdb.rating_count,
      genres: metadata.imdb.genres,
    });

    return metadata;
  } catch (error: any) {
    logger.error('TV_SHOW_METADATA', 'Error fetching TV show metadata', {
      error: error.message,
      tvShowName,
      tvShowYear,
    });
    return null;
  }
}

/**
 * Enrich a TV show in the database with metadata from Perplexity
 */
export async function enrichTvShowWithMetadata(
  tvShowId: number,
  tvShowName: string,
  tvShowYear?: number | null
) {
  try {
    logger.info('TV_SHOW_METADATA', '🔄 Starting TV show enrichment', {
      tvShowId,
      tvShowName,
      tvShowYear,
    });

    // Fetch TV show from database
    const tvShow = await prisma.tvShow.findUnique({
      where: { id: tvShowId },
    });

    if (!tvShow) {
      logger.warn('TV_SHOW_METADATA', 'TV show not found in database', { tvShowId });
      return null;
    }

    // Fetch metadata from Perplexity
    const metadata = await fetchTvShowMetadata(tvShowName, tvShowYear);

    if (!metadata) {
      logger.warn('TV_SHOW_METADATA', 'No metadata received from Perplexity', {
        tvShowId,
        tvShowName,
      });
      return tvShow;
    }

    // Prepare update data (only update if fields are missing)
    const updateData: any = {};

    if (metadata.imdb.rating && !tvShow.imdbRating) {
      updateData.imdbRating = metadata.imdb.rating;
    }

    if (metadata.imdb.rating_count && !tvShow.imdbVoterCount) {
      updateData.imdbVoterCount = metadata.imdb.rating_count;
    }

    if (metadata.imdb.user_reviews_ai_summary && !tvShow.userReviewSummary) {
      updateData.userReviewSummary = metadata.imdb.user_reviews_ai_summary;
    }

    if (metadata.imdb.genres && metadata.imdb.genres.length > 0 && (!tvShow.genres || tvShow.genres.length === 0)) {
      updateData.genres = metadata.imdb.genres;
    }

    if (Object.keys(updateData).length > 0) {
      const updatedTvShow = await prisma.tvShow.update({
        where: { id: tvShowId },
        data: updateData,
      });

      logger.info('TV_SHOW_METADATA', '✅ Successfully enriched TV show with metadata', {
        tvShowId,
        tvShowName,
        updatedFields: Object.keys(updateData),
      });

      return updatedTvShow;
    }

    return tvShow;
  } catch (error: any) {
    logger.error('TV_SHOW_METADATA', 'Error enriching TV show with metadata', {
      error: error.message,
      tvShowId,
      tvShowName,
    });
    return null;
  }
}

