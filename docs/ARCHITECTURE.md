# CineMate - Architecture & Deployment Guide

## 📋 Table of Contents
1. [High-Level Architecture](#high-level-architecture)
2. [Technology Stack](#technology-stack)
3. [Code Structure](#code-structure)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Database Schema](#database-schema)
7. [AI & Recommendation Engine](#ai--recommendation-engine)
8. [Deployment Guide](#deployment-guide)

---

## 🏗️ High-Level Architecture

CineMate is a **full-stack monolithic Next.js application** with a clear separation between frontend and backend concerns. The architecture follows a modern **JAMstack + API** pattern with server-side rendering and API routes.

```
┌─────────────────────────────────────────────────────────────┐
│                        CineMate                              │
│              Next.js 15 Full-Stack Application               │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼───────┐           ┌──────▼──────┐
        │   Frontend    │           │   Backend   │
        │  (React/TSX)  │           │ (API Routes)│
        └───────┬───────┘           └──────┬──────┘
                │                           │
        ┌───────▼───────┐           ┌──────▼──────┐
        │  Components   │           │   Prisma    │
        │  Pages/Routes │           │     ORM     │
        │  State (Zustand)│         └──────┬──────┘
        └───────────────┘                  │
                                    ┌──────▼──────┐
                                    │  PostgreSQL │
                                    │  (Supabase) │
                                    └──────┬──────┘
                                           │
                ┌──────────────────────────┼──────────────────────────┐
                │                          │                          │
        ┌───────▼───────┐          ┌──────▼──────┐          ┌────────▼────────┐
        │  OpenAI GPT   │          │  Perplexity │          │   TMDB API      │
        │(Recommendations)│         │  Sonar API  │          │ (Movie Details) │
        └───────────────┘          └─────────────┘          └─────────────────┘
```

### Key Architectural Principles

1. **Monolithic Full-Stack**: Frontend and backend coexist in a single Next.js application
2. **API-First Design**: All backend operations exposed via RESTful API routes
3. **Client-Side State Management**: Zustand for local state, synced with backend
4. **Server-Side Rendering (SSR)**: Pages rendered on server for better SEO and performance
5. **Progressive Web App (PWA)**: Responsive design with mobile-first approach
6. **AI-Powered**: Integrated with OpenAI and Perplexity for intelligent recommendations

---

## 🛠️ Technology Stack

### Frontend Technologies

#### **Next.js 15.1.5**
- **What**: React framework with App Router
- **Why**: Server-side rendering, API routes, file-based routing, excellent DX
- **Used For**: Application framework, routing, server components

#### **React 19**
- **What**: UI library for building components
- **Why**: Component-based architecture, virtual DOM, large ecosystem
- **Used For**: Building all UI components and pages

#### **TypeScript 5**
- **What**: Typed superset of JavaScript
- **Why**: Type safety, better IDE support, fewer runtime errors
- **Used For**: Entire codebase for type-safe development

#### **Tailwind CSS 4**
- **What**: Utility-first CSS framework
- **Why**: Rapid styling, consistent design system, small bundle size
- **Used For**: All styling, responsive design, dark theme

#### **shadcn/ui**
- **What**: Re-usable component library built on Radix UI
- **Why**: Accessible, customizable, beautiful components
- **Used For**: Buttons, cards, dialogs, inputs, etc.

#### **Framer Motion**
- **What**: Animation library for React
- **Why**: Smooth animations, gestures, excellent performance
- **Used For**: Page transitions, card animations, swipe gestures

#### **Zustand**
- **What**: Lightweight state management library
- **Why**: Simple API, no boilerplate, React hooks integration
- **Used For**: Client-side state (ratings, watchlist, user preferences)

### Backend Technologies

#### **Next.js API Routes**
- **What**: Serverless API endpoints within Next.js
- **Why**: Same codebase as frontend, automatic deployment, TypeScript support
- **Used For**: All backend logic, database operations, external API calls

#### **Prisma ORM**
- **What**: Next-generation TypeScript ORM
- **Why**: Type-safe database access, migrations, excellent DX
- **Used For**: Database schema, queries, migrations

#### **PostgreSQL (Supabase)**
- **What**: Powerful open-source relational database
- **Why**: ACID compliance, vector support (pgvector), excellent performance
- **Used For**: Primary data storage (users, movies, ratings, etc.)

#### **pgvector**
- **What**: PostgreSQL extension for vector embeddings
- **Why**: Similarity search, AI-powered recommendations
- **Used For**: Storing and querying movie embeddings (currently configured, not fully utilized)

#### **NextAuth.js**
- **What**: Authentication library for Next.js
- **Why**: Multiple auth providers, session management, JWT support
- **Used For**: Google OAuth, email/password authentication

### AI & External APIs

#### **OpenAI GPT (gpt-5-nano-2025-08-07)**
- **What**: Large language model for text generation
- **Why**: Intelligent movie recommendations, natural language understanding
- **Used For**: Generating personalized movie recommendations based on user ratings

#### **Perplexity Sonar API**
- **What**: Real-time web search API
- **Why**: Up-to-date movie information, trending movies
- **Used For**: Discovering new movies, getting current movie data

#### **TMDB API (The Movie Database)**
- **What**: Comprehensive movie database API
- **Why**: Rich movie metadata, posters, ratings, reviews
- **Used For**: Fetching detailed movie information (posters, ratings, cast, crew)

### Development & Tooling

- **Jest**: Unit and integration testing
- **ESLint**: Code linting
- **Prettier**: Code formatting (via ESLint config)
- **Winston**: Logging library (custom implementation)
- **bcryptjs**: Password hashing
- **uuid**: Unique ID generation

---

## 📁 Code Structure

```
cinemate/
├── app/                          # Next.js App Router (Frontend + Backend)
│   ├── (routes)/                # Application routes/pages
│   │   ├── discover/           # Home/Discover page
│   │   ├── rate/               # Rate movies page
│   │   ├── watchlist/          # User's watchlist
│   │   ├── friends/            # Friends/social features
│   │   ├── profile/            # User profile & settings
│   │   ├── onboarding/         # New user onboarding
│   │   ├── login/              # Login page
│   │   └── signup/             # Signup page
│   ├── api/                    # Backend API routes
│   │   ├── auth/               # Authentication endpoints
│   │   ├── ratings/            # Movie ratings CRUD
│   │   ├── watchlist/          # Watchlist CRUD
│   │   ├── recommendations/    # AI recommendations
│   │   ├── search/             # Search & discovery
│   │   ├── user/               # User profile operations
│   │   ├── quick-picks/        # Quick movie picks
│   │   ├── rate-movies/        # Rate page movie generation
│   │   └── preview-movies/     # Landing page preview movies
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout component
│   └── page.tsx                # Root page (redirects to /discover)
│
├── components/                  # Reusable React components
│   ├── ui/                     # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── MovieCard.tsx           # Movie poster card
│   ├── MovieMeta.tsx           # Movie metadata display
│   ├── RatingPills.tsx         # Rating buttons
│   ├── ShareModal.tsx          # Share movie modal
│   ├── AuthModal.tsx           # Auth modal for unauthenticated users
│   ├── AIBot.tsx               # AI chatbot component
│   ├── Shell.tsx               # App shell (header, navigation)
│   ├── Glow.tsx                # Background glow effects
│   └── SessionProvider.tsx     # NextAuth session provider
│
├── lib/                        # Utility libraries & configurations
│   ├── auth.ts                 # NextAuth configuration
│   ├── prisma.ts               # Prisma client singleton
│   ├── logger.ts               # Winston logger configuration
│   ├── store.ts                # Zustand state management
│   ├── data.ts                 # Mock data & type definitions
│   ├── helpers.ts              # Utility helper functions
│   ├── rag.ts                  # RAG pipeline (OpenAI integration)
│   └── perplexity-recommendations.ts  # Perplexity integration
│
├── prisma/                     # Database schema & migrations
│   ├── schema.prisma           # Prisma schema definition
│   └── migrations/             # Database migrations
│
├── logs/                       # Application logs (file-based)
│   └── app-YYYY-MM-DD.log     # Daily log files
│
├── __tests__/                  # Test files
│   ├── api/                    # API route tests
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   └── helpers/                # Test utilities
│
├── public/                     # Static assets
│   └── posters/                # Movie poster images
│
├── middleware.ts               # Next.js middleware (auth, logging)
├── next.config.js              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── jest.config.js              # Jest testing configuration
├── package.json                # Dependencies & scripts
└── .env.local                  # Environment variables (not in git)
```

### Frontend vs Backend Separation

#### Frontend (Client-Side)
**Location**: `app/(routes)/`, `components/`
- All `.tsx` files with `"use client"` directive
- React components, hooks, state management
- Client-side routing, animations, user interactions

#### Backend (Server-Side)
**Location**: `app/api/`, `lib/`, `prisma/`
- All `route.ts` files in `app/api/`
- Prisma models, database operations
- External API integrations (OpenAI, Perplexity, TMDB)
- Authentication logic

---

## 🎨 Frontend Architecture

### Component Hierarchy

```
Shell (App Layout)
├── Header
│   ├── Logo
│   ├── Search Bar
│   └── User Menu
├── Navigation
│   ├── Home
│   ├── Rate
│   ├── Watchlist
│   └── Friends
└── Main Content (Route-specific)
    ├── Discover Page
    │   ├── AI Recommendations Button
    │   ├── Quick Picks Grid
    │   └── Smart Picks Grid
    ├── Rate Page
    │   ├── Generate Button
    │   └── Movie Rating Grid
    ├── Watchlist Page
    ├── Friends Page
    └── Profile Page
        ├── User Stats
        ├── Language Preferences
        ├── AI Recommendation Settings
        └── Recently Rated Movies
```

### State Management

**Zustand Store** (`lib/store.ts`):
```typescript
{
  // User profile
  name: string
  age: number
  languages: string[]
  
  // Ratings
  rated: Record<number, Rating>
  ratedMovies: RatedMovie[]
  
  // Watchlist
  watchlist: Movie[]
  
  // Actions
  setProfile()
  setLanguages()
  rateMovie()
  addToWatchlist()
  removeFromWatchlist()
}
```

**Persistence**:
- Local state: `localStorage` (client-side)
- Remote state: PostgreSQL via API calls (server-side)
- Sync strategy: Optimistic updates with server confirmation

### Routing Structure

| Route | Purpose | Protection |
|-------|---------|------------|
| `/` | Root redirect to `/discover` | Public |
| `/discover` | Home page, movie discovery | Public (limited), Auth (full) |
| `/rate` | Rate movies for taste discovery | Protected |
| `/watchlist` | User's watchlist | Protected |
| `/friends` | Social features | Protected |
| `/profile` | User settings & preferences | Protected |
| `/onboarding` | New user setup | Protected |
| `/login` | Authentication | Public |
| `/signup` | User registration | Public |

---

## ⚙️ Backend Architecture

### API Routes Structure

```
/api/
├── auth/
│   ├── [...nextauth]/route.ts     # NextAuth handlers
│   └── signup/route.ts            # User registration
│
├── ratings/
│   └── route.ts                   # CRUD for movie ratings
│
├── watchlist/
│   └── route.ts                   # CRUD for watchlist
│
├── recommendations/
│   └── bulk/route.ts              # Generate AI recommendations
│
├── search/
│   ├── smart-picks/route.ts       # AI-powered discovery (Perplexity)
│   ├── database/route.ts          # Database search
│   └── ai/route.ts                # AI chatbot search
│
├── user/
│   ├── profile/route.ts           # Get user profile
│   ├── onboarding/route.ts        # Save onboarding data
│   └── ai-instructions/route.ts   # Custom AI instructions
│
├── quick-picks/route.ts           # Quick movie recommendations
├── rate-movies/route.ts           # Generate movies for rating
└── preview-movies/route.ts        # Landing page movies
```

### API Design Patterns

1. **RESTful Endpoints**: Standard HTTP methods (GET, POST, PUT, DELETE)
2. **Consistent Response Format**:
   ```json
   {
     "success": true,
     "data": {...},
     "error": null
   }
   ```
3. **Error Handling**: Try-catch with detailed logging
4. **Authentication**: Session-based via NextAuth
5. **Logging**: Comprehensive logging for all operations

### External API Integration

#### OpenAI Integration (`lib/rag.ts`)
```typescript
- Model: gpt-5-nano-2025-08-07
- Input Token Limit: 64k
- Output Token Limit: 50k
- Use Cases:
  • Analyze user ratings
  • Generate personalized recommendations
  • Chat-based movie search
```

#### Perplexity Integration (`lib/perplexity-recommendations.ts`)
```typescript
- Model: sonar-pro
- Use Cases:
  • Real-time movie discovery
  • Trending movie search
  • Smart picks for discovery page
```

#### TMDB Integration (Multiple API routes)
```typescript
- Endpoints:
  • /search/movie - Search movies
  • /movie/{id} - Get movie details
- Use Cases:
  • Fetch movie metadata
  • Get posters and images
  • Retrieve ratings and reviews
```

---

## 🗄️ Database Schema

### Core Models

#### User
```prisma
model User {
  id                 String    @id @default(cuid())
  name               String?
  email              String?   @unique
  password           String?   // Hashed
  languages          String[]  // Preferred languages
  moviePreference    String?   // Taste description
  aiInstructions     String?   // Custom AI instructions
  onboardingComplete Boolean   @default(false)
  signupMethod       String?   // "email" | "oauth"
  
  ratings            MovieRating[]
  watchlist          WatchlistItem[]
  recommendations    UserRecommendation[]
}
```

#### Movie
```prisma
model Movie {
  id              Int       @id
  title           String
  originalTitle   String?
  year            Int
  posterPath      String?
  overview        String?
  language        String
  voteAverage     Float?
  voteCount       Int?
  genres          String[]
  imdbRating      Float?
  rtRating        Float?
  // ... more fields
}
```

#### MovieRating
```prisma
model MovieRating {
  id         String   @id @default(cuid())
  userId     String
  movieId    Int
  movieTitle String
  movieYear  String?
  rating     String   // "awful" | "good" | "amazing" | "not_seen"
  createdAt  DateTime @default(now())
  
  user       User     @relation(fields: [userId], references: [id])
}
```

#### WatchlistItem
```prisma
model WatchlistItem {
  id         String   @id @default(cuid())
  userId     String
  movieId    Int
  movieTitle String
  addedAt    DateTime @default(now())
  
  user       User     @relation(fields: [userId], references: [id])
}
```

### Database Provider

**Supabase PostgreSQL**
- Hosted PostgreSQL database
- Connection pooling
- Automatic backups
- pgvector extension enabled

---

## 🤖 AI & Recommendation Engine

### Two-Stage Recommendation Pipeline

#### Stage 1: Perplexity Discovery
```
User Preferences → Perplexity Sonar API → Raw Movie List
```
- Generates 12-15 movie suggestions
- Uses real-time web data
- Considers trending movies

#### Stage 2: GPT Refinement
```
Raw Movie List → OpenAI GPT → Refined Recommendations
```
- Analyzes user ratings
- Applies custom AI instructions
- Personalizes based on taste

### Recommendation Flow

1. **User rates movies** → Stored in database
2. **User clicks "Generate Recommendations"** → API call
3. **Backend fetches user data** → Ratings, preferences, instructions
4. **Perplexity API called** → Get movie suggestions
5. **Database checked** → Fetch existing movie data
6. **TMDB API called** → Fetch missing movie details
7. **Movies added to DB** → Upsert operation
8. **Response returned** → 12 movies with full details
9. **Frontend displays** → Movie cards with rating UI

### AI Instructions Feature

Users can provide custom instructions in their profile:
- Examples: "Past 6 months trending", "Critically acclaimed only"
- Stored in database (`aiInstructions` field)
- Automatically included in all AI prompts
- 500 character limit

---

## 🚀 Deployment Guide

### Overview

CineMate is a **monolithic Next.js application** that combines frontend and backend. For optimal deployment:

- **Frontend + API Routes**: Deploy to Vercel (recommended)
- **Database**: Keep on Supabase (already configured)
- **External APIs**: Keep API keys in environment variables

---

### 1. Deploy Frontend & Backend to Vercel

#### Why Vercel?
- **Native Next.js support** (created by Vercel)
- **Zero-config deployment**
- **Automatic SSL**
- **Global CDN**
- **Serverless functions** for API routes
- **Free tier available**

#### Deployment Steps

##### Step 1: Prepare Repository

1. **Ensure `.env.local` is in `.gitignore`**:
   ```bash
   # Check if .env.local is ignored
   cat .gitignore | grep .env.local
   ```

2. **Create `.env.example`** (for documentation):
   ```bash
   # Copy without values
   cp .env.local .env.example
   # Remove sensitive values manually
   ```

3. **Commit and push to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

##### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with GitHub
3. Click **"Add New Project"**
4. Select your `cinemate` repository
5. Vercel auto-detects Next.js configuration

##### Step 3: Configure Environment Variables

In Vercel project settings, add all environment variables:

```env
# Database
DATABASE_URL=your_supabase_connection_string

# NextAuth
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your_generated_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Perplexity
PERPLEXITY_API_KEY=your_perplexity_api_key

# TMDB
TMDB_API_KEY=your_tmdb_api_key

# Optional: Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

##### Step 4: Configure OAuth Callback

Update Google OAuth settings:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services > Credentials**
3. Edit your OAuth 2.0 Client
4. Add authorized redirect URI:
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```

##### Step 5: Deploy

1. Click **"Deploy"** in Vercel
2. Wait for build and deployment (2-3 minutes)
3. Visit your deployed app: `https://your-app.vercel.app`

##### Step 6: Post-Deployment

1. **Run database migrations** (if needed):
   ```bash
   # From local machine
   npx prisma migrate deploy
   ```

2. **Test authentication**:
   - Try Google OAuth login
   - Try email/password signup

3. **Test API routes**:
   - Generate recommendations
   - Rate movies
   - Add to watchlist

---

### 2. Database (Supabase)

#### Current Setup
- Already configured and working
- Connection string in `DATABASE_URL`
- Includes `pgvector` extension

#### Recommendations
- **Keep on Supabase** (no changes needed)
- Enable connection pooling for production
- Set up automated backups (if not already)
- Monitor database size and performance

#### Supabase Settings (Optional)

```sql
-- Enable connection pooling
-- In Supabase Dashboard: Settings > Database > Connection Pooling

-- Set reasonable pool size
-- Recommended: 10-20 connections for hobby plan
```

---

### 3. Alternative Backend Deployment Options

While Vercel is recommended, here are alternatives:

#### Option A: Railway
- **Pros**: Simple deployment, PostgreSQL included, good for monolithic apps
- **Cons**: Limited free tier, slower than Vercel
- **Best For**: If you need more control over server

#### Option B: AWS Amplify
- **Pros**: Full AWS integration, scalable, CDN included
- **Cons**: More complex setup, higher cost
- **Best For**: Enterprise applications

#### Option C: DigitalOcean App Platform
- **Pros**: Simple, affordable, good support
- **Cons**: Less serverless features
- **Best For**: Traditional hosting approach

#### Option D: Cloudflare Pages
- **Pros**: Fast CDN, excellent DDoS protection
- **Cons**: Limited Next.js support
- **Best For**: Static-heavy applications

---

### 4. Separate Frontend & Backend (Not Recommended)

If you must separate frontend and backend:

#### Frontend (Vercel)
```bash
# Remove API routes from deployment
# Create separate repository with only:
- app/(routes)/
- components/
- lib/store.ts
- lib/helpers.ts
```

#### Backend (Railway, Heroku, or AWS)
```bash
# Create standalone API with:
- app/api/
- lib/prisma.ts
- lib/auth.ts
- lib/rag.ts
- prisma/
```

**CORS Configuration Required**:
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', 'https://frontend.vercel.app');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}
```

---

### 5. Environment-Specific Configurations

#### Development
```env
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

#### Staging (Optional)
```env
NEXTAUTH_URL=https://cinemate-staging.vercel.app
NODE_ENV=staging
```

#### Production
```env
NEXTAUTH_URL=https://cinemate.vercel.app
NODE_ENV=production
```

---

### 6. Performance Optimization

#### Before Deployment

1. **Optimize Images**:
   ```typescript
   // next.config.js
   images: {
     domains: ['image.tmdb.org'],
     formats: ['image/avif', 'image/webp'],
   }
   ```

2. **Enable Caching**:
   ```typescript
   // API routes
   export const revalidate = 3600; // Cache for 1 hour
   ```

3. **Bundle Analysis**:
   ```bash
   npm install --save-dev @next/bundle-analyzer
   # Add to next.config.js
   ```

4. **Minify & Compress**:
   ```typescript
   // next.config.js
   compress: true,
   swcMinify: true,
   ```

---

### 7. Monitoring & Logging

#### Vercel Analytics
- Enable in Vercel dashboard
- Track page views, performance, user flows

#### Error Tracking (Optional)
- **Sentry**: `npm install @sentry/nextjs`
- **LogRocket**: For session replay
- **Datadog**: For comprehensive monitoring

#### Custom Logging
- Already implemented in `lib/logger.ts`
- Configure log levels per environment:
  ```typescript
  const LOG_LEVEL = process.env.NODE_ENV === 'production' ? 'error' : 'info';
  ```

---

### 8. CI/CD Pipeline

#### Automated Deployment (Vercel)

Vercel automatically deploys on:
- **Push to `main`** → Production
- **Pull requests** → Preview deployments
- **Push to other branches** → Branch previews

#### GitHub Actions (Optional)

```yaml
# .github/workflows/deploy.yml
name: CI/CD
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: npm test
      - name: Run linter
        run: npm run lint
```

---

### 9. Post-Deployment Checklist

- [ ] All environment variables set in Vercel
- [ ] Google OAuth redirect URI updated
- [ ] Database migrations applied
- [ ] SSL certificate active (automatic on Vercel)
- [ ] Custom domain configured (optional)
- [ ] Authentication working (Google & email)
- [ ] API routes responding correctly
- [ ] Perplexity API calls working
- [ ] OpenAI API calls working
- [ ] TMDB images loading
- [ ] Mobile responsiveness verified
- [ ] Performance metrics acceptable
- [ ] Error monitoring set up

---

### 10. Scaling Considerations

#### When to Scale

- **User growth**: > 10,000 active users
- **High traffic**: > 1M requests/month
- **Database size**: > 10GB
- **Response time**: > 3 seconds

#### Scaling Strategies

1. **Database**:
   - Upgrade Supabase plan
   - Enable read replicas
   - Implement caching (Redis)

2. **API Routes**:
   - Vercel automatically scales serverless functions
   - Consider rate limiting for external APIs

3. **Static Assets**:
   - Use Vercel's global CDN (automatic)
   - Optimize images with Next.js Image component

4. **AI API Costs**:
   - Monitor OpenAI usage
   - Implement request throttling
   - Cache common recommendations

---

## 📊 Cost Estimation

### Development/Hobby (Free)
- **Vercel**: Free tier (100GB bandwidth, serverless functions)
- **Supabase**: Free tier (500MB database, 2GB bandwidth)
- **OpenAI**: Pay-as-you-go (~ $10-50/month)
- **Perplexity**: Pay-as-you-go (~ $5-20/month)
- **TMDB**: Free (limited requests)
- **Total**: ~ $15-70/month

### Production (< 10k users)
- **Vercel Pro**: $20/month
- **Supabase Pro**: $25/month
- **OpenAI**: ~ $100-300/month
- **Perplexity**: ~ $50-100/month
- **TMDB**: Free or $50/month (commercial)
- **Total**: ~ $245-495/month

---

## 🔐 Security Considerations

1. **Environment Variables**: Never commit to git
2. **API Keys**: Rotate regularly
3. **Database**: Use connection pooling, enable SSL
4. **Authentication**: Secure session tokens, HTTP-only cookies
5. **CORS**: Restrict origins in production
6. **Rate Limiting**: Implement for API routes
7. **Input Validation**: Sanitize all user inputs
8. **SQL Injection**: Use Prisma (already protected)
9. **XSS Protection**: React escapes by default
10. **CSRF Protection**: NextAuth handles this

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Deployment Guide](https://vercel.com/docs/deployments/overview)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Perplexity API Documentation](https://docs.perplexity.ai)

---

## 📝 Summary

**CineMate** is a modern, full-stack movie recommendation application built with:
- **Frontend**: React + Next.js + Tailwind CSS
- **Backend**: Next.js API Routes + Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **AI**: OpenAI GPT + Perplexity Sonar

**Recommended Deployment**:
- Deploy entire application to **Vercel** (frontend + backend)
- Keep database on **Supabase**
- Configure environment variables in Vercel
- Enable monitoring and analytics

This monolithic architecture is perfect for rapid development and easy deployment, with the flexibility to scale as needed.

---

**Version**: 1.0.0  
**Last Updated**: November 2024  
**Maintained By**: CineMate Team

