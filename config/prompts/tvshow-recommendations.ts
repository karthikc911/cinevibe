/**
 * LLM Prompts for TV Show Recommendations
 * 
 * These prompts are used by the AI recommendation engine to generate personalized
 * TV show suggestions based on user preferences and rating history.
 * 
 * Edit these prompts to fine-tune TV show recommendation behavior.
 */

export const TV_SHOW_RECOMMENDATIONS_SYSTEM_PROMPT = `You are a TV show recommendation expert. Provide personalized TV show suggestions based on the user's viewing history and preferences.

CRITICAL: NEVER recommend TV shows the user has already rated, marked as "not interested", OR added to their watchlist. The user has provided complete lists of ALL TV shows they've already interacted with - you MUST recommend ONLY new shows not on any of those lists.

WATCHLIST EXCLUSION: TV shows in the user's watchlist are saved to watch later. Do NOT recommend them again - they already know about these shows.

Format your response as a numbered list with TV show title and year in parentheses.`;

/**
 * Build the user prompt for TV show recommendations
 * 
 * Note: This is currently handled in the API route itself using database filtering.
 * This file is prepared for future Perplexity API integration for TV shows.
 * 
 * @param config Configuration object with user preferences and ratings
 * @returns Complete user prompt string
 */
export function buildTvShowRecommendationPrompt(config: {
  count: number;
  amazing: Array<{ tvShowName: string; tvShowYear: number }>;
  good: Array<{ tvShowName: string; tvShowYear: number }>;
  awful: Array<{ tvShowName: string; tvShowYear: number }>;
  notInterested: Array<{ tvShowName: string; tvShowYear: number }>;
  watchlistTvShows: Array<{ tvShowName: string; tvShowYear: number }>;
  languagePrefs?: string;
  genres?: string[];
  aiInstructions?: string;
}): string {
  const {
    count,
    amazing,
    good,
    awful,
    notInterested,
    watchlistTvShows,
    languagePrefs,
    genres,
    aiInstructions,
  } = config;

  let userPrompt = `Find ${count} highly recommended TV shows based on this user's taste:\n\n`;

  if (amazing.length > 0) {
    userPrompt += `TV SHOWS THEY LOVED:\n${amazing.map((r) => `- ${r.tvShowName} (${r.tvShowYear})`).join('\n')}\n\n`;
  }

  if (good.length > 0) {
    userPrompt += `TV SHOWS THEY ENJOYED:\n${good.map((r) => `- ${r.tvShowName} (${r.tvShowYear})`).join('\n')}\n\n`;
  }

  if (awful.length > 0) {
    userPrompt += `TV SHOWS THEY DISLIKED (avoid similar):\n${awful.map((r) => `- ${r.tvShowName} (${r.tvShowYear})`).join('\n')}\n\n`;
  }

  if (notInterested.length > 0) {
    userPrompt += `TV SHOWS THEY'RE NOT INTERESTED IN (NEVER recommend these or similar):\n${notInterested.map((r) => `- ${r.tvShowName} (${r.tvShowYear})`).join('\n')}\n\n`;
  }

  if (watchlistTvShows.length > 0) {
    userPrompt += `TV SHOWS IN THEIR WATCHLIST (NEVER recommend - already saved to watch):\n${watchlistTvShows.map((w) => `- ${w.tvShowName} (${w.tvShowYear})`).join('\n')}\n\n`;
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

  userPrompt += `Based on their taste, recommend ${count} NEW TV shows they would love. Include:\n`;
  
  // Requirements section
  userPrompt += `- TV show title (original and English if different)\n`;
  userPrompt += `- First air date/year\n`;
  userPrompt += `- IMDb rating\n`;
  userPrompt += `- Genre(s)\n`;
  userPrompt += `- Language\n`;
  userPrompt += `- Number of seasons\n`;
  userPrompt += `- Brief reason why it matches their taste\n\n`;
  
  // Critical rules
  userPrompt += `🚨 CRITICAL RULES - YOU MUST FOLLOW THESE:\n`;
  userPrompt += `1. DO NOT recommend ANY TV shows listed above (shows they loved, enjoyed, disliked, not interested in, OR in their watchlist)\n`;
  userPrompt += `2. The user has ALREADY SEEN/RATED all shows in the ratings lists - recommend ONLY NEW shows they haven't seen\n`;
  userPrompt += `3. NEVER recommend shows from the "NOT INTERESTED" or "WATCHLIST" sections - these are already known to the user\n`;
  userPrompt += `4. TV shows in the WATCHLIST are saved to watch later - don't recommend them again\n`;
  userPrompt += `5. Focus on recent shows (2020-2024) and highly rated series unless the preferences specify otherwise\n`;
  userPrompt += `6. Every recommendation MUST be a TV show the user has NOT already rated, marked as not interested, or added to watchlist\n`;
  userPrompt += `7. Limit recommendations to EXACTLY ${count} TV shows\n\n`;
  userPrompt += `TRIPLE CHECK: Before recommending any TV show, verify it's NOT in ANY of the lists above (ratings, not interested, watchlist).`;

  return userPrompt;
}

/**
 * Language display names for TV show recommendations
 */
export const TV_SHOW_LANGUAGE_DESCRIPTIONS: Record<string, string> = {
  English: 'American/British TV',
  Hindi: 'Indian TV/Hindi',
  Kannada: 'Kannada TV',
  Tamil: 'Tamil TV',
  Telugu: 'Telugu TV',
  Malayalam: 'Malayalam TV',
  Korean: 'K-Drama',
  Japanese: 'J-Drama/Anime',
  Italian: 'Italian TV',
};

