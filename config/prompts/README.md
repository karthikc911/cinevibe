# LLM Prompt Templates Configuration

This directory contains all LLM prompt templates used throughout the Cinemate application. By centralizing prompts in this configuration folder, you can easily review, update, and experiment with different prompt strategies without diving into API route code.

---

## 📁 **File Structure**

```
config/prompts/
├── README.md                      # This file
├── index.ts                       # Central export file
├── movie-recommendations.ts       # Movie AI recommendation prompts
├── tvshow-recommendations.ts      # TV show AI recommendation prompts
└── search.ts                      # Search and media extraction prompts
```

---

## 📄 **File Descriptions**

### **`movie-recommendations.ts`**

**Purpose:** Prompts for AI-powered movie recommendations using Perplexity API.

**Key Exports:**
- `MOVIE_RECOMMENDATIONS_SYSTEM_PROMPT`: System prompt that defines the AI's role as a movie recommendation expert
- `buildMovieRecommendationPrompt()`: Function that builds the complete user prompt based on:
  - User's rated movies (amazing, good, awful, not interested)
  - Movies in user's watchlist
  - User's language and genre preferences
  - Custom AI instructions from user
  - Custom search queries
- `LANGUAGE_DESCRIPTIONS`: Maps language names to display descriptions (e.g., "Hindi" → "Bollywood/Hindi")

**Used By:**
- `/app/api/search/smart-picks/route.ts` - AI movie recommendations

**Customization Tips:**
- Adjust the "CRITICAL RULES" section to change how strictly exclusions are enforced
- Modify the language descriptions to change regional cinema naming
- Update the movie metadata requirements (year, genre, rating, etc.)

---

### **`tvshow-recommendations.ts`**

**Purpose:** Prompts for AI-powered TV show recommendations.

**Key Exports:**
- `TV_SHOW_RECOMMENDATIONS_SYSTEM_PROMPT`: System prompt for TV show recommendations
- `buildTvShowRecommendationPrompt()`: Function that builds TV show recommendation prompts
- `TV_SHOW_LANGUAGE_DESCRIPTIONS`: Maps language names to TV show categories (e.g., "Korean" → "K-Drama")

**Used By:**
- `/app/api/search/smart-picks-tvshows/route.ts` - AI TV show recommendations (currently uses DB filtering, prepared for future Perplexity integration)

**Customization Tips:**
- Adjust the season count preferences
- Modify the recency bias (currently favors 2020-2024)
- Update TV show metadata requirements

---

### **`search.ts`**

**Purpose:** Prompts for natural language search and media extraction using Perplexity API.

**Key Exports:**
- `SEARCH_SYSTEM_PROMPT`: System prompt defining the AI as a media search expert
- `buildSearchQueryPrompt()`: Builds search queries that extract structured movie/TV show data from user queries
- `QUERY_ANALYSIS_SYSTEM_PROMPT`: System prompt for analyzing whether user wants a single item or multiple items

**Used By:**
- `/app/api/search/perplexity/route.ts` - Natural language search
- `/app/api/search/analyze-query/route.ts` - Query intent analysis

**Customization Tips:**
- Adjust the JSON structure requirements
- Modify the "IMPORTANT RULES" to change search behavior
- Update language defaults and type classifications

---

## 🎯 **How to Use**

### **Import Prompts in Your Code:**

```typescript
import { 
  MOVIE_RECOMMENDATIONS_SYSTEM_PROMPT,
  buildMovieRecommendationPrompt,
  LANGUAGE_DESCRIPTIONS
} from '@/config/prompts';

// Use in your API route
const systemPrompt = MOVIE_RECOMMENDATIONS_SYSTEM_PROMPT;
const userPrompt = buildMovieRecommendationPrompt({
  count: 10,
  amazing: [...],
  good: [...],
  // ... other config
});
```

### **Build Dynamic Prompts:**

