# 🎬 CineVibe

**Your AI-Powered Movie & TV Show Companion**

CineVibe is a personalized movie recommendation platform that uses AI to help you discover films and TV shows you'll love. Rate what you've watched, and get intelligent suggestions tailored to your taste.

![CineVibe](https://img.shields.io/badge/Next.js-14-black) ![React Native](https://img.shields.io/badge/Expo-React%20Native-blue) ![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-green) ![AI](https://img.shields.io/badge/AI-Perplexity-purple)

## 🌐 Live Deployments

- **Website**: [https://cinevibe-six.vercel.app](https://cinevibe-six.vercel.app)
- **iOS App (TestFlight)**: [https://appstoreconnect.apple.com/apps/6757141769/testflight/ios](https://appstoreconnect.apple.com/apps/6757141769/testflight/ios)
- **App Store Connect**: App ID `6757141769`

---

## 🌟 Features

| Feature | Description |
|---------|-------------|
| **AI Recommendations** | Perplexity AI generates personalized movie picks based on your ratings and preferences |
| **Smart Rating System** | Rate movies as Amazing, Good, Meh, Awful, or Not Interested |
| **Watchlist** | Save movies and TV shows to watch later |
| **Multi-Language Support** | Movies in Hindi, English, Tamil, Telugu, Kannada, Malayalam, Korean, Japanese, and more |
| **Friends & Sharing** | Share recommendations with friends |
| **Cross-Platform** | Website + iOS app with synchronized data |
| **IMDB Integration** | View ratings, vote counts, and user review summaries |

---

## 📱 Platforms

### Website (Next.js)
- Full-featured web application
- Google OAuth login
- Responsive design for desktop and mobile browsers

### iOS App (Expo/React Native)
- Native mobile experience
- Email/password and Google authentication
- Offline-capable with demo mode

**Both platforms share the same backend API and database, ensuring your ratings, watchlist, and preferences stay synchronized.**

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CineVibe                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐                      ┌──────────────┐       │
│   │   Website    │                      │   iOS App    │       │
│   │  (Next.js)   │                      │ (Expo/RN)    │       │
│   └──────┬───────┘                      └──────┬───────┘       │
│          │                                     │                │
│          └──────────────┬──────────────────────┘                │
│                         │                                       │
│                         ▼                                       │
│          ┌──────────────────────────────┐                      │
│          │   Next.js API Routes         │                      │
│          │   (Shared Backend)           │                      │
│          └──────────────┬───────────────┘                      │
│                         │                                       │
│          ┌──────────────┼───────────────┐                      │
│          ▼              ▼               ▼                      │
│   ┌──────────┐   ┌──────────┐   ┌───────────┐                 │
│   │PostgreSQL│   │  TMDB    │   │Perplexity │                 │
│   │ Database │   │   API    │   │    AI     │                 │
│   └──────────┘   └──────────┘   └───────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology |
|-----------|------------|
| **Website Frontend** | Next.js 14, React, Tailwind CSS, Framer Motion |
| **iOS App** | Expo, React Native, Expo Router |
| **Backend API** | Next.js API Routes |
| **Database** | PostgreSQL (via Prisma ORM) |
| **Authentication** | NextAuth.js (web), Custom tokens (mobile) |
| **AI/ML** | Perplexity AI for recommendations |
| **Movie Data** | TMDB API |
| **Hosting** | Vercel (website), App Store (iOS) |

---

## 📂 Project Structure

```
cinemate/
├── app/                      # Next.js App Router (Website)
│   ├── api/                  # Backend API endpoints
│   ├── page.tsx              # Home page
│   ├── rate/                 # Rate movies page
│   ├── watchlist/            # Watchlist page
│   └── profile/              # User profile & preferences
│
├── cinemate-ios/             # iOS App (Expo)
│   ├── app/                  # Expo Router screens
│   ├── components/           # React Native components
│   └── lib/                  # Utilities & API client
│
├── components/               # Website React components
├── lib/                      # Website utilities
├── prisma/                   # Database schema
├── config/                   # AI prompts configuration
└── docs/                     # Documentation
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (or use Neon/Supabase free tier)
- API Keys: TMDB, Perplexity, Google OAuth

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/cinemate.git
cd cinemate
npm install
```

### 2. Environment Setup

Create `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/cinemate"

# Authentication
NEXTAUTH_SECRET="your-random-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# APIs
TMDB_API_KEY="your-tmdb-api-key"
PERPLEXITY_API_KEY="your-perplexity-api-key"
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed with sample data
npx prisma db seed
```

### 4. Run Website

```bash
npm run dev
# Open http://localhost:3000
```

### 5. Run iOS App (Optional)

```bash
cd cinemate-ios
npm install
npx expo start
# Scan QR code with Expo Go app
```

---

## 🌐 Deployment

### Website → Vercel

| Step | Action |
|------|--------|
| 1 | Push code to GitHub |
| 2 | Import repo at [vercel.com/new](https://vercel.com/new) |
| 3 | Add environment variables |
| 4 | Deploy (automatic on git push) |

**Detailed guide:** [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)

### iOS App → App Store

| Route | Timeline | Best For |
|-------|----------|----------|
| **TestFlight** | 2-4 days | Beta testing, early access |
| **App Store** | 1-2 weeks | Public release |

**Requirements:**
- Apple Developer Account ($99/year)
- Expo/EAS account (free)

**Steps:**
```bash
cd cinemate-ios
npm install -g eas-cli
eas login
eas build --platform ios
eas submit --platform ios
```

**Detailed guide:** [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)

---

## 🔑 Getting API Keys

### TMDB (Movie Data)
1. Sign up at [themoviedb.org](https://www.themoviedb.org/)
2. Go to Settings → API → Create API Key
3. Copy the API Key (v3 auth)

### Perplexity AI (Recommendations)
1. Sign up at [perplexity.ai](https://www.perplexity.ai/)
2. Go to API settings
3. Generate API key

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Add redirect URI: `http://localhost:3000/api/auth/callback/google`

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) | Complete Vercel + App Store deployment |
| [SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) | Architecture & data flow diagrams |
| [IOS_APP_STRATEGY.md](docs/IOS_APP_STRATEGY.md) | iOS app development strategy |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical architecture details |
| [BACKEND_SETUP.md](docs/BACKEND_SETUP.md) | Backend configuration guide |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- __tests__/api/ratings.test.ts
```

---

## 📊 Database Schema (Key Models)

```sql
User
├── id, email, name, password
├── languages[], genres[]          -- Preferences
├── aiInstructions                 -- Custom AI guidance
└── mobileToken                    -- iOS app auth

Movie
├── id (TMDB ID), title, year
├── posterPath, overview
├── imdbRating, userReviewSummary
└── budget, boxOffice

MovieRating
├── userId, movieId
├── rating (amazing/good/meh/awful/not-interested)
└── createdAt

WatchlistItem
├── userId, movieId
└── addedAt
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is for personal/educational use. See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for movie data
- [Perplexity AI](https://www.perplexity.ai/) for AI recommendations
- [Vercel](https://vercel.com/) for hosting
- [Expo](https://expo.dev/) for React Native tooling

---

## 📬 Support

For issues or questions:
- Open a GitHub issue
- Check [docs/](docs/) for detailed guides

---

**Built with ❤️ using Next.js, React Native, and AI**
