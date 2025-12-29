import { create } from 'zustand';
import { Movie, TvShow, Rating, WatchlistItem, User, RatingType } from './types';

interface AppState {
  // User
  user: User | null;
  isAuthenticated: boolean;
  isUsingDemoMode: boolean;
  setUser: (user: User | null) => void;
  login: (user: User) => void;
  logout: () => void;
  setIsUsingDemoMode: (isDemoMode: boolean) => void;
  
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

export const useAppStore = create<AppState>((set) => ({
  // User
  user: null,
  isAuthenticated: false,
  isUsingDemoMode: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false, isUsingDemoMode: false }),
  setIsUsingDemoMode: (isDemoMode) => set({ isUsingDemoMode: isDemoMode }),
  
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
  
  // Clear
  clearAll: () =>
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
    }),
}));

