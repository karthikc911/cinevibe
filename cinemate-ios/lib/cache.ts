import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache keys
const CACHE_KEYS = {
  TRENDING_MOVIES: 'cache_trending_movies',
  TRENDING_TVSHOWS: 'cache_trending_tvshows',
  MOVIE_RATINGS: 'cache_movie_ratings',
  TVSHOW_RATINGS: 'cache_tvshow_ratings',
  MOVIE_WATCHLIST: 'cache_movie_watchlist',
  TVSHOW_WATCHLIST: 'cache_tvshow_watchlist',
  USER_PREFERENCES: 'cache_user_preferences',
  RATE_MOVIES: 'cache_rate_movies',
  RATE_TVSHOWS: 'cache_rate_tvshows',
  SMART_PICKS: 'cache_smart_picks',
  MOVIE_DETAILS: 'cache_movie_details_',
  TVSHOW_DETAILS: 'cache_tvshow_details_',
} as const;

// Cache expiry times (in milliseconds)
const CACHE_TTL = {
  SHORT: 5 * 60 * 1000,      // 5 minutes (trending, smart picks)
  MEDIUM: 30 * 60 * 1000,    // 30 minutes (ratings, watchlist)
  LONG: 24 * 60 * 60 * 1000, // 24 hours (movie details, preferences)
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Generic cache getter with TTL validation
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - entry.timestamp < entry.ttl) {
      console.log(`[CACHE] HIT: ${key}`);
      return entry.data;
    }

    console.log(`[CACHE] EXPIRED: ${key}`);
    return null;
  } catch (error) {
    console.log(`[CACHE] Error reading ${key}:`, error);
    return null;
  }
}

/**
 * Generic cache setter with TTL
 */
export async function setInCache<T>(key: string, data: T, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
    console.log(`[CACHE] SET: ${key}`);
  } catch (error) {
    console.log(`[CACHE] Error writing ${key}:`, error);
  }
}

/**
 * Get cached data even if expired (for stale-while-revalidate)
 */
export async function getStaleFromCache<T>(key: string): Promise<{ data: T | null; isStale: boolean }> {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return { data: null, isStale: false };

    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();
    const isStale = now - entry.timestamp >= entry.ttl;

    console.log(`[CACHE] ${isStale ? 'STALE' : 'FRESH'}: ${key}`);
    return { data: entry.data, isStale };
  } catch (error) {
    console.log(`[CACHE] Error reading stale ${key}:`, error);
    return { data: null, isStale: false };
  }
}

/**
 * Clear specific cache key
 */
export async function clearCache(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`[CACHE] CLEARED: ${key}`);
  } catch (error) {
    console.log(`[CACHE] Error clearing ${key}:`, error);
  }
}

/**
 * Clear all app caches
 */
export async function clearAllCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith('cache_'));
    await AsyncStorage.multiRemove(cacheKeys);
    console.log(`[CACHE] CLEARED ALL: ${cacheKeys.length} entries`);
  } catch (error) {
    console.log('[CACHE] Error clearing all:', error);
  }
}

// ============================================
// Specific cache functions for each data type
// ============================================

// Trending Movies
export const trendingMoviesCache = {
  get: () => getStaleFromCache<any[]>(CACHE_KEYS.TRENDING_MOVIES),
  set: (data: any[]) => setInCache(CACHE_KEYS.TRENDING_MOVIES, data, CACHE_TTL.SHORT),
  clear: () => clearCache(CACHE_KEYS.TRENDING_MOVIES),
};

// Trending TV Shows
export const trendingTvShowsCache = {
  get: () => getStaleFromCache<any[]>(CACHE_KEYS.TRENDING_TVSHOWS),
  set: (data: any[]) => setInCache(CACHE_KEYS.TRENDING_TVSHOWS, data, CACHE_TTL.SHORT),
  clear: () => clearCache(CACHE_KEYS.TRENDING_TVSHOWS),
};

