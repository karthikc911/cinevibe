# 🚨 QUICK FIX: Wrong Movie Information

## The Problem
Some movies show incorrect information (wrong language, missing posters, etc.)

**Examples**: The Matrix, Paatal Lok, NetErath 3

---

## ⚡ FASTEST FIX (30 seconds)

### Step 1: Open the Fix Tool
```
http://localhost:3000/fix-movies
```

### Step 2: Search for Your Movie
- Type the movie name in the search box
- Click on the correct result from the list

### Step 3: Click "Refresh from TMDB"
- Wait a few seconds
- See green checkmarks for success

### Step 4: Hard Refresh Your Browser
```
Mac: Cmd + Shift + R
Windows: Ctrl + Shift + R
```

### Step 5: Verify
- Go to your watchlist
- Check if the movie now shows correct information

---

## 🎯 Specific Fixes

### The Matrix (Shows as Hindi)
```javascript
// In browser console (F12):
fetch('/api/movies/603/refresh', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

### Multiple Movies at Once
1. Go to: http://localhost:3000/fix-movies
2. Enter IDs: `603, 550, 27205` (comma-separated)
3. Click "Refresh from TMDB"
4. Wait for completion
5. Hard refresh browser

---

## 📝 Quick Commands

### Fix Single Movie
```javascript
fetch('/api/movies/[MOVIE_ID]/refresh', { method: 'POST' })
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

---

## ✅ After Fixing

1. Hard refresh browser (Cmd/Ctrl + Shift + R)
2. Go to watchlist/rate page
3. Verify language badges are correct
4. Verify posters load
5. Done! ✨

---

## 🔗 Links

- **Fix Tool**: http://localhost:3000/fix-movies
- **Watchlist**: http://localhost:3000/watchlist
- **Detailed Guide**: docs/FIX_SPECIFIC_MOVIES_GUIDE.md

---

**Need Help?** Check the detailed guide in `docs/FIX_SPECIFIC_MOVIES_GUIDE.md`

