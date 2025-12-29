# CineVibe iOS App Development Strategy

## Overview

You have **3 main options** to convert your Next.js web app to iOS:

| Option | Effort | Native Feel | Recommended For |
|--------|--------|-------------|-----------------|
| **React Native + Expo** | Medium | High | Full native experience |
| **Capacitor (Ionic)** | Low | Medium | Quick deployment |
| **PWA (Progressive Web App)** | Very Low | Low | Fastest path |

---

## 🏆 RECOMMENDED: Option 1 - React Native + Expo

### Why React Native?
- **Code reuse**: ~70% of your React components can be adapted
- **Native performance**: True native UI components
- **Large ecosystem**: Same npm packages you know
- **Hot reloading**: Fast development cycle

### Step-by-Step Guide

#### Step 1: Set Up Development Environment

```bash
# Install Xcode from Mac App Store (required for iOS)
# Then install command line tools:
xcode-select --install

# Install Expo CLI
npm install -g @expo/cli

# Create new Expo project
npx create-expo-app cinemate-ios --template blank-typescript
cd cinemate-ios
```

#### Step 2: Install Required Dependencies

```bash
# Navigation (equivalent to Next.js routing)
npx expo install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context

# UI Components
npx expo install react-native-gesture-handler react-native-reanimated

# State management (same as web)
npm install zustand

# API calls
npm install axios

# Authentication
npx expo install expo-auth-session expo-web-browser

# Image handling
npx expo install expo-image

# Secure storage (for tokens)
npx expo install expo-secure-store
```

#### Step 3: Project Structure (Mirror Your Web App)

```
cinemate-ios/
├── app/                      # Expo Router (file-based routing)
│   ├── (tabs)/
│   │   ├── index.tsx         # Home (AI Picks)
│   │   ├── search.tsx        # Search
│   │   ├── watchlist.tsx     # Watchlist
│   │   ├── rate.tsx          # Rate Movies
│   │   └── profile.tsx       # Profile
│   ├── login.tsx
│   ├── signup.tsx
│   └── _layout.tsx
├── components/
│   ├── MovieCard.tsx         # Adapt from web
│   ├── RatingModal.tsx       # Adapt from web
│   ├── AIThinkingPanel.tsx   # Adapt from web
│   └── ShareModal.tsx        # Adapt from web
├── lib/
│   ├── api.ts               # API calls to your backend
│   ├── store.ts             # Zustand store (same as web)
│   └── auth.ts              # Auth helpers
└── assets/
```

#### Step 4: Convert Components (Example)

**Web MovieCard.tsx → iOS MovieCard.tsx:**

```tsx
// cinemate-ios/components/MovieCard.tsx
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface MovieCardProps {
  movie: {
    id: number;
    title: string;
    year: number;
    poster: string;
    lang: string;
  };
  onPress: () => void;
}

export function MovieCard({ movie, onPress }: MovieCardProps) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <Image 
        source={{ uri: movie.poster }} 
        style={styles.poster}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.gradient}
      >
        <Text style={styles.title}>{movie.title}</Text>
        <Text style={styles.meta}>{movie.year} • {movie.lang}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  poster: {
    width: '100%',
    aspectRatio: 2/3,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  meta: {
    color: '#9ca3af',
    fontSize: 14,
  },
});
```

#### Step 5: API Integration

```tsx
// cinemate-ios/lib/api.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Point to your deployed Vercel backend
const API_BASE = 'https://your-cinemate.vercel.app/api';

const api = axios.create({
  baseURL: API_BASE,
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const moviesApi = {
  getSmartPicks: () => api.get('/search/smart-picks'),
  getRatings: () => api.get('/ratings'),
  rateMovie: (movieId: number, rating: string) => 
    api.post('/ratings', { movieId, rating }),
  getWatchlist: () => api.get('/watchlist'),
  addToWatchlist: (movieId: number, title: string, year: number) =>
    api.post('/watchlist', { movieId, movieTitle: title, movieYear: year }),
};

export default api;
```

#### Step 6: Build & Test on iOS Simulator

```bash
# Start development server
npx expo start

# Press 'i' to open iOS Simulator
# Or scan QR code with Expo Go app on your iPhone
```

#### Step 7: Build for App Store

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS (requires Apple Developer account - $99/year)
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

---

## Option 2: Capacitor (Wrap Existing Web App)

**Fastest path** - wraps your existing Next.js app in a native container.

### Setup

```bash
# In your existing Next.js project
npm install @capacitor/core @capacitor/cli @capacitor/ios

# Initialize Capacitor
npx cap init CineVibe com.yourname.cinemate

# Build your Next.js app
npm run build

# Add iOS platform
npx cap add ios

# Copy web assets
npx cap copy ios

# Open in Xcode
npx cap open ios
```

### Pros/Cons
- ✅ Uses your existing code (99%)
- ✅ Quick to implement
- ❌ Not truly native feel
- ❌ Larger app size
- ❌ Slower performance

---

## Option 3: PWA (Progressive Web App)

**Simplest** - make your existing site installable on iOS.

### Add to your Next.js app:

```bash
npm install next-pwa
```

```js
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
});

module.exports = withPWA({
  // your existing config
});
```

Create `public/manifest.json`:
```json
{
  "name": "CineVibe",
  "short_name": "CineVibe",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f0f1a",
  "theme_color": "#06b6d4",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Pros/Cons
- ✅ Zero additional development
- ✅ Instant updates (no App Store review)
- ❌ Limited iOS features (no push notifications)
- ❌ Not in App Store

---

## Using Cursor for iOS Development

### 1. Install Extensions
- **React Native Tools** - debugging
- **ES7+ React/Redux/React-Native snippets** - code snippets
- **Prettier** - code formatting

### 2. Cursor AI Tips for React Native

When asking Cursor to help convert components:

```
"Convert this React/Next.js component to React Native:
- Use StyleSheet instead of Tailwind
- Replace div with View
- Replace img with Image
- Replace button with TouchableOpacity
- Use react-navigation instead of next/navigation"
```

### 3. Debug in Cursor

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug iOS",
      "type": "reactnative",
      "request": "launch",
      "platform": "ios"
    }
  ]
}
```

---

## Backend Considerations

Your existing Next.js API routes will work perfectly! The iOS app calls the same endpoints:

```
https://your-cinemate.vercel.app/api/ratings
https://your-cinemate.vercel.app/api/watchlist
https://your-cinemate.vercel.app/api/search/smart-picks
etc.
```

**Changes needed:**
1. Enable CORS for mobile app requests
2. Implement token-based auth (JWT) for mobile
3. Add push notification endpoints (optional)

---

## Timeline Estimate

| Phase | Duration | Tasks |
|-------|----------|-------|
| Setup | 1 day | Expo setup, dependencies, project structure |
| Core UI | 1 week | Convert main screens, navigation |
| Features | 1 week | Rating, Watchlist, Search, AI Picks |
| Auth | 2 days | Login/Signup with secure storage |
| Polish | 3 days | Animations, error handling, testing |
| Deployment | 1 day | Build & submit to App Store |

**Total: ~3 weeks** for a production-ready iOS app

---

## Quick Start Commands

```bash
# Create the project
npx create-expo-app cinemate-ios --template blank-typescript
cd cinemate-ios

# Install essentials
npx expo install expo-router react-native-safe-area-context react-native-screens
npm install zustand axios
npx expo install expo-secure-store expo-image expo-linear-gradient

# Start development
npx expo start
```

---

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Apple Developer Program](https://developer.apple.com/programs/) ($99/year)
- [EAS Build](https://docs.expo.dev/build/introduction/)

