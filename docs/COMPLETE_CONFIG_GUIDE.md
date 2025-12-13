# 🔧 Complete Configuration Guide for CineMate

## Overview

This guide provides **ALL** configuration values, API keys, credentials, and mock data needed to run CineMate end-to-end from authentication → rating → vector search → AI recommendations → UI.

---

## 📋 Quick Start Checklist

### ✅ Prerequisites
- [ ] Node.js 18+ installed
- [ ] PostgreSQL 14+ installed (or Supabase account)
- [ ] Google Cloud Console account
- [ ] OpenAI Platform account with billing set up

### ✅ Setup Steps
1. [ ] Run `npm install`
2. [ ] Run `node scripts/setup-wizard.js` (interactive setup)
3. [ ] OR manually create `.env.local` (see below)
4. [ ] Run `npx prisma generate`
5. [ ] Run `npx prisma migrate dev --name init`
6. [ ] Enable pgvector (see Database Setup)
7. [ ] Run `npm run dev`
8. [ ] Visit `http://localhost:3000`

---

## 🔐 Required Configuration Values

### 1. Database Configuration

**Required**: PostgreSQL connection string with pgvector support

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

#### Examples:

**Local PostgreSQL:**
```bash
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/cinemate?schema=public"
# OR without password:
DATABASE_URL="postgresql://postgres@localhost:5432/cinemate?schema=public"
```

**Supabase:**
```bash
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

**Vercel Postgres:**
```bash
DATABASE_URL="postgres://default:[PASSWORD]@[HOST]-pooler.us-east-1.aws.neon.tech/verceldb?sslmode=require"
```

**Neon:**
```bash
DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST].neon.tech/neondb?sslmode=require"
```

---

### 2. NextAuth Configuration

**Required**: Base URL and secret for session management

```bash
# Base URL (change for production)
NEXTAUTH_URL="http://localhost:3000"

# Secret key (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="[GENERATED_SECRET_HERE]"
```

#### Generate Secret:

```bash
# On macOS/Linux:
openssl rand -base64 32

# Example output:
# 7UJ3xR5YQnP8mK2wL9vT4sH6aB1cN0eF+gD3iV/8jX=
```

Use this output as your `NEXTAUTH_SECRET`.

---

### 3. Google OAuth Credentials

**Required**: OAuth 2.0 Client ID and Secret

```bash
GOOGLE_CLIENT_ID="[YOUR-CLIENT-ID].apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="[YOUR-CLIENT-SECRET]"
```

#### How to Get:

1. **Go to**: [Google Cloud Console](https://console.cloud.google.com/)
2. **Create Project** (or select existing)
3. **Enable APIs**: Search for "Google+ API" and enable it
4. **Go to**: Credentials → Create Credentials → OAuth 2.0 Client ID
5. **Application Type**: Web application
6. **Name**: CineMate Local Development
7. **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
8. **For Production**, add:
   ```
   https://yourdomain.com/api/auth/callback/google
   ```
9. **Copy**: Client ID and Client Secret

---

### 4. OpenAI API Configuration

**Required**: API key for GPT-4 and embeddings

```bash
OPENAI_API_KEY="sk-[YOUR-KEY-HERE]"
```

#### How to Get:

1. **Go to**: [OpenAI Platform](https://platform.openai.com/)
2. **Sign in** / Create account
3. **Add Payment Method**: Settings → Billing ($5-10 recommended to start)
4. **Go to**: API Keys → Create new secret key
5. **Name it**: "CineMate Development"
6. **Copy**: The key (starts with `sk-`)
7. **⚠️ Important**: Save it immediately (can't view again)

---

### 5. Optional Configuration

```bash
# OpenAI Model (default: gpt-4-turbo-preview)
OPENAI_MODEL="gpt-4-turbo-preview"
# Alternative: gpt-4, gpt-3.5-turbo

# Embedding Model (default: text-embedding-3-small)
EMBEDDING_MODEL="text-embedding-3-small"

# Vector Dimension (default: 1536 for text-embedding-3-small)
EMBEDDING_DIMENSION=1536

# Enable Prisma Query Logging (development only)
DEBUG="prisma:query"
```

---

## 📦 Complete .env.local Template

Copy this entire template and fill in your values:

```bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CineMate Backend Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Database Configuration (REQUIRED)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Local PostgreSQL:
DATABASE_URL="postgresql://postgres:password@localhost:5432/cinemate?schema=public"

