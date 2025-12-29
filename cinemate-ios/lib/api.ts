import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Movie, TvShow, Rating, WatchlistItem, TvShowWatchlistItem, RatingType } from './types';

// ============================================
// IMPORTANT: Update this to your backend URL
// ============================================
// For local development (same machine):
// const API_BASE = 'http://localhost:3000/api';

// For local development (from phone on same network):
// const API_BASE = 'http://YOUR_MAC_IP:3000/api';

// For local development (from phone on same network):
// Your Mac's IP address + backend port
const API_BASE = 'http://10.0.0.17:3000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add session cookie if available
    const sessionCookie = await SecureStore.getItemAsync('sessionCookie');
    if (sessionCookie) {
      config.headers.Cookie = sessionCookie;
    }
  } catch (error) {
    console.log('Error getting auth token:', error);
  }
  return config;
});

// Response interceptor for error handling
// Note: Network errors are expected when backend is unavailable (demo mode)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only log non-network errors (network errors are expected in demo mode)
    if (error.message !== 'Network Error') {
      console.log('API Error:', error.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);

// Auth functions
export const authApi = {
  async setToken(token: string) {
    await SecureStore.setItemAsync('authToken', token);
  },
  
  async getToken() {
    return await SecureStore.getItemAsync('authToken');
  },
  
  async clearToken() {
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('sessionCookie');
  },

  async setSessionCookie(cookie: string) {
    await SecureStore.setItemAsync('sessionCookie', cookie);
  },
};

// ============================================
// Movie API - Same as web app
// ============================================
export const moviesApi = {
  // AI-powered smart picks (uses Perplexity AI) - POST method
  async getSmartPicks(): Promise<{ movies: Movie[], aiSteps?: any[] }> {
    const response = await api.post('/search/smart-picks', {});
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
      const response = await api.post('/search/perplexity', { query });
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
    const response = await api.post('/search/smart-picks-tvshows', {});
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
      const response = await api.post('/search/perplexity', { query });
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
