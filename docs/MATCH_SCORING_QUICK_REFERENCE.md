# Match Scoring - Quick Reference Guide

> **Quick edits for adjusting match percentages and scoring logic**

---

## 🎯 Current Scoring

| Factor | Points | File Location |
|--------|--------|---------------|
| Base Score | 70 | Line ~528 (movies), ~258 (TV) |
| Language Match | +15 | Line ~537 (movies), ~270 (TV) |
| High Rating (≥8.0) | +10 | Line ~549 (movies), ~282 (TV) |
| Good Rating (≥7.0) | +5 | Line ~559 (movies), ~292 (TV) |
| Genre Match | +10/genre (max 20) | Line ~571 (movies), ~304 (TV) |
| Recent (≥2023) | +8 | Line ~589 (movies), ~322 (TV) |
| Recent (≥2020) | +5 | Line ~598 (movies), ~331 (TV) |
| Very Popular (≥10K votes) | +12 | Line ~610 (movies) |
| Very Popular (≥5K votes) | +12 | Line ~343 (TV) |
| Popular (≥5K votes) | +7 | Line ~619 (movies) |
| Popular (≥2K votes) | +7 | Line ~352 (TV) |
| AI Personalized | +10 | Line ~631 (movies), ~364 (TV) |
| **Max Score** | **95** | Line ~643 (movies), ~376 (TV) |

---

## 📁 File Locations

```
/app/api/search/smart-picks/route.ts          ← Movies
/app/api/search/smart-picks-tvshows/route.ts  ← TV Shows
/components/MovieMeta.tsx                     ← Badge display
/components/MatchReasoningModal.tsx           ← Popup modal
/lib/data.ts                                  ← TypeScript types
```

---

## ⚡ Common Edits

### Change Base Score
```typescript
// File: smart-picks/route.ts (line ~528)
let match = 70;  // Change this number
```

### Make Language More Important
```typescript
// File: smart-picks/route.ts (line ~537)
const langScore = 20;  // Was 15
```

### Lower Rating Threshold
```typescript
// File: smart-picks/route.ts (line ~549)
if (movie.imdbRating >= 7.5 || movie.voteAverage >= 7.5) {  // Was 8.0
  const ratingScore = 10;
```

### Adjust Popularity Requirements
```typescript
// File: smart-picks/route.ts (line ~610)
if (movie.voteCount >= 5000) {  // Was 10000
  const popScore = 12;
```

### Change Max Score
```typescript
// File: smart-picks/route.ts (line ~643)
const finalMatch = Math.min(99, match);  // Was 95
```

---

## 🆕 Add New Factor Template

```typescript
// Add inside calculateMatchPercentage() function
// Before the "Cap at 95%" line

// [YOUR FACTOR NAME] (0-XX points)
if (movie.YOUR_FIELD && YOUR_CONDITION) {
  const yourScore = 15;  // Choose points
  match += yourScore;
  reasons.push({
    factor: "Your Factor Name",
    score: yourScore,
    description: `Explanation of why this matters`,
    icon: "heart"  // heart|star|trending|calendar|globe|sparkles
  });
}
```

**Remember to add to BOTH files:**
- `/app/api/search/smart-picks/route.ts` (movies)
- `/app/api/search/smart-picks-tvshows/route.ts` (TV shows)

---

## 🎨 Icon Options

```typescript
"heart"     → ❤️  Personal preferences (genre, director)
"star"      → ⭐ Quality (ratings, awards)
"trending"  → 📈 Popularity (votes, views)
"calendar"  → 📅 Recency (release date)
"globe"     → 🌍 Language/Region
"sparkles"  → ✨ AI/Personalization
```

---

## 🧪 Test Locally

1. **Generate AI picks**
   ```
   Click "AI Picks for Movies" or "AI Picks for TV Shows"
   ```

2. **Check match percentage**
   ```
   Should show "💯 XX% Match" on each card
   ```

3. **Click to see reasoning**
   ```
   Modal should open with breakdown
   ```

4. **Verify calculations**
   ```
   Open browser console
   Check server logs for calculation details
   ```

---

## 📊 Scoring Examples

### High Match (92%)
```
Base: 70 + Language: 15 + High Rating: 10 + Genre: 20
+ Recent: 8 + Popular: 12 + AI: 10 = 145 → Capped at 95%
```

### Medium Match (85%)
```
Base: 70 + Language: 15 + High Rating: 10 + Genre: 10
+ Recent: 8 + Popular: 7 + AI: 10 = 130 → Shows 95%
(Adjust base or factors to get 85%)
```

### Low Match (75%)
```
Base: 70 + Language: 15 + Good Rating: 5 = 90
(or Base: 70 + Good Rating: 5 = 75 with no language match)
```

---

## 🔍 Debugging

### Backend (Server Console)
```typescript
// Add to calculateMatchPercentage():
console.log(`Calculating: ${movie.title}`);
console.log(`Score: ${match}%`);
console.log(`Reasons:`, reasons);
```

### Frontend (Browser Console)
```typescript
// Check API response:
// Network tab → smart-picks → Response
// Look for matchPercent and matchReasons
```

---

## ⚠️ Important Notes

1. **Always update BOTH files** (movies + TV shows)
2. **Keep total possible > 95** (ensures variety in scores)
3. **Test with different user profiles** (with/without preferences)
4. **Restart dev server** after changes
5. **Check browser console** for errors

---

## 🚀 Deploy Changes

```bash
# After editing code:
npm run build    # Check for errors
npm run dev      # Test locally

# When ready:
git add .
git commit -m "Adjust match scoring logic"
git push
```

---

## 📝 Change Log Template

When modifying scores, document here:

```
Date: YYYY-MM-DD
Changed: [Factor name] from X to Y points
Reason: [Why you made this change]
Result: [What happened to average scores]
```

---

**Quick Links:**
- [Full Documentation](./MATCH_REASONING_DOCUMENTATION.md)
- [Code: Movies API](./app/api/search/smart-picks/route.ts)
- [Code: TV Shows API](./app/api/search/smart-picks-tvshows/route.ts)
- [Code: Modal UI](./components/MatchReasoningModal.tsx)

