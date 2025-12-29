/**
 * LLM Prompts for Movie Recommendations
 * 
 * These prompts are used by the AI recommendation engine to generate personalized
 * movie suggestions based on user preferences and rating history.
 * 
 * Edit these prompts to fine-tune the recommendation behavior.
 */

export const MOVIE_RECOMMENDATIONS_SYSTEM_PROMPT = `You are a movie recommendation expert. Provide personalized movie suggestions based on the user's rating history and preferences.

🚨🚨🚨 ABSOLUTE RULE - ZERO TOLERANCE FOR DUPLICATES 🚨🚨🚨

THE USER HAS PROVIDED A COMPLETE LIST OF MOVIES THEY'VE ALREADY WATCHED OR REJECTED.

YOU MUST NEVER RECOMMEND ANY MOVIE FROM THE FOLLOWING CATEGORIES:
1. MOVIES THEY LOVED (amazing) - ALREADY WATCHED
2. MOVIES THEY ENJOYED (good) - ALREADY WATCHED
3. MOVIES THEY RATED AS MEH - ALREADY WATCHED
4. MOVIES THEY DISLIKED (awful) - ALREADY WATCHED
5. MOVIES NOT INTERESTED - USER REJECTED THESE
6. MOVIES IN WATCHLIST - ALREADY SAVED
7. MOVIES SKIPPED - USER PASSED ON THESE

⚠️ THIS INCLUDES ALL VERSIONS/REMAKES OF EXCLUDED MOVIES:
- If "Vikram Vedha (2017)" is excluded, do NOT recommend "Vikram Vedha (2022)" or any version
- If "Drishyam (2015)" is excluded, do NOT recommend "Drishyam 2 (2022)" or any sequel
- If "Jersey (2019)" is excluded, do NOT recommend "Jersey (2022)" or any remake

🎯 YOUR TASK: Recommend ONLY movies the user has NEVER seen or interacted with.
- Scan the entire exclusion list before making each recommendation
- If ANY movie in your list appears in the exclusion list (even partially), REMOVE IT
- Double-check every recommendation against the exclusion list

If you recommend even ONE excluded movie, you have FAILED completely.

Format: Numbered list with "Movie Title (Year)" format.`;

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
  meh?: Array<{ movieTitle: string; movieYear: number }>;
  awful: Array<{ movieTitle: string; movieYear: number }>;
  notInterested: Array<{ movieTitle: string; movieYear: number }>;
  skipped?: Array<{ movieTitle: string; movieYear: number }>;
  watchlistMovies: Array<{ movieTitle: string; movieYear: number }>;
  languagePrefs?: string;
  genres?: string[];
  aiInstructions?: string;
  customUserQuery?: string;
  userFeedback?: string[]; // User's feedback on past AI recommendations
}): string {
  const {
    count,
    amazing,
    good,
    meh = [],
    awful,
    notInterested,
    skipped = [],
    watchlistMovies,
    languagePrefs,
    genres,
    aiInstructions,
    customUserQuery,
    userFeedback = [],
  } = config;

  let userPrompt = '';

  // Combine ALL movies user has already seen into one exclusion list for emphasis
  const allSeenMovies = [...amazing, ...good, ...meh, ...awful];
  const allExcludedMovies = [...allSeenMovies, ...notInterested, ...skipped, ...watchlistMovies];
  
  if (customUserQuery) {
    // User provided a custom search query
    userPrompt = `${customUserQuery}\n\n`;
    userPrompt += `USER'S TASTE PROFILE (use this to refine recommendations):\n\n`;

    if (amazing.length > 0) {
      userPrompt += `MOVIES THEY LOVED (ALREADY WATCHED - DO NOT RECOMMEND):\n${amazing.slice(0, 10).map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }

    if (good.length > 0) {
      userPrompt += `MOVIES THEY ENJOYED (ALREADY WATCHED - DO NOT RECOMMEND):\n${good.slice(0, 10).map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }

    if (meh.length > 0) {
      userPrompt += `MOVIES THEY RATED AS MEH (ALREADY WATCHED - DO NOT RECOMMEND):\n${meh.slice(0, 10).map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }

    if (awful.length > 0) {
      userPrompt += `MOVIES THEY DISLIKED (ALREADY WATCHED - DO NOT RECOMMEND):\n${awful.slice(0, 5).map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }

    if (notInterested.length > 0) {
      userPrompt += `MOVIES THEY'RE NOT INTERESTED IN (DO NOT RECOMMEND):\n${notInterested.slice(0, 10).map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }

    if (skipped.length > 0) {
      userPrompt += `MOVIES THEY SKIPPED (DO NOT RECOMMEND):\n${skipped.slice(0, 10).map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }

    if (watchlistMovies.length > 0) {
      userPrompt += `MOVIES IN THEIR WATCHLIST (ALREADY SAVED - DO NOT RECOMMEND):\n${watchlistMovies.slice(0, 15).map((w) => `- ${w.movieTitle} (${w.movieYear})`).join('\n')}\n\n`;
    }

    userPrompt += `Based on the user's query and their taste profile, provide ${count} movie recommendations. Include:\n`;
  } else {
    // Default behavior - use user preferences
    userPrompt = `Find ${count} highly recommended movies based on this user's taste:\n\n`;
    
    userPrompt += `⛔ EXCLUSION LIST - USER HAS ALREADY SEEN/INTERACTED WITH THESE ${allExcludedMovies.length} MOVIES - NEVER RECOMMEND ANY OF THEM:\n\n`;

    if (amazing.length > 0) {
      userPrompt += `MOVIES THEY LOVED (ALREADY WATCHED - EXCLUDED):\n${amazing.map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }

    if (good.length > 0) {
      userPrompt += `MOVIES THEY ENJOYED (ALREADY WATCHED - EXCLUDED):\n${good.map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }

    if (meh.length > 0) {
      userPrompt += `MOVIES THEY RATED AS MEH (ALREADY WATCHED - EXCLUDED):\n${meh.map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }

    if (awful.length > 0) {
      userPrompt += `MOVIES THEY DISLIKED (ALREADY WATCHED - EXCLUDED):\n${awful.map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }

    if (notInterested.length > 0) {
      userPrompt += `MOVIES THEY'RE NOT INTERESTED IN (EXCLUDED):\n${notInterested.map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }

    if (skipped.length > 0) {
      userPrompt += `MOVIES THEY SKIPPED (EXCLUDED):\n${skipped.map((r) => `- ${r.movieTitle} (${r.movieYear})`).join('\n')}\n\n`;
    }

    if (watchlistMovies.length > 0) {
      userPrompt += `MOVIES IN THEIR WATCHLIST (ALREADY SAVED - EXCLUDED):\n${watchlistMovies.map((w) => `- ${w.movieTitle} (${w.movieYear})`).join('\n')}\n\n`;
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

    // Include user's feedback on past AI recommendations
    if (userFeedback.length > 0) {
      userPrompt += `🎯 USER'S FEEDBACK ON PAST AI RECOMMENDATIONS (FOLLOW THESE CLOSELY):\n`;
      userFeedback.forEach((feedback, index) => {
        userPrompt += `${index + 1}. "${feedback}"\n`;
      });
      userPrompt += `\nYou MUST take this feedback into account when making recommendations. Adjust your selections to match what the user is asking for.\n\n`;
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
  
  // Critical rules - VERY EMPHATIC
  userPrompt += `\n🚨🚨🚨 CRITICAL EXCLUSION RULES - ABSOLUTE ZERO TOLERANCE 🚨🚨🚨\n\n`;
  userPrompt += `⛔ STRICTLY FORBIDDEN - DO NOT RECOMMEND:\n`;
  userPrompt += `   • ANY movie from "MOVIES THEY LOVED" - ALREADY WATCHED\n`;
  userPrompt += `   • ANY movie from "MOVIES THEY ENJOYED" - ALREADY WATCHED\n`;
  userPrompt += `   • ANY movie from "MOVIES THEY RATED AS MEH" - ALREADY WATCHED\n`;
  userPrompt += `   • ANY movie from "MOVIES THEY DISLIKED" - ALREADY WATCHED\n`;
  userPrompt += `   • ANY movie from "NOT INTERESTED" - USER REJECTED\n`;
  userPrompt += `   • ANY movie from "SKIPPED" - USER PASSED\n`;
  userPrompt += `   • ANY movie from "WATCHLIST" - ALREADY SAVED\n\n`;
  userPrompt += `⚠️ THIS ALSO INCLUDES:\n`;
  userPrompt += `   • Sequels of excluded movies (e.g., if "Drishyam" is excluded, "Drishyam 2" is also excluded)\n`;
  userPrompt += `   • Remakes of excluded movies (e.g., if "Jersey (2019)" is excluded, "Jersey (2022)" is also excluded)\n`;
  userPrompt += `   • Different language versions (e.g., if "Vikram Vedha (Tamil)" is excluded, "Vikram Vedha (Hindi)" is also excluded)\n\n`;
  userPrompt += `✅ ONLY recommend movies that:\n`;
  userPrompt += `   • Do NOT appear in any exclusion list above\n`;
  userPrompt += `   • Are NOT sequels/remakes/versions of excluded movies\n`;
  userPrompt += `   • The user has NEVER seen or interacted with\n\n`;
  userPrompt += `🔍 VALIDATION CHECKLIST (do this for EACH recommendation):\n`;
  userPrompt += `   1. Is this exact movie title in any exclusion list? If YES → SKIP IT\n`;
  userPrompt += `   2. Is this a sequel of an excluded movie? If YES → SKIP IT\n`;
  userPrompt += `   3. Is this a remake of an excluded movie? If YES → SKIP IT\n`;
  userPrompt += `   4. Is this a different version of an excluded movie? If YES → SKIP IT\n\n`;
  userPrompt += `Limit to EXACTLY ${count} movies. Quality over quantity.\n\n`;
  userPrompt += `FINAL CHECK: Review ALL ${count} recommendations against ALL exclusion lists. Replace any that match.`;

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

