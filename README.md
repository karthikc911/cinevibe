# 🎬 CineMate - Personalized Movie Recommender

A beautiful, dark cinematic UI movie recommendation system with AI-powered suggestions. Built with Next.js, TypeScript, Tailwind CSS, and advanced AI integration.

## ⚡ Start the Server

```bash
npm run dev
```

**Access the app at:** http://localhost:3000

> **Note:** First-time users will be redirected to `/discover` where you'll see **Login** and **Sign Up** buttons.

---

## ✨ Features

- **🌙 Dark Cinematic UI**: Gradient backgrounds with neon cyan glow accents
- **🎯 Smart AI Recommendations**: Get personalized movie picks powered by OpenAI & Perplexity
- **⭐ Rating System**: Four-tier rating system (Awful, Meh, Good, Amazing) with keyboard shortcuts
- **📝 Watchlist Management**: Track movies you want to watch and mark them as watched
- **🔍 Advanced Search**: AI-powered search with natural language queries
- **👥 Friends Feature**: Connect with friends and share movie recommendations
- **📊 Profile Analytics**: View your rating statistics and top genres
- **♿ Accessible**: Semantic HTML, keyboard navigation, and ARIA labels
- **📱 Responsive**: Works beautifully on all screen sizes

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or npm/pnpm/yarn
- PostgreSQL database (local or Supabase)
- OpenAI API key
- Google OAuth credentials (optional)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables (see below)
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Visit http://localhost:3000

### Keep Supabase Active

Supabase pauses databases after 7 days of inactivity. Prevent this by running:

```bash
# Quick ping command
npm run db:ping

# Or manually
npx prisma db execute --stdin <<< "SELECT 1;"

# Or open database GUI (also keeps it active)
npm run db:studio
```

**Pro tip:** Enable the GitHub Actions workflow (`.github/workflows/keep-supabase-alive.yml`) to automatically ping your database every 3 days.

## 🔐 Environment Variables

