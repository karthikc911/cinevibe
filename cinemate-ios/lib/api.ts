import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Movie, TvShow, Rating, WatchlistItem, TvShowWatchlistItem, RatingType } from './types';

// ============================================
// IMPORTANT: Update this to your backend URL
// ============================================
// For production (Vercel deployment):
const API_BASE = 'https://cinevibe-six.vercel.app/api';

// ============================================
// IN-MEMORY TOKEN CACHE - Critical for performance!
// SecureStore is slow on iOS, so we cache tokens in memory
// ============================================
let cachedAuthToken: string | null = null;
let cachedSessionCookie: string | null = null;
let tokenCacheInitialized = false;

// Initialize token cache from SecureStore (call once at app start)
export const initializeTokenCache = async () => {
  if (tokenCacheInitialized) return;
  try {
    cachedAuthToken = await SecureStore.getItemAsync('authToken');
    cachedSessionCookie = await SecureStore.getItemAsync('sessionCookie');
    tokenCacheInitialized = true;
    console.log('[API] Token cache initialized');
  } catch (error) {
    console.log('[API] Error initializing token cache:', error);
  }
};

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000, // Reduced from 30s to 15s for faster failure
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create a separate instance for AI endpoints with longer timeout
const aiApi = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 60 seconds for AI-powered endpoints (Perplexity, enrichment, etc.)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests - NOW USES MEMORY CACHE (FAST!)
const addAuthToRequest = (config: any) => {
  // Use cached tokens - NO async SecureStore calls!
  if (cachedAuthToken) {
    config.headers.Authorization = `Bearer ${cachedAuthToken}`;
  }
  if (cachedSessionCookie) {
    config.headers.Cookie = cachedSessionCookie;
  }
  return config;
};

api.interceptors.request.use(addAuthToRequest);
aiApi.interceptors.request.use(addAuthToRequest);

// Response interceptor for error handling
const handleErrorResponse = (error: any) => {
  // Only log non-network errors
  if (error.message !== 'Network Error') {
    console.log('API Error:', error.response?.data || error.message);
  }
  return Promise.reject(error);
};

api.interceptors.response.use((response) => response, handleErrorResponse);
aiApi.interceptors.response.use((response) => response, handleErrorResponse);

// Auth functions - update both SecureStore AND memory cache
export const authApi = {
  async setToken(token: string) {
    cachedAuthToken = token; // Update memory cache FIRST (instant)
    await SecureStore.setItemAsync('authToken', token); // Then persist
  },
  
  getToken() {
    return cachedAuthToken; // Return from memory (instant)
  },
  
  async clearToken() {
    cachedAuthToken = null; // Clear memory cache FIRST
    cachedSessionCookie = null;
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('sessionCookie');
  },

  async setSessionCookie(cookie: string) {
    cachedSessionCookie = cookie; // Update memory cache FIRST
    await SecureStore.setItemAsync('sessionCookie', cookie);
  },
};

// ============================================
// Movie API - Same as web app
// ============================================
export const moviesApi = {
  // AI-powered smart picks (uses Perplexity AI) - POST method
  async getSmartPicks(): Promise<{ movies: Movie[], aiSteps?: any[] }> {
    const response = await aiApi.post('/search/smart-picks', {}); // Use aiApi for longer timeout
    return response.data;
  },

  // Get movie details by ID
  async getMovieDetails(movieId: number): Promise<Movie> {
    const response = await api.get(`/movies/${movieId}`);
    return response.data.movie;
  },

  // Search movies (using Perplexity like website)
  async searchMovies(query: string): Promise<Movie[]> {
    try {
      // Use Perplexity search like the website does
      const response = await aiApi.post('/search/perplexity', { query }); // Use aiApi for AI-powered search
      return response.data.movies || [];
    } catch (error) {
      console.log('Perplexity search failed, falling back to basic search');
      // Fallback to basic search
      const response = await api.get('/movies', { params: { query } });
      return response.data.movies || [];
    }
  },

  // Get movies for rating page (same as website - /api/random-movies POST)
  async getRateMovies(): Promise<Movie[]> {
    const response = await api.post('/random-movies', {});
    return response.data.movies || [];
  },

  // Get trending movies from TMDB
  async getTrending(timeWindow: 'day' | 'week' = 'day'): Promise<Movie[]> {
    const response = await api.get('/tmdb/trending', { params: { timeWindow } });
    return response.data.movies || [];
  },

  // Get popular movies
  async getPopular(category: string = 'streaming'): Promise<Movie[]> {
    const response = await api.get('/popular', { params: { category } });
    return response.data.movies || [];
  },

  // Enrich movie with AI data (IMDB ratings, reviews, etc.)
  async enrichMovie(movieId: number): Promise<Movie> {
    const response = await api.post(`/movies/enrich/${movieId}`);
    return response.data.movie;
  },
};

// ============================================
// TV Show API - Same as web app
// ============================================
export const tvShowsApi = {
  // AI-powered smart picks (uses Perplexity AI) - POST method
  async getSmartPicks(): Promise<{ tvShows: TvShow[], aiSteps?: any[] }> {
    const response = await aiApi.post('/search/smart-picks-tvshows', {}); // Use aiApi for longer timeout
    return response.data;
  },

  // Get trending TV shows from TMDB
  async getTrending(timeWindow: 'day' | 'week' = 'day'): Promise<TvShow[]> {
    const response = await api.get('/tmdb/trending-tvshows', { params: { time_window: timeWindow } });
    return response.data.tvShows || [];
  },

  // Get TV show details by ID
  async getTvShowDetails(tvShowId: number): Promise<TvShow> {
    const response = await api.get(`/tvshows/${tvShowId}`);
    return response.data;
  },

  // Search TV shows (using Perplexity like website)
  async searchTvShows(query: string): Promise<TvShow[]> {
    try {
      // Use Perplexity search like the website does
      const response = await aiApi.post('/search/perplexity', { query }); // Use aiApi for AI-powered search
      return response.data.tvShows || [];
    } catch (error) {
      console.log('Perplexity search failed for TV shows, falling back to basic search');
      // Fallback to basic search
      const response = await api.get('/tvshows', { params: { query } });
      return response.data.tvShows || [];
    }
  },
};

