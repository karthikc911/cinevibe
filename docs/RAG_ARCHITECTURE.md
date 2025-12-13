# 🤖 RAG Architecture & Vector Storage

## 📊 Current Status

**STATUS:** 🟡 **RAG infrastructure exists but is NOT actively integrated**

The RAG system and vector database are set up but not currently being used in the normal user flow. OpenAI API calls are dormant.

---

## 🗄️ Where Are Vectors Stored?

### Database Location
```
Provider:  PostgreSQL (Supabase)
Extension: pgvector (enabled)
Table:     UserPreference
Column:    embedding (vector type, 1536 dimensions)
```

### Table Schema

```sql
CREATE TABLE "UserPreference" (
  id             String                      @id @default(cuid())
  userId         String                      -- Links to User
  preferenceType String                      -- 'genre', 'actor', 'director', etc.
  value          String                      -- The preference text
  strength       Float   @default(1.0)       -- 0-1 strength score
  embedding      vector(1536)                -- OpenAI embedding
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
)
```

### Vector Index (for fast similarity search)
```sql
CREATE INDEX "UserPreference_embedding_idx"
ON "UserPreference" USING hnsw ("embedding" vector_cosine_ops);
```

---

## 🏗️ RAG System Architecture

### Two Recommendation Approaches:

#### **Approach 1: Traditional RAG (with Vector Embeddings)**
```
┌─────────────────────────────────────────────────────────────┐
│                     USER RATES A MOVIE                       │
│                           ↓                                   │
│                  /api/ratings (POST)                         │
│                           ↓                                   │
│              ❌ Currently: Just stores rating                │
│              ✅ Should: Trigger analysis                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   RATING ANALYSIS FLOW                       │
│                   (NOT CURRENTLY ACTIVE)                     │
└─────────────────────────────────────────────────────────────┘

    1. USER RATINGS
       ↓
    2. analyzeUserRatings(userId)
       ├─ Fetch all user ratings from DB
       ├─ Group by rating type (amazing, good, awful)
       └─ Extract patterns (genres, actors, themes)
       ↓
    3. GENERATE EMBEDDINGS
       ├─ Call OpenAI text-embedding-3-small
       ├─ Input: "User likes sci-fi action movies"
       └─ Output: [0.023, -0.15, ..., 0.78] (1536 numbers)
       ↓
    4. STORE IN DATABASE
       ├─ Save to UserPreference table
       ├─ Store: preferenceType, value, embedding
       └─ Create vector index for fast search
       ↓
    5. SIMILARITY SEARCH
       ├─ When generating recommendations
       ├─ Use cosine similarity on embeddings
       └─ Find relevant preferences (< 0.5ms)
       ↓
    6. GENERATE RECOMMENDATIONS
       ├─ Call GPT-4 with context
       ├─ Include: User preferences, ratings, history
       └─ Return: Personalized movie recommendations
```

