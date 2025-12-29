# 🎬 CineVibe Database Setup & Movie Population Guide

## ✅ What's Been Fixed

### 1. **Ratings Sync to Database** ✅
- **Problem**: Movie ratings were only stored in local storage (Zustand), never synced to PostgreSQL
- **Solution**: Created `lib/ratings-api.ts` and integrated with the store
- **Result**: Every rating now automatically syncs to the database

### 2. **Watchlist Sync to Database** ✅
- **Problem**: Watchlist was only stored in local storage
- **Solution**: Created `lib/watchlist-api.ts` and integrated with the store
- **Result**: Every watchlist addition/removal now syncs to the database

### 3. **Movies Table Added** ✅
- **New Model**: Added `Movie` table to Prisma schema
- **Fields**: TMDB ID, title, overview, poster, ratings, genres, language, etc.
- **Indexes**: Optimized for searching by language, rating, and popularity
- **Migration**: Already pushed to your Supabase database

---

## 🔑 Get Your TMDB API Key (Required)

The TMDB (The Movie Database) API is **FREE** and provides access to millions of movies!

### Step 1: Sign Up for TMDB
1. Go to: **https://www.themoviedb.org/signup**
2. Create a free account

### Step 2: Request API Key
1. Go to: **https://www.themoviedb.org/settings/api**
2. Click **"Request an API Key"`
3. Choose **"Developer"** (free tier)
4. Fill in the form:
   - **Application Name**: "CineVibe" (or anything)
   - **Application URL**: http://localhost:3000
   - **Application Summary**: "Personal movie recommender app"
5. Accept terms and submit
6. You'll receive your API key instantly!

### Step 3: Add to Environment
Copy your API key and add it to `.env.local`:

```bash
# Open .env.local and replace the placeholder:
TMDB_API_KEY="your-actual-tmdb-api-key-here"
```

---

## 🚀 Populate Your Database with Real Movies

Once you have your TMDB API key, run:

```bash
npm run populate:movies
```

### What This Script Does:
- ✅ Fetches **top 25 highly-rated movies** for **12 languages**:
  - English, Hindi, Spanish, French, Japanese, Korean, Chinese, German, Italian, Portuguese, Russian, Arabic
- ✅ Filters movies with:
  - **Vote count ≥ 100** (popular movies only)
  - **Vote average ≥ 6.5** (high-quality movies)
- ✅ Stores complete movie data:
  - Title, overview, poster image
  - Release year, genres
  - TMDB ratings, vote counts
  - Original language
- ✅ **~300 movies total** (25 per language)

### Expected Output:
```
🎬 Starting movie population from TMDB API...

📚 Processing English (en)...
  Fetching movies for en...
    Page 1: Found 20 movies (total: 20)
    Page 2: Found 20 movies (total: 40)
  ✓ Found 25 movies
  ✓ Added: The Shawshank Redemption (1994) - ⭐ 8.7
  ✓ Added: The Godfather (1972) - ⭐ 8.7
  ...

📚 Processing Hindi (hi)...
  ...

✅ Movie population complete!
   Total movies added/updated: 300
   Total skipped: 0

📊 Movies by Language:
----------------------------------------
  English         25 movies
  Hindi           25 movies
  Spanish         25 movies
  ...
----------------------------------------
  TOTAL           300 movies
```

---

## 🧪 Validate Ratings & Watchlist Sync

### Test Ratings API
```bash
curl http://localhost:3000/api/ratings/debug
```

Expected response:
```json
{
  "success": true,
  "userId": "...",
  "userName": "Your Name",
  "totalRatings": 15,
  "ratingBreakdown": [
    { "rating": "amazing", "count": 5 },
    { "rating": "good", "count": 7 },
    { "rating": "awful", "count": 2 },
    { "rating": "not-seen", "count": 1 }
  ],
  "recentRatings": [...]
}
```

### Test Watchlist API
```bash
curl http://localhost:3000/api/watchlist/debug
```

Expected response:
```json
{
  "success": true,
  "userId": "...",
  "userName": "Your Name",
  "watchlistCount": 8,
  "watchlist": [...]
}
```

### Manual Database Check (Prisma Studio)
```bash
npm run db:studio
```

This opens a web UI at `http://localhost:5555` where you can:
- View all tables
- Check `MovieRating` and `WatchlistItem` tables
- See real-time data as you rate movies

