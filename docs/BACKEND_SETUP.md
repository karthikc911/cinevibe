# 🚀 CineVibe Backend Setup Guide

## Overview

I've successfully integrated a complete backend system with:
- ✅ **Gmail OAuth Authentication** via NextAuth.js
- ✅ **PostgreSQL Database** with Prisma ORM
- ✅ **OpenAI GPT-4** for AI-powered recommendations
- ✅ **RAG Architecture** (Retrieval Augmented Generation) for personalized suggestions
- ✅ **RESTful API** endpoints for all features

## 🎯 What's Been Built

### 1. Authentication System
- **File**: `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/login/page.tsx`
- **Features**:
  - Google OAuth integration
  - Session management
  - Beautiful login page with feature highlights
  - Automatic redirect to onboarding after login

### 2. Database Schema
- **File**: `prisma/schema.prisma`
- **Models**:
  - `User`: Store user profile, preferences, languages
  - `Account` & `Session`: NextAuth.js auth tables
  - `MovieRating`: Track all movie ratings per user
  - `WatchlistItem`: Manage user watchlists
  - `UserPreference`: Store AI-extracted preferences with vector embeddings

### 3. AI Integration (OpenAI GPT-4 + RAG)
- **File**: `lib/openai.ts`
- **Capabilities**:
  - `generateEmbedding()`: Convert text to vector embeddings
  - `retrieveUserPreferences()`: RAG-based similarity search
  - `storeUserPreference()`: Save preferences with embeddings
  - `analyzeUserRatings()`: Use GPT-4 to extract preferences from ratings
  - `generateRecommendations()`: AI-powered personalized recommendations
  - `chatWithAI()`: Conversational AI about movies

### 4. API Endpoints
All routes are in `app/api/`:

#### Authentication
- `POST /api/auth/signin` - Google OAuth login

#### Recommendations
- `GET /api/recommendations` - Get AI recommendations
  - Query: `?context=action movies` for specific requests
  - Query: `?analyze=true` to analyze ratings first

#### Chat
- `POST /api/chat` - Chat with AI
  - Body: `{ message, history }`

#### Ratings
- `GET /api/ratings` - Fetch all ratings
- `POST /api/ratings` - Add/update rating
- `DELETE /api/ratings?movieId={id}` - Remove rating

#### Watchlist
- `GET /api/watchlist` - Fetch watchlist
- `POST /api/watchlist` - Add movie
- `DELETE /api/watchlist?movieId={id}` - Remove movie

## 📋 Next Steps: How to Complete Setup

### Step 1: Create Environment Variables

Create `.env.local` file in the root directory:

```bash
# Database - You'll need PostgreSQL running
DATABASE_URL="postgresql://user:password@localhost:5432/cinemate?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run-this-command: openssl rand -base64 32"

# Google OAuth
GOOGLE_CLIENT_ID="get-from-google-cloud-console"
GOOGLE_CLIENT_SECRET="get-from-google-cloud-console"

# OpenAI API
OPENAI_API_KEY="get-from-openai-platform"
```

### Step 2: Set Up PostgreSQL Database

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL (macOS)
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb cinemate

# Update DATABASE_URL in .env.local
DATABASE_URL="postgresql://yourusername@localhost:5432/cinemate?schema=public"
```

**Option B: Supabase (Free Cloud PostgreSQL)**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get connection string from Settings → Database
4. Add to `.env.local` as `DATABASE_URL`

**Option C: Vercel Postgres**
1. Deploy to Vercel
2. Add Vercel Postgres from dashboard
3. Connection string auto-added to env vars

### Step 3: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable "Google+ API"
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add Authorized redirect URI:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
7. Copy **Client ID** and **Client Secret** to `.env.local`

### Step 4: Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create account / Sign in
3. Go to **API keys**
4. Click **Create new secret key**
5. Copy key to `.env.local` as `OPENAI_API_KEY`
6. Note: You'll need credits/billing set up ($5-10 should last a while)

### Step 5: Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Create database tables
npx prisma migrate dev --name init

# (Optional) View database in browser
npx prisma studio
```

### Step 6: Run the App

```bash
npm run dev
```

Visit `http://localhost:3000` - you'll see the login page!

## 🧪 Testing the Backend

### 1. Test Authentication
1. Go to `/login`
2. Click "Continue with Google"
3. Sign in with your Google account
4. Should redirect to `/onboarding`

### 2. Test API Endpoints

Once logged in, open browser console and try:

```javascript
// Test fetching ratings
fetch('/api/ratings')
  .then(r => r.json())
  .then(console.log)

// Test adding a rating
fetch('/api/ratings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    movieId: 1,
    movieTitle: 'Inception',
    movieYear: '2010',
    rating: 'amazing'
  })
}).then(r => r.json()).then(console.log)

// Test AI recommendations
fetch('/api/recommendations?analyze=true')
  .then(r => r.json())
  .then(console.log)

// Test AI chat
fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Recommend me some sci-fi movies'
  })
}).then(r => r.json()).then(console.log)
```

## 🔄 How RAG Works

1. **User rates movies** → Stored in database
2. **AI analyzes ratings** → Extracts preferences (genres, actors, themes)
3. **Preferences → Embeddings** → Vector representations stored
4. **New query comes in** → Embedding generated for query
5. **Similarity search** → Find relevant preferences using cosine similarity
6. **Context building** → Top-k preferences retrieved
7. **GPT-4 generates** → Personalized recommendations with context

## 📊 Database Viewer

Use Prisma Studio to view/edit data:

```bash
npx prisma studio
```

Opens at `http://localhost:5555`

## 🔐 Security Notes

- ✅ All API routes protected with NextAuth session
- ✅ Environment variables never committed (`.gitignore`)
- ✅ Database queries use Prisma (SQL injection protected)
- ✅ OAuth tokens stored securely by NextAuth
- ⚠️ OpenAI API calls cost money - monitor usage

## 🐛 Troubleshooting

### "Prisma Client not found"
```bash
npx prisma generate
```

### "Can't connect to database"
- Check PostgreSQL is running
- Verify `DATABASE_URL` in `.env.local`
- Try: `psql -U yourusername -d cinemate`

### "Unauthorized" errors
- Ensure you're signed in
- Check cookies are enabled
- Try clearing cookies and signing in again

### "OpenAI API error"
- Verify API key is correct
- Check you have credits/billing set up
- Monitor rate limits

## 🚀 Deployment

For production deployment:

1. **Environment Variables**: Add all env vars to your hosting platform
2. **Database**: Use production PostgreSQL (Supabase/Neon/Vercel Postgres)
3. **OAuth Redirect**: Update Google OAuth redirect URI to production URL
4. **NEXTAUTH_URL**: Set to production URL

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Add Vercel Postgres from integrations
```

## 📚 Additional Resources

- [NextAuth.js Docs](https://next-auth.js.org/)
- [Prisma Docs](https://www.prisma.io/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [RAG Architecture](https://www.pinecone.io/learn/retrieval-augmented-generation/)

---

## 🎉 You're All Set!

Once you complete the setup steps, you'll have:
- ✨ Full Gmail authentication
- 🤖 AI-powered movie recommendations
- 💾 Persistent user data across devices
- 🧠 Learning system that improves over time
- 💬 AI chat about movies

Enjoy building with CineVibe! 🎬