#### **Approach 2: Bulk Recommendations (✅ NEW - READY TO USE)**
```
┌────────────────────────────────────────────────────────────┐
│            🚀 BULK RECOMMENDATION SYSTEM                    │
│         (50 Movies in One Shot with Auto-DB-Storage)       │
└────────────────────────────────────────────────────────────┘

    1. USER TRIGGERS BULK RECOMMENDATION
       POST /api/recommendations/bulk
       
       ↓

    2. ANALYZE USER RATINGS
       ├─ Fetch last 100 ratings
       ├─ Group: Amazing, Good, Awful
       ├─ Extract patterns: genres, themes, styles
       └─ Build rich user profile
       
       ↓

    3. CALL OPENAI GPT-4
       Model: gpt-4-turbo-preview
       Input: 
         • Amazing movies (loved)
         • Good movies (liked)
         • Awful movies (disliked - avoid similar)
         • User's language preferences
       
       Output: 50 movie recommendations with:
         • Title
         • Year
         • Reason (why it matches their taste)
         • Match percentage (0-100)
       
       Duration: ~10 seconds
       
       ↓

    4. FETCH TMDB DETAILS (for each movie)
       For each recommended movie:
       ├─ Search TMDB by title + year
       ├─ Get detailed info:
       │  • Poster, backdrop images
       │  • Overview, tagline
       │  • Genres, runtime
       │  • Vote average, vote count
       │  • IMDb rating, RT score
       └─ Rate limit: 250ms between calls
       
       Duration: ~25 seconds (50 movies × 0.5s)
       
       ↓

    5. STORE IN DATABASE (automatically)
       For each movie:
       ├─ Check if exists (by TMDB ID)
       ├─ If exists: UPDATE with latest info
       ├─ If new: INSERT into Movie table
       └─ Store: All metadata + poster paths
       
       ↓

    6. RETURN RESULTS
       {
         "success": true,
         "totalRequested": 50,
         "successfullyStored": 48,
         "failed": 2,
         "recommendations": [
           {
             "title": "Inception",
             "year": "2010",
             "reason": "Mind-bending thriller...",
             "match_percentage": 95,
             "tmdb_id": 27205,
             "genres": ["Action", "Sci-Fi"]
           },
           ...
         ]
       }

┌────────────────────────────────────────────────────────────┐
│  ⏱️  TOTAL TIME: 30-60 seconds                             │
│  💰  COST: ~$0.10-0.15 per generation                      │
│  📦  OUTPUT: 48-50 movies in your database                 │
└────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

### Approach 1: Traditional RAG Implementation
```
lib/rag.ts                          # Main RAG pipeline
├─ generateEmbedding()              # Create vector from text
├─ analyzeUserRatings()             # Extract preferences from ratings
├─ storeUserPreference()            # Save to database with embedding
├─ retrieveRelevantPreferences()    # Similarity search
├─ generateRecommendations()        # GPT-4 generation
└─ chatWithAI()                     # Chat with context

prisma/schema.prisma
└─ UserPreference model             # Vector storage table

prisma/migrations/enable_pgvector.sql
└─ CREATE EXTENSION vector          # Enable pgvector
```

### Approach 2: Bulk Recommendations (✅ NEW)
```
lib/bulk-recommendations.ts         # NEW! Bulk recommendation engine
├─ generate50Recommendations()      # Main function
├─ fetchTMDBMovieDetails()          # Get movie data from TMDB
└─ storeMovieInDB()                 # Auto-store in database

prisma/schema.prisma
└─ Movie model                      # Movie storage table (already exists)
```

### API Routes
```
app/api/recommendations/bulk/route.ts  # ✅ NEW! Bulk recommendations
├─ POST /api/recommendations/bulk      # Generate 50 recommendations
└─ GET /api/recommendations/bulk       # Check status/readiness

app/api/recommendations/route.ts    # Traditional RAG (not integrated)
├─ ?analyze=true                    # Trigger analysis
└─ Returns GPT-4 recommendations

app/api/ratings/route.ts            # POST /api/ratings
├─ Currently: Just stores rating
└─ Could: Trigger bulk recommendations periodically

app/api/chat/route.ts               # POST /api/chat
└─ Chat with RAG context

app/api/chat/stream/route.ts        # POST /api/chat/stream
└─ Streaming chat with RAG

app/api/health/route.ts             # GET /api/health
└─ Check RAG system status
```

---

## 🔑 Required Environment Variables

```bash
# OpenAI API (REQUIRED for RAG to work)
OPENAI_API_KEY=sk-...                    # Your OpenAI API key
OPENAI_MODEL=gpt-4-turbo-preview         # Optional, defaults to this

# Database (Already configured)
DATABASE_URL=postgresql://...            # Supabase PostgreSQL
```

**Current Issue:** OpenAI API key might not be set or RAG is not being called.

---

## 🚀 How to Activate RAG System

### Option 1: Auto-Analyze on Rating (Recommended)

Update `/api/ratings` to trigger analysis automatically:

```typescript
// In app/api/ratings/route.ts
import { analyzeUserRatings } from "@/lib/rag";