```typescript
const userPrompt = buildMovieRecommendationPrompt({
  count: 5,
  amazing: [
    { movieTitle: "Inception", movieYear: 2010 },
    { movieTitle: "Interstellar", movieYear: 2014 },
  ],
  good: [
    { movieTitle: "The Matrix", movieYear: 1999 },
  ],
  awful: [],
  notInterested: [],
  watchlistMovies: [
    { movieTitle: "Dune", movieYear: 2021 },
  ],
  languagePrefs: "Hollywood/English, Bollywood/Hindi",
  genres: ["Action", "Sci-Fi"],
  aiInstructions: "Focus on mind-bending plots",
});
```

---

## 🔧 **Customization Guide**

### **1. Changing Exclusion Behavior**

**Location:** `movie-recommendations.ts` → `buildMovieRecommendationPrompt()` → Critical Rules section

**Example:** Make watchlist exclusion less strict:

```typescript
// BEFORE
userPrompt += `4. Movies in the WATCHLIST are saved to watch later - don't recommend them again\n`;

// AFTER
userPrompt += `4. Movies in the WATCHLIST may be recommended if they strongly match preferences\n`;
```

---

### **2. Adjusting Recency Bias**

**Location:** `movie-recommendations.ts` → Critical Rules → Rule 5

**Example:** Focus on classics instead of newer movies:

```typescript
// BEFORE
userPrompt += `5. Focus on newer movies (2020-2024) and highly rated films unless the query specifies otherwise\n`;

// AFTER
userPrompt += `5. Focus on timeless classics (1970-2010) and highly rated films unless the query specifies otherwise\n`;
```

---

### **3. Changing Movie Metadata Requirements**

**Location:** `movie-recommendations.ts` → Requirements section

**Example:** Add streaming availability requirement:

```typescript
userPrompt += `- Movie title (original and English if different)\n`;
userPrompt += `- Release year\n`;
userPrompt += `- IMDb rating\n`;
userPrompt += `- Genre(s)\n`;
userPrompt += `- Language\n`;
userPrompt += `- Streaming availability (Netflix, Prime, etc.)\n`; // ✅ NEW
userPrompt += `- Brief reason why it matches their taste\n\n`;
```

---

### **4. Customizing Search JSON Format**

**Location:** `search.ts` → `buildSearchQueryPrompt()`

**Example:** Add director and cast to search results:

```typescript
// Modify the JSON format in the prompt
Return your response in the following JSON format ONLY (no additional text):
{
  "results": [
    {
      "title": "Movie or Show Title",
      "year": 2023,
      "language": "English",
      "type": "movie",
      "director": "Christopher Nolan",  // ✅ NEW
      "cast": ["Actor 1", "Actor 2"]    // ✅ NEW
    }
  ]
}
```

---

### **5. Adding New Language Descriptions**

**Location:** `movie-recommendations.ts` → `LANGUAGE_DESCRIPTIONS`

**Example:** Add support for French cinema:

```typescript
export const LANGUAGE_DESCRIPTIONS: Record<string, string> = {
  English: 'Hollywood/English',
  Hindi: 'Bollywood/Hindi',
  // ... existing languages
  French: 'French Cinema',        // ✅ NEW
  Spanish: 'Spanish Cinema',      // ✅ NEW
  German: 'German Cinema',        // ✅ NEW
};
```

---

## 🧪 **Testing Prompt Changes**

### **1. Test in Development:**

After modifying a prompt:

1. **Restart your dev server** (if needed)
   ```bash
   npm run dev
   ```

2. **Test the affected feature:**
   - For movie recommendations: Click "AI Picks for Movies"
   - For TV shows: Click "AI Picks for TV Shows"
   - For search: Use the search bar

3. **Check the logs:**
   ```bash
   tail -100 logs/app-2025-11-15.log | grep "PERPLEXITY"
   ```

### **2. Verify Prompt is Sent:**

The API routes log the complete prompts sent to Perplexity/OpenAI:

```
📤 PERPLEXITY API REQUEST - SYSTEM PROMPT
📤 PERPLEXITY API REQUEST - USER PROMPT
```

Look for these log entries to verify your changes.

### **3. Test Edge Cases:**

- **Empty ratings:** User with no rated movies
- **Large watchlist:** User with 50+ watchlisted movies
- **Custom AI instructions:** User with specific preferences
- **Multiple languages:** User preferring Hindi + English

---

## 📝 **Prompt Engineering Best Practices**

### **1. Be Explicit About Exclusions:**

```typescript
// ❌ BAD - Vague
"Don't recommend movies they've seen"

