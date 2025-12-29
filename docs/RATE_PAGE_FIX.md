# 🎬 Rate Page Fixes - December 14, 2024

## Issues Fixed

### 1. Movies Already Rated Were Appearing
**Problem**: Movies that the user had already rated were still showing up in the "Rate" page.

**Root Cause**: The API was only filtering out rated movies from the database query, but not from TMDB fetched movies.

**Fix**: 
- ✅ API now excludes BOTH rated movies AND watchlist movies
- ✅ Added double validation for TMDB results
- ✅ Added logging to track exclusions

### 2. "Add to Wishlist" Not Showing Next Movie
**Problem**: Clicking "Add to Wishlist" button added the movie to watchlist but didn't show the next movie.

**Root Cause**: The `handleAddToWatchlist` function was not removing the current movie from the display list.

**Fix**:
- ✅ Movie is now removed from the list after adding to watchlist
- ✅ New movie is automatically loaded if the list becomes empty
- ✅ Previous movie is saved to history (can go back)

---

## Changes Made

### `app/rate/page.tsx`

**Before** (Broken):
```typescript
const handleAddToWatchlist = async () => {
  // Added to watchlist but stayed on same movie
  if (response.ok) {
    addToWatchlist(movie);
    console.log("Added to watchlist successfully");
  }
};
```

**After** (Fixed):
```typescript
const handleAddToWatchlist = async () => {
  // Save to history
  setPreviousMovies((prev) => [...prev, movie]);
  
  if (response.ok) {
    addToWatchlist(movie);
    
    // Remove and show next movie
    setMovies((prev) => {
      const filtered = prev.filter((m) => m.id !== movie.id);
      if (filtered.length === 0) {
        loadMovies(); // Load more
      }
      return filtered;
    });
  }
};
```

### `app/api/rate-movies/route.ts`

**Before** (Only filtered rated):
```typescript
// Only excluded rated movies
const ratedMovieIds = user.ratings.map((r) => r.movieId);

// Query excluded only rated
id: { notIn: ratedMovieIds }
```

**After** (Filters rated + watchlist):
```typescript
// Exclude both rated AND watchlist
const ratedMovieIds = user.ratings.map((r) => r.movieId);
const watchlistMovieIds = user.watchlist.map((w) => w.movieId);
const excludeMovieIds = [...new Set([...ratedMovieIds, ...watchlistMovieIds])];

// Query excludes both
id: { notIn: excludeMovieIds }

// Also skip when fetching from TMDB
if (excludeMovieIds.includes(movie.id)) {
  logger.info('RATE_MOVIES', `Skipping ${movie.title} - already rated or in watchlist`);
  continue;
}
```

---

## How It Works Now

### Rate Movie Flow

```
┌─────────────────┐
│   Load Movies   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Fetches    │
│  Movies from    │
│  Perplexity/DB  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  FILTER OUT:                │
│  ✓ Already rated movies     │
│  ✓ Watchlist movies         │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────┐
│  Show Movie     │
│  Card           │
└────────┬────────┘
         │
    ┌────┴─────┐
    │  Action  │
    └──────────┘
         │
    ┌────┴────┬─────────────┐
    │         │             │
    ▼         ▼             ▼
┌───────┐ ┌────────┐ ┌─────────────┐
│ Rate  │ │ Skip   │ │ Add to      │
│ Movie │ │        │ │ Watchlist   │
└───┬───┘ └────┬───┘ └──────┬──────┘
    │          │            │
    ▼          ▼            ▼
┌─────────────────────────────────┐
│  REMOVE current movie from list │
│  SHOW next movie                │
│  LOAD more if empty             │
└─────────────────────────────────┘
```

### Watchlist Button Flow

```
User clicks "Add to Watchlist"
         │
         ▼
┌─────────────────────┐
│ Save movie to       │
│ previousMovies      │
│ (for back button)   │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ POST /api/watchlist │
│ Add to database     │
└────────┬────────────┘
         │
    ┌────┴────┐
    │ Success │
    └────┬────┘
         │
         ▼
┌─────────────────────────┐
│ Update local store      │
│ Remove from display list│
│ Show next movie         │
│ Load more if empty      │
└─────────────────────────┘
```

---

## Testing

### Test 1: Rated Movies Don't Appear

1. Go to Rate page: `http://localhost:3000/rate`
2. Rate several movies (Amazing, Good, Meh, Awful)
3. Click "Generate Movies" again
4. **Verify**: Previously rated movies should NOT appear

### Test 2: Watchlist Movies Don't Appear

1. Add movies to watchlist from Rate page
2. Click "Generate Movies" again
3. **Verify**: Watchlist movies should NOT appear

### Test 3: Add to Wishlist Shows Next Movie

1. Go to Rate page
2. Click the heart/wishlist button on a movie
3. **Verify**: Movie changes to the next one immediately
4. Check browser console:
   ```
   Added to watchlist successfully
   ```

### Test 4: Go Back Works

1. Add a movie to watchlist
2. Click the "Back" button (left arrow)
3. **Verify**: Previous movie reappears

---

## Console Logs

### API Logs

```
RATE_MOVIES: Excluding movies {
  ratedCount: 15,
  watchlistCount: 8,
  totalExcluded: 23
}

RATE_MOVIES: Skipping "Inception" - already rated or in watchlist
```

### Frontend Logs

```
Added to watchlist successfully
✅ Movie removed from list, showing next
```

---

## Files Modified

1. `app/rate/page.tsx` - Fixed handleAddToWatchlist
2. `app/api/rate-movies/route.ts` - Added watchlist filtering

---

## Summary

| Issue | Status |
|-------|--------|
| Rated movies appearing | ✅ FIXED |
| Watchlist movies appearing | ✅ FIXED |
| Add to wishlist not showing next | ✅ FIXED |
| Back button after wishlist | ✅ WORKS |

**Result**: Rate page now correctly:
- Excludes already rated movies
- Excludes movies in watchlist
- Shows next movie after adding to watchlist