export async function POST(request: NextRequest) {
  // ... save rating ...
  
  // Trigger analysis in background (fire and forget)
  analyzeUserRatings(session.user.id).catch(err => 
    console.error("Background analysis failed:", err)
  );
  
  return NextResponse.json({ rating: savedRating });
}
```

**Pros:** Automatic, always up-to-date  
**Cons:** Adds ~500ms to rating API (can be backgrounded)

### Option 2: Manual Trigger from Frontend

Call recommendations API with `analyze=true`:

```typescript
// In frontend code
async function getRecommendations() {
  const response = await fetch('/api/recommendations?analyze=true');
  const data = await response.json();
  return data;
}
```

**Pros:** User controls when to analyze  
**Cons:** Manual, might forget to trigger

### Option 3: Background Cron Job

Set up a periodic job to analyze all users:

```typescript
// Create app/api/cron/analyze-ratings/route.ts
export async function GET() {
  const users = await prisma.user.findMany();
  
  for (const user of users) {
    await analyzeUserRatings(user.id);
  }
  
  return NextResponse.json({ success: true });
}
```

Then configure Vercel Cron or similar.

**Pros:** No impact on user experience  
**Cons:** Not real-time, requires cron setup

---

## 🔍 How to Check if RAG is Working

### 1. Check if embeddings are being created

```bash
# Run from project root
npx prisma studio

# Navigate to UserPreference table
# Check if there are rows with embeddings
```

### 2. Check OpenAI API usage

```typescript
// Call recommendations endpoint
fetch('/api/recommendations?analyze=true')
  .then(res => res.json())
  .then(data => console.log(data));

// Check OpenAI dashboard at:
// https://platform.openai.com/usage
```

### 3. Check health endpoint

```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "status": "healthy",
  "database": "connected",
  "openai": "configured",
  "pgvector": "enabled"
}
```

---

## 💰 Cost Estimates

### OpenAI API Costs (as of 2024)

**text-embedding-3-small:**
- $0.00002 per 1K tokens (~750 words)
- For 100 preferences: ~$0.002 (less than 1 cent)

**gpt-4-turbo-preview:**
- Input: $0.01 per 1K tokens
- Output: $0.03 per 1K tokens
- For 1 recommendation: ~$0.01-0.05

**Monthly estimate for 1000 active users:**
- Embeddings: ~$2
- Recommendations: ~$50-100
- **Total: ~$52-102/month**

---

## 🐛 Troubleshooting

### "No recommendations generated"
- Check if `OPENAI_API_KEY` is set in `.env.local`
- Verify user has rated movies
- Call `/api/recommendations?analyze=true` to force analysis

### "Error generating embedding"
- OpenAI API key invalid or expired
- Check OpenAI API status: https://status.openai.com

### "Database error: relation does not exist"
- Run `npx prisma db push` to sync schema
- Check if pgvector extension is enabled

### "Embeddings are null in database"
- Analysis not triggered
- OpenAI API call failed (check logs)
- Need to call `analyzeUserRatings(userId)`

---

## 📚 Further Reading

- **OpenAI Embeddings:** https://platform.openai.com/docs/guides/embeddings
- **pgvector:** https://github.com/pgvector/pgvector
- **RAG Concepts:** https://www.pinecone.io/learn/retrieval-augmented-generation/
- **Vector Search:** https://www.pinecone.io/learn/vector-database/

---

## 🎯 Summary

**Current State:**
- ✅ RAG infrastructure: COMPLETE
- ✅ Vector database: SETUP
- ✅ API endpoints: EXIST
- ❌ Integration: NOT ACTIVE
- ❌ OpenAI calls: NOT HAPPENING

**To Activate:**
1. Verify `OPENAI_API_KEY` in `.env.local`
2. Integrate `analyzeUserRatings()` into `/api/ratings`
3. Call `/api/recommendations` from frontend
4. Test with Prisma Studio to see embeddings

**Where Vectors Live:**
```
Supabase PostgreSQL
  └─ Database: postgres
      └─ Table: UserPreference
          └─ Column: embedding (vector(1536))
              └─ Index: HNSW for fast similarity search
```

---

## 🚀 How to Use Bulk Recommendations (✅ READY NOW)

### Step 1: Verify Environment Variables

Make sure these are in your `.env.local`:

```bash
# Required
OPENAI_API_KEY=sk-...                    # Your OpenAI API key
TMDB_API_KEY=...                         # Your TMDB API key
DATABASE_URL=postgresql://...            # PostgreSQL connection

# Optional
OPENAI_MODEL=gpt-4-turbo-preview         # Defaults to this
```

### Step 2: Rate at Least 5 Movies

Users need to rate at least 5 movies before generating personalized recommendations. This helps the AI understand their taste.

### Step 3: Check Readiness

```bash
# GET request to check if user is ready
curl http://localhost:3000/api/recommendations/bulk