---

## 🔄 How the Database Sync Works

### When You Rate a Movie:
1. **Local Store** (Zustand) updates immediately → instant UI feedback
2. **API Call** (background) syncs to PostgreSQL via `/api/ratings`
3. **RAG Analysis** triggers on backend to update user preferences
4. **Vector Embeddings** are generated for AI recommendations

### When You Add to Watchlist:
1. **Local Store** updates immediately
2. **API Call** syncs to PostgreSQL via `/api/watchlist`
3. Database maintains the source of truth

### Benefits:
- ✅ **Offline-first UX**: Instant updates, no loading spinners
- ✅ **Data persistence**: Never lose ratings even if you clear browser
- ✅ **Multi-device**: Login from phone/tablet and see same data
- ✅ **AI-powered**: RAG uses database to generate better recommendations

---

## 📊 Database Schema Overview

### Core Tables:

```
User
├── id, email, name, image (from Google OAuth)
├── createdAt, updatedAt
└── Relations: MovieRating[], WatchlistItem[], UserPreference[]

MovieRating
├── id, userId, movieId, movieTitle, movieYear, rating
├── rating: "awful" | "good" | "amazing" | "not-seen"
└── Unique constraint: (userId, movieId)

WatchlistItem
├── id, userId, movieId, movieTitle, movieYear, addedAt
└── Unique constraint: (userId, movieId)

Movie (NEW!)
├── id (TMDB ID), title, originalTitle, overview
├── posterPath, backdropPath, releaseDate, year
├── voteAverage, voteCount, popularity
├── language, genres[], runtime, tagline
└── Indexed by: language, voteAverage, voteCount, popularity

UserPreference (RAG)
├── id, userId, preferenceType, value, strength
├── embedding: vector(1536) ← OpenAI embedding
└── Used for: AI recommendations, similarity search
```

---

## 🎯 Next Steps

### 1. Get TMDB API Key
   - Sign up at https://www.themoviedb.org/signup
   - Request API key at https://www.themoviedb.org/settings/api
   - Add to `.env.local`

### 2. Populate Database
   ```bash
   npm run populate:movies
   ```

### 3. Test the App
   - Go to http://localhost:3000/rate
   - Rate 5-10 movies
   - Check `/api/ratings/debug` to verify sync

### 4. View Database
   ```bash
   npm run db:studio
   ```

### 5. Test AI Recommendations (Coming Soon)
   - Once you've rated enough movies, visit `/home`
   - AI will use RAG to suggest personalized movies

---

## 🛠️ Troubleshooting

### "No TMDB API key found"
**Solution**: Add `TMDB_API_KEY` to `.env.local` and restart the dev server

### "Failed to sync rating to backend"
**Solution**: Check browser console → Network tab → Look for 401 errors (means not logged in)

### "Database connection failed"
**Solution**: Verify `DATABASE_URL` in `.env.local` is correct

### Movies not appearing after populate
**Solution**: 
```bash
# Check if movies were added
npm run db:studio
# Navigate to "Movie" table and verify rows exist
```

---

## 📚 API Documentation

### Ratings API

**POST /api/ratings**
```json
{
  "movieId": 550,
  "movieTitle": "Fight Club",
  "movieYear": "1999",
  "rating": "amazing"
}
```

**GET /api/ratings**
Returns all ratings for logged-in user

**DELETE /api/ratings?movieId=550**
Removes a rating

### Watchlist API

**POST /api/watchlist**
```json
{
  "movieId": 550,
  "movieTitle": "Fight Club",
  "movieYear": "1999"
}
```

**GET /api/watchlist**
Returns all watchlist items for logged-in user

**DELETE /api/watchlist?movieId=550**
Removes from watchlist

---

## 🎬 Summary

You now have:
- ✅ **Ratings syncing to PostgreSQL** (fixed!)
- ✅ **Watchlist syncing to PostgreSQL** (fixed!)
- ✅ **Movies table ready** for 300+ real movies
- ✅ **TMDB integration script** to populate database
- ✅ **Debug endpoints** to verify everything works
- ✅ **RAG architecture** ready for AI recommendations

**Next**: Get your free TMDB API key and run `npm run populate:movies`! 🚀

