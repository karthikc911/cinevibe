# AI Exclusions and Thinking Panel Updates

## 📅 **Date:** November 18, 2025

## ✅ **Three Major Updates Completed**

---

## 1. 🎨 **AI Thinking Panel - Elegant Blue Theme**

### **Changes Made:**
- ✅ Removed all green colors from the AI Thinking Panel
- ✅ Replaced with elegant blue/cyan theme for completed steps
- ✅ Grey/subdued colors for pending steps
- ✅ Blue checkmarks (✓) for completed items
- ✅ Cyan for loading/in-progress items

### **Color Scheme:**
| Status | Icon Color | Background | Border |
|--------|------------|------------|--------|
| **Pending** | `text-gray-400` | `bg-gray-700/10` | `border-gray-500/20` |
| **Loading** | `text-cyan-400` | `bg-cyan-500/15` | `border-cyan-400/25` |
| **Completed** | `text-blue-400` | `bg-blue-500/15` | `border-blue-400/25` |
| **Error** | `text-red-400` | `bg-red-500/15` | `border-red-400/25` |

### **Visual Changes:**
```typescript
// BEFORE - Green theme
"text-green-400"
"bg-green-500/20 border-green-400/30"

// AFTER - Blue theme
"text-blue-400"
"bg-blue-500/15 border-blue-400/25"
```

### **Experience Improvements:**
- ✅ **ChatGPT Deep Research style** - Collapsible, elegant, minimal
- ✅ **Real data display** - Shows actual user preferences, ratings count
- ✅ **Substeps with details** - Expandable for more information
- ✅ **Smooth animations** - Blue progress bar, animated icons
- ✅ **Auto-collapse** - Stays visible but can be manually collapsed/expanded

### **Files Modified:**
- `components/AIThinkingPanel.tsx`

---

## 2. 🚫 **Exclude Already Seen Content from AI Recommendations**

### **Problem:**
AI was recommending movies/TV shows that users had:
- Already rated
- Marked as "Not Interested"
- Added to Watchlist
- Previously seen

### **Solution Implemented:**

#### **For Movies (`/api/search/smart-picks`):**

**1. Database Query Updated:**
```typescript
// Get user with preferences, ratings, AND watchlist
const user = await prisma.user.findUnique({
  where: { email: session.user.email },
  include: {
    ratings: { orderBy: { createdAt: 'desc' }, take: 50 },
    watchlist: { // ✅ NEW
      select: { movieId: true, movieTitle: true, movieYear: true },
    },
  },
});
```

**2. Exclusion List Expanded:**
```typescript
// BEFORE - Only excluded rated movies
const excludedMovieIds = user.ratings.map(r => r.movieId);

// AFTER - Excludes rated + watchlist movies
const excludedMovieIds = [
  ...user.ratings.map(r => r.movieId),
  ...watchlistMovies.map(w => w.movieId), // ✅ NEW
];
```

**3. Perplexity Prompt Updated:**
```typescript
// Added to prompt
if (watchlistMovies.length > 0) {
  userPrompt += `MOVIES IN THEIR WATCHLIST (NEVER recommend - already saved to watch):\n`;
  userPrompt += watchlistMovies.map((w) => `- ${w.movieTitle} (${w.movieYear})`).join('\n') + '\n\n';
}

// Updated critical rules
userPrompt += `🚨 CRITICAL RULES:\n`;
userPrompt += `1. DO NOT recommend ANY movies listed above (rated, not interested, OR in watchlist)\n`;
userPrompt += `3. NEVER recommend movies from "NOT INTERESTED" or "WATCHLIST" sections\n`;
userPrompt += `4. Movies in the WATCHLIST are saved to watch later - don't recommend them again\n`;
userPrompt += `6. Every recommendation MUST be NOT already rated/watchlisted/not-interested\n`;
```

**4. System Prompt Enhanced:**
```typescript
const systemPrompt = `You are a movie recommendation expert.

CRITICAL: NEVER recommend movies the user has already rated, marked as "not interested", 
OR added to their watchlist. You MUST recommend ONLY new movies not on any of those lists.

WATCHLIST EXCLUSION: Movies in the user's watchlist are saved to watch later. 
Do NOT recommend them again - they already know about these movies.`;
```

#### **For TV Shows (`/api/search/smart-picks-tvshows`):**

**1. Watchlist Query Added:**
```typescript
// Get TV shows in watchlist
const watchlistTvShows = await prisma.tvShowWatchlistItem.findMany({
  where: { userId: user.id },
  select: { tvShowId: true },
});
const watchlistTvShowIds = watchlistTvShows.map(w => w.tvShowId);