// ============================================
// Rating API - Same as web app
// ============================================
export const ratingsApi = {
  // Get all movie ratings
  async getRatings(): Promise<Rating[]> {
    const response = await api.get('/ratings');
    return response.data.ratings || [];
  },

  // Rate a movie
  async rateMovie(movieId: number, movieTitle: string, movieYear: number, rating: RatingType) {
    const response = await api.post('/ratings', {
      movieId,
      movieTitle,
      movieYear,
      rating,
    });
    return response.data;
  },

  // Get TV show ratings
  async getTvShowRatings(): Promise<Rating[]> {
    const response = await api.get('/tvshow-ratings');
    return response.data.ratings || [];
  },

  // Rate a TV show
  async rateTvShow(tvShowId: number, tvShowName: string, tvShowYear: number, rating: RatingType) {
    const response = await api.post('/tvshow-ratings', {
      tvShowId,
      tvShowName,
      tvShowYear,
      rating,
    });
    return response.data;
  },
};

// ============================================
// Watchlist API - Same as web app
// ============================================
export const watchlistApi = {
  // Get movie watchlist
  async getWatchlist(): Promise<WatchlistItem[]> {
    const response = await api.get('/watchlist');
    return response.data.watchlist || [];
  },

  // Add movie to watchlist
  async addToWatchlist(movieId: number, movieTitle: string, movieYear: number) {
    const response = await api.post('/watchlist', {
      movieId,
      movieTitle,
      movieYear,
    });
    return response.data;
  },

  // Remove movie from watchlist
  async removeFromWatchlist(movieId: number) {
    const response = await api.delete(`/watchlist?movieId=${movieId}`);
    return response.data;
  },

  // Get TV show watchlist
  async getTvShowWatchlist(): Promise<TvShowWatchlistItem[]> {
    const response = await api.get('/tvshow-watchlist');
    return response.data.watchlist || [];
  },

  // Add TV show to watchlist
  async addTvShowToWatchlist(tvShowId: number, tvShowName: string, tvShowYear: number) {
    const response = await api.post('/tvshow-watchlist', {
      tvShowId,
      tvShowName,
      tvShowYear,
    });
    return response.data;
  },

  // Remove TV show from watchlist
  async removeTvShowFromWatchlist(tvShowId: number) {
    const response = await api.delete(`/tvshow-watchlist?tvShowId=${tvShowId}`);
    return response.data;
  },
};

// ============================================
// User API - Same as web app
// ============================================
export const userApi = {
  // Get user profile
  async getProfile() {
    const response = await api.get('/user/profile');
    return response.data;
  },

  // Get user preferences
  async getPreferences() {
    const response = await api.get('/user/preferences');
    return response.data;
  },

  // Update user preferences
  async updatePreferences(
    languages: string[], 
    genres: string[],
    aiInstructions?: string,
    recYearFrom?: number,
    recYearTo?: number,
    recMinImdb?: number | null
  ) {
    const response = await api.post('/user/preferences', {
      languages,
      genres,
      aiInstructions: aiInstructions || null,
      recYearFrom,
      recYearTo,
      recMinImdb,
    });
    return response.data;
  },
};

// ============================================
// AI Feedback API - Same as web app
// ============================================
export const feedbackApi = {
  // Get user's AI feedback
  async getFeedback() {
    const response = await api.get('/ai-feedback');
    return response.data;
  },

  // Submit AI feedback
  async submitFeedback(feedbackType: 'movie' | 'tvshow', feedback: string) {
    const response = await api.post('/ai-feedback', {
      feedbackType,
      feedback,
    });
    return response.data;
  },

  // Delete AI feedback
  async deleteFeedback(feedbackId: string) {
    const response = await api.delete('/ai-feedback', {
      data: { feedbackId },
    });
    return response.data;
  },
};

// ============================================
// Friends API - Same as web app
// ============================================
export const friendsApi = {
  // Get friends list
  async getFriends() {
    const response = await api.get('/friends');
    return response.data.friends || [];
  },

  // Get pending friend requests
  async getPendingRequests() {
    const response = await api.get('/friends/requests');
    return response.data.requests || [];
  },

  // Search for users
  async searchUsers(query: string) {
    const response = await api.get(`/friends/search?q=${encodeURIComponent(query)}`);
    return response.data.users || [];
  },

  // Send friend request
  async sendFriendRequest(userId: string) {
    const response = await api.post('/friends/request', { userId });
    return response.data;
  },

  // Accept friend request
  async acceptFriendRequest(requestId: string) {
    const response = await api.post('/friends/accept', { requestId });
    return response.data;
  },

  // Reject friend request
  async rejectFriendRequest(requestId: string) {
    const response = await api.post('/friends/reject', { requestId });
    return response.data;
  },

  // Recommend movie to friends
  async recommendMovie(friendIds: string[], movieId: number, movieTitle: string, movieYear: number, message?: string) {
    const response = await api.post('/friends/recommend', {
      friendIds,
      movieId,
      movieTitle,
      movieYear,
      message,
    });
    return response.data;
  },

  // Get movie recommendations from friends
  async getRecommendations() {
    const response = await api.get('/friends/recommendations');
    return response.data;
  },
};

export default api;