Create a `.env` or `.env.local` file in the root directory:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/cinemate?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth (Get from Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OpenAI API (Get from OpenAI Platform)
OPENAI_API_KEY="sk-your-openai-api-key"
OPENAI_MODEL="gpt-4o-mini"  # or "gpt-4-turbo-preview"

# Perplexity API (Optional - for enhanced search)
PERPLEXITY_API_KEY="pplx-your-perplexity-api-key"

# TMDB API (Optional - for movie metadata)
TMDB_API_KEY="your-tmdb-api-key"
```

See [Complete Config Guide](docs/COMPLETE_CONFIG_GUIDE.md) for detailed setup instructions.

## 🗺️ Routes & Pages

| Route | Description |
|-------|-------------|
| `/` | Home page with discovery, trending, and AI recommendations |
| `/discover` | Movie discovery with search and filters |
| `/onboarding` | Set up your profile and preferences |
| `/rate` | Rate movies with progress tracker |
| `/search` | Advanced search with AI-powered queries |
| `/watchlist` | Manage your watchlist |
| `/friends` | Connect with friends and share recommendations |
| `/profile` | View stats and preferences |

## 🎨 Tech Stack

### Frontend
- **Next.js 16** - App Router with Server Components
- **React 19** - Latest React with new features
- **TypeScript** - Full type safety
- **Tailwind CSS v4** - Modern styling with CSS-first config
- **shadcn/ui** - Beautiful, accessible components
- **Framer Motion** - Smooth animations
- **Zustand** - Client-side state management

### Backend & AI
- **NextAuth.js** - Authentication (OAuth + Credentials)
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Relational database with pgvector
- **Supabase** - Cloud PostgreSQL hosting
- **OpenAI GPT** - AI recommendations and analysis
- **Perplexity Sonar API** - Real-time movie data search
- **RAG Architecture** - Vector embeddings for personalized suggestions

## 💾 Database Schema

The app uses PostgreSQL with pgvector extension for similarity search:

- **Users**: Authentication and preferences
- **Movies/TvShows**: Metadata from TMDB
- **Ratings**: User ratings (awful, meh, good, amazing)
- **Watchlist**: Movies to watch
- **Recommendations**: AI-generated suggestions
- **Friendships**: Social connections
- **UserPreferences**: Vector embeddings for RAG

See [Architecture Documentation](docs/ARCHITECTURE.md) for details.

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run linter

# Database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:push          # Push schema changes
npm run db:studio        # Open Prisma Studio GUI
npm run db:ping          # Keep Supabase active

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:api         # API tests only

# Setup
npm run setup            # Interactive setup wizard
npm run populate:movies  # Populate movie database
```

## 🤖 AI Recommendation System

CineMate uses a hybrid AI approach:

```
User Ratings + Preferences
        ↓
RAG Vector Search (PostgreSQL + pgvector)
        ↓
Perplexity Sonar (Real-time movie data)
        ↓
OpenAI GPT (Taste analysis + Match scoring)
        ↓
Personalized Recommendations
```

**Features:**
- Vector embeddings for preference matching
- Real-time web search for current movies
- AI-generated match percentages
- Context-aware recommendations
- Continuous learning from ratings

See [RAG Architecture](docs/RAG_ARCHITECTURE.md) for technical details.

## 📱 Mobile Access with ngrok

Test on mobile devices:

```bash
# Install ngrok
brew install ngrok

# Start tunnel
ngrok http 3000

# Use the https URL on your mobile device
```

See [Mobile Access Guide](docs/MOBILE_ACCESS_GUIDE.md) for setup.

## 🧪 Testing

The app includes comprehensive test coverage:

```bash
# Run all tests with coverage
npm test

# Run specific test suites
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:api         # API endpoint tests

# Watch mode for development
npm run test:watch
```

See [Testing Guide](docs/TESTING.md) for more information.

## 📚 Documentation

Detailed documentation is available in the `/docs` folder:

### Getting Started
- [Complete Configuration Guide](docs/COMPLETE_CONFIG_GUIDE.md)
- [Database Setup Guide](docs/DATABASE_SETUP_GUIDE.md)
- [Backend Setup](docs/BACKEND_SETUP.md)

### Architecture
- [Architecture Overview](docs/ARCHITECTURE.md)
- [RAG Architecture](docs/RAG_ARCHITECTURE.md)
- [Testing Guide](docs/TESTING.md)

### Features
- [Friends System](docs/FRIENDS_SYSTEM.md)
- [Match Reasoning](docs/MATCH_REASONING_DOCUMENTATION.md)
- [AI Features](docs/AI_THINKING_PANEL_UPDATES.md)

### Operational Guides
- [Logging Guide](docs/LOGGING_GUIDE.md)
- [Mobile Access Guide](docs/MOBILE_ACCESS_GUIDE.md)
- [ngrok Quick Reference](docs/NGROK_QUICK_REFERENCE.md)

## 🎯 Key Features Explained

### AI-Powered Search
Ask natural language questions:
- "Top 5 trending movies in India"
- "Best sci-fi movies from 2023"
- "Oscar-winning dramas"

### Smart Recommendations
The AI learns from your ratings to suggest movies you'll love:
- Analyzes your taste profile
- Considers genre preferences
- Filters by year, rating, and other criteria
- Provides match percentage for each recommendation

### Friends System
- Connect with friends
- Share movie recommendations
- See friend's ratings and reviews
- Match percentage between friends

### Rating System
Rate movies with emojis:
- 😖 Awful
- 😐 Meh  
- 😊 Good
- 🤩 Amazing
- ❌ Not Interested

## 🚨 Troubleshooting

### Database Connection Issues
```bash
# Test connection
npx prisma db pull

# Reset database
npx prisma migrate reset

# Regenerate client
npx prisma generate
```

### Supabase Paused
```bash
# Wake up database
npm run db:ping

# Check status in Supabase dashboard
```

### OpenAI API Errors
- Verify API key is correct
- Check billing status
- Ensure rate limits aren't exceeded

### Build Errors
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

## 🔗 Useful Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Movie data from [TMDB](https://www.themoviedb.org/)
- Icons from [Lucide](https://lucide.dev/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Built with [Next.js](https://nextjs.org/)

---

**Made with ❤️ and powered by vibes** ✨

For questions or feedback, open an issue or reach out!