// Combine exclusions
const excludedTvShowIds = [...ratedTvShowIds, ...watchlistTvShowIds];
```

**2. Where Clause Updated:**
```typescript
// BEFORE
{ id: { notIn: ratedTvShowIds } }

// AFTER - Excludes both rated and watchlist
{ id: { notIn: excludedTvShowIds } }
```

**3. Logging Added:**
```typescript
logger.info('TV_SHOW_SMART_PICKS', 'Exclusion lists', {
  ratedTvShows: ratedTvShowIds.length,
  watchlistTvShows: watchlistTvShowIds.length,
  totalExcluded: excludedTvShowIds.length,
});
```

### **What's Excluded Now:**

| Category | Movies | TV Shows |
|----------|--------|----------|
| **Rated (Amazing)** | ✅ Excluded | ✅ Excluded |
| **Rated (Good)** | ✅ Excluded | ✅ Excluded |
| **Rated (Meh)** | ✅ Excluded | ✅ Excluded |
| **Rated (Awful)** | ✅ Excluded | ✅ Excluded |
| **Not Interested** | ✅ Excluded | ✅ Excluded |
| **In Watchlist** | ✅ **NEW - Excluded** | ✅ **NEW - Excluded** |

### **Files Modified:**
- `app/api/search/smart-picks/route.ts`
- `app/api/search/smart-picks-tvshows/route.ts`

---

## 3. ❤️ **Watchlist Button Removes Cards Like Rating**

### **Status:** ✅ **ALREADY IMPLEMENTED**

The `handleAddToWatchlist` function in `app/page.tsx` already:

1. ✅ **Removes card from display**
2. ✅ **Auto-advances carousel** (for AI picks, search results)
3. ✅ **Works for all sections:**
   - AI Movies
   - AI TV Shows
   - Search Results
   - Trending Movies
   - Popular Movies

### **How It Works:**

```typescript
const handleAddToWatchlist = (movie: Movie) => {
  // 1. Add to watchlist
  addToWatchlist(movie);

  // 2. Find which list the movie belongs to
  const isAIMovie = aiMovies.find(m => m.id === movie.id);
  const isAITvShow = aiTvShows.find(m => m.id === movie.id);
  const isSearchResult = searchResults.find(m => m.id === movie.id);

  // 3. Remove from relevant lists
  setAiMovies(prev => prev.filter(m => m.id !== movie.id));
  setAiTvShows(prev => prev.filter(m => m.id !== movie.id));
  setSearchResults(prev => prev.filter(m => m.id !== movie.id));
  setTrendingMovies(prev => prev.filter(m => m.id !== movie.id));
  setPopularMovies(prev => prev.filter(m => m.id !== movie.id));

  // 4. Auto-advance carousel if needed
  if (isAIMovie && aiMovieIndex >= aiIndex && aiMovieIndex < aiIndex + 3) {
    setTimeout(() => {
      setAiIndex(prev => {
        const newLength = aiMovies.length - 1;
        if (prev + 3 > newLength && prev > 0) {
          return Math.max(0, newLength - 3);
        }
        return prev;
      });
    }, 300);
  }
};
```

### **User Experience:**

| Action | Behavior |
|--------|----------|
| **Click Heart (Watchlist)** | Card disappears ✅ |
| **Click Rating** | Card disappears ✅ |
| **Auto-advance** | Shows next card ✅ |
| **Works for AI picks** | ✅ Yes |
| **Works for search** | ✅ Yes |
| **Works for trending** | ✅ Yes |
| **Works for popular** | ✅ Yes |

### **No Changes Needed:**
This feature was already fully implemented in a previous update.

---

## 🎯 **Testing Instructions**

### **Test 1: AI Thinking Panel Colors**
1. Go to Home page (`/`)
2. Click "AI Picks for Movies" or "AI Picks for TV Shows"
3. **Observe:** AI Thinking Panel appears
4. **Expected Colors:**
   - 🔵 **Blue** for completed steps (not green)
   - 🔵 **Cyan** for loading steps
   - ⚪ **Grey** for pending steps
   - 🔵 **Blue progress bar** (not green)
5. **Verify:** Can collapse/expand panel
6. **Verify:** Shows real user data (rated movies count, preferences)

### **Test 2: Exclusion of Watchlist Items**

**Setup:**
1. Add a movie to watchlist (e.g., "Inception")
2. Note the movie title and year

**Test AI Recommendations:**
1. Click "AI Picks for Movies"
2. **Expected:** "Inception" should NOT appear in recommendations
3. Check logs for exclusion count:
   ```
   SMART_PICKS: User rating breakdown {
     totalExcluded: 25, // Should include watchlist items
     watchlist: 5
   }
   ```

**Test with Already Rated Movies:**
1. Rate a movie (e.g., "Breaking Bad" - Amazing)
2. Click "AI Picks for TV Shows"
3. **Expected:** "Breaking Bad" should NOT appear in recommendations

**Test Search:**
1. Search for "suggest 5 action movies"
2. **Expected:** No movies you've rated or watchlisted should appear
3. Check console logs to verify exclusions were sent to Perplexity

### **Test 3: Watchlist Button Removes Card**

**Test on AI Picks:**
1. Click "AI Picks for Movies"
2. Click heart/watchlist button on any movie
3. **Expected:** Card disappears immediately
4. **Expected:** Next movie card appears (auto-slide)

**Test on Search Results:**
1. Search for "top 5 sci-fi movies"
2. Get multiple results (>3)
3. Click heart/watchlist button on 2nd card
4. **Expected:** Card disappears
5. **Expected:** Remaining cards re-arrange

**Test on Trending/Popular:**
1. Scroll to "Trending Movies" section
2. Click heart/watchlist button on any card
3. **Expected:** Card disappears
4. **Expected:** Section re-renders without that card

---

## 📊 **Impact Summary**

### **Before:**
- ❌ AI Thinking Panel used green colors
- ❌ AI recommended movies already in watchlist
- ❌ Watchlist button didn't remove cards *(actually it did)*

### **After:**
- ✅ AI Thinking Panel uses elegant blue theme
- ✅ AI explicitly excludes watchlist items from recommendations
- ✅ Watchlist button removes cards and auto-advances carousel
- ✅ Perplexity API receives complete exclusion lists
- ✅ User sees only NEW content they haven't interacted with
- ✅ Cleaner, more elegant UI matching ChatGPT Deep Research

---

## 🔍 **Debug Information**

### **Check Exclusions in Logs:**

**For Movies:**
```bash
tail -100 logs/app-2025-11-15.log | grep "SMART_PICKS.*exclusion"
```

Expected output:
```json
{
  "amazing": 15,
  "good": 8,
  "awful": 2,
  "notInterested": 3,
  "watchlist": 5, // ✅ NEW
  "totalExcluded": 33 // ✅ Includes watchlist
}
```

**For TV Shows:**
```bash
tail -100 logs/app-2025-11-15.log | grep "TV_SHOW_SMART_PICKS.*Exclusion"
```

Expected output:
```json
{
  "ratedTvShows": 12,
  "watchlistTvShows": 4, // ✅ NEW
  "totalExcluded": 16 // ✅ Combined
}
```

### **Verify Perplexity Prompt:**
```bash
tail -200 logs/app-2025-11-15.log | grep -A 20 "PERPLEXITY API REQUEST"
```

Should see:
```
MOVIES IN THEIR WATCHLIST (NEVER recommend - already saved to watch):
- Inception (2010)
- The Dark Knight (2008)
...
```

---

## 📁 **Files Modified**

| File | Changes | Lines Modified |
|------|---------|----------------|
| `components/AIThinkingPanel.tsx` | Changed green to blue theme | ~20 lines |
| `app/api/search/smart-picks/route.ts` | Added watchlist exclusions | ~40 lines |
| `app/api/search/smart-picks-tvshows/route.ts` | Added watchlist exclusions | ~25 lines |

---

## ✨ **Key Benefits**

1. **Better UX:**
   - Elegant blue theme instead of jarring green
   - Collapsible AI thinking panel
   - Real data display for transparency

2. **Smarter Recommendations:**
   - No duplicate recommendations
   - Respects user's watchlist choices
   - Perplexity explicitly told to avoid known content

3. **Consistent Behavior:**
   - Watchlist button acts like rating button
   - Cards disappear after interaction
   - Auto-advance works for all sections

4. **User Trust:**
   - Shows actual user data being used
   - Transparent about what's excluded
   - No surprises in recommendations

---

## 🎉 **All Features Complete!**

Ready to test! 🚀

