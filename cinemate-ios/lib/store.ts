import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Movie, TvShow, Rating, WatchlistItem, User, RatingType } from './types';

// Session storage keys
const SESSION_KEYS = {
  USER: 'session_user',
  IS_DEMO: 'session_is_demo',
} as const;

interface AppState {
  // User
  user: User | null;
  isAuthenticated: boolean;
  isUsingDemoMode: boolean;
  isSessionRestored: boolean;
  setUser: (user: User | null) => void;
  login: (user: User) => void;
  logout: () => void;
  setIsUsingDemoMode: (isDemoMode: boolean) => void;
  restoreSession: () => Promise<boolean>;
  persistSession: () => Promise<void>;
  
  // Movies
  smartPicks: Movie[];
  setSmartPicks: (movies: Movie[]) => void;
  
  // TV Shows
  tvSmartPicks: TvShow[];
  setTvSmartPicks: (shows: TvShow[]) => void;
  
  // Ratings
  movieRatings: Rating[];
  tvShowRatings: Rating[];
  setMovieRatings: (ratings: Rating[]) => void;
  setTvShowRatings: (ratings: Rating[]) => void;
  addMovieRating: (rating: Rating) => void;
  addTvShowRating: (rating: Rating) => void;
  
  // Watchlist
  movieWatchlist: WatchlistItem[];
  tvShowWatchlist: WatchlistItem[];
  setMovieWatchlist: (items: WatchlistItem[]) => void;
  setTvShowWatchlist: (items: WatchlistItem[]) => void;
  addToMovieWatchlist: (item: WatchlistItem) => void;
  removeFromMovieWatchlist: (movieId: number) => void;
  addToTvShowWatchlist: (item: WatchlistItem) => void;
  removeFromTvShowWatchlist: (tvShowId: number) => void;
  
  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // Rate page state
  rateMovies: Movie[];
  currentRateIndex: number;
  setRateMovies: (movies: Movie[]) => void;
  nextRateMovie: () => void;
  
  // Clear all
  clearAll: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // User
  user: null,
  isAuthenticated: false,
  isUsingDemoMode: false,
  isSessionRestored: false,
  
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  login: async (user) => {
    set({ user, isAuthenticated: true });
    // Persist session to SecureStore
    try {
      await SecureStore.setItemAsync(SESSION_KEYS.USER, JSON.stringify(user));
      console.log('[SESSION] User session persisted');
    } catch (error) {
      console.log('[SESSION] Error persisting user session:', error);
    }
  },
  
  logout: async () => {
    set({ user: null, isAuthenticated: false, isUsingDemoMode: false });
    // Clear persisted session
    try {
      await SecureStore.deleteItemAsync(SESSION_KEYS.USER);
      await SecureStore.deleteItemAsync(SESSION_KEYS.IS_DEMO);
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('sessionCookie');
      console.log('[SESSION] Session cleared');
    } catch (error) {
      console.log('[SESSION] Error clearing session:', error);
    }
  },
  
  setIsUsingDemoMode: async (isDemoMode) => {
    set({ isUsingDemoMode: isDemoMode });
    // Persist demo mode preference
    try {
      await SecureStore.setItemAsync(SESSION_KEYS.IS_DEMO, JSON.stringify(isDemoMode));
    } catch (error) {
      console.log('[SESSION] Error persisting demo mode:', error);
    }
  },

