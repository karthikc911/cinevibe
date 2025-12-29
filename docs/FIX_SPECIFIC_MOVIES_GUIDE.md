# 🔧 Fix Specific Movies - Step-by-Step Guide

## Quick Fix Tool

I've created a dedicated page to fix incorrect movie data easily!

**Access it here**: http://localhost:3000/fix-movies

---

## 🎯 Movies to Fix

Based on your report, these movies have incorrect data:
1. **The Matrix**
2. **Paatal Lok** (Note: This might be a TV show, not a movie)
3. **NetErath 3** (Need to verify exact title)

---

## 🚀 Method 1: Use the Fix Movies Page (Easiest)

### Step 1: Open the Fix Tool
```
http://localhost:3000/fix-movies
```

### Step 2: Search for the Movie

**For The Matrix:**
1. Type "The Matrix" in the search box
2. Press Enter or click Search
3. Click on "The Matrix (1999)" from results
4. Movie ID (603) will be added to the refresh list

**For other movies:**
- Search by name
- Click the correct result
- ID gets added automatically

### Step 3: Refresh from TMDB

1. Click the **"Refresh from TMDB"** button
2. Wait for the process to complete (a few seconds)
3. Check the results:
   - ✅ Green = Successfully updated
   - ❌ Red = Error (check error message)

### Step 4: Verify the Fix

1. Hard refresh your browser: `Cmd/Ctrl + Shift + R`
2. Go to your watchlist or rate page
3. Check if the movie now shows correct information

---

## 🔍 Method 2: Using Browser Console

If you know the TMDB movie ID:

```javascript
// Open browser console (F12 → Console)

// Fix The Matrix (ID: 603)
fetch('/api/movies/603/refresh', { method: 'POST' })
  .then(r => r.json())
  .then(data => console.log('✅ Fixed:', data));

// Fix multiple movies at once
fetch('/api/movies/bulk-refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    movieIds: [603, 550, 27205] // The Matrix, Fight Club, Inception
  })
})
  .then(r => r.json())
  .then(data => console.log('✅ Results:', data));
```

---

## 📋 Known Movie IDs

| Movie | TMDB ID | Common Issue |
|-------|---------|--------------|
| The Matrix | 603 | Wrong language (shows Hindi) |
| Fight Club | 550 | Incomplete data |
| Inception | 27205 | Wrong language |
| Parasite | 496243 | Wrong language |
| The Dark Knight | 155 | Incomplete data |

---

## 🔎 How to Find TMDB Movie ID

### Method 1: Use the Search Feature

On the fix-movies page:
1. Type the movie name
2. Search results show the ID: "ID: 603"
3. Click to add it

### Method 2: Check TMDB Website

1. Go to https://www.themoviedb.org/
2. Search for the movie
3. URL will show the ID: `themoviedb.org/movie/603-the-matrix`
4. The number before the dash is the ID

### Method 3: Check Your Database

1. Open Prisma Studio: `npm run db:studio`
2. Browse to "Movie" table
3. Find the movie
4. Check the "id" column

---

## 🎬 Special Case: Paatal Lok

**Note**: "Paatal Lok" is a TV series, not a movie!

If it's in your movie watchlist:
1. It should be in the TV show watchlist instead
2. Check: http://localhost:3000/watchlist
3. Click "TV Shows" tab to verify

**TMDB ID for Paatal Lok**: 103534 (TV Series)

To fix TV shows, the process is different - they use the TV show API, not movie API.

---

## ⚠️ Troubleshooting

### Issue: "Movie not found in TMDB"

**Causes**:
1. Wrong movie ID
2. Movie removed from TMDB
3. TMDB API down

**Solutions**:
- Search for the movie on TMDB.org to verify ID
- Try a different movie ID
- Wait and try again later

---

### Issue: "Still showing wrong data after refresh"

**Solutions**:
1. **Hard refresh browser**: `Cmd/Ctrl + Shift + R`
2. **Clear browser cache**: Settings → Clear browsing data
3. **Check console** for error messages
4. **Verify the fix worked**: Check the results on fix-movies page

---

### Issue: "Search returns no results"

