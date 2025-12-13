/**
 * GPT-Powered Bulk Movie Recommendations
 * 
 * This module generates 50 personalized movie recommendations using ONLY GPT-4.
 * GPT provides complete movie data in the database schema format.
 * No TMDB dependency - all movie data comes from GPT's knowledge.
 */

import OpenAI from "openai";
import { prisma } from "./prisma";
import { logger } from "./logger";
import { v4 as uuidv4 } from "uuid";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const GPT_MODEL = process.env.OPENAI_MODEL || "gpt-5-nano-2025-08-07";
const MIN_RATINGS_FOR_AI = 3; // Reduced from 5 to 3 for easier onboarding

interface GPTMovieRecommendation {
  // Movie data fields
  id: number; // Use IMDB tt number or hash-based ID
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
  language: string; // ISO 639-1 code
  genres: string[];
  runtime: number | null;
  tagline: string | null;
  imdbRating: number | null;
  rtRating: number | null;
  
  // Recommendation metadata
  reason: string;
  matchPercentage: number;
}

/**
 * Generate a deterministic ID from movie title and year
 * Ensures ID fits within PostgreSQL INT4 range (max: 2,147,483,647)
 */
function generateMovieId(title: string, year: number): number {
  const str = `${title.toLowerCase().trim()}-${year}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash | 0; // Force 32-bit signed integer conversion
  }
  // Ensure positive number within INT4 range
  // Max INT4: 2,147,483,647 → Safe range: 100,000,000 to 2,000,000,000
  const absHash = Math.abs(hash);
  return (absHash % 1900000000) + 100000000; // Range: 100M to 2B (fits in INT4)
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
    logger.error("BULK_RECS", `Failed to store movie: ${movie.title}`, error);
    throw error;
  }
}

export interface RecommendationFilters {
  count?: number; // Number of recommendations (default: 10)
  yearFrom?: number; // Minimum year (default: current year - 1)
  yearTo?: number; // Maximum year (default: current year)
  genres?: string[]; // Preferred genres
  languages?: string[]; // Override user's language preferences
  minImdbRating?: number; // Minimum IMDb rating (e.g., 7.0)
  minBoxOffice?: number; // Minimum box office in millions USD
  maxBudget?: number; // Maximum budget in millions USD
}

/**
 * Generate personalized movie recommendations for a user with filters
 */
export async function generate50RecommendationsGPT(
  userId: string,
  filters: RecommendationFilters = {}
) {
  // Apply default filters
  const currentYear = new Date().getFullYear();
  const recommendationCount = filters.count || 10;
  const yearFrom = filters.yearFrom || (currentYear - 2); // Default: past 2 years
  const yearTo = filters.yearTo || currentYear;
  
  logger.info("BULK_RECS", `Starting GPT-only bulk recommendation for user ${userId}`);
  logger.info("BULK_RECS", `Filters: count=${recommendationCount}, yearFrom=${yearFrom}, yearTo=${yearTo}`);
  if (filters.genres?.length) {
    logger.info("BULK_RECS", `Genres: ${filters.genres.join(", ")}`);
  }
  if (filters.minImdbRating) {
    logger.info("BULK_RECS", `Min IMDb rating: ${filters.minImdbRating}`);
  }
  if (filters.minBoxOffice) {
    logger.info("BULK_RECS", `Min box office: $${filters.minBoxOffice}M`);
  }
  if (filters.maxBudget) {
    logger.info("BULK_RECS", `Max budget: $${filters.maxBudget}M`);
  }

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

  // 2. Build categorized rating profile
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

  logger.info("BULK_RECS", `Rating breakdown: ${amazingMovies.length} amazing, ${goodMovies.length} good, ${awfulMovies.length} awful, ${notSeenMovies.length} not-seen`);

  // Use filter languages if provided, otherwise use user's language preferences
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

  // 3. Generate recommendations with GPT-5-nano using categorized ratings
  logger.info("BULK_RECS", "Calling OpenAI GPT-5-nano for complete movie recommendations...");
  logger.info("BULK_RECS", `Model: ${GPT_MODEL}`);
  logger.info("BULK_RECS", `Token limits: 64k input / 50k output`);

  // Build filter requirements string
  let filterRequirements = `
═══ FILTER REQUIREMENTS ═══

CRITICAL FILTERS (MUST FOLLOW):
1. Release Year: ${yearFrom} to ${yearTo} ONLY
   → Do NOT recommend movies outside this range
   → Focus on recent/newer releases`;

  if (filters.genres && filters.genres.length > 0) {
    filterRequirements += `
2. Genres: Prioritize these genres: ${filters.genres.join(", ")}
   → At least 70% of recommendations should be from these genres`;
  }

  if (filters.minImdbRating) {
    filterRequirements += `
3. IMDb Rating: Minimum ${filters.minImdbRating}/10
   → Only recommend movies with IMDb rating >= ${filters.minImdbRating}`;
  }

  if (filters.minBoxOffice) {
    filterRequirements += `
4. Box Office: Minimum $${filters.minBoxOffice}M USD worldwide
   → Only recommend commercially successful movies`;
  }

  if (filters.maxBudget) {
    filterRequirements += `
5. Budget: Maximum $${filters.maxBudget}M USD
   → Exclude big-budget blockbusters if specified`;
  }

  filterRequirements += `

════════════════════════════
`;

          const systemPrompt = `You are CineMate's expert movie recommender with deep knowledge of world cinema.

        CRITICAL INSTRUCTIONS:
        - You MUST generate EXACTLY ${recommendationCount} movie recommendations
        - DO NOT ask questions or request clarifications
        - If constraints seem strict, prioritize generating recommendations that best fit user's taste
        - If year range is limited, include movies from the specified range (even if fewer high-rated options exist)
        - Return ONLY valid JSON with recommendations array (no explanations, no questions)

        Your task: Recommend ${recommendationCount} diverse movies the user would love, providing COMPLETE movie data.
        ${filterRequirements}

        ═══ HOW TO USE USER RATINGS ═══

The user has provided CATEGORIZED ratings:
1. 🤩 AMAZING - Movies they absolutely loved
   → Use these as PRIMARY indicators of their taste
   → Look for similar themes, genres, directors, actors, cinematography styles
   → These are your STRONGEST signals

2. 👍 GOOD - Movies they enjoyed
   → Secondary indicators of preferences
   → Shows broader taste range
   → Use to add variety to recommendations

3. 👎 AWFUL - Movies they disliked
   → CRITICAL: AVOID recommending similar movies
   → Identify what they disliked (themes, styles, genres)
   → Use as negative filter

4. 👀 NOT SEEN - Movies they're aware of but haven't watched
   → Shows their interests and awareness level
   → Consider as potential interest indicators
   → Can help gauge their cinema knowledge

═══════════════════════════════════════════

CRITICAL REQUIREMENTS:
1. Return COMPLETE movie information for each recommendation
2. Use actual TMDB poster paths: "/abc123xyz.jpg" format (real poster URLs from your knowledge)
3. Provide accurate ratings, runtime, and metadata
4. Generate unique IDs using: hash(title + year)
5. PRIORITIZE movies from user's preferred languages/cinemas
6. Include mix of popular and hidden gems
7. Distribute across genres and eras
8. AVOID movies they've already rated (check ALL four categories)
9. Balance recommendations: mostly similar to AMAZING, diverse within user's taste range

Language codes:
- English: "en"
- Hindi: "hi" 
- Tamil: "ta"
- Telugu: "te"
- Kannada: "kn"
- Malayalam: "ml"
- Korean: "ko"
- Japanese: "ja"
- Italian: "it"

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

  const userPrompt = `IMPORTANT: Generate EXACTLY ${recommendationCount} movie recommendations.

User Profile:
Preferred Languages/Cinemas: ${languageDescriptions}

═══ USER'S MOVIE RATINGS (Categorized) ═══

🤩 AMAZING Movies (they absolutely loved these - highest priority for style/theme matching):
${amazingMovies.slice(0, 30).join("\n") || "None yet"}

👍 GOOD Movies (they enjoyed these - good indicators of taste):
${goodMovies.slice(0, 30).join("\n") || "None yet"}

👎 AWFUL Movies (they disliked these - AVOID similar themes/styles):
${awfulMovies.slice(0, 15).join("\n") || "None yet"}

👀 NOT SEEN Yet (they're aware of but haven't watched - consider as potential interest):
${notSeenMovies.slice(0, 15).join("\n") || "None yet"}

═══════════════════════════════════════════

Based on this detailed rating profile, recommend EXACTLY ${recommendationCount} movies with COMPLETE data.
Focus heavily on: ${languageDescriptions}

CRITICAL REMINDERS:
1. Generate EXACTLY ${recommendationCount} recommendations (no more, no less)
2. DO NOT ask questions or request clarifications - GENERATE RECOMMENDATIONS DIRECTLY
3. Release year should be between ${yearFrom}-${yearTo} (prioritize this range, but include movies that exist)${filters.genres?.length ? `\n4. Prioritize genres: ${filters.genres.join(", ")}` : ''}${filters.minImdbRating ? `\n5. Prefer IMDb rating >= ${filters.minImdbRating} but include quality movies if needed` : ''}
6. Prioritize movies similar to AMAZING and GOOD ratings
7. STRICTLY AVOID movies similar to AWFUL ratings
8. Consider NOT SEEN movies as indicators of user awareness/interest
9. Ensure genre, theme, and style diversity
10. Match language preferences: ${languageDescriptions}
11. Provide COMPLETE, accurate movie data for all fields
12. Return ONLY valid JSON with recommendations array (no text explanations)`;

  // Log prompts for debugging
  logger.info("BULK_RECS", "=== COMPLETE SYSTEM PROMPT ===");
  logger.info("BULK_RECS", systemPrompt);
  logger.info("BULK_RECS", "=== COMPLETE USER PROMPT ===");
  logger.info("BULK_RECS", userPrompt);
  logger.info("BULK_RECS", `Prompt lengths: System=${systemPrompt.length} chars, User=${userPrompt.length} chars`);

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
      // temperature: removed - GPT-5-nano only supports default (1)
      max_completion_tokens: 50000, // GPT-5-nano: 64k input / 50k output limits
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error("BULK_RECS", "❌ GPT API call failed");
    logger.error("BULK_RECS", `Duration before failure: ${duration}ms`);
    logger.error("BULK_RECS", `Error type: ${error.name || 'Unknown'}`);
    logger.error("BULK_RECS", `Error message: ${error.message}`);
    if (error.response) {
      logger.error("BULK_RECS", `Response status: ${error.response.status}`);
      logger.error("BULK_RECS", `Response data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }

  const duration = Date.now() - startTime;

  // Log response details
  logger.info("BULK_RECS", "=== GPT RESPONSE RECEIVED ===");
  logger.info("BULK_RECS", `Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
  logger.info("BULK_RECS", `Model used: ${response.model}`);
  logger.info("BULK_RECS", `Finish reason: ${response.choices[0].finish_reason}`);
  
  if (response.usage) {
    logger.info("BULK_RECS", "=== TOKEN USAGE ===");
    logger.info("BULK_RECS", `Prompt tokens: ${response.usage.prompt_tokens}`);
    logger.info("BULK_RECS", `Completion tokens: ${response.usage.completion_tokens}`);
    logger.info("BULK_RECS", `Total tokens: ${response.usage.total_tokens}`);
    
    // Calculate approximate cost (rough estimate for GPT-5-nano)
    const estimatedCost = (response.usage.prompt_tokens * 0.00001 + response.usage.completion_tokens * 0.00003).toFixed(4);
    logger.info("BULK_RECS", `Estimated cost: $${estimatedCost}`);
  }

  const responseContent = response.choices[0].message.content || '{"recommendations": []}';
  logger.info("BULK_RECS", `Response length: ${responseContent.length} characters`);
  logger.info("BULK_RECS", "=== COMPLETE GPT RESPONSE ===");
  logger.info("BULK_RECS", responseContent);

  const result = JSON.parse(responseContent);
  const recommendations: GPTMovieRecommendation[] = result.recommendations || [];
  
  logger.info("BULK_RECS", `✅ GPT-5-nano returned ${recommendations.length} recommendations`);

  if (recommendations.length === 0) {
    throw new Error("GPT failed to generate recommendations");
  }

  // 4. Generate batch ID for this recommendation set
  const batchId = uuidv4();

  // 5. Store movies and create recommendation records
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
      logger.error("BULK_RECS", `Failed to store recommendation: ${rec.title}`, error);
      failCount++;
    }
  }

  logger.info("BULK_RECS", `Stored ${successCount} recommendations, ${failCount} failed`);

  return {
    success: true,
    batchId,
    totalRequested: recommendations.length,
    successfullyStored: successCount,
    failed: failCount,
    recommendations: storedRecommendations,
  };
}

