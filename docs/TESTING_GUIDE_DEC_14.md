# 🧪 Testing Guide - December 14, 2024 Fixes

## Quick Test Summary

All fixes are ready to test! Follow this guide to verify everything works.

---

## 🎬 Test 1: Movie Metadata Accuracy

### What to Test
Verify that movies show correct language and details.

### Steps

1. **Go to Watchlist**:
   ```
   http://localhost:3000/watchlist
   ```

2. **Find The Matrix** (or any English movie)

3. **Check the language badge**:
   - ✅ Should show "English" (not "Hindi" or wrong language)
   - ✅ Badge should be on top-left of poster

4. **Check browser console** for auto-fix logs:
   ```javascript
   📘 INFO [GET_MOVIE] Movie needs refresh from TMDB
   📘 INFO [GET_MOVIE] TMDB movie data fetched
   {
     "original_language": "en"  // Correct!
   }
   ```

5. **Verify other movies**:
   - English movies → "English" badge
   - Hindi movies → "Hindi" badge
   - Korean movies → "Korean" badge

### Expected Result
✅ All movies show correct language  
✅ No English movies labeled as Hindi  
✅ Console shows refresh logs if data was corrected

---

## 📺 Test 2: Watchlist Movie/TV Show Separation

### What to Test
Verify that movies and TV shows are properly categorized with correct badges.

### Steps

1. **Go to Watchlist**:
   ```
   http://localhost:3000/watchlist
   ```

2. **Check the "All" tab**:
   - Movies should have **cyan "Movie"** badges
   - TV shows should have **purple "TV"** badges
   - Both types should be visible

3. **Click "Movies" tab**:
   - ✅ Should show ONLY movies
   - ✅ All should have cyan badges
   - ✅ Tab label shows correct count: "Movies (X)"

4. **Click "TV Shows" tab**:
   - ✅ Should show ONLY TV shows
   - ✅ All should have purple badges
   - ✅ Tab label shows correct count: "TV Shows (Y)"

5. **Verify counts add up**:
   - Total in "All" = Movies count + TV Shows count

### Expected Result
✅ Movies and TV shows properly separated  
✅ Correct color badges (cyan/purple)  
✅ Filtering works perfectly  
✅ Counts are accurate

---

## 🎯 Test 3: My Ratings Page Improvements

### What to Test
Verify tiny thumbnails, CSV export, and skipped category.

### Steps

1. **Go to My Ratings**:
   ```
   http://localhost:3000/my-ratings
   ```

2. **Check Tiny Thumbnails**:
   - ✅ Should see 3-10 columns (depending on screen size)
   - ✅ Much smaller cards than before
   - ✅ More movies visible at once (up to 24 per page)
   - ✅ Tiny text (10-12px font size)

3. **Check Header**:
   - ✅ Should show: "X rated • Y not interested • Z skipped"
   - ✅ Should have "Export CSV" button next to item count

4. **Test CSV Export**:
   - Click "Export CSV" button
   - ✅ File downloads: `my-movie-ratings-2024-12-14.csv`
   - Open in Excel/Google Sheets
   - ✅ Verify data: Title, Year, Rating, Language, Date

5. **Test Skipped Filter**:
   - ✅ Should see "⏭️ Skipped (X)" button
   - Click it
   - ✅ Shows only skipped movies
   - ✅ Count matches

6. **Verify Total Count**:
   - Add up: Rated + Not Interested + Skipped
   - ✅ Should equal total item count

7. **Check Stats Breakdown**:
   - ✅ Should show 6 boxes (including Skipped)
   - ✅ All counts should be accurate

### Expected Result
✅ Thumbnails are tiny (24 per page)  
✅ CSV export downloads correctly  
✅ Skipped category exists and works  
✅ Total counts add up properly  
✅ No "Loading movie posters..." message

---

## 🔄 Test 4: Watchlist Rendering

### What to Test
Verify no rendering issues or console spam.

### Steps

1. **Go to Watchlist**:
   ```
   http://localhost:3000/watchlist
   ```

2. **Open Browser Console** (F12 → Console)

3. **Check for issues**:
   - ✅ Should NOT see repeated debug logs
   - ✅ Should NOT see infinite loop
   - ✅ Console should be clean

4. **Interact with page**:
   - Switch between tabs
   - Remove items
   - Add items
   - ✅ Page should be smooth and responsive

### Expected Result
✅ No console spam  
✅ No rendering issues  
✅ Smooth performance  
✅ Clean logs

---

## 📱 Test 5: Responsive Design

### What to Test
Verify layouts work on different screen sizes.