// Movie Ratings
export const movieRatingsCache = {
  get: () => getStaleFromCache<any[]>(CACHE_KEYS.MOVIE_RATINGS),
  set: (data: any[]) => setInCache(CACHE_KEYS.MOVIE_RATINGS, data, CACHE_TTL.MEDIUM),
  clear: () => clearCache(CACHE_KEYS.MOVIE_RATINGS),
};

// TV Show Ratings
export const tvShowRatingsCache = {
  get: () => getStaleFromCache<any[]>(CACHE_KEYS.TVSHOW_RATINGS),
  set: (data: any[]) => setInCache(CACHE_KEYS.TVSHOW_RATINGS, data, CACHE_TTL.MEDIUM),
  clear: () => clearCache(CACHE_KEYS.TVSHOW_RATINGS),
};

// Movie Watchlist
export const movieWatchlistCache = {
  get: () => getStaleFromCache<any[]>(CACHE_KEYS.MOVIE_WATCHLIST),
  set: (data: any[]) => setInCache(CACHE_KEYS.MOVIE_WATCHLIST, data, CACHE_TTL.MEDIUM),
  clear: () => clearCache(CACHE_KEYS.MOVIE_WATCHLIST),
};

// TV Show Watchlist
export const tvShowWatchlistCache = {
  get: () => getStaleFromCache<any[]>(CACHE_KEYS.TVSHOW_WATCHLIST),
  set: (data: any[]) => setInCache(CACHE_KEYS.TVSHOW_WATCHLIST, data, CACHE_TTL.MEDIUM),
  clear: () => clearCache(CACHE_KEYS.TVSHOW_WATCHLIST),
};

// User Preferences
export const userPreferencesCache = {
  get: () => getStaleFromCache<any>(CACHE_KEYS.USER_PREFERENCES),
  set: (data: any) => setInCache(CACHE_KEYS.USER_PREFERENCES, data, CACHE_TTL.LONG),
  clear: () => clearCache(CACHE_KEYS.USER_PREFERENCES),
};

// Rate Movies
export const rateMoviesCache = {
  get: () => getStaleFromCache<any[]>(CACHE_KEYS.RATE_MOVIES),
  set: (data: any[]) => setInCache(CACHE_KEYS.RATE_MOVIES, data, CACHE_TTL.SHORT),
  clear: () => clearCache(CACHE_KEYS.RATE_MOVIES),
};

// Rate TV Shows
export const rateTvShowsCache = {
  get: () => getStaleFromCache<any[]>(CACHE_KEYS.RATE_TVSHOWS),
  set: (data: any[]) => setInCache(CACHE_KEYS.RATE_TVSHOWS, data, CACHE_TTL.SHORT),
  clear: () => clearCache(CACHE_KEYS.RATE_TVSHOWS),
};

// Smart Picks
export const smartPicksCache = {
  get: () => getStaleFromCache<any>(CACHE_KEYS.SMART_PICKS),
  set: (data: any) => setInCache(CACHE_KEYS.SMART_PICKS, data, CACHE_TTL.SHORT),
  clear: () => clearCache(CACHE_KEYS.SMART_PICKS),
};

// Movie Details (by ID)
export const movieDetailsCache = {
  get: (movieId: number) => getStaleFromCache<any>(`${CACHE_KEYS.MOVIE_DETAILS}${movieId}`),
  set: (movieId: number, data: any) => setInCache(`${CACHE_KEYS.MOVIE_DETAILS}${movieId}`, data, CACHE_TTL.LONG),
  clear: (movieId: number) => clearCache(`${CACHE_KEYS.MOVIE_DETAILS}${movieId}`),
};

// TV Show Details (by ID)
export const tvShowDetailsCache = {
  get: (tvShowId: number) => getStaleFromCache<any>(`${CACHE_KEYS.TVSHOW_DETAILS}${tvShowId}`),
  set: (tvShowId: number, data: any) => setInCache(`${CACHE_KEYS.TVSHOW_DETAILS}${tvShowId}`, data, CACHE_TTL.LONG),
  clear: (tvShowId: number) => clearCache(`${CACHE_KEYS.TVSHOW_DETAILS}${tvShowId}`),
};

export { CACHE_KEYS, CACHE_TTL };

