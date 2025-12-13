/**
 * RAG (Retrieval Augmented Generation) Pipeline
 * 
 * This module provides a complete RAG implementation for CineMate using:
 * - OpenAI embeddings (text-embedding-3-small)
 * - pgvector for similarity search
 * - GPT-4 for generation
 * 
 * Features:
 * - Vector embeddings for user preferences
 * - Cosine similarity search
 * - Context-aware recommendation generation
 * - Automatic preference extraction from ratings
 */

import OpenAI from "openai";
import { prisma } from "./prisma";
import { logger } from "./logger";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configuration
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSION = 1536; // Dimension for text-embedding-3-small
const GPT_MODEL = process.env.OPENAI_MODEL || "gpt-5-nano-2025-08-07";
const MAX_CONTEXT_PREFERENCES = 10;

/**
 * Generate vector embedding for a text string
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding");
  }
}

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1, where 1 means identical
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Retrieve user preferences using vector similarity search
 * Uses pgvector's cosine distance operator (<=>)
 */
export async function retrieveRelevantPreferences(
  userId: string,
  queryEmbedding: number[],
  limit: number = MAX_CONTEXT_PREFERENCES
) {
  try {
    // Convert embedding array to pgvector format string
    const embeddingString = `[${queryEmbedding.join(",")}]`;

    // Use raw SQL for pgvector similarity search
    // The <=> operator computes cosine distance (1 - cosine similarity)
    const results = await prisma.$queryRaw`
      SELECT 
        id,
        "userId",
        "preferenceType",
        value,
        strength,
        embedding,
        "createdAt",
        "updatedAt",
        (embedding <=> ${embeddingString}::vector) as distance
      FROM "UserPreference"
      WHERE "userId" = ${userId}
      ORDER BY embedding <=> ${embeddingString}::vector
      LIMIT ${limit}
    ` as any[];

    // Convert distance to similarity score (0 to 1)
    return results.map((pref) => ({
      id: pref.id,
      userId: pref.userId,
      preferenceType: pref.preferenceType,
      value: pref.value,
      strength: pref.strength,
      similarity: 1 - parseFloat(pref.distance),
      createdAt: pref.createdAt,
      updatedAt: pref.updatedAt,
    }));
  } catch (error) {
    console.error("Error retrieving preferences:", error);
    // Fallback to Prisma ORM without vector search if pgvector isn't available
    const allPrefs = await prisma.userPreference.findMany({
      where: { userId },
      take: limit,
    });

    // Calculate similarity manually as fallback
    return allPrefs.map((pref: any) => ({
      ...pref,
      similarity: 0.5, // Default similarity
      embedding: undefined, // Don't return the embedding
    }));
  }
}

/**
 * Store a new user preference with its vector embedding
 */
export async function storeUserPreference(
  userId: string,
  preferenceType: string,
  value: string,
  strength: number = 1.0
) {
  const text = `${preferenceType}: ${value}`;
  const embedding = await generateEmbedding(text);

  // Convert embedding to pgvector format
  const embeddingString = `[${embedding.join(",")}]`;

  try {
    // Use raw SQL to insert with vector type
    await prisma.$executeRaw`
      INSERT INTO "UserPreference" (id, "userId", "preferenceType", value, strength, embedding, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::text,
        ${userId},
        ${preferenceType},
        ${value},
        ${strength},
        ${embeddingString}::vector,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE
      SET value = ${value}, strength = ${strength}, embedding = ${embeddingString}::vector, "updatedAt" = NOW()
    `;

    return { success: true };
  } catch (error) {
    console.error("Error storing preference:", error);
    throw new Error("Failed to store preference");
  }
}

/**
 * Analyze user's movie ratings and extract preferences using GPT-4
 */
