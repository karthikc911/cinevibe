# AI Exclusion Fix - Already Rated Movies/TV Shows 🔧

## 📅 **Date:** November 18, 2025

---

## 🐛 **Problem Reported**

AI Picks were recommending movies/TV shows that the user had **already rated, marked as not interested, or added to watchlist**. This was creating a poor user experience with duplicate recommendations.

---

## 🔍 **Root Cause Analysis**

### **Movie Recommendations (`/api/search/smart-picks/route.ts`)**

**Issue Found:** Line 610 - Double validation filter was **ONLY** excluding "not interested" movies:

```typescript
// ❌ BEFORE - Only filtered "not interested"
enrichedMovies = enrichedMovies.filter(movie => !notInterestedMovieIds.includes(movie.id));
```

**Missing Exclusions:**
- ❌ Movies rated as "Amazing"
- ❌ Movies rated as "Good"
- ❌ Movies rated as "Meh"
- ❌ Movies rated as "Awful"
- ❌ Movies in watchlist

### **Why This Happened:**

1. **Prompt-level exclusions:** The prompts correctly told Perplexity to avoid all rated/watchlist movies
2. **Database-level exclusions:** Database queries correctly excluded these movies (line 308)
3. **BUT:** Perplexity doesn't always follow instructions perfectly, so it sometimes returned already-rated movies
4. **Final filter was incomplete:** The double validation only caught "not interested" movies, letting other rated movies slip through

---

## ✅ **Solution Implemented**

### **1. Movies - Enhanced Double Validation**

**File:** `/app/api/search/smart-picks/route.ts`

**Before:**
```typescript
// ❌ Only excluded "not interested" movies
enrichedMovies = enrichedMovies.filter(movie => !notInterestedMovieIds.includes(movie.id));
```

**After:**
```typescript
// ✅ Excludes ALL rated movies + watchlist
enrichedMovies = enrichedMovies.filter(movie => !excludedMovieIds.includes(movie.id));
```

**What `excludedMovieIds` includes:**
- ✅ All rated movies (amazing, good, meh, awful, not-interested)
- ✅ All watchlist movies

**Enhanced Logging:**
```typescript
if (filteredCount > 0) {
  logger.warn('SMART_PICKS', '⚠️ DOUBLE VALIDATION: Perplexity recommended already-rated/watchlist movies!', {
    beforeCount: beforeFilterCount,
    afterCount: enrichedMovies.length,
    filteredOut: filteredCount,
    excludedCount: excludedMovieIds.length,
    breakdown: {
      totalRated: user.ratings.length,
      notInterested: notInterested.length,
      watchlist: watchlistMovies.length,
    },
  });
}
```

---

### **2. TV Shows - Added Double Validation**

**File:** `/app/api/search/smart-picks-tvshows/route.ts`

**Before:**
```typescript
// ❌ No double validation - relied solely on database WHERE clause
const shuffledShows = tvShows.sort(() => Math.random() - 0.5).slice(0, count);
```

**After:**
```typescript
// ✅ Added double validation filter
const beforeFilterCount = tvShows.length;
tvShows = tvShows.filter(show => !excludedTvShowIds.includes(show.id));
const filteredCount = beforeFilterCount - tvShows.length;

if (filteredCount > 0) {
  logger.warn('TV_SHOW_SMART_PICKS', '⚠️ DOUBLE VALIDATION: Found already-rated/watchlist TV shows!', {
    beforeCount: beforeFilterCount,
    afterCount: tvShows.length,
    filteredOut: filteredCount,
    excludedCount: excludedTvShowIds.length,
    breakdown: {
      totalRated: ratedTvShowIds.length,
      watchlist: watchlistTvShowIds.length,
    },
  });
}

logger.info('TV_SHOW_SMART_PICKS', '✅ FINAL TV SHOWS AFTER EXCLUSION FILTER', {
  tvShowsReturning: tvShows.length,
  totalExcluded: excludedTvShowIds.length,
  verifiedNoOverlap: true,
});

// Then shuffle and return
const shuffledShows = tvShows.sort(() => Math.random() - 0.5).slice(0, count);
```

**What `excludedTvShowIds` includes:**
- ✅ All rated TV shows
- ✅ All watchlist TV shows

---

## 🛡️ **Multi-Layer Defense**

The system now has **3 layers of exclusion** to prevent duplicate recommendations:

### **Layer 1: Prompt Instructions** 🧠
- Perplexity is explicitly told to avoid rated/watchlist movies
- Prompts include complete lists of movies to exclude
- Critical rules emphasize "NEVER recommend" these movies

### **Layer 2: Database Filters** 🗄️
- Database queries use `WHERE id NOT IN (excludedMovieIds)`
- Filters applied before fetching from DB
- Prevents already-rated movies from being considered

### **Layer 3: Double Validation (NEW!)** ✅
- **After** Perplexity/DB returns results
- **Before** sending to frontend
- Catches any duplicates that slipped through
- Logs warnings if Perplexity ignored instructions

---

## 📊 **What Gets Excluded**

| Category | Movies | TV Shows | Status |
|----------|--------|----------|--------|
| **Rated: Amazing** | ✅ Excluded | ✅ Excluded | Fixed |
| **Rated: Good** | ✅ Excluded | ✅ Excluded | Fixed |
| **Rated: Meh** | ✅ Excluded | ✅ Excluded | Fixed |
| **Rated: Awful** | ✅ Excluded | ✅ Excluded | Fixed |
| **Rated: Not Interested** | ✅ Excluded | ✅ Excluded | Already worked |
| **In Watchlist** | ✅ Excluded | ✅ Excluded | Fixed |

