import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Movie } from "./data";
import { addToWatchlistAPI, removeFromWatchlistAPI } from "./watchlist-api";
import { saveRatingAPI } from "./ratings-api";

export type Rating = "awful" | "meh" | "good" | "amazing" | "not-seen" | "not-interested";

export interface RatedMovie {
  movie: Movie;
  rating: Rating;
  timestamp: number;
}

interface AppState {
  // User profile
  name: string;
  age: string;
  languages: string[];

  // Movie ratings
  ratedMovies: RatedMovie[];
  rated: number;

  // Watchlist
  watchlist: Movie[];

  // Actions
  setName: (name: string) => void;
  setAge: (age: string) => void;
  toggleLanguage: (lang: string) => void;
  setLanguages: (languages: string[]) => void;

  rateMovie: (movie: Movie, rating: Rating) => void;
  addToWatchlist: (movie: Movie) => void;
  removeFromWatchlist: (movieId: number) => void;
  
  // Get computed values
  getProfileStrength: () => "Weak" | "Strong";
  getTopGenres: () => string[];
  getAmazingPercentage: () => number;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      name: "",
      age: "",
      languages: [],
      ratedMovies: [],
      rated: 0,
      watchlist: [],

      // Actions
      setName: (name) => set({ name }),
      setAge: (age) => set({ age }),
      toggleLanguage: (lang) =>
        set((state) => ({
          languages: state.languages.includes(lang)
            ? state.languages.filter((l) => l !== lang)
            : [...state.languages, lang],
        })),
      setLanguages: (languages) => set({ languages }),

      rateMovie: async (movie, rating) => {
        // Check if movie was already rated
        const state = get();
        const existingIndex = state.ratedMovies.findIndex(
          (rm) => rm.movie.id === movie.id
        );

        let newRatedMovies;
        if (existingIndex >= 0) {
          // Update existing rating
          newRatedMovies = [...state.ratedMovies];
          newRatedMovies[existingIndex] = {
            movie,
            rating,
            timestamp: Date.now(),
          };
        } else {
          // Add new rating
          newRatedMovies = [
            ...state.ratedMovies,
            { movie, rating, timestamp: Date.now() },
          ];
        }

        // Update local state immediately (optimistic update)
        set({
          ratedMovies: newRatedMovies,
          rated: newRatedMovies.length,
        });

        // Sync with backend (fire and forget)
        saveRatingAPI(movie, rating).catch((error) => {
          console.error("Failed to sync rating to backend:", error);
        });
      },

      addToWatchlist: async (movie) => {
        // Check if already in watchlist
        const state = get();
        if (state.watchlist.some((m) => m.id === movie.id)) {
          return;
        }

        // Update local state immediately (optimistic update)
        set((state) => ({
          watchlist: [...state.watchlist, movie],
        }));

        // Sync with backend (fire and forget)
        addToWatchlistAPI(movie).catch((error) => {
          console.error("Failed to sync watchlist to backend:", error);
          // Could revert local state here if needed
        });
      },

      removeFromWatchlist: async (movieId) => {
        // Update local state immediately (optimistic update)
        set((state) => ({
          watchlist: state.watchlist.filter((m) => m.id !== movieId),
        }));

        // Sync with backend (fire and forget)
        removeFromWatchlistAPI(movieId).catch((error) => {
          console.error("Failed to sync watchlist removal to backend:", error);
          // Could revert local state here if needed
        });
      },

      getProfileStrength: () => {
        const { rated } = get();
        return rated >= 100 ? "Strong" : "Weak";
      },

      getTopGenres: () => {
        const { ratedMovies } = get();
        const genreCounts: Record<string, number> = {};

        ratedMovies.forEach(({ movie }) => {
          movie.genres?.forEach((genre) => {
            genreCounts[genre] = (genreCounts[genre] || 0) + 1;
          });
        });

        return Object.entries(genreCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([genre]) => genre);
      },

      getAmazingPercentage: () => {
        const { ratedMovies } = get();
        if (ratedMovies.length === 0) return 0;

        const amazingCount = ratedMovies.filter(
          (rm) => rm.rating === "amazing"
        ).length;
        return Math.round((amazingCount / ratedMovies.length) * 100);
      },
    }),
    {
      name: "cinemate-storage",
    }
  )
);

