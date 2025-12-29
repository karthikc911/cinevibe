# CineVibe System Design Document

A comprehensive guide explaining how the CineVibe website and iOS app work together.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Website Architecture](#website-architecture)
4. [iOS App Architecture](#ios-app-architecture)
5. [Shared Backend API](#shared-backend-api)
6. [Authentication Flow](#authentication-flow)
7. [Data Flow](#data-flow)
8. [AI Recommendation System](#ai-recommendation-system)
9. [Database Schema](#database-schema)
10. [External Services](#external-services)

---

## System Overview

CineVibe is a movie and TV show recommendation platform with two client applications:

1. **Website** (Next.js) - Full-featured web application
2. **iOS App** (React Native/Expo) - Mobile application

Both clients share the **same backend API** hosted on the website, ensuring:
- Single source of truth for all data
- Consistent user experience across platforms
- Shared authentication and user profiles
- Synchronized ratings, watchlists, and preferences

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CineVibe System                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐                      ┌──────────────┐            │
│   │   Website    │                      │   iOS App    │            │
│   │  (Next.js)   │                      │    (Expo)    │            │
│   │              │                      │              │            │
│   │  - SSR/CSR   │                      │  - Native UI │            │
│   │  - React     │                      │  - React     │            │
│   │  - Web Auth  │                      │    Native    │            │
│   └──────┬───────┘                      └──────┬───────┘            │
│          │                                     │                     │
│          │ HTTP/HTTPS                          │ HTTP/HTTPS          │
│          │                                     │                     │
│          └──────────────┬──────────────────────┘                     │
│                         │                                            │
│                         ▼                                            │
│          ┌──────────────────────────────┐                           │
│          │      Next.js API Routes      │                           │
│          │     (Backend - /api/*)       │                           │
│          │                              │                           │
│          │  • Authentication            │                           │
│          │  • Movie/TV APIs             │                           │
│          │  • Ratings & Watchlist       │                           │
│          │  • AI Recommendations        │                           │
│          │  • User Preferences          │                           │
│          └──────────────┬───────────────┘                           │
│                         │                                            │
│          ┌──────────────┼───────────────┐                           │
│          │              │               │                            │
│          ▼              ▼               ▼                            │
│   ┌──────────┐  ┌──────────────┐  ┌───────────┐                     │
│   │ PostgreSQL│  │ External APIs│  │   Prisma  │                     │
│   │ Database │  │ (TMDB, AI)   │  │    ORM    │                     │
│   └──────────┘  └──────────────┘  └───────────┘                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Architecture Diagram

### High-Level Architecture

```
                    ┌─────────────────────────────────────┐
                    │            CLIENTS                   │
                    ├─────────────────┬───────────────────┤
                    │                 │                   │
              ┌─────▼─────┐     ┌─────▼─────┐            │
              │  Website  │     │  iOS App  │            │
              │ (Browser) │     │ (iPhone)  │            │
              └─────┬─────┘     └─────┬─────┘            │
                    │                 │                   │
                    │    HTTPS        │    HTTPS          │
                    │                 │                   │
                    └────────┬────────┘                   │
                             │                            │
                    ┌────────▼────────┐                   │
                    │   Vercel CDN    │                   │
                    │  (Edge Network) │                   │
                    └────────┬────────┘                   │
                             │                            │
┌────────────────────────────▼────────────────────────────┐
│                    BACKEND (Vercel)                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Next.js Application                    │ │
│  ├────────────────────────────────────────────────────┤ │
│  │                                                    │ │
│  │  ┌─────────────────┐    ┌─────────────────┐       │ │
│  │  │   React Pages   │    │   API Routes    │       │ │
│  │  │   (Frontend)    │    │   (/api/*)      │       │ │
│  │  │                 │    │                 │       │ │
│  │  │  • Home         │    │  • /auth/*      │       │ │
│  │  │  • Rate         │    │  • /movies/*    │       │ │
│  │  │  • Watchlist    │    │  • /ratings     │       │ │
│  │  │  • Profile      │    │  • /watchlist   │       │ │
│  │  │  • Search       │    │  • /search/*    │       │ │
│  │  └─────────────────┘    └────────┬────────┘       │ │
│  │                                  │                 │ │
│  └──────────────────────────────────┼─────────────────┘ │
│                                     │                   │
│  ┌──────────────────────────────────▼─────────────────┐ │
│  │                   Prisma ORM                        │ │
│  │            (Database Abstraction)                   │ │
│  └──────────────────────────────────┬─────────────────┘ │
│                                     │                   │
└─────────────────────────────────────┼───────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
      ┌───────▼───────┐       ┌───────▼───────┐       ┌───────▼───────┐
      │   PostgreSQL  │       │     TMDB      │       │  Perplexity   │
      │   (Neon DB)   │       │     API       │       │     AI        │
      │               │       │               │       │               │
      │ • Users       │       │ • Movie Data  │       │ • Smart Picks │
      │ • Ratings     │       │ • TV Shows    │       │ • Enrichment  │
      │ • Watchlist   │       │ • Posters     │       │ • Search      │
      │ • Movies      │       │ • Trending    │       │               │
      └───────────────┘       └───────────────┘       └───────────────┘
```

---

## Website Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 14 | React framework with SSR, API routes |
| **UI** | React + Tailwind CSS | Component-based UI with utility styling |
| **State** | Zustand | Global state management |
| **Auth** | NextAuth.js | OAuth & credential authentication |
| **Database** | Prisma + PostgreSQL | ORM with type-safe queries |
| **Animations** | Framer Motion | Smooth UI animations |

### File Structure

```
cinemate/
├── app/                      # Next.js App Router
│   ├── page.tsx              # Home page (AI Picks)
│   ├── rate/page.tsx         # Rate movies/TV shows
│   ├── watchlist/page.tsx    # User's watchlist
│   ├── my-ratings/page.tsx   # View ratings history
│   ├── profile/page.tsx      # User profile & preferences
│   ├── login/page.tsx        # Login page
│   ├── admin/page.tsx        # Admin panel
│   │
│   └── api/                  # Backend API Routes
│       ├── auth/             # Authentication endpoints
│       │   ├── [...nextauth]/route.ts  # NextAuth handler
│       │   ├── mobile-login/route.ts   # Mobile app login
│       │   ├── google-mobile/route.ts  # Google OAuth for mobile
│       │   └── signup/route.ts         # Email/password signup
│       │
│       ├── movies/           # Movie endpoints
│       │   └── [id]/route.ts # Get movie by ID
│       │
│       ├── tvshows/          # TV show endpoints
│       │   └── [id]/route.ts # Get TV show by ID
│       │
│       ├── ratings/route.ts  # Movie ratings CRUD
│       ├── tvshow-ratings/route.ts  # TV show ratings
│       ├── watchlist/route.ts       # Movie watchlist
│       ├── tvshow-watchlist/route.ts # TV show watchlist
│       ├── random-movies/route.ts   # Movies for rating page
│       │
│       ├── search/           # Search & AI endpoints
│       │   ├── smart-picks/route.ts      # AI movie recommendations
│       │   ├── smart-picks-tvshows/route.ts # AI TV recommendations
│       │   └── perplexity/route.ts       # Perplexity search
│       │
│       ├── tmdb/             # TMDB proxy endpoints
│       │   ├── trending/route.ts         # Trending movies
│       │   └── trending-tvshows/route.ts # Trending TV shows
│       │
│       ├── user/             # User management
│       │   └── preferences/route.ts      # User preferences
│       │
│       └── friends/          # Social features
│           ├── route.ts      # Friends list
│           ├── recommend/route.ts  # Share movies
│           └── requests/route.ts   # Friend requests
│
├── components/               # React components
│   ├── MovieCard.tsx         # Movie/TV display card
│   ├── ShareModal.tsx        # Share with friends modal
│   ├── AIThinkingPanel.tsx   # AI processing indicator
│   └── ui/                   # Shadcn UI components
│
├── lib/                      # Utility libraries
│   ├── prisma.ts             # Prisma client
│   ├── auth.ts               # Auth configuration
│   ├── mobile-auth.ts        # Mobile token validation
│   ├── store.ts              # Zustand store
│   └── movie-metadata-fetcher.ts # IMDB enrichment
│
├── config/                   # Configuration
│   └── prompts/              # AI prompts
│       ├── movie-recommendations.ts
│       ├── tvshow-recommendations.ts
│       └── search.ts
│
└── prisma/
    └── schema.prisma         # Database schema
```

### Page Flow

```
User Opens Website
        │
        ▼
┌───────────────────┐
│   Login Page      │ ◄──── Not authenticated
│   /login          │
└─────────┬─────────┘
          │ Auth success
          ▼
┌───────────────────┐
│    Home Page      │ ◄──── Shows AI Picks (Movies & TV)
│    /              │
└─────────┬─────────┘
          │
    ┌─────┴─────┬──────────┬──────────┐
    ▼           ▼          ▼          ▼
┌───────┐  ┌────────┐  ┌────────┐  ┌────────┐
│ Rate  │  │Watchlist│  │ My     │  │Profile │
│ /rate │  │/watchlist│ │Ratings │  │/profile│
└───────┘  └────────┘  └────────┘  └────────┘
    │           │          │          │
    │     User actions sync to database via API
    └───────────┴──────────┴──────────┘
```

---

## iOS App Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Expo (React Native) | Cross-platform mobile framework |
| **Navigation** | Expo Router | File-based routing |
| **UI** | React Native components | Native mobile UI |
| **State** | Zustand | Global state management |
| **HTTP** | Axios | API requests with interceptors |
| **Auth Storage** | Expo SecureStore | Encrypted token storage |
| **Images** | expo-image | Optimized image loading |

### File Structure

```
cinemate-ios/
├── app/                      # Expo Router pages
│   ├── _layout.tsx           # Root layout
│   ├── index.tsx             # Entry (redirects to login or tabs)
│   ├── login.tsx             # Login screen
│   ├── signup.tsx            # Signup screen
│   ├── rate.tsx              # Rate movies/TV shows
│   ├── preferences.tsx       # User preferences
│   │
│   └── (tabs)/               # Tab navigation
│       ├── _layout.tsx       # Tab bar configuration
│       ├── index.tsx         # Home (Trending)
│       ├── search.tsx        # Search & AI Picks
│       ├── watchlist.tsx     # User's watchlist
│       ├── friends.tsx       # Friends & recommendations
│       └── profile.tsx       # User profile
│
├── components/               # React Native components
│   ├── MovieCard.tsx         # Movie/TV display card
│   ├── MovieDetailModal.tsx  # Full movie details modal
│   ├── LoadingSpinner.tsx    # Loading indicator
│   ├── EmptyState.tsx        # Empty list placeholder
│   └── RatingButtonGroup.tsx # Rating buttons
│
├── lib/                      # Utility libraries
│   ├── api.ts                # API client (Axios)
│   ├── store.ts              # Zustand store
│   ├── types.ts              # TypeScript types
│   ├── constants.ts          # Colors, config
│   └── mockData.ts           # Demo mode data
│
└── assets/                   # Images, icons
    ├── icon.png
    └── splash.png
```

### How iOS App Connects to Website Backend

The iOS app is a **thin client** that uses the website's API:

```
┌─────────────────────────────────────────────────────────────────┐
│                        iOS App (Expo)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    lib/api.ts                            │   │
│  │                                                         │   │
│  │  const API_BASE = 'https://your-app.vercel.app/api';   │   │
│  │                                                         │   │
│  │  // All API calls go to website backend:               │   │
│  │  • moviesApi.getSmartPicks()  → POST /api/search/smart-picks │
│  │  • ratingsApi.rateMovie()     → POST /api/ratings      │   │
│  │  • watchlistApi.getWatchlist()→ GET  /api/watchlist    │   │
│  │  • userApi.getPreferences()   → GET  /api/user/preferences  │
│  │                                                         │   │
│  │  // Authentication header on every request:            │   │
│  │  Authorization: Bearer <mobile_token>                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Website Backend (Vercel)                       │
│                                                                 │
│  API Route receives request:                                    │
│  1. Checks Authorization header for mobile token                │
│  2. Validates token against database (user.mobileToken)         │
│  3. Processes request with user context                         │
│  4. Returns JSON response                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### iOS App Screen Flow

```
App Launch
    │
    ▼
┌─────────────────┐
│  Check Token    │
│  (SecureStore)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
No Token    Has Token
    │         │
    ▼         ▼
┌─────────┐  ┌─────────────┐
│ Login   │  │ Validate    │
│ Screen  │  │ Token       │
└────┬────┘  └──────┬──────┘
     │              │
     │         ┌────┴────┐
     │         │         │
     │       Valid    Invalid
     │         │         │
     │         ▼         ▼
     │    ┌─────────┐  ┌─────────┐
     │    │  Tabs   │  │  Login  │
     └───►│  Home   │  │  Screen │
          └─────────┘  └─────────┘
               │
      ┌────────┴────────┐
      │                 │
      ▼                 ▼
┌──────────┐      ┌──────────┐
│ Tab Bar  │      │ Profile  │
│ • Home   │      │ Menu     │
│ • Search │      │ • Rate   │
│ • Watchlist│    │ • Prefs  │
│ • Friends│      │ • Logout │
│ • Profile│      └──────────┘
└──────────┘
```

---

## Shared Backend API

### API Endpoints Used by Both Clients

| Endpoint | Method | Website | iOS | Purpose |
|----------|--------|---------|-----|---------|
| `/api/auth/[...nextauth]` | * | ✅ | ❌ | Web OAuth |
| `/api/auth/mobile-login` | POST | ❌ | ✅ | Mobile login |
| `/api/auth/google-mobile` | POST | ❌ | ✅ | Mobile Google OAuth |
| `/api/auth/signup` | POST | ✅ | ✅ | Email signup |
| `/api/movies/[id]` | GET | ✅ | ✅ | Get movie details |
| `/api/tvshows/[id]` | GET | ✅ | ✅ | Get TV show details |
| `/api/ratings` | GET/POST | ✅ | ✅ | Movie ratings |
| `/api/tvshow-ratings` | GET/POST | ✅ | ✅ | TV show ratings |
| `/api/watchlist` | GET/POST/DELETE | ✅ | ✅ | Movie watchlist |
| `/api/tvshow-watchlist` | GET/POST/DELETE | ✅ | ✅ | TV show watchlist |
| `/api/random-movies` | POST | ✅ | ✅ | Movies for rating |
| `/api/search/smart-picks` | POST | ✅ | ✅ | AI movie recommendations |
| `/api/search/smart-picks-tvshows` | POST | ✅ | ✅ | AI TV recommendations |
| `/api/search/perplexity` | POST | ✅ | ✅ | Search with AI |
| `/api/tmdb/trending` | GET | ✅ | ✅ | Trending movies |
| `/api/tmdb/trending-tvshows` | GET | ✅ | ✅ | Trending TV shows |
| `/api/user/preferences` | GET/POST | ✅ | ✅ | User preferences |
| `/api/friends/*` | * | ✅ | ✅ | Friends & sharing |

### Authentication Methods

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   WEBSITE (NextAuth.js)                iOS APP (Token-based)    │
│   ─────────────────────                ─────────────────────    │
│                                                                 │
│   1. User clicks "Sign in with Google" │  1. User enters email/ │
│   2. Redirects to Google OAuth         │     password          │
│   3. Google returns to callback URL    │  2. POST /mobile-login│
│   4. NextAuth creates session cookie   │  3. Server validates  │
│   5. Session stored in HTTP-only cookie│  4. Returns JWT-like  │
│                                        │     mobile token      │
│   API calls use:                       │  5. Token stored in   │
│   - Session cookie (automatic)         │     SecureStore       │
│                                        │                       │
│                                        │  API calls use:       │
│                                        │  - Authorization header│
│                                        │  - Bearer <token>     │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                 getCurrentUser() Helper                  │  │
│   │                                                         │  │
│   │  // lib/mobile-auth.ts                                 │  │
│   │  export async function getCurrentUser(session, authHeader) │
│   │    // Check web session first                           │  │
│   │    if (session?.user?.email) return session.user;      │  │
│   │                                                         │  │
│   │    // Then check mobile token                          │  │
│   │    if (authHeader?.startsWith('Bearer ')) {            │  │
│   │      const token = authHeader.replace('Bearer ', '');  │  │
│   │      const user = await prisma.user.findFirst({        │  │
│   │        where: { mobileToken: token }                   │  │
│   │      });                                               │  │
│   │      return user;                                      │  │
│   │    }                                                   │  │
│   │    return null;                                        │  │
│   │  }                                                     │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Rating a Movie

```
User rates movie as "Amazing"
         │
         ├─────────────────────┬─────────────────────┐
         │                     │                     │
    Website                iOS App              Both Store
         │                     │                     │
         ▼                     ▼                     │
POST /api/ratings        POST /api/ratings          │
{                        {                          │
  movieId: 123,            movieId: 123,           │
  movieTitle: "...",       movieTitle: "...",      │
  rating: "amazing"        rating: "amazing"       │
}                        }                          │
         │                     │                     │
         │  + Session Cookie   │  + Bearer Token    │
         │                     │                     │
         └──────────┬──────────┘                     │
                    │                                │
                    ▼                                │
         ┌─────────────────────┐                     │
         │   API Route         │                     │
         │   /api/ratings      │                     │
         │                     │                     │
         │   1. getCurrentUser()│                    │
         │   2. Find/Create User│                    │
         │   3. Upsert Rating   │                    │
         └──────────┬──────────┘                     │
                    │                                │
                    ▼                                │
         ┌─────────────────────┐                     │
         │   PostgreSQL        │ ◄───────────────────┘
         │                     │
         │   MovieRating {     │
         │     id,             │
         │     userId,         │
         │     movieId: 123,   │
         │     rating: "amazing"│
         │   }                 │
         └─────────────────────┘
```

### AI Recommendation Flow

```
User requests AI Movie Picks
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                POST /api/search/smart-picks                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. AUTHENTICATE USER                                           │
│     └── getCurrentUser(session, authHeader)                    │
│                                                                 │
│  2. LOAD USER DATA FROM DATABASE                               │
│     ├── User preferences (languages, genres)                   │
│     ├── All movie ratings (for exclusion)                      │
│     ├── Watchlist (for exclusion)                              │
│     └── AI feedback (user instructions)                        │
│                                                                 │
│  3. BUILD PERPLEXITY PROMPT                                    │
│     ├── System prompt: "You are a movie recommendation expert" │
│     ├── User profile: languages, genres, year range, IMDB min  │
│     ├── Exclusion list: All rated + watchlist movies           │
│     └── User instructions: Custom AI guidance                   │
│                                                                 │
│  4. CALL PERPLEXITY AI                                         │
│     └── POST https://api.perplexity.ai/chat/completions        │
│         └── Returns: ["Movie A", "Movie B", "Movie C", ...]    │
│                                                                 │
│  5. PROCESS RECOMMENDATIONS                                     │
│     ├── Search each title in local database                    │
│     ├── If not found → Search TMDB → Store in DB               │
│     ├── Enrich with IMDB data (ratings, reviews)               │
│     └── Filter out any already-rated movies (double check)     │
│                                                                 │
│  6. RETURN RESPONSE                                            │
│     └── { movies: [...], aiSteps: [...] }                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## AI Recommendation System

### How Smart Picks Work

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI RECOMMENDATION PIPELINE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  USER PROFILE                    EXCLUSION LIST                 │
│  ────────────                    ──────────────                 │
│  • Languages: Hindi, English     • All "Amazing" rated movies   │
│  • Genres: Action, Thriller      • All "Good" rated movies      │
│  • Year range: 2010-2024         • All "Meh" rated movies       │
│  • Min IMDB: 7.0                 • All "Awful" rated movies     │
│  • AI Instructions: "Love        • All "Not Interested" movies  │
│    psychological thrillers"      • All "Skipped" movies         │
│                                  • All Watchlist movies         │
│                                                                 │
│                    ┌─────────────┐                              │
│                    │             │                              │
│  USER PROFILE ────►│  PERPLEXITY │◄──── EXCLUSION LIST          │
│                    │     AI      │                              │
│                    │             │                              │
│                    └──────┬──────┘                              │
│                           │                                     │
│                           ▼                                     │
│              "Based on your love of Action and                  │
│               Thriller movies in Hindi and English,             │
│               avoiding the 150 movies you've rated,             │
│               I recommend: Jawan, Animal, Pathaan..."           │
│                           │                                     │
│                           ▼                                     │
│                    ┌─────────────┐                              │
│                    │ VALIDATION  │                              │
│                    │             │                              │
│                    │ • Check DB  │                              │
│                    │ • Title match│                             │
│                    │ • Fuzzy filter│                            │
│                    └──────┬──────┘                              │
│                           │                                     │
│                           ▼                                     │
│                    ┌─────────────┐                              │
│                    │ ENRICHMENT  │                              │
│                    │             │                              │
│                    │ • TMDB data │                              │
│                    │ • IMDB rating│                             │
│                    │ • User reviews│                            │
│                    │ • Budget/Box │                             │
│                    └──────┬──────┘                              │
│                           │                                     │
│                           ▼                                     │
│                   FINAL RECOMMENDATIONS                         │
│                   (Personalized, No Duplicates)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Prompt Structure

```javascript
// System Prompt
"You are a movie recommendation expert. Generate personalized movie
recommendations based on user preferences. CRITICAL RULES:
1. NEVER recommend movies from the exclusion list
2. Match user's language preferences
3. Consider genre preferences
4. Respect year and rating filters"

// User Prompt
"USER PROFILE:
- Preferred Languages: Hindi, English
- Favorite Genres: Action, Thriller, Drama
- Year Range: 2010-2024
- Minimum IMDB Rating: 7.0

USER'S PERSONAL INSTRUCTIONS:
'I love psychological thrillers with plot twists'

EXCLUSION LIST (MUST NOT RECOMMEND):
- Drishyam (2015) - Rated: Amazing
- Vikram Vedha (2022) - Rated: Good
- Animal (2023) - In Watchlist
... [150 more movies]

Generate 10 movie recommendations in JSON format."
```

---

## Database Schema

### Core Tables

```sql
-- Users
User {
  id            String    @id
  email         String    @unique
  name          String?
  password      String?   -- Hashed, null for OAuth users
  mobileToken   String?   -- Token for iOS app auth
  
  -- Preferences
  languages     String[]  -- ["Hindi", "English"]
  genres        String[]  -- ["Action", "Drama"]
  aiInstructions String?  -- Custom AI guidance
  recYearFrom   Int?
  recYearTo     Int?
  recMinImdb    Float?
  
  -- Relations
  ratings       MovieRating[]
  tvShowRatings TvShowRating[]
  watchlist     WatchlistItem[]
}

-- Movies (cached from TMDB + enriched)
Movie {
  id              Int       @id  -- TMDB ID
  title           String
  year            Int?
  posterPath      String?
  overview        String?
  language        String?
  genres          String[]
  
  -- IMDB enrichment
  imdbRating      Float?
  imdbVoterCount  Int?
  userReviewSummary String?
  budget          BigInt?
  boxOffice       BigInt?
}

-- Ratings
MovieRating {
  id          String    @id
  userId      String
  movieId     Int
  movieTitle  String
  movieYear   Int?
  rating      String    -- "amazing"|"good"|"meh"|"awful"|"not-interested"
  createdAt   DateTime
}

-- Watchlist
WatchlistItem {
  id          String    @id
  userId      String
  movieId     Int
  movieTitle  String
  movieYear   Int?
  addedAt     DateTime
}
```

---

## External Services

### API Dependencies

| Service | Purpose | Cost |
|---------|---------|------|
| **TMDB** | Movie/TV metadata, posters, trending | Free (rate limited) |
| **Perplexity AI** | Smart recommendations, search | ~$20/month for moderate use |
| **Google OAuth** | Social login | Free |
| **Neon/Supabase** | PostgreSQL hosting | Free tier available |
| **Vercel** | Website + API hosting | Free tier available |

### Service Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICE FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  REQUEST: "Show me trending action movies in Hindi"             │
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Perplexity│    │   TMDB   │    │ Database │    │ Response │  │
│  │    AI    │───►│   API    │───►│  Cache   │───►│  to User │  │
│  │          │    │          │    │          │    │          │  │
│  │ "Find    │    │ Get movie│    │ Store &  │    │ Display  │  │
│  │  movies  │    │ details, │    │ enrich   │    │ cards    │  │
│  │  matching│    │ posters  │    │ with IMDB│    │          │  │
│  │  query"  │    │          │    │          │    │          │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                 │
│  Cost: ~$0.01-0.05 per recommendation request                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary

### Key Design Principles

1. **Shared Backend**: Both website and iOS app use the same API endpoints
2. **Single Database**: All user data synchronized across platforms
3. **Unified Auth**: Different auth methods (session vs token) but same user accounts
4. **AI-Powered**: Perplexity AI for personalized recommendations
5. **Cached Data**: Movies stored locally after first fetch to reduce API calls
6. **Progressive Enhancement**: iOS app can work in demo mode without backend

### Data Synchronization

```
User rates movie on iOS
        │
        ▼
POST /api/ratings (iOS App)
        │
        ▼
Database Updated
        │
        ▼
User opens Website → Sees same rating ✓
User opens iOS App → Sees same rating ✓
```

Both clients always show the same data because they share the same backend and database.