**Solutions**:
- Check spelling
- Try alternative title (e.g., "Matrix" instead of "The Matrix")
- Use the original language title if it's a foreign film
- Search directly on TMDB.org and use the ID

---

## 📊 What Gets Updated

When you refresh a movie, these fields are updated from TMDB:

✅ **Title**: Correct movie title  
✅ **Language**: Correct original language (e.g., "en" for English)  
✅ **Poster**: Correct poster URL  
✅ **Backdrop**: Background image  
✅ **Overview**: Movie description  
✅ **Genres**: Accurate genre list  
✅ **Year**: Release year  
✅ **Runtime**: Movie duration  
✅ **Vote Average**: TMDB rating  
✅ **Vote Count**: Number of votes  

---

## 🎯 Quick Fix Commands

### Fix The Matrix (603)
```javascript
fetch('/api/movies/603/refresh', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

### Fix Multiple Movies
```javascript
fetch('/api/movies/bulk-refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ movieIds: [603, 550, 27205] })
})
  .then(r => r.json())
  .then(console.log);
```

### Check Current Movie Data
```javascript
fetch('/api/movies/603')
  .then(r => r.json())
  .then(data => console.log('Current data:', data.movie));
```

---

## 📝 Example: Fixing The Matrix

### Before Fix
```
Language: Hindi  ❌
Genres: [Wrong genres]
Poster: [Missing or wrong]
```

### After Fix
```
Language: English  ✅
Genres: ["Action", "Science Fiction"]
Poster: https://image.tmdb.org/t/p/w500/... ✅
```

### Steps
1. Go to: http://localhost:3000/fix-movies
2. Search "The Matrix"
3. Click first result (1999)
4. Click "Refresh from TMDB"
5. Wait for success message
6. Hard refresh browser
7. Verify in watchlist

---

## 🔄 Bulk Fix All Problematic Movies

If you have many movies with wrong data:

1. **Open fix-movies page**: http://localhost:3000/fix-movies
2. **Search and add all wrong movies** to the ID list
3. **Click "Refresh from TMDB"** once
4. **All movies updated** in one go!

Example IDs list:
```
603, 550, 27205, 496243, 155, 680, 278
```

---

## 🎨 Visual Guide

### Fix Movies Page Layout

```
┌─────────────────────────────────────────┐
│  🔄 Fix Movie Metadata                  │
│  Refresh movies with incorrect data     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  🔍 Search Movies                       │
│  [Search box]  [Search button]          │
│                                          │
│  Click to add:                           │
│  • The Matrix (1999) - ID: 603          │
│  • The Matrix Reloaded - ID: 604        │
│  • The Matrix Revolutions - ID: 605     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Movie IDs to Refresh                   │
│  [603, 550, 27205]                      │
│  [Refresh from TMDB]                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Results                                 │
│  ✅ Movie 603: The Matrix (EN)         │
│  ✅ Movie 550: Fight Club (EN)         │
│  ✅ Movie 27205: Inception (EN)        │
└─────────────────────────────────────────┘
```

---

## ✅ Success Checklist

After fixing, verify:

- [ ] Movie shows correct language badge
- [ ] Poster loads correctly
- [ ] Genres are accurate
- [ ] Year is correct
- [ ] Title is correct
- [ ] Hard refreshed browser
- [ ] Changes visible in watchlist/rate page

---

## 🆘 Still Having Issues?

If movies still show wrong data after fixing:

1. **Check Prisma Studio**: `npm run db:studio`
   - Browse to Movie table
   - Find the movie by ID
   - Verify data was updated

2. **Check browser console**: `F12 → Console`
   - Look for any API errors
   - Check if movie is being fetched correctly

3. **Try clearing all caches**:
   - Browser cache
   - Application data
   - Hard refresh (Cmd/Ctrl + Shift + R)

4. **Check the actual TMDB page**:
   - Go to https://www.themoviedb.org/movie/603
   - Verify the data is correct there
   - If TMDB data is wrong, contact TMDB support

---

**Quick Link**: http://localhost:3000/fix-movies

Use this tool to fix The Matrix, Paatal Lok, and any other movies with incorrect data! 🎬

