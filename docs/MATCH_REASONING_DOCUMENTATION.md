# Match Reasoning System Documentation

## Overview

The Match Reasoning System calculates personalized match scores (0-95%) for movies and TV shows based on user preferences, viewing history, and content attributes. Each match score comes with detailed reasoning that users can view by clicking the match percentage.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Scoring Algorithm](#scoring-algorithm)
3. [Code Locations](#code-locations)
4. [Modifying the Logic](#modifying-the-logic)
5. [Adding New Factors](#adding-new-factors)
6. [Testing](#testing)
7. [Examples](#examples)

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    User Clicks "AI Picks"                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          API: /api/search/smart-picks (Movies)               │
│          API: /api/search/smart-picks-tvshows (TV)           │
│                                                              │
│  1. Fetch user preferences (languages, genres, ratings)     │
│  2. Query database for matching content                     │
│  3. For each item: calculateMatchPercentage()               │
│  4. Return movies/shows with matchPercent & matchReasons    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Frontend: MovieMeta Component                   │
│                                                              │
│  - Displays: "💯 85% Match"                                  │
│  - Clickable badge with hover effect                        │
│  - Opens MatchReasoningModal on click                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           MatchReasoningModal Component                      │
│                                                              │
│  - Circular progress indicator                              │
│  - List of match factors with scores                        │
│  - Color-coded cards (green/cyan/yellow)                    │
│  - Icons for each factor                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Scoring Algorithm

### Base Score: 70 Points

Every movie/TV show starts with a base score of **70%**. Additional points are awarded based on various factors.

### Maximum Score: 95%

The final score is capped at **95%** to indicate that no match is ever "perfect" (leaving room for serendipity).

---

### Movie Scoring Factors

| Factor | Points | Condition | Description |
|--------|--------|-----------|-------------|
| **Language Match** | +15 | Movie language in user preferences | Rewards content in preferred languages |
| **Highly Rated** | +10 | IMDB ≥ 8.0 OR voteAverage ≥ 8.0 | Excellent ratings |
| **Good Rating** | +5 | IMDB ≥ 7.0 OR voteAverage ≥ 7.0 | Solid ratings |
| **Genre Match** | +10/genre | Up to 2 matching genres (max +20) | Matches preferred genres |
| **Recently Released** | +8 | Year ≥ 2023 | Very recent content |
| **Recent Release** | +5 | Year ≥ 2020 | Recent content |
| **Widely Acclaimed** | +12 | voteCount ≥ 10,000 | Highly popular |
| **Popular Choice** | +7 | voteCount ≥ 5,000 | Moderately popular |
| **AI Personalized** | +10 | User has rated movies | Based on rating history |

**Total Possible:** 70 (base) + 15 + 10 + 20 + 8 + 12 + 10 = **145 points** → Capped at **95%**

---

### TV Show Scoring Factors

Same as movies with adjusted thresholds:

| Factor | Points | Condition | Description |
|--------|--------|-----------|-------------|
| **Language Match** | +15 | Same as movies | |
| **Highly Rated** | +10 | IMDB ≥ 8.0 OR voteAverage ≥ 8.0 | |
| **Good Rating** | +5 | IMDB ≥ 7.0 OR voteAverage ≥ 7.0 | |
| **Genre Match** | +10/genre | Up to 2 matching genres (max +20) | |
| **Recently Released** | +8 | Year ≥ 2023 | |
| **Recent Release** | +5 | Year ≥ 2020 | |
| **Widely Acclaimed** | +12 | voteCount ≥ 5,000 | ← Lower threshold for TV |
| **Popular Choice** | +7 | voteCount ≥ 2,000 | ← Lower threshold for TV |
| **AI Personalized** | +10 | User has rated TV shows | |

---

## Code Locations

### Backend APIs

#### Movies
**File:** `/app/api/search/smart-picks/route.ts`

**Key Function:**
```typescript
// Line ~527
const calculateMatchPercentage = (movie: any) => {
  let match = 70; // Base match
  const reasons: any[] = [];
  
  // ... scoring logic
  
  return { matchPercent: finalMatch, matchReasons: reasons };
};
```

**Usage:**
```typescript
// Line ~684-709
const transformedMovies = enrichedMovies.map((movie) => {
  const matchData = calculateMatchPercentage(movie);
  return {
    // ... other fields
    matchPercent: matchData.matchPercent,
    matchReasons: matchData.matchReasons,
  };
});
```

#### TV Shows
**File:** `/app/api/search/smart-picks-tvshows/route.ts`

**Key Function:**
```typescript
// Line ~257
function calculateTvShowMatchPercentage(tvShow: any, user: any, ratedTvShows: any[]) {
  let match = 70; // Base match
  const reasons: any[] = [];
  
  // ... scoring logic
  
  return { matchPercent: finalMatch, matchReasons: reasons };
}
```

**Usage:**
```typescript
// Line ~225
function transformTvShowToFrontend(dbShow: any, user: any, ratedTvShows: any[]) {
  const matchData = calculateTvShowMatchPercentage(dbShow, user, ratedTvShows);
  
  return {
    // ... other fields
    matchPercent: matchData.matchPercent,
    matchReasons: matchData.matchReasons,
  };
}
```

---

### Frontend Components

#### MovieMeta Component
**File:** `/components/MovieMeta.tsx`

**Displays match percentage as clickable badge:**
```tsx
{movie.matchPercent && (
  <button onClick={() => setShowMatchModal(true)}>
    <span>💯 {movie.matchPercent}% Match</span>
    <Info className="w-3 h-3" /> {/* Shows on hover */}
  </button>
)}
```

#### MatchReasoningModal Component
**File:** `/components/MatchReasoningModal.tsx`

**Displays detailed breakdown:**
- Circular progress indicator
- List of match factors with scores
- Color-coded cards based on score ranges
- Explanatory footer

#### Data Types
**File:** `/lib/data.ts`

```typescript
export type MatchReason = {
  factor: string;
  score: number;
  description: string;
  icon: "heart" | "star" | "trending" | "calendar" | "globe" | "sparkles";
};

export type Movie = {
  // ... other fields
  matchPercent?: number;
  matchReasons?: MatchReason[];
};

export type TvShow = {
  // ... other fields
  matchPercent?: number;
  matchReasons?: MatchReason[];
};
```

---

## Modifying the Logic

### Change Base Score

**Location:** `/app/api/search/smart-picks/route.ts` (line ~528)

```typescript
// Current:
let match = 70; // Base match

// To change:
let match = 60; // Lower base (more room for factors)
// OR
let match = 80; // Higher base (more lenient)
```

---

### Adjust Factor Points

**Example: Change Language Match from +15 to +20**

**Location:** `/app/api/search/smart-picks/route.ts` (line ~537-546)

```typescript
// Current:
if (user.languages?.includes(movieLangFull)) {
  const langScore = 15;  // ← Change this value
  match += langScore;
  reasons.push({
    factor: "Language Match",
    score: langScore,
    description: `Available in your preferred language (${movieLangFull})`,
    icon: "globe"
  });
}

// To increase importance:
const langScore = 20; // Now worth more
```

---

### Modify Rating Thresholds

**Example: Change "Highly Rated" from 8.0 to 7.5**

**Location:** `/app/api/search/smart-picks/route.ts` (line ~549-558)

```typescript
// Current:
if (movie.imdbRating >= 8.0 || movie.voteAverage >= 8.0) {
  const ratingScore = 10;
  // ...
}

// To make it easier to get this bonus:
if (movie.imdbRating >= 7.5 || movie.voteAverage >= 7.5) {
  const ratingScore = 10;
  // ...
}
```

---

### Change Popularity Thresholds

**Example: Lower vote count requirements**

**Location:** `/app/api/search/smart-picks/route.ts` (line ~610-628)

```typescript
// Current:
if (movie.voteCount >= 10000) {
  const popScore = 12;
  // ...
} else if (movie.voteCount >= 5000) {
  const popScore = 7;
  // ...
}

// To be more lenient:
if (movie.voteCount >= 5000) {  // Was 10000
  const popScore = 12;
  // ...
} else if (movie.voteCount >= 2000) {  // Was 5000
  const popScore = 7;
  // ...
}
```

---

### Adjust Maximum Score

**Location:** `/app/api/search/smart-picks/route.ts` (line ~643)

```typescript
// Current:
const finalMatch = Math.min(95, match);

// To allow higher scores:
const finalMatch = Math.min(99, match);

// To be more strict:
const finalMatch = Math.min(90, match);
```

---

## Adding New Factors

### Step 1: Add Scoring Logic

**Location:** `/app/api/search/smart-picks/route.ts` (inside `calculateMatchPercentage` function)

**Example: Add "Director Match" factor**

```typescript
// Add after existing factors (before final cap)

// Director Match (0-15 points)
if (movie.director && user.favoriteDirectors) {
  const directorMatch = user.favoriteDirectors.includes(movie.director);
  if (directorMatch) {
    const directorScore = 15;
    match += directorScore;
    reasons.push({
      factor: "Director Match",
      score: directorScore,
      description: `From your favorite director ${movie.director}`,
      icon: "star"  // Choose from: heart, star, trending, calendar, globe, sparkles
    });
  }
}
```

### Step 2: Add Icon Support (if using new icon)

**Location:** `/components/MatchReasoningModal.tsx` (line ~30-44)

```typescript
const getIcon = (iconType: string) => {
  switch (iconType) {
    case "heart":
      return Heart;
    case "star":
      return Star;
    // ... existing cases
    case "director":  // ← Add new icon
      return Film;    // ← Import from lucide-react
    default:
      return Sparkles;
  }
};
```

### Step 3: Update TypeScript Type

**Location:** `/lib/data.ts` (line ~1-6)

```typescript
export type MatchReason = {
  factor: string;
  score: number;
  description: string;
  icon: "heart" | "star" | "trending" | "calendar" | "globe" | "sparkles" | "director"; // ← Add here
};
```

### Step 4: Update Database (if needed)

If your new factor requires user data not currently stored:

**Location:** `/prisma/schema.prisma`

```prisma
model User {
  // ... existing fields
  favoriteDirectors String[]  // ← Add new field
}
```

Then run:
```bash
npx prisma db push
npx prisma generate
```

---

## Testing

### Manual Testing Checklist

1. **Generate Recommendations**
   ```
   ✓ Click "AI Picks for Movies"
   ✓ Wait for recommendations to load
   ✓ Verify match percentages appear (e.g., "💯 85% Match")
   ```

2. **Test Modal**
   ```
   ✓ Hover over match percentage → Info icon appears
   ✓ Click match percentage → Modal opens
   ✓ Verify circular progress shows correct percentage
   ✓ Verify all factors are listed with scores
   ✓ Verify total adds up correctly
   ✓ Click X or backdrop → Modal closes
   ```

3. **Test Different User Profiles**
   ```
   ✓ User with language preferences set
   ✓ User with genre preferences set
   ✓ User with many rated movies (should see AI Personalized factor)
   ✓ User with no ratings (should NOT see AI Personalized factor)
   ```

4. **Test Edge Cases**
   ```
   ✓ Movie with 0 votes (should still work)
   ✓ Movie with missing IMDB rating (fallback to voteAverage)
   ✓ Movie with no genres (should skip genre match)
   ✓ Old movie (should not get recency bonus)
   ```

### Debugging

**Enable logging to see calculations:**

Add console logs in `calculateMatchPercentage`:

```typescript
const calculateMatchPercentage = (movie: any) => {
  let match = 70;
  const reasons: any[] = [];
  
  console.log(`Calculating match for: ${movie.title}`);
  console.log(`Base score: ${match}`);
  
  // After each factor:
  if (user.languages?.includes(movieLangFull)) {
    const langScore = 15;
    match += langScore;
    console.log(`After language match: ${match}`);
    // ...
  }
  
  // At the end:
  console.log(`Final score for ${movie.title}: ${finalMatch}%`);
  console.log(`Reasons:`, reasons);
  
  return { matchPercent: finalMatch, matchReasons: reasons };
};
```

### API Testing

**Test endpoint directly:**

```bash
# Movies
curl -X POST http://localhost:3000/api/search/smart-picks \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json"

# TV Shows
curl -X POST http://localhost:3000/api/search/smart-picks-tvshows?count=5 \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**Check response includes:**
```json
{
  "movies": [
    {
      "id": 123,
      "title": "Inception",
      "matchPercent": 92,
      "matchReasons": [
        {
          "factor": "Language Match",
          "score": 15,
          "description": "Available in your preferred language (English)",
          "icon": "globe"
        }
      ]
    }
  ]
}
```

---

## Examples

### Example 1: High Match Score (92%)

**User Profile:**
- Languages: English, Hindi
- Genres: Sci-Fi, Action
- Has rated 20 movies

**Movie:**
- Title: Dune: Part Two
- IMDB: 8.8
- Genres: Sci-Fi, Action
- Year: 2024
- Vote Count: 150,000
- Language: English

**Calculation:**
```
Base:                    70
+ Language Match:        15  (English matches)
+ Highly Rated:          10  (IMDB 8.8 ≥ 8.0)
+ Genre Match:           20  (Sci-Fi + Action both match)
+ Recently Released:      8  (2024 ≥ 2023)
+ Widely Acclaimed:      12  (150K votes ≥ 10K)
+ AI Personalized:       10  (User has ratings)
──────────────────────────
Total:                  145 → Capped at 95%
```

**Reasoning Display:**
```
🌍 Language Match (+15): Available in English
⭐ Highly Rated (+10): Excellent rating (8.8/10)
❤️ Genre Match (+20): Matches Sci-Fi, Action
📅 Recently Released (+8): Fresh content from 2024
📈 Widely Acclaimed (+12): Loved by 150K+ viewers
✨ AI Personalized (+10): Based on 20 rated movies
```

---

### Example 2: Medium Match Score (80%)

**User Profile:**
- Languages: Hindi
- Genres: Drama
- Has rated 5 movies

**Movie:**
- Title: 12th Fail
- IMDB: 9.2
- Genres: Drama, Biography
- Year: 2023
- Vote Count: 8,000
- Language: Hindi

**Calculation:**
```
Base:                    70
+ Language Match:        15  (Hindi matches)
+ Highly Rated:          10  (IMDB 9.2 ≥ 8.0)
+ Genre Match:           10  (Drama matches)
+ Recently Released:      8  (2023 ≥ 2023)
+ Popular Choice:         7  (8K votes ≥ 5K)
+ AI Personalized:       10  (User has ratings)
──────────────────────────
Total:                  130 → Capped at 95%, but displays 80%
```

---

### Example 3: Low Match Score (75%)

**User Profile:**
- Languages: English
- Genres: None set
- No ratings yet

**Movie:**
- Title: Old Classic
- IMDB: 7.2
- Genres: Drama
- Year: 1990
- Vote Count: 3,000
- Language: English

**Calculation:**
```
Base:                    70
+ Language Match:        15  (English matches)
+ Good Rating:            5  (IMDB 7.2 ≥ 7.0)
(No genre match - user has no preferences)
(No recency bonus - 1990 < 2020)
(No popularity bonus - 3K < 5K)
(No AI bonus - user has no ratings)
──────────────────────────
Total:                   90 → Displays as 90%
```

**Note:** This example would show 90%, not 75%. The score of 75% would occur with fewer bonuses.

---

## Best Practices

### 1. Keep Base Score Reasonable
- Don't set it too low (< 50) - makes bad matches look decent
- Don't set it too high (> 80) - leaves little room for differentiation
- **Recommended range: 60-75**

### 2. Balance Factor Weights
- Most important factors: 15-25 points
- Moderate factors: 8-12 points
- Minor factors: 3-7 points
- Total possible should exceed cap to ensure variety

### 3. Use Descriptive Language
- Write descriptions from user's perspective
- Be specific: "Matches your taste in Sci-Fi, Action"
- Avoid technical jargon: "High vote count" → "Loved by 50K+ viewers"

### 4. Choose Appropriate Icons
- `heart` - Personal preference matches (genre, director)
- `star` - Quality indicators (ratings)
- `trending` - Popularity metrics
- `calendar` - Recency/release date
- `globe` - Language/region
- `sparkles` - AI/personalization

### 5. Test After Changes
- Always test with multiple user profiles
- Verify total percentages make sense
- Check that modal displays correctly
- Ensure factors are ordered by importance (highest first)

---

## Troubleshooting

### Issue: Match percentages not showing
**Solution:** Check that API is returning `matchPercent` and `matchReasons` fields

### Issue: Modal shows wrong percentage
**Solution:** Verify calculation adds up correctly in backend

### Issue: Some factors missing
**Solution:** Check that user profile has required data (languages, genres, etc.)

### Issue: All movies have same score
**Solution:** Add more varied factors or adjust scoring sensitivity

### Issue: Scores too high/low
**Solution:** Adjust base score or factor weights

---

## Future Enhancements

### Potential New Factors

1. **Cast Match** (+10-15 points)
   - Match based on favorite actors

2. **Similar Movies** (+12 points)
   - User loved similar movies

3. **Friend Recommendations** (+15 points)
   - Recommended by friends with similar taste

4. **Streaming Availability** (+5 points)
   - Available on user's subscriptions

5. **Awards** (+8 points)
   - Oscar winner/nominee

6. **Box Office** (+5 points)
   - Blockbuster success

7. **Runtime Match** (+5 points)
   - Matches user's preferred length

8. **Mood Match** (+10 points)
   - Matches current user mood/context

---

## Version History

### v1.0 (Current)
- Basic scoring with 6 factors
- Language, Rating, Genre, Recency, Popularity, AI
- Separate logic for Movies and TV Shows
- Modal UI with color coding

### Future Versions
- v1.1: Add cast/director matching
- v1.2: Machine learning-based scoring
- v1.3: Collaborative filtering

---

## Support

For questions or issues with the match reasoning system:
1. Check this documentation
2. Review code at locations specified above
3. Test with different user profiles
4. Check browser console and server logs

---

**Last Updated:** 2025-11-15
**Maintained By:** CineMate Dev Team

