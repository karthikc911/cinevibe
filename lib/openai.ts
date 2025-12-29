import OpenAI from "openai";
import { prisma } from "./prisma";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate embeddings for text
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  
  return response.data[0].embedding;
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Retrieve relevant user preferences using RAG
export async function retrieveUserPreferences(
  userId: string,
  query: string,
  limit: number = 5
) {
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);
  
  // Get all user preferences
  const preferences = await prisma.userPreference.findMany({
    where: { userId },
  });
  
  // Calculate similarity scores
  const scoredPreferences = preferences.map((pref: any) => ({
    ...pref,
    similarity: cosineSimilarity(queryEmbedding, pref.embedding),
  }));
  
  // Sort by similarity and return top results
  return scoredPreferences
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

// Store user preference with embedding
export async function storeUserPreference(
  userId: string,
  preferenceType: string,
  value: string,
  strength: number = 1.0
) {
  const embedding = await generateEmbedding(`${preferenceType}: ${value}`);
  
  return await (prisma.userPreference as any).create({
    data: {
      userId,
      preferenceType,
      value,
      strength,
      embedding,
    },
  });
}

// Analyze user's rating history and extract preferences
export async function analyzeUserRatings(userId: string) {
  const ratings = await prisma.movieRating.findMany({
    where: { userId, rating: { in: ["amazing", "good"] } },
    take: 50,
  });
  
  if (ratings.length === 0) return null;
  
  // Build a context from rated movies
  const ratedMovies = ratings
    .map((r) => `${r.movieTitle} (${r.movieYear || ""}): ${r.rating}`)
    .join("\n");
  
  // Use GPT-4 to analyze and extract preferences
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: `You are a movie preference analyzer. Analyze the user's movie ratings and extract their preferences.
Extract: genres they like, actors/directors they prefer, themes they enjoy, and movie characteristics.
Return a JSON array of preferences with format: [{"type": "genre", "value": "sci-fi", "strength": 0.9}, ...]`,
      },
      {
        role: "user",
        content: `Analyze these movie ratings:\n\n${ratedMovies}`,
      },
    ],
    response_format: { type: "json_object" },
  });
  
  const preferences = JSON.parse(response.choices[0].message.content || "{}");
  
  // Store preferences with embeddings
  if (preferences.preferences && Array.isArray(preferences.preferences)) {
    for (const pref of preferences.preferences) {
      await storeUserPreference(
        userId,
        pref.type,
        pref.value,
        pref.strength || 1.0
      );
    }
  }
  
  return preferences;
}

// Generate personalized movie recommendations using RAG
export async function generateRecommendations(
  userId: string,
  context?: string
) {
  // Retrieve user info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      ratings: {
        where: { rating: { in: ["amazing", "good"] } },
        take: 20,
        orderBy: { createdAt: "desc" },
      },
    },
  });
  
  if (!user) throw new Error("User not found");
  
  // Retrieve relevant preferences using RAG
  const query = context || "movie recommendations";
  const relevantPreferences = await retrieveUserPreferences(userId, query, 10);
  
  // Build context for GPT
  const userContext = {
    languages: user.languages,
    age: user.age,
    recentRatings: user.ratings.map((r) => ({
      title: r.movieTitle,
      rating: r.rating,
    })),
    preferences: relevantPreferences.map((p) => ({
      type: p.preferenceType,
      value: p.value,
      strength: p.strength,
    })),
  };
  
  // Generate recommendations using GPT-4
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: `You are an expert movie recommender. Based on the user's preferences and rating history,
suggest 10 personalized movie recommendations. Consider their language preferences, past ratings, and extracted preferences.
Return a JSON array with: title, year, reason, match_percentage.`,
      },
      {
        role: "user",
        content: `User context: ${JSON.stringify(userContext, null, 2)}\n\n${context || "Recommend movies I would love"}`,
      },
    ],
    response_format: { type: "json_object" },
  });
  
  return JSON.parse(response.choices[0].message.content || "{}");
}

// Chat with AI about movies
export async function chatWithAI(
  userId: string,
  message: string,
  conversationHistory: Array<{ role: string; content: string }> = []
) {
  // Retrieve user context
  const relevantPreferences = await retrieveUserPreferences(userId, message, 5);
  
  const preferenceContext = relevantPreferences
    .map((p) => `${p.preferenceType}: ${p.value} (strength: ${p.strength})`)
    .join("\n");
  
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system" as const,
        content: `You are CineVibe, a friendly AI movie companion. You help users discover movies based on their preferences.
User's preferences:\n${preferenceContext}\n\nBe conversational, enthusiastic, and helpful.`,
      },
      ...(conversationHistory as any[]),
      {
        role: "user" as const,
        content: message,
      },
    ],
  });
  
  return response.choices[0].message.content;
}

