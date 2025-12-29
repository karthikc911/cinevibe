# CineVibe Deployment Guide

Complete guide to deploying CineVibe website to Vercel and publishing the iOS app to the App Store.

---

# 📋 SECTION 1: QUICK REFERENCE (High-Level Overview)

## Website Deployment to Vercel (5 minutes)

1. **Push code to GitHub** → Create repo, push code
2. **Connect to Vercel** → Import from GitHub at [vercel.com/new](https://vercel.com/new)
3. **Set environment variables** → Add all `.env` variables in Vercel dashboard
4. **Deploy** → Automatic deployment on git push
5. **Update OAuth** → Add Vercel URL to Google OAuth redirect URIs

## iOS App Deployment Options

### Option A: TestFlight First (Recommended) ⭐

TestFlight is Apple's official beta testing platform. **Much faster than App Store!**

| Phase | Time | Notes |
|-------|------|-------|
| Apple Developer Enrollment | 1-3 days | One-time, identity verification |
| Technical Setup (EAS) | 30 min | One-time setup |
| Building the App | 15-30 min | EAS cloud build |
| **TestFlight Review** | **24-48 hours** | Usually same day! |
| Beta Testing | Your choice | Test with real users |
| **Total to TestFlight** | **~2-4 days** | Much faster! |

**Why start with TestFlight:**
- ✅ **Faster review** (24-48 hours vs 1-3 days)
- ✅ **Less strict review** (beta apps get more leniency)
- ✅ **Real user testing** before public launch
- ✅ **Find bugs early** with limited audience
- ✅ **No App Store listing required** initially
- ✅ **Up to 10,000 testers** can install via link

### Option B: Direct App Store Release

| Phase | Time | Notes |
|-------|------|-------|
| Apple Developer Enrollment | 1-3 days | Identity verification |
| Technical Setup (EAS) | 30 min | One-time setup |
| Building the App | 15-30 min | EAS cloud build |
| App Store Listing | 1-2 hours | Screenshots, description |
| **First Apple Review** | **1-3 days** | Apple examines your app |
| Fix Rejections (if any) | 2-5 days | Common for first submissions |
| **Total First Time** | **~1-2 weeks** | Conservative estimate |
| **Subsequent Updates** | **24-48 hours** | Much faster after approval |

### Quick Steps (TestFlight Route):
1. **Apple Developer Account** → Enroll at [developer.apple.com](https://developer.apple.com) ($99/year)
2. **EAS Build Setup** → `npm install -g eas-cli && eas build:configure`
3. **Build for iOS** → `eas build --platform ios`
4. **Submit to TestFlight** → `eas submit --platform ios` (select TestFlight)
5. **TestFlight Review** → Usually approved within 24-48 hours
6. **Share with Testers** → Send TestFlight link to users
7. **Later: App Store** → When ready, submit for full release

### Timeline Comparison

| Route | Time to First Users | Best For |
|-------|---------------------|----------|
| **TestFlight** | **2-4 days** | Beta testing, early feedback, faster iteration |
| **App Store** | **1-2 weeks** | Public launch, full marketing push |
| **TestFlight → App Store** | **2-4 days + 1-3 days** | Best of both: test first, then launch |

### Key Requirements Checklist

| Requirement | Website | iOS App |
|-------------|---------|---------|
| GitHub Repository | ✅ Required | ✅ Required |
| Vercel Account | ✅ Required | ❌ |
| Apple Developer Account | ❌ | ✅ Required ($99/yr) |
| Expo Account | ❌ | ✅ Required (Free) |
| Production Database | ✅ Required | Via Website |
| Domain Name | Optional | ❌ |

---

# 📖 SECTION 2: DETAILED INSTRUCTIONS

## Part A: Deploying Website to Vercel

### Prerequisites

- [ ] GitHub account
- [ ] Vercel account (free at [vercel.com](https://vercel.com))
- [ ] All API keys ready (TMDB, OpenAI/Perplexity, Google OAuth)
- [ ] PostgreSQL database URL (Neon, Supabase, or similar)

### Step 1: Prepare Your Repository

```bash
# Initialize git if not already done
cd /path/to/cinemate
git init

# Create .gitignore if not exists
cat >> .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Next.js
.next/
out/
build/

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Vercel
.vercel

# Prisma
prisma/migrations/*.sql.bak
EOF

# Add all files
git add .
git commit -m "Initial commit"

# Create GitHub repository (using GitHub CLI or manually)
gh repo create cinemate --public --source=. --push
# OR manually create at github.com and:
git remote add origin https://github.com/YOUR_USERNAME/cinemate.git
git push -u origin main
```

### Step 2: Set Up Production Database

#### Option A: Neon (Recommended - Free Tier)

1. Go to [neon.tech](https://neon.tech) and create account
2. Create new project "cinemate-production"
3. Copy the connection string:
   ```
   postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

#### Option B: Supabase

1. Go to [supabase.com](https://supabase.com)
2. Create project → Get connection string from Settings → Database

### Step 3: Deploy to Vercel

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/new](https://vercel.com/new)
   - Click "Import Git Repository"
   - Select your `cinemate` repository

2. **Configure Project**
   - Framework Preset: `Next.js`
   - Root Directory: `./` (default)
   - Build Command: `npx prisma generate && next build`
   - Output Directory: `.next` (default)

3. **Add Environment Variables**

   Click "Environment Variables" and add each:

   | Variable | Value | Description |
   |----------|-------|-------------|
   | `DATABASE_URL` | `postgresql://...` | Your Neon/Supabase URL |
   | `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Generate random secret |
   | `NEXTAUTH_URL` | `https://your-app.vercel.app` | Your Vercel URL |
   | `TMDB_API_KEY` | Your TMDB key | From [themoviedb.org](https://themoviedb.org) |
   | `OPENAI_API_KEY` | Your OpenAI key | From OpenAI dashboard |
   | `PERPLEXITY_API_KEY` | Your Perplexity key | From Perplexity dashboard |
   | `GOOGLE_CLIENT_ID` | Your Google ID | From Google Cloud Console |
   | `GOOGLE_CLIENT_SECRET` | Your Google secret | From Google Cloud Console |

4. **Deploy**
   - Click "Deploy"
   - Wait 2-5 minutes for build to complete

### Step 4: Run Database Migrations

After first deployment:

```bash
# Install Vercel CLI
npm i -g vercel

# Link to your project
vercel link

# Run Prisma migrations on production
vercel env pull .env.production
DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d '=' -f2) npx prisma migrate deploy
```

Or use Vercel's build command with migrations:
- Go to Project Settings → General → Build Command
- Change to: `npx prisma migrate deploy && npx prisma generate && next build`

### Step 5: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client
3. Add Authorized redirect URIs:
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```

### Step 6: Verify Deployment

1. Visit your Vercel URL
2. Test login with Google
3. Test AI recommendations
4. Check all features work

### Troubleshooting Website Deployment

| Issue | Solution |
|-------|----------|
| Build fails | Check Vercel build logs, ensure all env vars are set |
| Database connection fails | Verify DATABASE_URL, check Neon/Supabase is accessible |
| Google OAuth fails | Verify redirect URIs match exactly |
| API errors | Check API keys are valid and have quota |

---

## Part B: Publishing iOS App to App Store

### Prerequisites

- [ ] Apple Developer Account ($99/year) - [developer.apple.com/programs](https://developer.apple.com/programs)
- [ ] Expo Account (free) - [expo.dev](https://expo.dev)
- [ ] EAS CLI installed
- [ ] App icons and screenshots ready
- [ ] Privacy policy URL
- [ ] Website deployed (for API backend)

### Step 1: Apple Developer Account Setup

1. **Enroll in Apple Developer Program**
   - Go to [developer.apple.com/programs](https://developer.apple.com/programs)
   - Click "Enroll"
   - Pay $99/year fee
   - Wait for approval (usually 24-48 hours)

2. **Create App ID**
   - Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)
   - Click "+" to add new Identifier
   - Select "App IDs" → Continue
   - Select "App" → Continue
   - Description: `CineVibe`
   - Bundle ID: `com.cinemate.app` (must match app.json)
   - Enable capabilities: Push Notifications (optional)
   - Register

### Step 2: Set Up EAS Build

```bash
# Navigate to iOS app directory
cd cinemate-ios

# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS for your project
eas build:configure
```

This creates `eas.json`. Update it:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

### Step 3: Update app.json for Production

```json
{
  "expo": {
    "name": "CineVibe",
    "slug": "cinemate",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "dark",
    "scheme": "cinemate",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0f0f1a"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.cinemate.app",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "CineVibe needs camera access for scanning movie posters",
        "CFBundleURLTypes": [
          {
            "CFBundleURLSchemes": ["cinemate"]
          }
        ]
      }
    },
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

### Step 4: Update API URL for Production

In `cinemate-ios/lib/api.ts`, update the backend URL:

```typescript
// Change from local development
// const API_BASE = 'http://10.0.0.17:3000/api';

// To your production Vercel URL
const API_BASE = 'https://your-cinemate-app.vercel.app/api';
```

### Step 5: Create App Store Assets

#### Required Icons (in `assets/` folder)

| Asset | Size | Usage |
|-------|------|-------|
| `icon.png` | 1024x1024 | App Store listing |
| `adaptive-icon.png` | 1024x1024 | Android adaptive |
| `splash.png` | 1284x2778 | Splash screen |
| `favicon.png` | 48x48 | Web |

#### Required Screenshots (for App Store)

- **6.7" Display** (iPhone 14 Pro Max): 1290 x 2796 pixels
- **6.5" Display** (iPhone 11 Pro Max): 1284 x 2778 pixels
- **5.5" Display** (iPhone 8 Plus): 1242 x 2208 pixels

Create at least 3 screenshots showing:
1. Home screen with recommendations
2. Search/AI picks
3. User profile/preferences

### Step 6: Build for Production

```bash
# Build for iOS App Store
eas build --platform ios --profile production

# This will:
# 1. Upload your code to EAS servers
# 2. Build the iOS app
# 3. Generate an .ipa file
# 4. Sign with your Apple credentials

# Build takes 15-30 minutes
# You'll get a link to download the .ipa when complete
```

### Step 7: Create App Store Connect Listing

1. **Go to App Store Connect**
   - Visit [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Click "My Apps" → "+" → "New App"

2. **Fill in App Information**
   ```
   Platform: iOS
   Name: CineVibe
   Primary Language: English
   Bundle ID: com.cinemate.app
   SKU: cinemate-001
   User Access: Full Access
   ```

3. **Complete App Information Tab**
   - Subtitle: "AI-Powered Movie Recommendations"
   - Category: Entertainment
   - Content Rights: You own all content
   - Age Rating: Complete questionnaire (likely 12+)

4. **Add Privacy Policy**
   - Create privacy policy page on your website
   - Add URL: `https://your-app.vercel.app/privacy`

5. **Upload Screenshots**
   - Go to each device size section
   - Upload 3-10 screenshots per size

6. **Write Description**
   ```
   Discover your next favorite movie with CineVibe - your personal AI movie companion.
   
   Features:
   • AI-powered recommendations based on your taste
   • Rate movies and TV shows
   • Create and manage your watchlist
   • Share recommendations with friends
   • Search millions of titles
   • Multi-language support
   
   CineVibe learns from your preferences to suggest movies you'll love.
   ```

7. **Add Keywords**
   ```
   movies,recommendations,ai,entertainment,tv shows,streaming,watchlist
   ```

### Step 8: TestFlight Deployment (Recommended First Step)

TestFlight lets you distribute your app to beta testers before the public App Store release. **This is highly recommended** as the first step.

#### Why TestFlight First?

| Benefit | Description |
|---------|-------------|
| **Faster Review** | 24-48 hours (often same day) vs 1-3 days for App Store |
| **Less Strict** | Beta apps get more flexibility |
| **Real Testing** | Get feedback from actual users |
| **Fix Issues Early** | Find and fix bugs before public release |
| **No Full Listing** | Don't need screenshots/descriptions yet |
| **10,000 Testers** | Plenty for most apps |

#### Submit to TestFlight

```bash
# Build for production (same as App Store)
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios --profile production

# When prompted, select "TestFlight" distribution
```

#### Set Up TestFlight in App Store Connect

1. **Go to App Store Connect** → [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. **Select your app** (or create minimal app listing first)
3. **Go to TestFlight tab**
4. **Wait for build processing** (5-15 minutes after upload)
5. **Provide Export Compliance** → Usually "No" for encryption questions
6. **Submit for Beta App Review** → Click "Submit for Review"

#### Beta App Review (24-48 hours)

TestFlight review is typically:
- **Same day**: 50% of submissions
- **Next day**: 40% of submissions  
- **2 days**: 10% of submissions

You'll receive an email when approved.

#### Invite Testers

**Internal Testers** (up to 100, instant access):
1. Go to TestFlight → Internal Testing
2. Add testers by Apple ID
3. They get immediate access (no review needed)

**External Testers** (up to 10,000, after review):
1. Go to TestFlight → External Testing
2. Create a group (e.g., "Beta Testers")
3. Add testers by email or share public link
4. They can install after beta review approved

#### Share TestFlight Link

After approval, you get a **public TestFlight link**:
```
https://testflight.apple.com/join/XXXXXXXX
```

Share this with anyone to let them:
1. Download TestFlight app (free from App Store)
2. Click your link
3. Install your app

#### TestFlight to App Store Transition

When ready for public release:
1. Same build can be promoted to App Store
2. Go to App Store Connect → App Store tab
3. Select the TestFlight build
4. Complete App Store listing (screenshots, description)
5. Submit for App Store review

---

### Step 9: Direct App Store Submission (Alternative)

If skipping TestFlight, submit directly to App Store:

```bash
# Submit your build to App Store Connect
eas submit --platform ios --profile production

# Follow the prompts to:
# 1. Select the build to submit
# 2. Authenticate with Apple
# 3. Submit for review
```

Or manually:
1. Download .ipa from EAS build
2. Open Transporter app (from Mac App Store)
3. Sign in with Apple ID
4. Drag .ipa to Transporter
5. Click "Deliver"

### Step 10: App Review Process

1. **Go to App Store Connect**
2. **Select your app → App Store tab**
3. **Select Build** under "Build" section
4. **Complete App Review Information**
   - Contact info
   - Demo account credentials (for review)
   - Notes for reviewer
5. **Click "Submit for Review"**

#### Review Timeline

- First submission: 24-48 hours (can be longer)
- Updates: 24 hours typically
- Rejections: You'll get feedback to fix

#### Common Rejection Reasons & Fixes

| Rejection Reason | Fix |
|-----------------|-----|
| "Sign in with Apple required" | Add Apple Sign-In if you have social login |
| "Missing privacy information" | Add privacy labels in App Store Connect |
| "Crashes or bugs" | Test thoroughly, fix all bugs |
| "Incomplete metadata" | Fill all required fields, add screenshots |
| "Guideline 4.2 - Minimum Functionality" | Ensure app has enough unique features |

### Step 10: Post-Launch

1. **Monitor Crashes**
   - Use EAS Dashboard or Sentry
   
2. **Respond to Reviews**
   - Reply to user feedback in App Store Connect

3. **Update Regularly**
   ```bash
   # Bump version in app.json
   # Build new version
   eas build --platform ios --profile production
   eas submit --platform ios
   ```

---

## Google OAuth Setup for iOS App

### Step 1: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google+ API
4. Go to "Credentials"

### Step 2: Create OAuth Credentials

**Create Web Client (already have for website):**
- Application type: Web application
- Name: CineVibe Web
- Authorized redirect URIs: 
  - `https://your-app.vercel.app/api/auth/callback/google`

**Create iOS Client:**
- Application type: iOS
- Name: CineVibe iOS
- Bundle ID: `com.cinemate.app`
- Team ID: Your Apple Team ID

**Create Expo Client (for development):**
- Application type: Web application
- Name: CineVibe Expo
- Authorized redirect URIs:
  - `https://auth.expo.io/@your-expo-username/cinemate-ios`

### Step 3: Update iOS App

In `cinemate-ios/app/login.tsx`:

```typescript
const GOOGLE_WEB_CLIENT_ID = 'xxxx.apps.googleusercontent.com';      // Web client
const GOOGLE_IOS_CLIENT_ID = 'yyyy.apps.googleusercontent.com';      // iOS client  
const GOOGLE_EXPO_CLIENT_ID = 'zzzz.apps.googleusercontent.com';     // Expo client
```

---

## Quick Commands Reference

```bash
# === WEBSITE ===
# Deploy to Vercel
git push origin main  # Auto-deploys

# Run migrations
npx prisma migrate deploy

# Check logs
vercel logs

# === iOS APP ===
# Development
cd cinemate-ios
npx expo start

# Build for testing
eas build --platform ios --profile preview

# Build for production
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios

# Check build status
eas build:list
```

---

## Cost Summary

| Service | Cost | Notes |
|---------|------|-------|
| Vercel | Free tier | Hobby plan sufficient |
| Neon Database | Free tier | 0.5GB storage |
| Apple Developer | $99/year | Required for App Store |
| Expo/EAS | Free tier | 30 builds/month |
| TMDB API | Free | Rate limited |
| Google OAuth | Free | |
| **Total First Year** | **~$99** | Apple Developer fee |

---

## Support & Resources

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Expo Docs**: [docs.expo.dev](https://docs.expo.dev)
- **EAS Build**: [docs.expo.dev/build/introduction](https://docs.expo.dev/build/introduction)
- **App Store Guidelines**: [developer.apple.com/app-store/review/guidelines](https://developer.apple.com/app-store/review/guidelines)
- **Apple Developer Support**: [developer.apple.com/support](https://developer.apple.com/support)