/**
 * Get next batch of unshown recommendations for a user
 */
export async function getNextRecommendations(userId: string, limit: number = 10) {
  // Get unshown, unrated recommendations
  const recommendations = await prisma.userRecommendation.findMany({
    where: {
      userId,
      shown: false,
      rated: false,
    },
    orderBy: [
      { batchId: 'desc' }, // Latest batch first
      { position: 'asc' },  // Original order
    ],
    take: limit,
    include: {
      user: {
        select: {
          id: true,
        },
      },
    },
  });

  // Mark as shown
  if (recommendations.length > 0) {
    await prisma.userRecommendation.updateMany({
      where: {
        id: {
          in: recommendations.map(r => r.id),
        },
      },
      data: {
        shown: true,
      },
    });
  }

  // Fetch full movie details
  const movieIds = recommendations.map(r => r.movieId);
  const movies = await prisma.movie.findMany({
    where: {
      id: {
        in: movieIds,
      },
    },
  });

  // Combine data
  return recommendations.map(rec => {
    const movie = movies.find(m => m.id === rec.movieId);
    return {
      ...movie,
      recommendationId: rec.id,
      reason: rec.reason,
      matchPercentage: rec.matchPercentage,
    };
  });
}

/**
 * Mark a recommendation as rated
 */
export async function markRecommendationRated(userId: string, movieId: number) {
  await prisma.userRecommendation.updateMany({
    where: {
      userId,
      movieId,
    },
    data: {
      rated: true,
    },
  });
}

/**
 * Get recommendation queue status for user
 */
export async function getRecommendationStatus(userId: string) {
  const total = await prisma.userRecommendation.count({
    where: { userId },
  });

  const unshown = await prisma.userRecommendation.count({
    where: {
      userId,
      shown: false,
      rated: false,
    },
  });

  const shown = await prisma.userRecommendation.count({
    where: {
      userId,
      shown: true,
      rated: false,
    },
  });

  const rated = await prisma.userRecommendation.count({
    where: {
      userId,
      rated: true,
    },
  });

  return {
    total,
    unshown,
    shown,
    rated,
    available: unshown + shown,
  };
}

