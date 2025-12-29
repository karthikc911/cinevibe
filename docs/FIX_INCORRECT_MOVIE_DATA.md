# 🔧 How to Fix Incorrect Movie Metadata

## Problem

Some movies in the database have incorrect information:
- **Example**: The Matrix (ID: 603) showing as Hindi instead of English
- **Cause**: Old or corrupted data in database

## Solution

### Method 1: Automatic Refresh (Recommended)

The movie API now automatically refreshes data from TMDB when:
1. Movie has no language set
2. Movie has no poster path
3. Movie data seems incomplete

**How it works**:
- When you view a movie, the API checks data quality
- If data is bad, it automatically fetches fresh data from TMDB
- Database is updated with correct information

**Action Required**: Just view the movie in the app (watchlist, rate page, etc.)

### Method 2: Manual API Refresh

Use the refresh API endpoint to force update a specific movie:

```bash
# In your browser console or using curl:
fetch('/api/movies/603/refresh', { method: 'POST' })
  .then(r => r.json())
  .then(data => console.log('Fixed:', data));
```

**Or use curl**:
```bash
curl -X POST http://localhost:3000/api/movies/603/refresh \
  -H "Cookie: your-session-cookie"
```

### Method 3: Fix via Watchlist

1. Go to your watchlist: http://localhost:3000/watchlist
2. The page will automatically fetch fresh movie details
3. Incorrect data will be updated from TMDB

### Method 4: Clear and Re-add

1. Remove the movie from your watchlist
2. Search for it again
3. Add it back to watchlist
4. Fresh data will be fetched from TMDB

## Specific Fix for The Matrix

The Matrix (TMDB ID: 603) should be:
- **Language**: English (en)
- **Original Language**: English
- **Genres**: Action, Science Fiction

To fix it:

1. **Option A**: Just view it in your watchlist - it will auto-refresh
2. **Option B**: Call the refresh API:
   ```javascript
   // In browser console
   fetch('/api/movies/603/refresh', { method: 'POST' })
     .then(r => r.json())
     .then(data => console.log('✅ The Matrix fixed:', data));
   ```

## How the Auto-Fix Works

```typescript
// In app/api/movies/[id]/route.ts

// Check if movie needs refresh
const needsRefresh = movie && (
  !movie.language ||           // Missing language
  movie.language === '' ||     // Empty language
  !movie.posterPath            // Missing poster
);

if (needsRefresh) {
  // Fetch fresh data from TMDB
  // Update database
  // Return corrected data
}
```

## Verify the Fix

After fixing, check the movie card:
- ✅ Language badge should show "English" (not "Hindi")
- ✅ Poster should load correctly
- ✅ Genres should be accurate

## Console Output

When a movie is auto-fixed, you'll see:

```
📘 INFO [GET_MOVIE] Movie needs refresh from TMDB
{
  "movieId": 603,
  "reason": "missing language"
}

📘 INFO [GET_MOVIE] TMDB movie data fetched
{
  "movieId": 603,
  "title": "The Matrix",
  "original_language": "en",
  "genres": ["Action", "Science Fiction"]
}

✅ Movie updated in database
```

## Prevent Future Issues

### 1. Always Fetch from TMDB First

When adding new movies, ensure TMDB data is fetched:
```typescript
const tmdbResponse = await fetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}`);
const tmdbMovie = await tmdbResponse.json();

// Use tmdbMovie.original_language (not guessed language)
```

### 2. Update Existing Data

The movie API now uses `update: movieData` in the upsert:
```typescript
await prisma.movie.upsert({
  where: { id: movieId },
  create: movieData,
  update: movieData, // ✅ Updates existing records with fresh data
});
```

### 3. Validate Before Saving

Check data quality before saving:
```typescript
if (!tmdbMovie.original_language) {
  logger.warn('Missing language data from TMDB');
}
```

## Files Created/Modified

### Created
1. **`app/api/movies/[id]/refresh/route.ts`** - Manual refresh endpoint
2. **`scripts/fix-movie-metadata.ts`** - Batch fix script
3. **`docs/FIX_INCORRECT_MOVIE_DATA.md`** (this file)

### Modified
1. **`app/api/movies/[id]/route.ts`** - Auto-refresh logic
2. **`package.json`** - Added `db:fix-movie` script

## Usage Examples

### Fix Single Movie
```bash
npm run db:fix-movie 603
```

### Fix Multiple Movies
Edit `scripts/fix-movie-metadata.ts` and add movie IDs:
```typescript
const problematicMovies = [
  603,  // The Matrix
  550,  // Fight Club
  // Add more...
];
```

Then run:
```bash
npm run db:fix-movie
```

## Common Movie IDs

| Movie | TMDB ID | Common Issue |
|-------|---------|--------------|
| The Matrix | 603 | Wrong language |
| Fight Club | 550 | Missing poster |
| Inception | 27205 | Incomplete data |
| Parasite | 496243 | Wrong language |

---

**Quick Fix**: Just view the movie in your watchlist - it will automatically refresh from TMDB! 🔄

