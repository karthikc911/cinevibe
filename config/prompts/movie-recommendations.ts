/**
 * LLM Prompts for Movie Recommendations
 * 
 * These prompts are used by the AI recommendation engine to generate personalized
 * movie suggestions based on user preferences and rating history.
 * 
 * Edit these prompts to fine-tune the recommendation behavior.
 */

export const MOVIE_RECOMMENDATIONS_SYSTEM_PROMPT = `You are a movie recommendation expert. Provide personalized movie suggestions based on the user's rating history and preferences. 

CRITICAL: NEVER recommend movies the user has already rated, marked as "not interested", OR added to their watchlist. The user has provided complete lists of ALL movies they've already interacted with - you MUST recommend ONLY new movies not on any of those lists.

WATCHLIST EXCLUSION: Movies in the user's watchlist are saved to watch later. Do NOT recommend them again - they already know about these movies.

Format your response as a numbered list with movie title and year in parentheses.`;

/**
 * Build the user prompt for movie recommendations
 * 
 * @param config Configuration object with user preferences and ratings
 * @returns Complete user prompt string
 */
export function buildMovieRecommendationPrompt(config: {
  count: number;
  amazing: Array<{ movieTitle: string; movieYear: number }>;
  good: Array<{ movieTitle: string; movieYear: number }>;
  awful: Array<{ movieTitle: string; movieYear: number }>;
  notInterested: Array<{ movieTitle: string; movieYear: number }>;
  watchlistMovies: Array<{ movieTitle: string; movieYear: number }>;
  languagePrefs?: string;
  genres?: string[];
  aiInstructions?: string;
  customUserQuery?: string;
}): string {
  const {
    count,
    amazing,
    good,
    awful,
    notInterested,
    watchlistMovies,
    languagePrefs,
    genres,
    aiInstructions,
    customUserQuery,
  } = config;

  let userPrompt = '';

  if (customUserQuery) {
    // User provided a custom search query
    userPrompt = `${customUserQuery}\n\n`;
    userPrompt += `USER'S TASTE PROFILE (use this to refine recommendations):\n\n`;

    if (amazing.length > 0) {
      userPrompt += `MOVIES THEY LOVED:\n${amazing.slice(0, 10).map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }

    if (good.length > 0) {
      userPrompt += `MOVIES THEY ENJOYED:\n${good.slice(0, 10).map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }

    if (awful.length > 0) {
      userPrompt += `MOVIES THEY DISLIKED (avoid similar):\n${awful.slice(0, 5).map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }

    if (notInterested.length > 0) {
      userPrompt += `MOVIES THEY'RE NOT INTERESTED IN (NEVER recommend):\n${notInterested.slice(0, 10).map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }

    if (watchlistMovies.length > 0) {
      userPrompt += `MOVIES IN THEIR WATCHLIST (NEVER recommend - already saved to watch):\n${watchlistMovies.slice(0, 15).map((w) => `- ${w.movieTitle} (${w.movieYear})`).join('\n')}\n\n`;
    }

    userPrompt += `Based on the user's query and their taste profile, provide ${count} movie recommendations. Include:\n`;
  } else {
    // Default behavior - use user preferences
    userPrompt = `Find ${count} highly recommended movies based on this user's taste:\n\n`;

    if (amazing.length > 0) {
      userPrompt += `MOVIES THEY LOVED:\n${amazing.map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }

    if (good.length > 0) {
      userPrompt += `MOVIES THEY ENJOYED:\n${good.map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }

    if (awful.length > 0) {
      userPrompt += `MOVIES THEY DISLIKED (avoid similar):\n${awful.map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }

    if (notInterested.length > 0) {
      userPrompt += `MOVIES THEY'RE NOT INTERESTED IN (NEVER recommend these or similar):\n${notInterested.map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }

    if (watchlistMovies.length > 0) {
      userPrompt += `MOVIES IN THEIR WATCHLIST (NEVER recommend - already saved to watch):\n${watchlistMovies.map((w) => `- ${w.movieTitle} (${w.movieYear})`).join('\n')}\n\n`;
    }

    if (languagePrefs) {
      userPrompt += `Language Preferences: ${languagePrefs}\n\n`;
    }

    if (genres && genres.length > 0) {
      userPrompt += `Preferred Genres: ${genres.join(', ')}\n\n`;
    }

    if (aiInstructions && aiInstructions.trim()) {
      userPrompt += `SPECIAL INSTRUCTIONS FROM USER:\n${aiInstructions.trim()}\n\n`;
    }

    userPrompt += `Based on their taste, recommend ${count} NEW movies they would love. Include:\n`;
  }

  // Common requirements section
  userPrompt += `- Movie title (original and English if different)\n`;
  userPrompt += `- Release year\n`;
  userPrompt += `- IMDb rating\n`;
  userPrompt += `- Genre(s)\n`;
  userPrompt += `- Language\n`;
  userPrompt += `- Brief reason why it matches their taste\n\n`;
  
  // Critical rules
  userPrompt += `🚨 CRITICAL RULES - YOU MUST FOLLOW THESE:\n`;
  userPrompt += `1. DO NOT recommend ANY movies listed above (movies they loved, enjoyed, disliked, not interested in, OR in their watchlist)\n`;
  userPrompt += `2. The user has ALREADY SEEN/RATED all movies in the ratings lists - recommend ONLY NEW movies they haven't seen\n`;
  userPrompt += `3. NEVER recommend movies from the "NOT INTERESTED" or "WATCHLIST" sections - these are already known to the user\n`;
  userPrompt += `4. Movies in the WATCHLIST are saved to watch later - don't recommend them again\n`;
  userPrompt += `5. Focus on newer movies (2020-2024) and highly rated films unless the query specifies otherwise\n`;
  userPrompt += `6. Every recommendation MUST be a movie the user has NOT already rated, marked as not interested, or added to watchlist\n`;
  userPrompt += `7. Limit recommendations to EXACTLY ${count} movies\n\n`;
  userPrompt += `TRIPLE CHECK: Before recommending any movie, verify it's NOT in ANY of the lists above (ratings, not interested, watchlist).`;

  return userPrompt;
}

/**
 * Language display names for recommendations
 */
export const LANGUAGE_DESCRIPTIONS: Record<string, string> = {
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

