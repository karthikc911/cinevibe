/**
 * LLM Prompts for TV Show Recommendations
 * 
 * These prompts are used by the AI recommendation engine to generate personalized
 * TV show suggestions based on user preferences and rating history.
 * 
 * Edit these prompts to fine-tune TV show recommendation behavior.
 */

export const TV_SHOW_RECOMMENDATIONS_SYSTEM_PROMPT = `You are a TV show recommendation expert. Provide personalized TV show suggestions based on the user's viewing history and preferences.

🚨🚨🚨 ABSOLUTE RULE - ZERO TOLERANCE FOR DUPLICATES 🚨🚨🚨

NEVER, UNDER ANY CIRCUMSTANCES, recommend ANY TV show that appears in:
1. TV SHOWS THEY LOVED (amazing) - they already watched these
2. TV SHOWS THEY ENJOYED (good) - they already watched these  
3. TV SHOWS THEY RATED AS MEH - they already watched these
4. TV SHOWS THEY DISLIKED (awful) - they already watched these
5. TV SHOWS THEY MARKED NOT INTERESTED - they don't want these
6. TV SHOWS IN THEIR WATCHLIST - they already saved these to watch later
7. TV SHOWS THEY SKIPPED - they passed on these

The user has seen/rated ALL TV shows listed. Your job is to find ONLY NEW shows they haven't seen.

If you recommend even ONE show from any of those lists, you have FAILED the task.

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
  meh?: Array<{ tvShowName: string; tvShowYear: number }>;
  awful: Array<{ tvShowName: string; tvShowYear: number }>;
  notInterested: Array<{ tvShowName: string; tvShowYear: number }>;
  skipped?: Array<{ tvShowName: string; tvShowYear: number }>;
  watchlistTvShows: Array<{ tvShowName: string; tvShowYear: number }>;
  languagePrefs?: string;
  genres?: string[];
  aiInstructions?: string;
}): string {
  const {
    count,
    amazing,
    good,
    meh = [],
    awful,
    notInterested,
    skipped = [],
    watchlistTvShows,
    languagePrefs,
    genres,
    aiInstructions,
  } = config;

  // Count total excluded shows
  const allExcludedShows = [...amazing, ...good, ...meh, ...awful, ...notInterested, ...skipped, ...watchlistTvShows];

  let userPrompt = `Find ${count} highly recommended TV shows based on this user's taste:\n\n`;
  
  userPrompt += `⛔ EXCLUSION LIST - USER HAS ALREADY SEEN/INTERACTED WITH THESE ${allExcludedShows.length} TV SHOWS - NEVER RECOMMEND ANY OF THEM:\n\n`;

  if (amazing.length > 0) {
    userPrompt += `TV SHOWS THEY LOVED (ALREADY WATCHED - EXCLUDED):\n${amazing.map((r) => `- ${r.tvShowName} (${r.tvShowYear})`).join('\n')}\n\n`;
  }

  if (good.length > 0) {
    userPrompt += `TV SHOWS THEY ENJOYED (ALREADY WATCHED - EXCLUDED):\n${good.map((r) => `- ${r.tvShowName} (${r.tvShowYear})`).join('\n')}\n\n`;
  }

  if (meh.length > 0) {
    userPrompt += `TV SHOWS THEY RATED AS MEH (ALREADY WATCHED - EXCLUDED):\n${meh.map((r) => `- ${r.tvShowName} (${r.tvShowYear})`).join('\n')}\n\n`;
  }

  if (awful.length > 0) {
    userPrompt += `TV SHOWS THEY DISLIKED (ALREADY WATCHED - EXCLUDED):\n${awful.map((r) => `- ${r.tvShowName} (${r.tvShowYear})`).join('\n')}\n\n`;
  }

  if (notInterested.length > 0) {
    userPrompt += `TV SHOWS THEY'RE NOT INTERESTED IN (EXCLUDED):\n${notInterested.map((r) => `- ${r.tvShowName} (${r.tvShowYear})`).join('\n')}\n\n`;
  }

  if (skipped.length > 0) {
    userPrompt += `TV SHOWS THEY SKIPPED (EXCLUDED):\n${skipped.map((r) => `- ${r.tvShowName} (${r.tvShowYear})`).join('\n')}\n\n`;
  }

  if (watchlistTvShows.length > 0) {
    userPrompt += `TV SHOWS IN THEIR WATCHLIST (ALREADY SAVED - EXCLUDED):\n${watchlistTvShows.map((w) => `- ${w.tvShowName} (${w.tvShowYear})`).join('\n')}\n\n`;
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
  
  // Critical rules - VERY EMPHATIC
  userPrompt += `\n🚨🚨🚨 CRITICAL EXCLUSION RULES - ABSOLUTE ZERO TOLERANCE 🚨🚨🚨\n\n`;
  userPrompt += `YOU MUST NOT RECOMMEND ANY TV SHOW FROM THE EXCLUSION LISTS ABOVE!\n\n`;
  userPrompt += `❌ FORBIDDEN - Never recommend shows from:\n`;
  userPrompt += `   • "TV SHOWS THEY LOVED" - they already watched these\n`;
  userPrompt += `   • "TV SHOWS THEY ENJOYED" - they already watched these\n`;
  userPrompt += `   • "TV SHOWS THEY RATED AS MEH" - they already watched these\n`;
  userPrompt += `   • "TV SHOWS THEY DISLIKED" - they already watched these\n`;
  userPrompt += `   • "TV SHOWS NOT INTERESTED" - they rejected these\n`;
  userPrompt += `   • "TV SHOWS SKIPPED" - they passed on these\n`;
  userPrompt += `   • "WATCHLIST TV SHOWS" - they already saved these\n\n`;
  userPrompt += `✅ ONLY recommend TV shows that are:\n`;
  userPrompt += `   • NOT in any of the above lists\n`;
  userPrompt += `   • Shows the user has NEVER seen or interacted with\n`;
  userPrompt += `   • Fresh, new recommendations\n\n`;
  userPrompt += `Before each recommendation, ASK YOURSELF: "Is this TV show in any exclusion list?" If YES, DO NOT RECOMMEND IT.\n\n`;
  userPrompt += `Limit recommendations to EXACTLY ${count} TV shows.\n\n`;
  userPrompt += `FINAL CHECK: Scan every show title in the exclusion lists. If your recommendation matches ANY of them, REMOVE IT and find a different show.`;

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

