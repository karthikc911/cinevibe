/**
 * Perplexity + GPT Movie Recommendations
 * 
 * New Architecture:
 * 1. User filter selection
 * 2. Backend creates prompt with user rating data and preferences
 * 3. Perplexity Sonar API → returns real-time movie data (poster, rating, metadata)
 * 4. GPT-5-nano → applies JSON schema + taste logic
 * 5. Final 10 JSON recommendations
 */

import OpenAI from "openai";
import { prisma } from "./prisma";
import { logger } from "./logger";
import { v4 as uuidv4 } from "uuid";

// Initialize OpenAI client for GPT
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Perplexity API client
const perplexity = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: "https://api.perplexity.ai",
});

const GPT_MODEL = process.env.OPENAI_MODEL || "gpt-5-nano-2025-08-07";
const PERPLEXITY_MODEL = "sonar-pro"; // sonar, sonar-pro, or sonar-reasoning
const MIN_RATINGS_FOR_AI = 3;

interface GPTMovieRecommendation {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  year: number;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  language: string;
  genres: string[];
  runtime: number | null;
  tagline: string | null;
  imdbRating: number | null;
  rtRating: number | null;
  reason: string;
  matchPercentage: number;
}

export interface RecommendationFilters {
  count?: number;
  yearFrom?: number;
  yearTo?: number;
  genres?: string[];
  languages?: string[];
  minImdbRating?: number;
  minBoxOffice?: number;
  maxBudget?: number;
}

/**
 * Generate a deterministic ID from movie title and year
 */
