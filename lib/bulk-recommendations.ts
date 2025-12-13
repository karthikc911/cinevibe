/**
 * Bulk Movie Recommendations with OpenAI + TMDB Integration
 * 
 * This module generates 50 personalized movie recommendations using:
 * 1. User ratings analysis via OpenAI GPT-4
 * 2. TMDB API for movie details and metadata
 * 3. Automatic database storage for new movies
 */

import OpenAI from "openai";
import { prisma } from "./prisma";
import { logger } from "./logger";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const GPT_MODEL = process.env.OPENAI_MODEL || "gpt-5-nano-2025-08-07";

interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
  genre_ids: number[];
  runtime?: number;
  tagline?: string;
  genres?: { id: number; name: string }[];
}

interface RecommendationResult {
  title: string;
  year: string;
  reason: string;
  match_percentage: number;
  tmdb_id?: number;
  genres?: string[];
}

/**
 * Fetch movie details from TMDB API
 */
async function fetchTMDBMovieDetails(movieTitle: string, year?: string): Promise<TMDBMovie | null> {
  try {
    // Search for movie
    const searchQuery = year ? `${movieTitle} ${year}` : movieTitle;
    const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&include_adult=false`;
    
    const searchResponse = await fetch(searchUrl);
    if (!searchResponse.ok) {
      throw new Error(`TMDB search failed: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    
    if (!searchData.results || searchData.results.length === 0) {
      logger.warn("TMDB", `No results found for: ${movieTitle} (${year})`);
      return null;
    }
    
    // Get the first result (most relevant)
    const movieId = searchData.results[0].id;
    
    // Fetch detailed information
    const detailsUrl = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}`;
    const detailsResponse = await fetch(detailsUrl);
    
    if (!detailsResponse.ok) {
      throw new Error(`TMDB details failed: ${detailsResponse.status}`);
    }
    
    const movieDetails = await detailsResponse.json();
    return movieDetails;
    
  } catch (error) {
    logger.error("TMDB", `Failed to fetch movie: ${movieTitle}`, error);
    return null;
  }
}

/**
 * Store movie in database if it doesn't exist
 */
async function storeMovieInDB(tmdbMovie: TMDBMovie): Promise<number> {
  try {
    const releaseYear = tmdbMovie.release_date 
      ? parseInt(tmdbMovie.release_date.split('-')[0]) 
      : null;
    
    const movie = await prisma.movie.upsert({
      where: { id: tmdbMovie.id },
      update: {
        title: tmdbMovie.title,
        originalTitle: tmdbMovie.original_title,
        overview: tmdbMovie.overview,
        posterPath: tmdbMovie.poster_path,
        backdropPath: tmdbMovie.backdrop_path,
        releaseDate: tmdbMovie.release_date,
        year: releaseYear,
        voteAverage: tmdbMovie.vote_average,
        voteCount: tmdbMovie.vote_count,
        popularity: tmdbMovie.popularity,
        language: tmdbMovie.original_language,
        genres: tmdbMovie.genres ? tmdbMovie.genres.map(g => g.name) : [],
        runtime: tmdbMovie.runtime,
        tagline: tmdbMovie.tagline,
        imdbRating: tmdbMovie.vote_average,
        rtRating: Math.round(tmdbMovie.vote_average * 10),
        updatedAt: new Date(),
      },
      create: {
        id: tmdbMovie.id,
        title: tmdbMovie.title,
        originalTitle: tmdbMovie.original_title,
        overview: tmdbMovie.overview,
        posterPath: tmdbMovie.poster_path,
        backdropPath: tmdbMovie.backdrop_path,
        releaseDate: tmdbMovie.release_date,
        year: releaseYear,
        voteAverage: tmdbMovie.vote_average,
        voteCount: tmdbMovie.vote_count,
        popularity: tmdbMovie.popularity,
        language: tmdbMovie.original_language,
        genres: tmdbMovie.genres ? tmdbMovie.genres.map(g => g.name) : [],
        runtime: tmdbMovie.runtime,
        tagline: tmdbMovie.tagline,
        imdbRating: tmdbMovie.vote_average,
        rtRating: Math.round(tmdbMovie.vote_average * 10),
      },
    });
    
    logger.info("DB", `Stored movie: ${movie.title} (${movie.id})`);
    return movie.id;
    
  } catch (error) {
    logger.error("DB", `Failed to store movie: ${tmdbMovie.title}`, error);
    throw error;
  }
}

/**
 * Generate 50 personalized movie recommendations using OpenAI + TMDB
 * and store them in the database
 */
export async function generate50Recommendations(userId: string) {
  logger.info("RECOMMENDATIONS", `Starting bulk recommendation generation for user: ${userId}`);
  
  try {
    // 1. Get user profile and ratings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ratings: {
          orderBy: { createdAt: "desc" },
          take: 100, // Consider last 100 ratings
        },
      },
    });
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // 2. Build context from ratings
    const amazingMovies = user.ratings
      .filter(r => r.rating === "amazing")
      .map(r => `${r.movieTitle} (${r.movieYear || ""})`);
    
    const goodMovies = user.ratings
      .filter(r => r.rating === "good")
      .map(r => `${r.movieTitle} (${r.movieYear || ""})`);
    
    const awfulMovies = user.ratings
      .filter(r => r.rating === "awful")
      .map(r => `${r.movieTitle} (${r.movieYear || ""})`);
    
    // Map language names to more descriptive forms
    const languageDescriptions = user.languages.map(lang => {
      const langMap: Record<string, string> = {
        'English': 'Hollywood/English',
        'Hindi': 'Bollywood/Hindi',
        'Tamil': 'Kollywood/Tamil',
        'Telugu': 'Tollywood/Telugu',
        'Kannada': 'Sandalwood/Kannada',
        'Malayalam': 'Mollywood/Malayalam',
        'Korean': 'Korean Cinema (K-Drama style)',
        'Japanese': 'Japanese Cinema (Anime & Live Action)',
        'Italian': 'Italian Cinema',
      };
      return langMap[lang] || lang;
    }).join(", ");
    
    logger.info("RECOMMENDATIONS", `User profile: ${amazingMovies.length} amazing, ${goodMovies.length} good, ${awfulMovies.length} awful`);
    logger.info("RECOMMENDATIONS", `User languages: ${languageDescriptions}`);
    
    // 3. Generate recommendations with GPT-5-nano
    logger.info("RECOMMENDATIONS", "Calling OpenAI GPT-5-nano for recommendations...");
    logger.info("RECOMMENDATIONS", `Model: ${GPT_MODEL}`);
    logger.info("RECOMMENDATIONS", `Max completion tokens: 10000`);
    
    const startTime = Date.now();
    let response;
    
    try {
      response = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        {
          role: "system",
          content: `You are CineMate's expert movie recommender. Analyze the user's ratings and recommend 50 diverse movies they would love.

Instructions:
- Consider their amazing, good, and awful ratings
- PRIORITIZE movies from their preferred languages/cinemas
- Recommend movies from various genres and eras
- Include popular classics and hidden gems
- AVOID movies they've already rated
- For each movie, provide the exact title and year
- Explain WHY it matches their taste (be specific and mention language/style fit)
- Assign a match percentage (0-100)

Return ONLY valid JSON:
{
  "recommendations": [
    {
      "title": "Exact Movie Title",
      "year": "2023",
      "reason": "Specific reason based on their ratings...",
      "match_percentage": 92
    }
  ]
}

IMPORTANT: 
- Return exactly 50 recommendations
- Distribute recommendations across their preferred languages
- Prioritize quality and user taste match over just language matching`,
        },
        {
          role: "user",
          content: `User Profile:
Preferred Languages/Cinemas: ${languageDescriptions}

AMAZING Movies (they loved these):
${amazingMovies.slice(0, 20).join("\n") || "None yet"}

GOOD Movies (they liked these):
${goodMovies.slice(0, 20).join("\n") || "None yet"}

AWFUL Movies (they disliked these - avoid similar):
${awfulMovies.slice(0, 10).join("\n") || "None yet"}

Based on this profile, recommend 50 movies they would love. 
Focus on movies from: ${languageDescriptions}
Include diverse genres and styles, but respect their language preferences.`,
        },
      ],
      response_format: { type: "json_object" },
      // temperature: removed - GPT-5-nano only supports default (1)
      max_completion_tokens: 10000, // GPT-5-nano supports up to 32k output tokens
    });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error("RECOMMENDATIONS", "❌ GPT API call failed");
      logger.error("RECOMMENDATIONS", `Duration before failure: ${duration}ms`);
      logger.error("RECOMMENDATIONS", `Error: ${error.message}`);
      throw error;
    }
    
    const duration = Date.now() - startTime;
    
    // Log response details
    logger.info("RECOMMENDATIONS", "=== GPT RESPONSE RECEIVED ===");
    logger.info("RECOMMENDATIONS", `Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    logger.info("RECOMMENDATIONS", `Model used: ${response.model}`);
    logger.info("RECOMMENDATIONS", `Finish reason: ${response.choices[0].finish_reason}`);
    
    if (response.usage) {
      logger.info("RECOMMENDATIONS", "=== TOKEN USAGE ===");
      logger.info("RECOMMENDATIONS", `Prompt tokens: ${response.usage.prompt_tokens}`);
      logger.info("RECOMMENDATIONS", `Completion tokens: ${response.usage.completion_tokens}`);
      logger.info("RECOMMENDATIONS", `Total tokens: ${response.usage.total_tokens}`);
    }
    
    const responseContent = response.choices[0].message.content || '{"recommendations": []}';
    logger.info("RECOMMENDATIONS", `Response length: ${responseContent.length} characters`);
    
    const result = JSON.parse(responseContent);
    
    const recommendations: RecommendationResult[] = result.recommendations || [];
    logger.info("RECOMMENDATIONS", `✅ OpenAI generated ${recommendations.length} recommendations`);
    
    // 4. Fetch TMDB details and store in database
    const storedMovies: RecommendationResult[] = [];
    const failedMovies: string[] = [];
    
    for (const rec of recommendations) {
      try {
        logger.info("RECOMMENDATIONS", `Processing: ${rec.title} (${rec.year})`);
        
        // Fetch from TMDB
        const tmdbMovie = await fetchTMDBMovieDetails(rec.title, rec.year);
        
        if (tmdbMovie) {
          // Store in database
          const movieId = await storeMovieInDB(tmdbMovie);
          
          storedMovies.push({
            ...rec,
            tmdb_id: movieId,
            genres: tmdbMovie.genres?.map(g => g.name) || [],
          });
          
          logger.info("RECOMMENDATIONS", `✓ Stored: ${rec.title} (TMDB ID: ${movieId})`);
        } else {
          failedMovies.push(`${rec.title} (${rec.year})`);
          logger.warn("RECOMMENDATIONS", `✗ Not found on TMDB: ${rec.title}`);
        }
        
        // Rate limit: Wait 250ms between TMDB calls
        await new Promise(resolve => setTimeout(resolve, 250));
        
      } catch (error) {
        failedMovies.push(`${rec.title} (${rec.year})`);
        logger.error("RECOMMENDATIONS", `Error processing ${rec.title}`, error);
      }
    }
    
    // 5. Return results
    const summary = {
      userId,
      totalRequested: recommendations.length,
      successfullyStored: storedMovies.length,
      failed: failedMovies.length,
      failedMovies,
      recommendations: storedMovies,
    };
    
    logger.info("RECOMMENDATIONS", `Complete: ${storedMovies.length}/${recommendations.length} movies stored`);
    
    return summary;
    
  } catch (error) {
    logger.error("RECOMMENDATIONS", "Bulk recommendation generation failed", error);
    throw error;
  }
}

/**
 * Get recommendations for user (checks if already generated, or generates new)
 */
export async function getUserRecommendations(userId: string, forceRegenerate = false) {
  // TODO: Implement caching mechanism
  // For now, always generate fresh recommendations
  return await generate50Recommendations(userId);
}