# OR Supabase:
# DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# OR Vercel Postgres:
# DATABASE_URL="postgres://default:[PASSWORD]@[HOST]-pooler.us-east-1.aws.neon.tech/verceldb?sslmode=require"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# NextAuth Configuration (REQUIRED)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="GENERATE_WITH_openssl_rand_base64_32"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Google OAuth Configuration (REQUIRED)
# Get from: https://console.cloud.google.com/
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GOOGLE_CLIENT_ID="YOUR_CLIENT_ID.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# OpenAI API Configuration (REQUIRED)
# Get from: https://platform.openai.com/api-keys
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPENAI_API_KEY="sk-YOUR_API_KEY_HERE"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Optional Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# OpenAI Model (default: gpt-4-turbo-preview)
# OPENAI_MODEL="gpt-4-turbo-preview"

# Enable Prisma Query Logging (development only)
# DEBUG="prisma:query"
```

---

## 🗄️ Database Setup

### Option 1: Local PostgreSQL

#### Install PostgreSQL:

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download from [postgresql.org](https://www.postgresql.org/download/windows/)

#### Create Database:

```bash
# Create database
createdb cinemate

# OR via psql:
psql -U postgres
CREATE DATABASE cinemate;
\q
```

#### Enable pgvector:

```bash
# Install pgvector extension
# macOS:
brew install pgvector

# Ubuntu/Debian:
sudo apt install postgresql-15-pgvector

# Then enable in database:
psql -U postgres -d cinemate
CREATE EXTENSION vector;
\q
```

---

### Option 2: Supabase (Recommended for Beginners)

1. **Go to**: [supabase.com](https://supabase.com)
2. **Create Account** (free tier available)
3. **Create New Project**:
   - Project name: cinemate
   - Database password: (save this!)
   - Region: Choose closest to you
4. **Wait** for project creation (~2 minutes)
5. **Get Connection String**:
   - Go to: Settings → Database → Connection string
   - Copy "Connection Pooling" URI
6. **Enable pgvector**:
   - Go to: Database → Extensions
   - Search for "vector"
   - Click Enable

---

### Option 3: Vercel Postgres

1. **Deploy to Vercel** first
2. **Go to**: Your project → Storage → Create Database
3. **Select**: Postgres
4. **Copy** connection string from environment variables

---

## 🚀 Database Migrations

After configuring DATABASE_URL:

```bash
# 1. Generate Prisma Client
npx prisma generate

# 2. Create tables
npx prisma migrate dev --name init

# 3. Enable pgvector (if not already enabled)
# For Supabase: Already enabled in dashboard
# For Local/Others: Run this SQL in your database

psql -U postgres -d cinemate -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 4. Create vector index (optional, improves search speed)
psql -U postgres -d cinemate <<EOF
CREATE INDEX IF NOT EXISTS user_preference_embedding_idx 
ON "UserPreference" USING hnsw (embedding vector_cosine_ops);
EOF

# 5. Verify setup
npx prisma studio
# Opens http://localhost:5555 to view your database
```

---

## 🎭 Mock Data & Testing

### Test the Full Flow:

1. **Start the app**:
   ```bash
   npm run dev
   ```

2. **Sign in**:
   - Go to http://localhost:3000
   - Click "Continue with Google"
   - Sign in with your Google account

3. **Complete onboarding**:
   - Enter name and age
   - Select preferred languages
   - Click "Start Rating"

4. **Rate some movies**:
   - On `/rate` page, rate at least 10 movies
   - Use: Amazing, Good, Awful, or Not Seen

5. **Analyze preferences**:
   Open browser console:
   ```javascript
   fetch('/api/recommendations?analyze=true')
     .then(r => r.json())
     .then(console.log)
   ```

6. **Get AI recommendations**:
   ```javascript
   fetch('/api/recommendations?context=sci-fi action movies')
     .then(r => r.json())
     .then(console.log)
   ```

7. **Chat with AI**:
   ```javascript
   fetch('/api/chat', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       message: 'Recommend me some thriller movies like Inception'
     })
   }).then(r => r.json()).then(console.log)
   ```

---

## 🧪 API Testing Guide

### Test Authentication:
```bash
# Should redirect to /login if not authenticated
curl http://localhost:3000/api/recommendations
```

### Test Recommendations:
```bash
# After signing in, from browser console:
fetch('/api/recommendations')
  .then(r => r.json())
  .then(data => console.log(data))
