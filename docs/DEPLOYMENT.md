# CineVibe Deployment Guide

## 1. Push Code to GitHub

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/cinemate.git
git branch -M main
git push -u origin main
```

## 2. Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)
1. Go to [vercel.com](https://vercel.com) → Sign in with GitHub
2. Click **"Add New Project"**
3. Import your `cinemate` repository
4. Add Environment Variables (click "Environment Variables"):

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `TMDB_API_KEY` | From [themoviedb.org](https://www.themoviedb.org/settings/api) |
| `PERPLEXITY_API_KEY` | From [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |

5. Click **"Deploy"**

### Option B: Via CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set env vars
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
vercel env add TMDB_API_KEY
vercel env add PERPLEXITY_API_KEY

# Deploy to production
vercel --prod
```

## 3. Database Setup (Vercel Postgres or External)

### Using Vercel Postgres:
1. In Vercel Dashboard → Storage → Create Database → Postgres
2. Copy connection string to `DATABASE_URL`

### Using External (Supabase/Neon/Railway):
1. Create PostgreSQL database
2. Copy connection string
3. Run migrations:
```bash
npx prisma migrate deploy
```

## 4. Post-Deployment

```bash
# Run database migrations (if needed)
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

## 5. Update Google OAuth (Important!)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client
3. Add to **Authorized redirect URIs**:
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```

## Quick Reference

| Service | Get API Key |
|---------|-------------|
| TMDB | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) |
| Perplexity | [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api) |
| Google OAuth | [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) |

## Troubleshooting

- **Build fails**: Check `prisma generate` runs in build command
- **Auth not working**: Verify `NEXTAUTH_URL` matches your domain
- **DB errors**: Run `npx prisma migrate deploy` after deployment