// ✅ GOOD - Specific
"NEVER recommend movies from the 'WATCHLIST' or 'NOT INTERESTED' sections"
```

### **2. Use Triple-Check Reminders:**

```typescript
userPrompt += `TRIPLE CHECK: Before recommending any movie, verify it's NOT in ANY of the lists above.`;
```

### **3. Provide Clear Examples:**

```typescript
export const QUERY_ANALYSIS_SYSTEM_PROMPT = `...
Examples:
- "Inception" → {"type": "single-movie", "movieName": "Inception"}
- "top 5 action movies" → {"type": "multiple-movies", "movieName": null}
`;
```

### **4. Structure with Headers:**

```typescript
userPrompt += `USER'S TASTE PROFILE:\n\n`;
// ... content
userPrompt += `🚨 CRITICAL RULES:\n`;
// ... rules
```

### **5. Request Specific JSON Format:**

```typescript
"Return your response in the following JSON format ONLY (no additional text):"
```

---

## 🔄 **API Routes Using These Prompts**

| API Route | Prompt Config Used |
|-----------|-------------------|
| `/app/api/search/smart-picks/route.ts` | `movie-recommendations.ts` |
| `/app/api/search/smart-picks-tvshows/route.ts` | `tvshow-recommendations.ts` |
| `/app/api/search/perplexity/route.ts` | `search.ts` |
| `/app/api/search/analyze-query/route.ts` | `search.ts` |

---

## 🚀 **Quick Reference**

### **Common Prompt Changes:**

| What to Change | File | Section |
|----------------|------|---------|
| Exclusion rules | `movie-recommendations.ts` | Critical Rules |
| Recency bias | `movie-recommendations.ts` | Rule 5 |
| Metadata requirements | `movie-recommendations.ts` | Requirements section |
| Search JSON format | `search.ts` | `buildSearchQueryPrompt()` |
| Language names | `movie-recommendations.ts` | `LANGUAGE_DESCRIPTIONS` |
| TV show metadata | `tvshow-recommendations.ts` | Requirements section |

### **Testing Workflow:**

1. Edit prompt in `config/prompts/`
2. Save file (TypeScript compiles automatically)
3. Restart dev server if needed
4. Test feature in browser
5. Check logs for prompt output
6. Verify AI response matches expectations

---

## 📚 **Additional Resources**

- **Perplexity API Docs:** https://docs.perplexity.ai/
- **OpenAI API Docs:** https://platform.openai.com/docs/
- **Prompt Engineering Guide:** https://www.promptingguide.ai/

---

## ⚠️ **Important Notes**

1. **Prompt Length:** Perplexity has a token limit. Keep prompts concise while maintaining clarity.

2. **JSON Parsing:** Ensure JSON format instructions are clear to avoid parsing errors.

3. **User Privacy:** Never log sensitive user data in prompts (emails, personal info).

4. **Rate Limiting:** Be mindful of API rate limits when testing prompt changes.

5. **Version Control:** When making significant prompt changes, document them in commit messages.

---

## 🎉 **Happy Prompt Engineering!**

Experiment with different prompt strategies to improve recommendation quality. The modular structure makes it easy to A/B test different approaches.

For questions or issues, check the logs or review the API route implementations.