```

### Test Chat:
```bash
fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What are some good sci-fi movies?'
  })
}).then(r => r.json()).then(console.log)
```

### Test Streaming Chat:
```javascript
const response = await fetch('/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Tell me about your favorite movies'
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') break;
      const parsed = JSON.parse(data);
      console.log(parsed.content);
    }
  }
}
```

### Test Ratings:
```javascript
// Add a rating
fetch('/api/ratings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    movieId: 550,
    movieTitle: 'Fight Club',
    movieYear: '1999',
    rating: 'amazing'
  })
}).then(r => r.json()).then(console.log)

// Get all ratings
fetch('/api/ratings')
  .then(r => r.json())
  .then(console.log)
```

---

## 🎬 Mock Movie Data

The app comes with mock movie data in `lib/data.ts`. Here are some to test with:

```javascript
const testMovies = [
  { id: 550, title: "Fight Club", year: "1999" },
  { id: 155, title: "The Dark Knight", year: "2008" },
  { id: 13, title: "Forrest Gump", year: "1994" },
  { id: 680, title: "Pulp Fiction", year: "1994" },
  { id: 27205, title: "Inception", year: "2010" },
  { id: 122, title: "The Lord of the Rings: The Return of the King", year: "2003" },
  { id: 278, title: "The Shawshank Redemption", year: "1994" },
  { id: 238, title: "The Godfather", year: "1972" },
  { id: 424, title: "Schindler's List", year: "1993" },
  { id: 129, title: "Spirited Away", year: "2001" }
];
```

---

## 💰 Cost Estimates

### OpenAI API Costs (as of 2024):

**GPT-4 Turbo:**
- Input: $0.01 / 1K tokens
- Output: $0.03 / 1K tokens
- **Estimate**: ~$0.05 per recommendation request

**Embeddings (text-embedding-3-small):**
- $0.00002 / 1K tokens
- **Estimate**: ~$0.0001 per preference stored

**Typical Usage** (for testing/development):
- 100 recommendation requests: ~$5
- 1000 preference embeddings: ~$0.10
- **Total for development**: $5-10 should last weeks

### Database Costs:

- **Supabase Free Tier**: 500MB, 2 GB bandwidth (plenty for testing)
- **Vercel Postgres**: $0.10/month minimum
- **Local PostgreSQL**: Free

---

## 🔍 Troubleshooting

### "Can't connect to database"
- Check `DATABASE_URL` is correct
- Verify PostgreSQL is running: `pg_isready`
- Test connection: `psql $DATABASE_URL`

### "pgvector extension not found"
- Install pgvector (see Database Setup)
- Enable in database: `CREATE EXTENSION vector;`
- For Supabase: Enable in dashboard Extensions

### "Unauthorized" on API requests
- Clear cookies and sign in again
- Check `NEXTAUTH_SECRET` is set
- Verify `NEXTAUTH_URL` matches your domain

### "OpenAI API error"
- Verify API key starts with `sk-`
- Check billing is set up on OpenAI Platform
- Monitor usage: platform.openai.com/usage

### "Prisma Client not found"
- Run: `npx prisma generate`
- Restart dev server

---

## 📚 Additional Resources

- **NextAuth.js**: [next-auth.js.org](https://next-auth.js.org/)
- **Prisma**: [prisma.io/docs](https://www.prisma.io/docs)
- **pgvector**: [github.com/pgvector/pgvector](https://github.com/pgvector/pgvector)
- **OpenAI**: [platform.openai.com/docs](https://platform.openai.com/docs)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)

---

## ✅ Final Checklist

Before considering setup complete, verify:

- [ ] `.env.local` exists with all required values
- [ ] Database is accessible and pgvector is enabled
- [ ] `npx prisma studio` opens successfully
- [ ] App starts with `npm run dev`
- [ ] Can sign in with Google OAuth
- [ ] Can rate movies and save to database
- [ ] `/api/recommendations` returns AI suggestions
- [ ] `/api/chat` responds with AI messages
- [ ] Browser console shows no critical errors

---

## 🎉 You're All Set!

Once all items are checked, you have a fully functional:
- ✅ **Authentication** with Gmail OAuth
- ✅ **Database** with vector search capabilities
- ✅ **AI Recommendations** with GPT-4 and RAG
- ✅ **Chat Interface** with personalized context
- ✅ **Beautiful UI** with dark cinematic theme

Enjoy building with CineMate! 🎬✨