function generateMovieId(title: string, year: number): number {
  const str = `${title.toLowerCase().trim()}-${year}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash | 0;
  }
  const absHash = Math.abs(hash);
  return (absHash % 1900000000) + 100000000;
}

/**
 * Store movie in database
 */
async function storeMovieInDB(movie: GPTMovieRecommendation): Promise<number> {
  try {
    const movieData = {
      id: movie.id,
      title: movie.title,
      originalTitle: movie.originalTitle || movie.title,
      overview: movie.overview,
      posterPath: movie.posterPath,
      backdropPath: movie.backdropPath,
      releaseDate: movie.releaseDate,
      year: movie.year,
      voteAverage: movie.voteAverage,
      voteCount: movie.voteCount,
      popularity: movie.popularity,
      language: movie.language,
      genres: movie.genres,
      runtime: movie.runtime,
      tagline: movie.tagline,
      imdbRating: movie.imdbRating,
      rtRating: movie.rtRating,
    };

    const storedMovie = await prisma.movie.upsert({
      where: { id: movie.id },
      update: movieData,
      create: movieData,
    });

    logger.dbOperation("UPSERT", "Movie", `ID: ${storedMovie.id}, Title: ${storedMovie.title}`);
    return storedMovie.id;
  } catch (error) {
    logger.error("PERPLEXITY_RECS", `Failed to store movie: ${movie.title}`, error);
    throw error;
  }
}

/**
 * STEP 1: Use Perplexity Sonar to search for real-time movie data
 */
async function searchMoviesWithPerplexity(
  userRatingProfile: string,
  filters: RecommendationFilters,
  languageDescriptions: string
): Promise<string> {
  logger.info("PERPLEXITY_RECS", "📡 Step 1: Calling Perplexity Sonar for real-time movie search...");

  const currentYear = new Date().getFullYear();
  const recommendationCount = filters.count || 10;
  const yearFrom = filters.yearFrom || (currentYear - 2);
  const yearTo = filters.yearTo || currentYear;

  // Build search query for Perplexity
  let searchQuery = `Find ${recommendationCount} movie recommendations for someone who:

${userRatingProfile}

SEARCH CRITERIA:
- Release year: ${yearFrom} to ${yearTo}
- Languages/Cinema: ${languageDescriptions}`;

  if (filters.genres && filters.genres.length > 0) {
    searchQuery += `\n- Preferred genres: ${filters.genres.join(", ")}`;
  }

  if (filters.minImdbRating) {
    searchQuery += `\n- Minimum IMDb rating: ${filters.minImdbRating}/10`;
  }

  if (filters.minBoxOffice) {
    searchQuery += `\n- Minimum box office: $${filters.minBoxOffice}M worldwide`;
  }

  if (filters.maxBudget) {
    searchQuery += `\n- Maximum budget: $${filters.maxBudget}M`;
  }

  searchQuery += `

For each movie, provide:
1. Title (original and English if different)
2. Release year
3. IMDb rating and vote count
4. Rotten Tomatoes score (if available)
5. Runtime
6. Languages
7. Genres
8. Plot summary (2-3 sentences)
9. Poster URL (from TMDB or IMDb)
10. Box office performance
11. Why this movie would suit the user

Use current, up-to-date movie information from ${yearFrom}-${yearTo}.`;

  logger.info("PERPLEXITY_RECS", "=== PERPLEXITY SEARCH QUERY ===");
  logger.info("PERPLEXITY_RECS", searchQuery);

  const startTime = Date.now();
  let response;

  try {
    response = await perplexity.chat.completions.create({
      model: PERPLEXITY_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a movie search expert with access to real-time movie databases. Provide accurate, current movie information with detailed metadata.",
        },
        {
          role: "user",
          content: searchQuery,
        },
      ],
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error("PERPLEXITY_RECS", "❌ Perplexity API call failed");
    logger.error("PERPLEXITY_RECS", `Duration before failure: ${duration}ms`);
    logger.error("PERPLEXITY_RECS", `Error: ${error.message}`);
    throw new Error(`Perplexity search failed: ${error.message}`);
  }

  const duration = Date.now() - startTime;
  const movieData = response.choices[0].message.content || "";

  logger.info("PERPLEXITY_RECS", "✅ Perplexity search completed");
  logger.info("PERPLEXITY_RECS", `Duration: ${duration}ms`);
  logger.info("PERPLEXITY_RECS", `Model used: ${response.model}`);
  logger.info("PERPLEXITY_RECS", `Response length: ${movieData.length} characters`);
  
  if (response.usage) {
    logger.info("PERPLEXITY_RECS", `Tokens: ${response.usage.total_tokens} (${response.usage.prompt_tokens} prompt, ${response.usage.completion_tokens} completion)`);
  }

  logger.info("PERPLEXITY_RECS", "=== PERPLEXITY RESPONSE ===");
  logger.info("PERPLEXITY_RECS", movieData);

  return movieData;
}

/**
 * STEP 2: Use GPT to apply JSON schema and taste logic
 */
async function refineWithGPT(
  perplexityData: string,
  userRatingProfile: string,
  filters: RecommendationFilters,
  languageDescriptions: string
): Promise<GPTMovieRecommendation[]> {
  logger.info("PERPLEXITY_RECS", "🤖 Step 2: Calling GPT-5-nano to apply taste logic and JSON schema...");

  const recommendationCount = filters.count || 10;

  const systemPrompt = `You are CineMate's taste analysis expert. You receive raw movie data and apply personalized taste logic.

Your task: Transform the movie data into EXACTLY ${recommendationCount} structured JSON recommendations.

CRITICAL INSTRUCTIONS:
1. Return EXACTLY ${recommendationCount} recommendations
2. Apply the user's taste profile (loved movies, disliked movies)
3. Prioritize movies similar to their AMAZING and GOOD ratings
4. AVOID movies similar to their AWFUL ratings
5. Ensure all data is accurate and complete
6. Generate proper TMDB poster paths in format: "/abc123xyz.jpg"
7. Generate unique IDs using hash(title + year)

Language codes:
- English: "en", Hindi: "hi", Tamil: "ta", Telugu: "te"
- Kannada: "kn", Malayalam: "ml", Korean: "ko", Japanese: "ja", Italian: "it"

Return ONLY valid JSON with this EXACT schema:
{
  "recommendations": [
    {
      "id": 123456789,
      "title": "Movie Title",
      "originalTitle": "Original Title (if different)",
      "overview": "Compelling 2-3 sentence plot summary",
      "posterPath": "/actual_tmdb_poster.jpg",
      "backdropPath": "/actual_tmdb_backdrop.jpg",
      "releaseDate": "YYYY-MM-DD",
      "year": 2023,
      "voteAverage": 8.2,
      "voteCount": 15000,
      "popularity": 85.5,
      "language": "en",
      "genres": ["Drama", "Thriller"],
      "runtime": 142,
      "tagline": "Movie tagline",
      "imdbRating": 8.1,
      "rtRating": 92,
      "reason": "Specific reason based on their ratings and taste",
      "matchPercentage": 94
    }
  ]
}`;

  const userPrompt = `RAW MOVIE DATA FROM PERPLEXITY:
${perplexityData}

USER'S TASTE PROFILE:
${userRatingProfile}

Preferred Languages: ${languageDescriptions}

Transform the Perplexity movie data into EXACTLY ${recommendationCount} JSON recommendations.
Apply the user's taste preferences and ensure all fields are complete and accurate.
Return ONLY valid JSON (no explanations).`;

  logger.info("PERPLEXITY_RECS", "=== GPT SYSTEM PROMPT ===");
  logger.info("PERPLEXITY_RECS", systemPrompt);
  logger.info("PERPLEXITY_RECS", "=== GPT USER PROMPT ===");
  logger.info("PERPLEXITY_RECS", userPrompt);

  const startTime = Date.now();
  let response;

  try {
    response = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 50000,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error("PERPLEXITY_RECS", "❌ GPT API call failed");
    logger.error("PERPLEXITY_RECS", `Duration before failure: ${duration}ms`);
    logger.error("PERPLEXITY_RECS", `Error: ${error.message}`);
    throw error;
  }

  const duration = Date.now() - startTime;
  const responseContent = response.choices[0].message.content || '{"recommendations": []}';

  logger.info("PERPLEXITY_RECS", "✅ GPT refinement completed");
  logger.info("PERPLEXITY_RECS", `Duration: ${duration}ms`);
  logger.info("PERPLEXITY_RECS", `Model used: ${response.model}`);
  logger.info("PERPLEXITY_RECS", `Response length: ${responseContent.length} characters`);
  
  if (response.usage) {
    logger.info("PERPLEXITY_RECS", `Tokens: ${response.usage.total_tokens} (${response.usage.prompt_tokens} prompt, ${response.usage.completion_tokens} completion)`);
  }

  logger.info("PERPLEXITY_RECS", "=== GPT RESPONSE ===");
  logger.info("PERPLEXITY_RECS", responseContent);

  const result = JSON.parse(responseContent);
  return result.recommendations || [];
}

/**
 * Main function: Generate recommendations using Perplexity → GPT pipeline
 */
export async function generateRecommendationsWithPerplexity(
  userId: string,
  filters: RecommendationFilters = {}
) {
  logger.info("PERPLEXITY_RECS", "🚀 Starting Perplexity → GPT recommendation pipeline");
  logger.info("PERPLEXITY_RECS", `User ID: ${userId}`);
  logger.info("PERPLEXITY_RECS", `Filters: ${JSON.stringify(filters)}`);

  // 1. Fetch user's ratings and profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      ratings: {
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.ratings.length < MIN_RATINGS_FOR_AI) {
    throw new Error(
      `Please rate at least ${MIN_RATINGS_FOR_AI} movies to get personalized recommendations.`
    );
  }

  // 2. Build user rating profile
  const amazingMovies = user.ratings
    .filter((r) => r.rating === "amazing")
    .map((r) => `${r.movieTitle} (${r.movieYear || ""})`);

  const goodMovies = user.ratings
    .filter((r) => r.rating === "good")
    .map((r) => `${r.movieTitle} (${r.movieYear || ""})`);

  const awfulMovies = user.ratings
    .filter((r) => r.rating === "awful")
    .map((r) => `${r.movieTitle} (${r.movieYear || ""})`);

  const notSeenMovies = user.ratings
    .filter((r) => r.rating === "not-seen")
    .map((r) => `${r.movieTitle} (${r.movieYear || ""})`);

  logger.info("PERPLEXITY_RECS", `User ratings: ${amazingMovies.length} amazing, ${goodMovies.length} good, ${awfulMovies.length} awful, ${notSeenMovies.length} not-seen`);

  const userRatingProfile = `
🤩 MOVIES THEY LOVED (Amazing):
${amazingMovies.slice(0, 20).join("\n") || "None yet"}

👍 MOVIES THEY ENJOYED (Good):
${goodMovies.slice(0, 20).join("\n") || "None yet"}

👎 MOVIES THEY DISLIKED (Awful - AVOID similar):
${awfulMovies.slice(0, 10).join("\n") || "None yet"}

👀 MOVIES THEY'RE AWARE OF (Not Seen):
${notSeenMovies.slice(0, 10).join("\n") || "None yet"}
`;

  // Language preferences
  const selectedLanguages = filters.languages && filters.languages.length > 0
    ? filters.languages
    : user.languages;

  const languageDescriptions = selectedLanguages.map(lang => {
    const langMap: Record<string, string> = {
      'English': 'Hollywood/English',
      'Hindi': 'Bollywood/Hindi',
      'Tamil': 'Kollywood/Tamil',
      'Telugu': 'Tollywood/Telugu',
      'Kannada': 'Sandalwood/Kannada',
      'Malayalam': 'Mollywood/Malayalam',
      'Korean': 'Korean Cinema',
      'Japanese': 'Japanese Cinema',
      'Italian': 'Italian Cinema',
    };
    return langMap[lang] || lang;
  }).join(", ");

  // STEP 1: Search with Perplexity
  const perplexityData = await searchMoviesWithPerplexity(
    userRatingProfile,
    filters,
    languageDescriptions
  );

  // STEP 2: Refine with GPT
  const recommendations = await refineWithGPT(
    perplexityData,
    userRatingProfile,
    filters,
    languageDescriptions
  );

  logger.info("PERPLEXITY_RECS", `✅ Pipeline completed: ${recommendations.length} recommendations generated`);

  if (recommendations.length === 0) {
    throw new Error("Failed to generate recommendations");
  }

  // 3. Generate batch ID
  const batchId = uuidv4();

  // 4. Store movies and create recommendation records
  let successCount = 0;
  let failCount = 0;
  const storedRecommendations: Array<{ movieId: number; position: number }> = [];

  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i];
    
    try {
      // Generate ID if not provided
      if (!rec.id) {
        rec.id = generateMovieId(rec.title, rec.year);
      }

      // Store movie in database
      await storeMovieInDB(rec);

      // Create recommendation record
      await prisma.userRecommendation.create({
        data: {
          userId,
          movieId: rec.id,
          batchId,
          position: i + 1,
          reason: rec.reason,
          matchPercentage: rec.matchPercentage,
          shown: false,
          rated: false,
        },
      });

      storedRecommendations.push({ movieId: rec.id, position: i + 1 });
      successCount++;
    } catch (error) {
      logger.error("PERPLEXITY_RECS", `Failed to store recommendation: ${rec.title}`, error);
      failCount++;
    }
  }

  logger.info("PERPLEXITY_RECS", `📊 Final results: ${successCount} stored, ${failCount} failed`);

  return {
    success: true,
    batchId,
    totalRequested: recommendations.length,
    successfullyStored: successCount,
    failed: failCount,
    recommendations: storedRecommendations,
  };
}

// Re-export helper functions from the original module
export {
  getNextRecommendations,
  markRecommendationRated,
  getRecommendationStatus,
} from "./bulk-recommendations-gpt";