---

## 🧪 **How to Verify the Fix**

### **Test 1: Rate a Movie**
1. Go to Home page
2. Rate a movie as "Amazing" (e.g., "Inception")
3. Click "AI Picks for Movies" again
4. **Expected:** "Inception" should NOT appear in recommendations
5. **Check logs:**
   ```bash
   tail -100 logs/app-2025-11-15.log | grep "DOUBLE VALIDATION"
   ```
6. **Expected log:** No warnings (or if there are, `filteredOut` count should be > 0)

### **Test 2: Add to Watchlist**
1. Add a movie to watchlist (e.g., "The Dark Knight")
2. Click "AI Picks for Movies"
3. **Expected:** "The Dark Knight" should NOT appear
4. **Check logs:** Should see exclusion count including watchlist items

### **Test 3: Mark as Not Interested**
1. Mark a movie as "Not Interested" (e.g., "Avatar")
2. Click "AI Picks for Movies"
3. **Expected:** "Avatar" should NOT appear
4. **This was already working, but now has double protection**

### **Test 4: TV Shows**
1. Rate a TV show (e.g., "Breaking Bad")
2. Click "AI Picks for TV Shows"
3. **Expected:** "Breaking Bad" should NOT appear
4. **Check logs:** Should see TV show exclusion filter logs

### **Test 5: Multiple Exclusions**
1. Rate 5 movies, add 3 to watchlist, mark 2 as not interested
2. Click "AI Picks for Movies"
3. **Check logs:**
   ```
   totalExcluded: 10  // Should include all 10 movies
   verifiedNoOverlap: true
   ```
4. **Expected:** None of the 10 movies should appear

---

## 📝 **Logs to Monitor**

### **Success Logs:**

```json
{
  "event": "SMART_PICKS",
  "message": "✅ FINAL MOVIES AFTER EXCLUSION FILTER",
  "moviesReturning": 10,
  "totalExcluded": 45,
  "verifiedNoOverlap": true
}
```

### **Warning Logs (If Perplexity Ignores Instructions):**

```json
{
  "event": "SMART_PICKS",
  "level": "warn",
  "message": "⚠️ DOUBLE VALIDATION: Perplexity recommended already-rated/watchlist movies!",
  "beforeCount": 12,
  "afterCount": 10,
  "filteredOut": 2,  // 2 duplicates caught and removed
  "excludedCount": 45,
  "breakdown": {
    "totalRated": 40,
    "notInterested": 3,
    "watchlist": 5
  }
}
```

**What this means:**
- Perplexity returned 12 movies
- 2 of them were already rated/watchlist movies
- The double validation filter caught and removed them
- User receives 10 clean recommendations

---

## 🔄 **Data Flow**

```
User clicks "AI Picks for Movies"
  ↓
API fetches user's ratings & watchlist
  ↓
Creates excludedMovieIds list (ALL rated + watchlist)
  ↓
Builds Perplexity prompt with exclusions
  ↓
Perplexity returns movie recommendations
  ↓
Database filter: excludes movies in excludedMovieIds
  ↓
[NEW] Double Validation: filters out any that slipped through
  ↓
Logs warning if any were filtered (Perplexity ignored instructions)
  ↓
Returns clean, non-duplicate recommendations to user ✅
```

---

## 🎯 **Key Changes**

| File | Line | Change | Impact |
|------|------|--------|--------|
| `/api/search/smart-picks/route.ts` | 610 | Changed filter from `notInterestedMovieIds` to `excludedMovieIds` | Now excludes ALL rated + watchlist movies |
| `/api/search/smart-picks/route.ts` | 613-631 | Enhanced logging | Better debugging, warns if Perplexity ignores instructions |
| `/api/search/smart-picks-tvshows/route.ts` | 178-200 | Added double validation | TV shows now have same protection as movies |

---

## ✅ **Benefits**

1. **No More Duplicate Recommendations**
   - Users won't see movies/TV shows they've already rated
   - Users won't see content in their watchlist
   - Users won't see "not interested" content

2. **Better User Experience**
   - Fresh recommendations every time
   - No wasted slots on already-known content
   - Faster discovery of new content

3. **Fail-Safe Protection**
   - Even if Perplexity ignores prompt instructions (rare but happens)
   - Even if database filter fails (extremely rare)
   - Double validation catches everything

4. **Better Debugging**
   - Logs now show exactly what was filtered
   - Warns when Perplexity ignores instructions
   - Easy to track exclusion effectiveness

---

## 🚨 **Important Notes**

1. **This is a safety net:** The primary exclusion still happens via:
   - Prompt instructions (Layer 1)
   - Database queries (Layer 2)
   - Double validation is Layer 3 (backup)

2. **Performance impact:** Minimal - just a simple array filter on already-fetched data

3. **Backwards compatible:** All existing functionality works exactly the same

4. **Log monitoring:** If you see frequent "DOUBLE VALIDATION" warnings, it means Perplexity is ignoring prompt instructions more than expected - may need to adjust prompts

---

## 🎉 **Fix Complete!**

The AI recommendation system now has robust, multi-layer protection against duplicate recommendations. Users will only see movies and TV shows they haven't interacted with.

**Testing:** Refresh your browser and try rating/watchlisting some content, then request AI picks again. You should never see duplicates! 🚀