export async function analyzeUserRatings(userId: string) {
  // Get user's positive ratings
  const ratings = await prisma.movieRating.findMany({
    where: {
      userId,
      rating: { in: ["amazing", "good"] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  if (ratings.length === 0) {
    return { message: "No ratings to analyze yet" };
  }

  // Build context from ratings
  const ratedMovies = ratings
    .map((r: any) => `${r.movieTitle} (${r.movieYear || ""}): ${r.rating}`)
    .join("\n");

  try {
    const systemPrompt = `You are a movie preference analyzer. Analyze the user's movie ratings and extract detailed preferences.

Extract preferences in these categories:
- genre: specific genres they like (e.g., "sci-fi", "thriller")
- actor: actors they prefer
- director: directors they like
- theme: themes/subjects (e.g., "time travel", "heist", "redemption")
- style: cinematography/style preferences (e.g., "dark", "colorful", "minimal dialogue")
- era: time periods (e.g., "1990s cinema", "modern films")

For each preference, assign a strength score (0.0 to 1.0) based on how confident you are.

Return ONLY a valid JSON object with this exact structure:
{
  "preferences": [
    {"type": "genre", "value": "sci-fi", "strength": 0.9},
    {"type": "theme", "value": "time travel", "strength": 0.8}
  ]
}`;

    const userPrompt = `Analyze these movie ratings:\n\n${ratedMovies}`;

    // Use GPT-5-nano to analyze and extract preferences
    logger.info("RAG_ANALYZE", "=== ANALYZING USER RATINGS ===");
    logger.info("RAG_ANALYZE", `Model: ${GPT_MODEL}`);
    logger.info("RAG_ANALYZE", `Analyzing ${ratings.length} ratings`);
    logger.info("RAG_ANALYZE", "=== COMPLETE SYSTEM PROMPT ===");
    logger.info("RAG_ANALYZE", systemPrompt);
    logger.info("RAG_ANALYZE", "=== COMPLETE USER PROMPT ===");
    logger.info("RAG_ANALYZE", userPrompt);
    
    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      response_format: { type: "json_object" },
      // temperature: removed - GPT-5-nano only supports default (1)
    });

    const duration = Date.now() - startTime;
    logger.info("RAG_ANALYZE", `=== GPT RESPONSE RECEIVED ===`);
    logger.info("RAG_ANALYZE", `Duration: ${duration}ms`);
    if (response.usage) {
      logger.info("RAG_ANALYZE", `Tokens: ${response.usage.prompt_tokens} prompt + ${response.usage.completion_tokens} completion = ${response.usage.total_tokens} total`);
    }

    const responseContent = response.choices[0].message.content || '{"preferences": []}';
    logger.info("RAG_ANALYZE", "=== COMPLETE GPT RESPONSE ===");
    logger.info("RAG_ANALYZE", responseContent);

    const analysis = JSON.parse(responseContent);
    logger.info("RAG_ANALYZE", `Extracted ${analysis.preferences?.length || 0} preferences`);

    // Store extracted preferences with embeddings
    const stored = [];
    if (analysis.preferences && Array.isArray(analysis.preferences)) {
      for (const pref of analysis.preferences) {
        try {
          await storeUserPreference(
            userId,
            pref.type,
            pref.value,
            pref.strength || 1.0
          );
          stored.push(pref);
        } catch (error) {
          console.error("Error storing preference:", pref, error);
        }
      }
    }

    return {
      analyzed: ratings.length,
      extracted: stored.length,
      preferences: stored,
    };
  } catch (error) {
    console.error("Error analyzing ratings:", error);
    throw new Error("Failed to analyze ratings");
  }
}

/**
 * Generate personalized movie recommendations using RAG
 */
export async function generateRecommendations(
  userId: string,
  query: string = "Recommend movies I would love"
) {
  try {
    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ratings: {
          where: { rating: { in: ["amazing", "good"] } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Retrieve relevant preferences using vector similarity
    const relevantPreferences = await retrieveRelevantPreferences(
      userId,
      queryEmbedding,
      MAX_CONTEXT_PREFERENCES
    );

    // Build rich context for GPT-4
    const context = {
      user: {
        languages: user.languages,
        age: user.age,
      },
      recentRatings: user.ratings.map((r: any) => ({
        title: r.movieTitle,
        year: r.movieYear,
        rating: r.rating,
      })),
      preferences: relevantPreferences.map((p: any) => ({
        type: p.preferenceType,
        value: p.value,
        strength: p.strength,
        relevance: p.similarity,
      })),
    };

    // Generate recommendations with GPT-5-nano
    const systemPrompt = `You are an expert movie recommender for CineMate. Based on the user's profile and preferences, suggest personalized movie recommendations.

Context includes:
- User's language preferences
- Recent highly-rated movies
- Extracted preferences with relevance scores (how relevant to current query)

Provide 10 diverse recommendations. For each movie include:
- title: Movie title
- year: Release year
- reason: Why this movie matches their taste (2-3 sentences, specific to their preferences)
- match_percentage: How well it matches (0-100)

Return ONLY valid JSON:
{
  "recommendations": [
    {
      "title": "Movie Title",
      "year": "2023",
      "reason": "Detailed explanation...",
      "match_percentage": 95
    }
  ]
}`;
    
    const userPrompt = `User Profile:\n${JSON.stringify(context, null, 2)}\n\nQuery: ${query}`;

    logger.info("RAG_RECOMMENDATIONS", "=== GENERATING RECOMMENDATIONS ===");
    logger.info("RAG_RECOMMENDATIONS", `Model: ${GPT_MODEL}`);
    logger.info("RAG_RECOMMENDATIONS", `Query: ${query || 'general recommendations'}`);
    logger.info("RAG_RECOMMENDATIONS", "=== COMPLETE SYSTEM PROMPT ===");
    logger.info("RAG_RECOMMENDATIONS", systemPrompt);
    logger.info("RAG_RECOMMENDATIONS", "=== COMPLETE USER PROMPT ===");
    logger.info("RAG_RECOMMENDATIONS", userPrompt);
    
    const recStartTime = Date.now();
    const response = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      response_format: { type: "json_object" },
      // temperature: removed - GPT-5-nano only supports default (1)
    });

    const recDuration = Date.now() - recStartTime;
    logger.info("RAG_RECOMMENDATIONS", `=== GPT RESPONSE RECEIVED ===`);
    logger.info("RAG_RECOMMENDATIONS", `Duration: ${recDuration}ms`);
    if (response.usage) {
      logger.info("RAG_RECOMMENDATIONS", `Tokens: ${response.usage.prompt_tokens} prompt + ${response.usage.completion_tokens} completion = ${response.usage.total_tokens} total`);
    }

    const responseContent = response.choices[0].message.content || '{"recommendations": []}';
    logger.info("RAG_RECOMMENDATIONS", "=== COMPLETE GPT RESPONSE ===");
    logger.info("RAG_RECOMMENDATIONS", responseContent);

    const recommendations = JSON.parse(responseContent);
    logger.info("RAG_RECOMMENDATIONS", `Generated ${recommendations.recommendations?.length || 0} recommendations`);
    
    return recommendations;
  } catch (error) {
    console.error("Error generating recommendations:", error);
    throw new Error("Failed to generate recommendations");
  }
}

/**
 * Chat with AI about movies (with context from user preferences)
 */
export async function chatWithAI(
  userId: string,
  message: string,
  conversationHistory: Array<{ role: "system" | "user" | "assistant"; content: string }> = []
) {
  try {
    // Generate embedding for the message
    const messageEmbedding = await generateEmbedding(message);

    // Retrieve relevant preferences
    const relevantPreferences = await retrieveRelevantPreferences(
      userId,
      messageEmbedding,
      5
    );

    const preferenceContext = relevantPreferences
      .map(
        (p: any) =>
          `${p.preferenceType}: ${p.value} (strength: ${p.strength.toFixed(2)}, relevance: ${p.similarity.toFixed(2)})`
      )
      .join("\n");

    const systemPrompt = `You are CineMate AI, a friendly and knowledgeable movie companion. You help users discover movies based on their preferences.

User's preferences (with relevance to current conversation):
${preferenceContext}

Be conversational, enthusiastic, and provide specific movie recommendations when appropriate. Use the preferences to personalize your responses.`;

    logger.info("RAG_CHAT", "=== STARTING CHAT ===");
    logger.info("RAG_CHAT", `Model: ${GPT_MODEL}`);
    logger.info("RAG_CHAT", `Conversation history: ${conversationHistory.length} messages`);
    logger.info("RAG_CHAT", "=== COMPLETE SYSTEM PROMPT ===");
    logger.info("RAG_CHAT", systemPrompt);
    logger.info("RAG_CHAT", "=== CONVERSATION HISTORY ===");
    logger.info("RAG_CHAT", JSON.stringify(conversationHistory, null, 2));
    logger.info("RAG_CHAT", "=== USER MESSAGE ===");
    logger.info("RAG_CHAT", message);
    
    const chatStartTime = Date.now();
    const response = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: message },
      ],
      // temperature: removed - GPT-5-nano only supports default (1)
      max_completion_tokens: 2000, // GPT-5-nano allows longer responses
    });

    const chatDuration = Date.now() - chatStartTime;
    logger.info("RAG_CHAT", `=== GPT RESPONSE RECEIVED ===`);
    logger.info("RAG_CHAT", `Duration: ${chatDuration}ms`);
    if (response.usage) {
      logger.info("RAG_CHAT", `Tokens: ${response.usage.prompt_tokens} prompt + ${response.usage.completion_tokens} completion = ${response.usage.total_tokens} total`);
    }
    
    const responseContent = response.choices[0].message.content || '';
    logger.info("RAG_CHAT", "=== COMPLETE GPT RESPONSE ===");
    logger.info("RAG_CHAT", responseContent);

    return responseContent;
  } catch (error) {
    console.error("Error in chat:", error);
    throw new Error("Failed to process chat message");
  }
}

/**
 * Initialize or update vector index (run after migrations)
 */
export async function createVectorIndex() {
  try {
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS user_preference_embedding_idx 
      ON "UserPreference" USING hnsw (embedding vector_cosine_ops)
    `;
    return { success: true, message: "Vector index created" };
  } catch (error) {
    console.error("Error creating vector index:", error);
    return { success: false, error: "Failed to create vector index" };
  }
}

/**
 * Health check for RAG pipeline
 */
export async function healthCheck() {
  const checks = {
    openai: false,
    database: false,
    pgvector: false,
  };

  // Check OpenAI connection
  try {
    await generateEmbedding("test");
    checks.openai = true;
  } catch (error) {
    console.error("OpenAI check failed:", error);
  }

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    console.error("Database check failed:", error);
  }

  // Check pgvector extension
  try {
    await prisma.$queryRaw`SELECT extname FROM pg_extension WHERE extname = 'vector'`;
    checks.pgvector = true;
  } catch (error) {
    console.error("pgvector check failed:", error);
  }

  return checks;
}