  // Restore session from SecureStore on app launch
  restoreSession: async () => {
    try {
      console.log('[SESSION] Attempting to restore session...');
      
      // Check for persisted user
      const userJson = await SecureStore.getItemAsync(SESSION_KEYS.USER);
      const isDemoJson = await SecureStore.getItemAsync(SESSION_KEYS.IS_DEMO);
      const authToken = await SecureStore.getItemAsync('authToken');
      
      if (userJson) {
        const user = JSON.parse(userJson);
        const isDemo = isDemoJson ? JSON.parse(isDemoJson) : false;
        
        console.log('[SESSION] Found persisted session for:', user.email);
        console.log('[SESSION] Is demo mode:', isDemo);
        console.log('[SESSION] Has auth token:', !!authToken);
        
        set({ 
          user, 
          isAuthenticated: true, 
          isUsingDemoMode: isDemo,
          isSessionRestored: true 
        });
        return true;
      } else {
        console.log('[SESSION] No persisted session found');
        set({ isSessionRestored: true });
        return false;
      }
    } catch (error) {
      console.log('[SESSION] Error restoring session:', error);
      set({ isSessionRestored: true });
      return false;
    }
  },

  // Manually persist current session
  persistSession: async () => {
    const { user, isUsingDemoMode } = get();
    if (user) {
      try {
        await SecureStore.setItemAsync(SESSION_KEYS.USER, JSON.stringify(user));
        await SecureStore.setItemAsync(SESSION_KEYS.IS_DEMO, JSON.stringify(isUsingDemoMode));
        console.log('[SESSION] Session manually persisted');
      } catch (error) {
        console.log('[SESSION] Error manually persisting session:', error);
      }
    }
  },
  
  // Movies
  smartPicks: [],
  setSmartPicks: (movies) => set({ smartPicks: movies }),
  
  // TV Shows
  tvSmartPicks: [],
  setTvSmartPicks: (shows) => set({ tvSmartPicks: shows }),
  
  // Ratings
  movieRatings: [],
  tvShowRatings: [],
  setMovieRatings: (ratings) => set({ movieRatings: ratings }),
  setTvShowRatings: (ratings) => set({ tvShowRatings: ratings }),
  addMovieRating: (rating) =>
    set((state) => ({
      movieRatings: [rating, ...state.movieRatings],
    })),
  addTvShowRating: (rating) =>
    set((state) => ({
      tvShowRatings: [rating, ...state.tvShowRatings],
    })),
  
  // Watchlist
  movieWatchlist: [],
  tvShowWatchlist: [],
  setMovieWatchlist: (items) => set({ movieWatchlist: items }),
  setTvShowWatchlist: (items) => set({ tvShowWatchlist: items }),
  addToMovieWatchlist: (item) =>
    set((state) => ({
      movieWatchlist: [item, ...state.movieWatchlist],
    })),
  removeFromMovieWatchlist: (movieId) =>
    set((state) => ({
      movieWatchlist: state.movieWatchlist.filter((i) => i.movieId !== movieId),
    })),
  addToTvShowWatchlist: (item) =>
    set((state) => ({
      tvShowWatchlist: [item, ...state.tvShowWatchlist],
    })),
  removeFromTvShowWatchlist: (tvShowId) =>
    set((state) => ({
      tvShowWatchlist: state.tvShowWatchlist.filter((i) => i.movieId !== tvShowId),
    })),
  
  // Loading
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  // Rate page
  rateMovies: [],
  currentRateIndex: 0,
  setRateMovies: (movies) => set({ rateMovies: movies, currentRateIndex: 0 }),
  nextRateMovie: () =>
    set((state) => ({
      currentRateIndex: state.currentRateIndex + 1,
    })),
  
  // Clear all data (but session is cleared separately in logout)
  clearAll: async () => {
    // Clear persisted session
    try {
      await SecureStore.deleteItemAsync(SESSION_KEYS.USER);
      await SecureStore.deleteItemAsync(SESSION_KEYS.IS_DEMO);
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('sessionCookie');
    } catch (error) {
      console.log('[SESSION] Error clearing session in clearAll:', error);
    }
    
    set({
      user: null,
      isAuthenticated: false,
      isUsingDemoMode: false,
      smartPicks: [],
      tvSmartPicks: [],
      movieRatings: [],
      tvShowRatings: [],
      movieWatchlist: [],
      tvShowWatchlist: [],
      rateMovies: [],
      currentRateIndex: 0,
    });
  },
}));