# Response:
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    "ratingCount": 12
  },
  "database": {
    "totalMovies": 167
  },
  "ready": true,
  "message": "Ready to generate recommendations"
}
```

### Step 4: Generate Recommendations

```bash
# POST request to generate 50 recommendations
curl -X POST http://localhost:3000/api/recommendations/bulk \
  -H "Content-Type: application/json"

# This will take 30-60 seconds
# Response:
{
  "success": true,
  "message": "Generated 48 personalized recommendations",
  "userId": "...",
  "totalRequested": 50,
  "successfullyStored": 48,
  "failed": 2,
  "failedMovies": [
    "Obscure Movie (1995)",
    "Not on TMDB (2000)"
  ],
  "recommendations": [
    {
      "title": "Inception",
      "year": "2010",
      "reason": "Based on your love for mind-bending thrillers like The Matrix and Interstellar, Inception combines complex storytelling with stunning visuals and explores the nature of reality through layered dreams.",
      "match_percentage": 95,
      "tmdb_id": 27205,
      "genres": ["Action", "Science Fiction", "Thriller"]
    },
    ...
  ]
}
```

### Step 5: Frontend Integration

Add a button in your UI to trigger bulk recommendations:

```typescript
// In your component (e.g., app/home/page.tsx)
const [loading, setLoading] = useState(false);
const [recommendations, setRecommendations] = useState(null);

const generateRecommendations = async () => {
  setLoading(true);
  
  try {
    const response = await fetch('/api/recommendations/bulk', {
      method: 'POST',
    });
    
    const data = await response.json();
    
    if (data.success) {
      setRecommendations(data.recommendations);
      alert(`Generated ${data.successfullyStored} personalized recommendations!`);
      
      // Refresh movie list to show new recommendations
      window.location.reload();
    }
  } catch (error) {
    console.error('Failed to generate recommendations:', error);
  } finally {
    setLoading(false);
  }
};

return (
  <Button 
    onClick={generateRecommendations} 
    disabled={loading}
  >
    {loading ? 'Generating 50 Recommendations...' : 'Get Personalized Picks'}
  </Button>
);
```

---

## 💰 Cost Breakdown

### Per Bulk Recommendation (50 movies):

**OpenAI Costs:**
- GPT-4 Turbo: ~3000 tokens input, ~2000 tokens output
- Cost: ~$0.08 per generation

**TMDB API:**
- Free up to 1,000,000 requests/day
- No cost

**Total per user:** ~$0.08-0.10

**For 100 users generating once/month:**
- Monthly cost: ~$8-10

---

## 🎯 When to Trigger Bulk Recommendations?

### Option 1: Manual Button (Recommended)
- User clicks "Get My Personalized Picks"
- User controls when to generate
- Best for MVP and testing

### Option 2: Auto-trigger After N Ratings
```typescript
// In /api/ratings route.ts
if (userRatingCount === 10) {
  // Trigger bulk recommendations in background
  fetch('/api/recommendations/bulk', { method: 'POST' })
    .catch(err => console.error(err));
}
```

### Option 3: Periodic Regeneration
- Regenerate weekly if user has new ratings
- Use a cron job or scheduled task
- Best for production with active users

---

## 📊 Database Impact

### What Gets Stored:

**Before bulk recommendations:**
- Database: 167 movies (from initial population)

**After one user's bulk recommendations:**
- Database: ~200-210 movies (added 35-45 new movies)
- Some recommended movies may already exist

**After 10 users:**
- Database: ~250-300 movies (deduplicated)
- Popular movies will be shared across users

**Storage:** ~1-2 KB per movie = ~500 KB for 300 movies (negligible)

---

## 🐛 Troubleshooting Bulk Recommendations

### "Not enough ratings"
- User needs at least 5 ratings
- Ask them to rate more movies on /rate page

### "TMDB API key not found"
- Add `TMDB_API_KEY` to `.env.local`
- Get key from: https://www.themoviedb.org/settings/api

### "OpenAI API error"
- Check if `OPENAI_API_KEY` is valid
- Check OpenAI usage limits and billing

### "Failed to store movie"
- Check database connection
- Run `npx prisma db push` to sync schema

### "Takes too long / timeout"
- Normal: 30-60 seconds is expected
- Increase timeout in frontend (set to 90s)
- Consider running in background

---

*Need help activating the RAG system? Let me know which option you prefer!*

