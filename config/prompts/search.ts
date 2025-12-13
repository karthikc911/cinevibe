/**
 * LLM Prompts for Search and Media Extraction
 * 
 * These prompts are used to extract movies and TV shows from natural language queries
 * using the Perplexity API.
 * 
 * Edit these prompts to improve search accuracy and behavior.
 */

export const SEARCH_SYSTEM_PROMPT = `You are a movie and TV show search expert. Extract media information from user queries and return structured JSON data.`;

/**
 * Build the search query prompt for Perplexity
 * 
 * @param userQuery The user's natural language search query
 * @returns Complete search prompt string
 */
export function buildSearchQueryPrompt(userQuery: string): string {
  return `Based on this user query: "${userQuery}"

Identify all movies and/or TV shows mentioned or requested. For each item, provide:
1. Title (exact, official title)
2. Release year (if available)
3. Original language (English, Hindi, Tamil, Telugu, Kannada, Malayalam, Korean, Japanese, etc.)
4. Type (movie or tvshow)

Return your response in the following JSON format ONLY (no additional text):
{
  "results": [
    {
      "title": "Movie or Show Title",
      "year": 2023,
      "language": "English",
      "type": "movie"
    }
  ]
}

IMPORTANT RULES:
- If the query asks for "top 5 movies", return exactly 5 movies
- If the query asks for "one movie", return exactly 1 movie
- Provide current, accurate information
- Include the exact number of items requested
- If language is not specified, default to "English"
- For TV shows, use type: "tvshow"
- Return ONLY valid JSON, no explanations or markdown`;
}

/**
 * System prompt for analyzing user search queries
 */
export const QUERY_ANALYSIS_SYSTEM_PROMPT = `You are a search query analyzer for a movie app. Analyze the user's search query and determine:
1. Is this a search for a SINGLE specific movie? (e.g., "Inception", "The Dark Knight", "Interstellar 2014")
2. Or is this a request for MULTIPLE movies? (e.g., "top 5 action movies", "trending tamil movies", "best sci-fi films from 2020")

Respond in JSON format:
{
  "type": "single-movie" or "multiple-movies",
  "movieName": "extracted movie name if single-movie, otherwise null",
  "reasoning": "brief explanation"
}

Examples:
- "Inception" → {"type": "single-movie", "movieName": "Inception", "reasoning": "User searching for specific movie"}
- "The Godfather 1972" → {"type": "single-movie", "movieName": "The Godfather", "reasoning": "User searching for specific movie with year"}
- "top 5 trending movies" → {"type": "multiple-movies", "movieName": null, "reasoning": "User wants multiple movie recommendations"}
- "best tamil movies from 2023" → {"type": "multiple-movies", "movieName": null, "reasoning": "User wants list of movies with criteria"}`;