### Steps

1. **Open My Ratings**: http://localhost:3000/my-ratings

2. **Resize browser window** (or use DevTools device toolbar)

3. **Check grid columns**:
   - **Mobile (< 640px)**: 3 columns
   - **Small (640-768px)**: 4 columns
   - **Medium (768-1024px)**: 6 columns
   - **Large (1024-1280px)**: 8 columns
   - **XL (> 1280px)**: 10 columns

4. **Verify readability**:
   - Text should be readable (even if tiny)
   - Badges should be visible
   - Hover effects should work

### Expected Result
✅ Grid adapts to screen size  
✅ More columns on larger screens  
✅ Text remains readable  
✅ Touch-friendly on mobile

---

## 🎨 Visual Verification

### Movie Card Language Badge

**Before** (Wrong):
```
┌─────────────┐
│ [Hindi] 🎬 │  ← Wrong! (The Matrix is English)
│  [Poster]   │
│  The Matrix │
└─────────────┘
```

**After** (Correct):
```
┌─────────────┐
│ [English] 🎬│  ← Correct!
│  [Poster]   │
│  The Matrix │
└─────────────┘
```

### Watchlist Badges

**Movies** (Cyan):
```
┌─────────────┐
│ [English]   │
│ [Movie] 🎬 │  ← Cyan badge
│  [Poster]   │
└─────────────┘
```

**TV Shows** (Purple):
```
┌─────────────┐
│ [English]   │
│ [TV] 📺    │  ← Purple badge
│  [Poster]   │
└─────────────┘
```

### My Ratings Grid

**Before** (12 per page):
```
[M1] [M2] [M3] [M4] [M5] [M6]
[M7] [M8] [M9] [M10] [M11] [M12]
```

**After** (24 per page, 10 columns):
```
[M1] [M2] [M3] [M4] [M5] [M6] [M7] [M8] [M9] [M10]
[M11] [M12] [M13] [M14] [M15] [M16] [M17] [M18] [M19] [M20]
[M21] [M22] [M23] [M24]
```

---

## 🐛 Known Issues (Should Be Fixed)

| Issue | Status | Test |
|-------|--------|------|
| Movies showing wrong language | ✅ Fixed | Check language badges |
| Watchlist not separating movies/TV | ✅ Fixed | Check tab filtering |
| My Ratings loading message | ✅ Fixed | Should load silently |
| Total count not matching | ✅ Fixed | Check header counts |
| Watchlist rendering issues | ✅ Fixed | Check console |

---

## 🔍 Debugging Tips

### If Movie Still Shows Wrong Language

1. **Check console** for refresh logs
2. **Hard refresh browser**: `Cmd/Ctrl + Shift + R`
3. **Call refresh API manually**:
   ```javascript
   fetch('/api/movies/603/refresh', { method: 'POST' })
     .then(r => r.json())
     .then(console.log);
   ```

### If Watchlist Not Separating

1. **Check console** for type fields:
   ```javascript
   { title: "The Matrix", type: "movie", mediaType: "movie" }
   { title: "Breaking Bad", type: "tvshow", mediaType: "tv" }
   ```
2. **Verify badges** are showing (cyan vs purple)
3. **Test filtering** by clicking tabs

### If CSV Export Not Working

1. **Check browser console** for errors
2. **Verify you have ratings** (button disabled if empty)
3. **Check Downloads folder** for the file

---

## ✅ Success Criteria

All tests pass if:

- ✅ **Language badges accurate** on all movie cards
- ✅ **Movies/TV shows separated** in watchlist with correct badges
- ✅ **My Ratings shows 24 tiny thumbnails** per page
- ✅ **CSV export downloads** working file
- ✅ **Skipped category** exists and shows correct count
- ✅ **Total counts accurate**: Rated + Not Interested + Skipped = Total
- ✅ **No console spam** or rendering issues
- ✅ **All posters load** correctly

---

## 📊 Performance Expectations

| Metric | Expected |
|--------|----------|
| Watchlist load time | < 2 seconds |
| My Ratings load time | < 1 second |
| CSV export time | Instant |
| Movie metadata refresh | < 500ms |
| Page rendering | Smooth, no lag |

---

## 🆘 If Something's Not Working

1. **Hard refresh browser**: `Cmd/Ctrl + Shift + R`
2. **Check browser console** for errors
3. **Check server terminal** for API logs
4. **Clear browser cache** completely
5. **Restart dev server** if needed

---

**Ready to test!** Start with the watchlist page and verify The Matrix shows "English" instead of "Hindi". 🎬

