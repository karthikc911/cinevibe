"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MovieCard } from "@/components/MovieCard";
import { RatingPills } from "@/components/RatingPills";
import { ShareModal } from "@/components/ShareModal";
import { AIThinkingPanel, AIStep } from "@/components/AIThinkingPanel";
import { Movie, TvShow } from "@/lib/data";
import { useAppStore, Rating } from "@/lib/store";
import { Send, Heart, Search as SearchIcon, Loader2, AlertCircle, Star, X, Sparkles, TrendingUp, Flame, ChevronLeft, ChevronRight, Tv, Film } from "lucide-react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedMovie, setSearchedMovie] = useState<Movie | null>(null);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMultipleResults, setIsMultipleResults] = useState(false);
  
  // AI Recommendations - Movies
  const [aiMovies, setAiMovies] = useState<Movie[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiIndex, setAiIndex] = useState(0);
  
  // AI Recommendations - TV Shows
  const [aiTvShows, setAiTvShows] = useState<TvShow[]>([]);
  const [aiTvLoading, setAiTvLoading] = useState(false);
  const [aiTvIndex, setAiTvIndex] = useState(0);
  
  // Content type toggle
  const [contentType, setContentType] = useState<'movies' | 'tvshows'>('movies');
  
  // Trending Section
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [trendingWindow, setTrendingWindow] = useState<'day' | 'week'>('day');
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingIndex, setTrendingIndex] = useState(0);
  
  // Popular Section
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [popularCategory, setPopularCategory] = useState<'streaming' | 'on_tv' | 'for_rent' | 'in_theaters'>('streaming');
  const [popularLoading, setPopularLoading] = useState(false);
  const [popularIndex, setPopularIndex] = useState(0);
  
  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [movieToShare, setMovieToShare] = useState<Movie | null>(null);
  
  // AI Thinking Panel state
  const [aiSteps, setAiSteps] = useState<AIStep[]>([]);
  const [showAiPanel, setShowAiPanel] = useState(false);
  
  const { rateMovie, addToWatchlist } = useAppStore();

  // Helper to update AI step status
  const updateStep = (id: string, updates: Partial<AIStep>) => {
    setAiSteps(prev => prev.map(step => step.id === id ? { ...step, ...updates } : step));
  };

  // Load AI recommendations - Movies
  const loadAIRecommendations = async () => {
    setAiLoading(true);
    setError(null);
    setAiIndex(0); // Reset to first page
    setContentType('movies');
    setShowAiPanel(true);
    
    const startTime = Date.now();
    
    // Initialize steps
    const steps: AIStep[] = [
      {
        id: "preferences",
        label: "Understanding your taste",
        status: "loading",
        description: "Loading your movie preferences and ratings from database",
        icon: "brain",
        timestamp: Date.now(),
        subSteps: []
      },
      {
        id: "ai",
        label: "Consulting AI experts",
        status: "pending",
        description: "Using Perplexity AI to analyze your taste profile",
        icon: "sparkles"
      },
      {
        id: "database",
        label: "Searching movie library",
        status: "pending",
        description: "Querying database for movies matching your preferences",
        icon: "database"
      },
      {
        id: "matching",
        label: "Ranking recommendations",
        status: "pending",
        description: "Calculating match scores for personalized results",
        icon: "wand"
      }
    ];
    setAiSteps(steps);
    
    try {
      // Step 1: Load REAL user preferences
      const prefStart = Date.now();
      updateStep("preferences", { 
        status: "loading",
        subSteps: [
          { id: "pref-1", label: "Loading your profile...", status: "loading", timestamp: Date.now() }
        ]
      });
      
      // Fetch actual preferences and ratings in parallel
      const [prefRes, ratingsRes] = await Promise.all([
        fetch('/api/user/preferences'),
        fetch('/api/ratings')
      ]);
      
      const userPrefs = prefRes.ok ? await prefRes.json() : { languages: ['English', 'Hindi'], genres: [] };
      const ratingsData = ratingsRes.ok ? await ratingsRes.json() : { ratings: [] };
      const ratings = ratingsData.ratings || [];
      const amazingCount = ratings.filter((r: any) => r.rating === 'amazing').length;
      const goodCount = ratings.filter((r: any) => r.rating === 'good').length;
      const awfulCount = ratings.filter((r: any) => r.rating === 'awful').length;
      
      updateStep("preferences", { 
        status: "completed",
        duration: Date.now() - prefStart,
        result: `${ratings.length} rated movies: ${amazingCount} amazing, ${goodCount} good, ${awfulCount} awful`,
        subSteps: [
          { id: "pref-1", label: `✓ Languages: ${userPrefs.languages?.join(', ') || 'English, Hindi'}`, status: "completed", timestamp: Date.now() },
          { id: "pref-2", label: `✓ Loaded ${ratings.length} rated movies`, status: "completed", timestamp: Date.now() },
          { id: "pref-3", label: `✓ Year: ${userPrefs.recYearFrom || 1900}-${userPrefs.recYearTo || new Date().getFullYear()} • Min IMDB: ${userPrefs.recMinImdb || 7.0}`, status: "completed", timestamp: Date.now() }
        ]
      });
      
      // Step 2: AI Processing (REAL API call)
      const aiStart = Date.now();
      updateStep("ai", { 
        status: "loading", 
        timestamp: Date.now(),
        subSteps: [
          { id: "ai-1", label: "Analyzing your taste profile...", status: "loading", timestamp: Date.now() }
        ]
      });
      
      const response = await fetch('/api/search/smart-picks?count=10', {
        method: 'POST',
      });
      
      updateStep("ai", { 
        status: "completed",
        duration: Date.now() - aiStart,
        result: `Analyzed ${amazingCount + goodCount} positively-rated movies`,
        subSteps: [
          { id: "ai-1", label: `✓ Prioritized ${amazingCount} amazing-rated movies`, status: "completed", timestamp: Date.now() },
          { id: "ai-2", label: `✓ Genre focus: ${userPrefs.genres?.slice(0, 3).join(', ') || 'All genres'}`, status: "completed", timestamp: Date.now() }
        ]
      });
      
      // Step 3: Database Search
      const dbStart = Date.now();
      updateStep("database", { 
        status: "loading", 
        timestamp: Date.now(),
        subSteps: [
          { id: "db-1", label: "Filtering by your preferences...", status: "loading", timestamp: Date.now() }
        ]
      });
      
      if (response.ok) {
        const data = await response.json();
        
        updateStep("database", { 
          status: "completed",
          duration: Date.now() - dbStart,
          result: `Found ${data.movies?.length || 0} matching movies`,
          subSteps: [
            { id: "db-1", label: `✓ IMDB rating > ${userPrefs.recMinImdb || 7.0}`, status: "completed", timestamp: Date.now() },
            { id: "db-2", label: `✓ Excluded ${ratings.length} already-rated movies`, status: "completed", timestamp: Date.now() }
          ]
        });
        
        // Step 4: Matching
        const matchStart = Date.now();
        updateStep("matching", { 
          status: "loading", 
          timestamp: Date.now(),
          subSteps: [
            { id: "match-1", label: "Computing match scores...", status: "loading", timestamp: Date.now() }
          ]
        });
        
        setAiMovies(data.movies || []);
        
        const avgMatch = data.movies?.length > 0 
          ? Math.round(data.movies.reduce((acc: number, m: any) => acc + (m.matchPercent || 0), 0) / data.movies.length)
          : 0;
        
        updateStep("matching", { 
          status: "completed",
          duration: Date.now() - matchStart,
          result: `Best match: ${data.movies?.[0]?.matchPercent || 0}% • Average: ${avgMatch}%`,
          subSteps: [
            { id: "match-1", label: `✓ Ranked ${data.movies?.length || 0} movies by relevance`, status: "completed", timestamp: Date.now() },
            { id: "match-2", label: `✓ Top pick: ${data.movies?.[0]?.title || 'N/A'}`, status: "completed", timestamp: Date.now() }
          ]
        });
      } else {
        updateStep("database", { status: "error" });
        updateStep("matching", { status: "error" });
        setError('Failed to generate movie recommendations. Please try again.');
      }
    } catch (error) {
      console.error('Failed to load AI movie recommendations:', error);
      setError('Failed to generate movie recommendations. Please try again.');
      setAiSteps(prev => prev.map(step => 
        step.status === "loading" ? { ...step, status: "error" as const } : step
      ));
    } finally {
      setAiLoading(false);
      // Auto-collapse panel after 5 seconds
      setTimeout(() => {
        setShowAiPanel(false);
      }, 5000);
    }
  };

  // Load AI recommendations - TV Shows
  const loadAITvRecommendations = async () => {
    setAiTvLoading(true);
    setError(null);
    setAiTvIndex(0); // Reset to first page
    setContentType('tvshows');
    setShowAiPanel(true);
    
    // Initialize steps
    const steps: AIStep[] = [
      {
        id: "preferences",
        label: "Understanding your taste",
        status: "loading",
        description: "Loading your TV show preferences and ratings",
        icon: "brain"
      },
      {
        id: "ai",
        label: "Consulting AI experts",
        status: "pending",
        description: "Using advanced AI to analyze your taste profile",
        icon: "sparkles"
      },
      {
        id: "database",
        label: "Searching our TV show library",
        status: "pending",
        description: "Finding shows that match your preferences",
        icon: "database"
      },
      {
        id: "matching",
        label: "Calculating perfect matches",
        status: "pending",
        description: "Ranking shows based on how well they fit your taste",
        icon: "wand"
      }
    ];
    setAiSteps(steps);
    
    try {
      // Step 1: Load REAL user preferences for TV shows
      const prefStart = Date.now();
      updateStep("preferences", { 
        status: "loading",
        subSteps: [
          { id: "pref-1", label: "Loading your profile...", status: "loading", timestamp: Date.now() }
        ]
      });
      
      // Fetch actual preferences and TV show ratings in parallel
      const [prefRes, ratingsRes] = await Promise.all([
        fetch('/api/user/preferences'),
        fetch('/api/tvshow-ratings')
      ]);
      
      const userPrefs = prefRes.ok ? await prefRes.json() : { languages: ['English', 'Hindi'], genres: [] };
      const ratingsData = ratingsRes.ok ? await ratingsRes.json() : { ratings: [] };
      const ratings = ratingsData.ratings || [];
      const amazingCount = ratings.filter((r: any) => r.rating === 'amazing').length;
      const goodCount = ratings.filter((r: any) => r.rating === 'good').length;
      const awfulCount = ratings.filter((r: any) => r.rating === 'awful').length;
      
      updateStep("preferences", { 
        status: "completed",
        duration: Date.now() - prefStart,
        result: `${ratings.length} rated shows: ${amazingCount} amazing, ${goodCount} good, ${awfulCount} awful`,
        subSteps: [
          { id: "pref-1", label: `✓ Languages: ${userPrefs.languages?.join(', ') || 'English, Hindi'}`, status: "completed", timestamp: Date.now() },
          { id: "pref-2", label: `✓ Loaded ${ratings.length} rated TV shows`, status: "completed", timestamp: Date.now() },
          { id: "pref-3", label: `✓ Year: ${userPrefs.recYearFrom || 1900}-${userPrefs.recYearTo || new Date().getFullYear()} • Min IMDB: ${userPrefs.recMinImdb || 7.0}`, status: "completed", timestamp: Date.now() }
        ]
      });
      
      // Step 2: AI Processing (REAL API call)
      const aiStart = Date.now();
      updateStep("ai", { 
        status: "loading", 
        timestamp: Date.now(),
        subSteps: [
          { id: "ai-1", label: "Analyzing your TV show preferences...", status: "loading", timestamp: Date.now() }
        ]
      });
      
      const response = await fetch('/api/search/smart-picks-tvshows?count=10', {
        method: 'POST',
      });
      
      updateStep("ai", { 
        status: "completed",
        duration: Date.now() - aiStart,
        result: `Analyzed ${amazingCount + goodCount} positively-rated shows`,
        subSteps: [
          { id: "ai-1", label: `✓ Prioritized ${amazingCount} amazing-rated shows`, status: "completed", timestamp: Date.now() },
          { id: "ai-2", label: `✓ Genre focus: ${userPrefs.genres?.slice(0, 3).join(', ') || 'All genres'}`, status: "completed", timestamp: Date.now() }
        ]
      });
      
      // Step 3: Database Search
      const dbStart = Date.now();
      updateStep("database", { 
        status: "loading", 
        timestamp: Date.now(),
        subSteps: [
          { id: "db-1", label: "Filtering by your preferences...", status: "loading", timestamp: Date.now() }
        ]
      });
      
      if (response.ok) {
        const data = await response.json();
        
        updateStep("database", { 
          status: "completed",
          duration: Date.now() - dbStart,
          result: `Found ${data.tvShows?.length || 0} matching TV shows`,
          subSteps: [
            { id: "db-1", label: `✓ IMDB rating > ${userPrefs.recMinImdb || 7.0}`, status: "completed", timestamp: Date.now() },
            { id: "db-2", label: `✓ Excluded ${ratings.length} already-rated shows`, status: "completed", timestamp: Date.now() }
          ]
        });
        
        // Step 4: Matching
        const matchStart = Date.now();
        updateStep("matching", { 
          status: "loading", 
          timestamp: Date.now(),
          subSteps: [
            { id: "match-1", label: "Computing match scores...", status: "loading", timestamp: Date.now() }
          ]
        });
        
        setAiTvShows(data.tvShows || []);
        
        const avgMatch = data.tvShows?.length > 0 
          ? Math.round(data.tvShows.reduce((acc: number, s: any) => acc + (s.matchPercent || 0), 0) / data.tvShows.length)
          : 0;
        
        updateStep("matching", { 
          status: "completed",
          duration: Date.now() - matchStart,
          result: `Best match: ${data.tvShows?.[0]?.matchPercent || 0}% • Average: ${avgMatch}%`,
          subSteps: [
            { id: "match-1", label: `✓ Ranked ${data.tvShows?.length || 0} shows by relevance`, status: "completed", timestamp: Date.now() },
            { id: "match-2", label: `✓ Top pick: ${data.tvShows?.[0]?.name || 'N/A'}`, status: "completed", timestamp: Date.now() }
          ]
        });
      } else {
        updateStep("database", { status: "error" });
        updateStep("matching", { status: "error" });
        setError('Failed to generate TV show recommendations. Please try again.');
      }
    } catch (error) {
      console.error('Failed to load AI TV show recommendations:', error);
      setError('Failed to generate TV show recommendations. Please try again.');
      setAiSteps(prev => prev.map(step => 
        step.status === "loading" ? { ...step, status: "error" as const } : step
      ));
    } finally {
      setAiTvLoading(false);
      // Auto-collapse panel after 5 seconds
      setTimeout(() => setShowAiPanel(false), 5000);
    }
  };

  // Navigation functions for AI movies
  const handleAIPrev = () => {
    setAiIndex(prev => Math.max(0, prev - 3));
  };

  const handleAINext = () => {
    setAiIndex(prev => Math.min(aiMovies.length - 3, prev + 3));
  };

  // Navigation functions for AI TV shows
  const handleAITvPrev = () => {
    setAiTvIndex(prev => Math.max(0, prev - 3));
  };

  const handleAITvNext = () => {
    setAiTvIndex(prev => Math.min(aiTvShows.length - 3, prev + 3));
  };

  // Load trending movies
  const loadTrendingMovies = async (window: 'day' | 'week') => {
    setTrendingLoading(true);
    setTrendingWindow(window);
    setTrendingIndex(0); // Reset to first page
    try {
      const response = await fetch(`/api/tmdb/trending?timeWindow=${window}`);
      if (response.ok) {
        const data = await response.json();
        setTrendingMovies((data.movies || []).slice(0, 9)); // Load 9 movies (3 pages of 3)
      }
    } catch (error) {
      console.error('Failed to load trending movies:', error);
    } finally {
      setTrendingLoading(false);
    }
  };

  // Load popular movies
  const loadPopularMovies = async (category: 'streaming' | 'on_tv' | 'for_rent' | 'in_theaters') => {
    setPopularLoading(true);
    setPopularCategory(category);
    setPopularIndex(0); // Reset to first page
    try {
      const response = await fetch(`/api/tmdb/popular?category=${category}`);
      if (response.ok) {
        const data = await response.json();
        setPopularMovies((data.movies || []).slice(0, 9)); // Load 9 movies (3 pages of 3)
      }
    } catch (error) {
      console.error('Failed to load popular movies:', error);
    } finally {
      setPopularLoading(false);
    }
  };

  // Navigation functions for trending
  const handleTrendingPrev = () => {
    setTrendingIndex(prev => Math.max(0, prev - 3));
  };

  const handleTrendingNext = () => {
    setTrendingIndex(prev => Math.min(trendingMovies.length - 3, prev + 3));
  };

  // Navigation functions for popular
  const handlePopularPrev = () => {
    setPopularIndex(prev => Math.max(0, prev - 3));
  };

  const handlePopularNext = () => {
    setPopularIndex(prev => Math.min(popularMovies.length - 3, prev + 3));
  };

  // Load trending and popular on mount
  useEffect(() => {
    if (status === "authenticated") {
      loadTrendingMovies('day');
      loadPopularMovies('streaming');
    }
  }, [status]);

  // Handle rating a movie
  const handleRate = async (movieId: number, rating: Rating) => {
    try {
      // Find the movie in any of the lists
      const movie = searchedMovie?.id === movieId 
        ? searchedMovie 
        : searchResults.find(m => m.id === movieId) 
        || aiMovies.find(m => m.id === movieId)
        || aiTvShows.find(m => m.id === movieId) // Added AI TV shows
        || trendingMovies.find(m => m.id === movieId)
        || popularMovies.find(m => m.id === movieId);
      
      if (!movie) {
        console.error('⚠️ Movie not found in any list for rating', { 
          movieId, 
          aiMoviesCount: aiMovies.length,
          aiTvShowsCount: aiTvShows.length,
          searchResultsCount: searchResults.length,
          trendingCount: trendingMovies.length,
          popularCount: popularMovies.length 
        });
        return;
      }

      // Determine if this is a TV show or movie
      const isTvShow = (movie as any).type === 'tvshow' || (movie as any).mediaType === 'tv' || (movie as any).name;
      const endpoint = isTvShow ? '/api/tvshow-ratings' : '/api/ratings';
      const title = (movie as any).name || movie.title;
      
      console.log('💾 Saving rating:', {
        movieId: movie.id,
        title,
        isTvShow,
        endpoint,
        rating,
        movieObject: movie
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isTvShow 
            ? {
                tvShowId: movie.id,
                tvShowName: title,
                tvShowYear: movie.year,
                rating,
              }
            : {
                movieId: movie.id,
                movieTitle: title,
                movieYear: movie.year,
                rating,
              }
        ),
      });

      if (response.ok) {
        rateMovie(movieId, rating);
        
        // Check if this is an AI movie in the current view
        const isAIMovie = aiMovies.find(m => m.id === movieId);
        const aiMovieIndex = aiMovies.findIndex(m => m.id === movieId);
        
        // Check if this is a search result in the current view
        const isSearchResult = searchResults.find(m => m.id === movieId);
        const searchMovieIndex = searchResults.findIndex(m => m.id === movieId);
        
        // Remove from all lists
        if (isMultipleResults) {
          // Auto-slide for search results if the rated movie is in current view
          if (isSearchResult && searchMovieIndex >= searchIndex && searchMovieIndex < searchIndex + 3) {
            setSearchResults(prev => prev.filter(m => m.id !== movieId));
            // After removing, check if we need to adjust the index
            setTimeout(() => {
              setSearchIndex(prev => {
                const newLength = searchResults.length - 1; // Account for the removed movie
                // If we're past the last valid index, go back
                if (prev + 3 > newLength && prev > 0) {
                  return Math.max(0, newLength - 3);
                }
                return prev;
              });
            }, 300); // Small delay for smooth transition
          } else {
            setSearchResults(prev => prev.filter(m => m.id !== movieId));
          }
        } else if (searchedMovie?.id === movieId) {
          setSearchedMovie(null);
          setSearchQuery("");
        } else {
          setAiMovies(prev => prev.filter(m => m.id !== movieId));
          setAiTvShows(prev => prev.filter(m => m.id !== movieId)); // Added AI TV shows
          setTrendingMovies(prev => prev.filter(m => m.id !== movieId));
          setPopularMovies(prev => prev.filter(m => m.id !== movieId));
          
          // Auto-advance for AI movies if the rated movie is in current view
          if (isAIMovie && aiMovieIndex >= aiIndex && aiMovieIndex < aiIndex + 3) {
            // After removing, check if we need to adjust the index
            setTimeout(() => {
              setAiIndex(prev => {
                const newLength = aiMovies.length - 1; // Account for the removed movie
                // If we're past the last valid index, go back
                if (prev + 3 > newLength && prev > 0) {
                  return Math.max(0, newLength - 3);
                }
                return prev;
              });
            }, 300); // Small delay for smooth transition
          }
          
          // Auto-advance for AI TV shows if the rated show is in current view
          const aiTvShowIndex = aiTvShows.findIndex(m => m.id === movieId);
          if (aiTvShowIndex >= aiTvIndex && aiTvShowIndex < aiTvIndex + 3) {
            setTimeout(() => {
              setAiTvIndex(prev => {
                const newLength = aiTvShows.length - 1;
                if (prev + 3 > newLength && prev > 0) {
                  return Math.max(0, newLength - 3);
                }
                return prev;
              });
            }, 300);
          }
        }
        setError(null);
      } else {
        // API request failed
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Failed to save rating - API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          movieId,
          isTvShow,
          endpoint
        });
        setError(`Failed to save rating: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to save rating - Exception:', error);
      setError(`Failed to save rating: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle sharing movie with friends
  const handleShare = (movie: Movie) => {
    setMovieToShare(movie);
    setShareModalOpen(true);
  };

  // Handle watchlist with auto-slide for search results and AI picks
  const handleAddToWatchlist = (movie: Movie) => {
    // Add to watchlist using store
    addToWatchlist(movie);

    // Check which list this movie belongs to
    const isAIMovie = aiMovies.find(m => m.id === movie.id);
    const aiMovieIndex = aiMovies.findIndex(m => m.id === movie.id);
    
    const isAITvShow = aiTvShows.find(m => m.id === movie.id);
    const aiTvShowIndex = aiTvShows.findIndex(m => m.id === movie.id);
    
    const isSearchResult = searchResults.find(m => m.id === movie.id);
    const searchMovieIndex = searchResults.findIndex(m => m.id === movie.id);

    // Handle search results
    if (isMultipleResults && searchResults.length > 3) {
      // Only auto-slide if the movie is in current view
      if (isSearchResult && searchMovieIndex >= searchIndex && searchMovieIndex < searchIndex + 3) {
        setSearchResults(prev => prev.filter(m => m.id !== movie.id));
        
        // Adjust index after removal
        setTimeout(() => {
          setSearchIndex(prev => {
            const newLength = searchResults.length - 1;
            if (prev + 3 > newLength && prev > 0) {
              return Math.max(0, newLength - 3);
            }
            return prev;
          });
        }, 300);
      } else {
        // Not in current view, just remove
        setSearchResults(prev => prev.filter(m => m.id !== movie.id));
      }
    } else if (searchedMovie?.id === movie.id) {
      // Single search result
      setSearchedMovie(null);
      setSearchQuery("");
    } else {
      // Remove from AI picks, trending, and popular
      setAiMovies(prev => prev.filter(m => m.id !== movie.id));
      setAiTvShows(prev => prev.filter(m => m.id !== movie.id));
      setTrendingMovies(prev => prev.filter(m => m.id !== movie.id));
      setPopularMovies(prev => prev.filter(m => m.id !== movie.id));
      
      // Auto-advance for AI movies if the movie is in current view
      if (isAIMovie && aiMovieIndex >= aiIndex && aiMovieIndex < aiIndex + 3) {
        setTimeout(() => {
          setAiIndex(prev => {
            const newLength = aiMovies.length - 1;
            if (prev + 3 > newLength && prev > 0) {
              return Math.max(0, newLength - 3);
            }
            return prev;
          });
        }, 300);
      }
      
      // Auto-advance for AI TV shows if the show is in current view
      if (isAITvShow && aiTvShowIndex >= aiTvIndex && aiTvShowIndex < aiTvIndex + 3) {
        setTimeout(() => {
          setAiTvIndex(prev => {
            const newLength = aiTvShows.length - 1;
            if (prev + 3 > newLength && prev > 0) {
              return Math.max(0, newLength - 3);
            }
            return prev;
          });
        }, 300);
      }
    }
  };

  // Handle skipping a movie/TV show (remove without rating or adding to watchlist)
  const handleSkip = (movie: Movie) => {
    const isAIMovie = aiMovies.find(m => m.id === movie.id);
    const aiMovieIndex = aiMovies.findIndex(m => m.id === movie.id);
    
    const isAITvShow = aiTvShows.find(m => m.id === movie.id);
    const aiTvShowIndex = aiTvShows.findIndex(m => m.id === movie.id);
    
    const isSearchResult = searchResults.find(m => m.id === movie.id);
    const searchMovieIndex = searchResults.findIndex(m => m.id === movie.id);

    // Remove from lists
    if (isMultipleResults && searchResults.length > 3) {
      if (isSearchResult && searchMovieIndex >= searchIndex && searchMovieIndex < searchIndex + 3) {
        setSearchResults(prev => prev.filter(m => m.id !== movie.id));
        setTimeout(() => {
          setSearchIndex(prev => {
            const newLength = searchResults.length - 1;
            if (prev + 3 > newLength && prev > 0) {
              return Math.max(0, newLength - 3);
            }
            return prev;
          });
        }, 300);
      } else {
        setSearchResults(prev => prev.filter(m => m.id !== movie.id));
      }
    } else if (searchedMovie?.id === movie.id) {
      setSearchedMovie(null);
      setSearchQuery("");
    } else {
      setAiMovies(prev => prev.filter(m => m.id !== movie.id));
      setAiTvShows(prev => prev.filter(m => m.id !== movie.id));
      setTrendingMovies(prev => prev.filter(m => m.id !== movie.id));
      setPopularMovies(prev => prev.filter(m => m.id !== movie.id));
      
      // Auto-advance for AI movies
      if (isAIMovie && aiMovieIndex >= aiIndex && aiMovieIndex < aiIndex + 3) {
        setTimeout(() => {
          setAiIndex(prev => {
            const newLength = aiMovies.length - 1;
            if (prev + 3 > newLength && prev > 0) {
              return Math.max(0, newLength - 3);
            }
            return prev;
          });
        }, 300);
      }
      
      // Auto-advance for AI TV shows
      if (isAITvShow && aiTvShowIndex >= aiTvIndex && aiTvShowIndex < aiTvIndex + 3) {
        setTimeout(() => {
          setAiTvIndex(prev => {
            const newLength = aiTvShows.length - 1;
            if (prev + 3 > newLength && prev > 0) {
              return Math.max(0, newLength - 3);
            }
            return prev;
          });
        }, 300);
      }
    }
  };

  // Navigation for search results
  const [searchIndex, setSearchIndex] = useState(0);

  const handleSearchPrev = () => {
    setSearchIndex(prev => Math.max(0, prev - 3));
  };

  const handleSearchNext = () => {
    const totalItems = searchResults.length;
    setSearchIndex(prev => Math.min(totalItems - 3, prev + 3));
  };

  // Search for movies/TV shows using Perplexity
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!searchQuery.trim()) {
      setError('Please enter a movie name or question');
      return;
    }

    setLoading(true);
    setError(null);
    setSearchedMovie(null);
    setSearchResults([]);
    setIsMultipleResults(false);
    setSearchIndex(0); // Reset scroll position
    setShowAiPanel(true);
    
    // Initialize search steps
    const steps: AIStep[] = [
      {
        id: "understanding",
        label: "Understanding your search",
        status: "loading",
        description: "Analyzing what you're looking for",
        icon: "brain"
      },
      {
        id: "ai_search",
        label: "AI-powered search",
        status: "pending",
        description: "Using advanced AI to find exact matches",
        icon: "sparkles"
      },
      {
        id: "database_check",
        label: "Checking our library",
        status: "pending",
        description: "Searching movies and TV shows in our database",
        icon: "database"
      },
      {
        id: "enriching",
        label: "Gathering details",
        status: "pending",
        description: "Collecting ratings, reviews, and metadata",
        icon: "wand"
      }
    ];
    setAiSteps(steps);

    try {
      const query = searchQuery.trim();
      
      // Step 1: Understanding
      await new Promise(resolve => setTimeout(resolve, 600));
      updateStep("understanding", { status: "completed" });
      updateStep("ai_search", { status: "loading" });
      
      // Step 2: AI Search
      await new Promise(resolve => setTimeout(resolve, 800));
      updateStep("ai_search", { status: "completed" });
      updateStep("database_check", { status: "loading" });
      
      // Step 3: Database Check
      const response = await fetch('/api/search/perplexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        updateStep("database_check", { status: "error" });
        setError('Failed to process your search. Please try again.');
        setLoading(false);
        setTimeout(() => setShowAiPanel(false), 2000);
        return;
      }
      
      updateStep("database_check", { status: "completed" });
      updateStep("enriching", { status: "loading" });
      
      // Step 4: Enriching
      await new Promise(resolve => setTimeout(resolve, 700));

      const data = await response.json();
      const movies = data.movies || [];
      const tvShows = data.tvShows || [];
      
      // Combine movies and TV shows
      const allResults = [...movies, ...tvShows];

      if (allResults.length === 0) {
        updateStep("enriching", { status: "error" });
        setError('No movies or TV shows found for your query. Try rephrasing your search.');
      } else if (allResults.length === 1) {
        // Single result - show as searched movie
        updateStep("enriching", { status: "completed" });
        setSearchedMovie(allResults[0]);
        setIsMultipleResults(false);
        setError(null);
      } else {
        // Multiple results - show as scrollable list
        updateStep("enriching", { status: "completed" });
        setSearchResults(allResults);
        setIsMultipleResults(true);
        setError(null);
      }
    } catch (error) {
      console.error('Error searching:', error);
      setError('Failed to search. Please try again.');
      setAiSteps(prev => prev.map(step => 
        step.status === "loading" ? { ...step, status: "error" as const } : step
      ));
    } finally {
      setLoading(false);
      // Auto-collapse panel after 5 seconds
      setTimeout(() => setShowAiPanel(false), 5000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 pb-24">
      {/* Share Modal */}
      {movieToShare && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setMovieToShare(null);
          }}
          movieTitle={movieToShare.title}
          movieYear={movieToShare.year}
          movieId={movieToShare.id}
        />
      )}

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <span>✨</span>
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Discover Your Next Favorite
              </span>
            </h1>
            <p className="text-gray-400 text-lg mt-2">
              Search for any movie or TV show, explore trending & popular picks, or let AI curate personalized recommendations based on your unique taste!
            </p>
          </div>
          
          {/* AI Picks Buttons */}
          {status === "authenticated" && (
            <div className="flex flex-col gap-2">
              <Button
                onClick={loadAIRecommendations}
                disabled={aiLoading}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold px-6 py-4 text-sm shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl border border-cyan-400/20"
              >
                {aiLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-bold">AI Picks - Movies</span>
                  </div>
                )}
              </Button>
              
              <Button
                onClick={loadAITvRecommendations}
                disabled={aiTvLoading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold px-6 py-4 text-sm shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl border border-purple-400/20"
              >
                {aiTvLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Tv className="w-4 h-4" />
                    <span className="font-bold">AI Picks - TV Shows</span>
                  </div>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border-cyan-400/30">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter movie name or ask a question (e.g., 'top 5 trending movies in India')..."
                className="pl-10 bg-white/5 border-white/10 text-white placeholder-gray-500 h-12 text-lg"
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold px-8 h-12"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Search
                </>
              )}
            </Button>
          </form>

          {/* Search Instructions */}
          <div className="mt-4 text-sm text-gray-400">
            <p>💡 <strong>How it works:</strong> Search for a specific movie or ask natural language questions like "top 5 trending movies" to get AI-powered recommendations!</p>
          </div>
        </CardContent>
      </Card>

      {/* AI Thinking Panel */}
      <AIThinkingPanel 
        steps={aiSteps} 
        isVisible={showAiPanel} 
        title="AI Recommendations Engine"
        persistent={true}
        onClose={() => setShowAiPanel(false)}
      />

      {/* AI Recommended Movies Section - After Generation */}
      {status === "authenticated" && !searchQuery && !searchedMovie && aiMovies.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border-purple-400/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">Curated For You</h2>
                    <p className="text-sm text-gray-400">
                      {aiMovies.length} AI-powered picks tailored to your taste
                    </p>
                  </div>
                </div>
                <Button
                  onClick={loadAIRecommendations}
                  disabled={aiLoading}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-semibold shadow-lg"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <div className="relative px-12">
                {/* Left Arrow */}
                {aiIndex > 0 && (
                  <button
                    onClick={handleAIPrev}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-purple-500/90 hover:bg-purple-400 text-white shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95"
                    aria-label="Previous movies"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}

                {/* Movies Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence mode="wait">
                    {aiMovies.slice(aiIndex, aiIndex + 3).map((movie, idx) => (
                      <motion.div
                        key={movie.id}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                      >
                        <AIMovieCard
                          movie={movie}
                          idx={idx}
                          onRate={handleRate}
                          onShare={handleShare}
                          addToWatchlist={addToWatchlist}
                          onSkip={handleSkip}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Right Arrow */}
                {aiIndex + 3 < aiMovies.length && (
                  <button
                    onClick={handleAINext}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-purple-500/90 hover:bg-purple-400 text-white shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95"
                    aria-label="Next movies"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}

                {/* Debug Info */}
                <div className="text-center mt-4 text-sm text-gray-400">
                  Showing {aiIndex + 1}-{Math.min(aiIndex + 3, aiMovies.length)} of {aiMovies.length} movies
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* AI Recommended TV Shows Section - After Generation */}
      {status === "authenticated" && !searchQuery && !searchedMovie && aiTvShows.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border-purple-400/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Tv className="w-6 h-6 text-purple-400" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">Curated TV Shows For You</h2>
                    <p className="text-sm text-gray-400">
                      {aiTvShows.length} AI-powered TV show picks tailored to your taste
                    </p>
                  </div>
                </div>
                <Button
                  onClick={loadAITvRecommendations}
                  disabled={aiTvLoading}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-semibold shadow-lg"
                >
                  <Tv className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <div className="relative px-12">
                {/* Left Arrow */}
                {aiTvIndex > 0 && (
                  <button
                    onClick={handleAITvPrev}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-purple-500/90 hover:bg-purple-400 text-white shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95"
                    aria-label="Previous TV shows"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}

                {/* TV Shows Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence mode="wait">
                    {aiTvShows.slice(aiTvIndex, aiTvIndex + 3).map((tvShow, idx) => (
                      <motion.div
                        key={tvShow.id}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                      >
                        <AITvShowCard
                          tvShow={tvShow}
                          idx={idx}
                          onRate={handleRate}
                          onShare={handleShare}
                          addToWatchlist={addToWatchlist}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Right Arrow */}
                {aiTvIndex + 3 < aiTvShows.length && (
                  <button
                    onClick={handleAITvNext}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-purple-500/90 hover:bg-purple-400 text-white shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95"
                    aria-label="Next TV shows"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}

                {/* Debug Info */}
                <div className="text-center mt-4 text-sm text-gray-400">
                  Showing {aiTvIndex + 1}-{Math.min(aiTvIndex + 3, aiTvShows.length)} of {aiTvShows.length} TV shows
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
        >
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-300">{error}</p>
        </motion.div>
      )}

      {/* Search Result - Single Movie */}
      {searchedMovie && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border-purple-400/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🎬</span>
                <div>
                  <h2 className="text-2xl font-bold text-white">Found It!</h2>
                  <p className="text-sm text-gray-400">
                    Rate the movie using the buttons below
                  </p>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="w-full max-w-sm">
                  <AIMovieCard
                    movie={searchedMovie}
                    idx={0}
                    onRate={handleRate}
                    onShare={handleShare}
                    addToWatchlist={addToWatchlist}
                    type={(searchedMovie as any).type || 'movie'}
                    onSkip={handleSkip}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Multiple Search Results (Natural Language) */}
      {isMultipleResults && searchResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border-purple-400/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🎯</span>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Found {searchResults.length} Result{searchResults.length > 1 ? 's' : ''} for You!
                  </h2>
                  <p className="text-sm text-gray-400">
                    AI-powered search results based on your query
                  </p>
                </div>
              </div>

              {/* Show all results if 3 or less, otherwise show with arrow navigation */}
              {searchResults.length <= 3 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout">
                    {searchResults.map((movie, idx) => (
                      <AIMovieCard
                        key={movie.id}
                        movie={movie}
                        idx={idx}
                        onRate={handleRate}
                        onShare={handleShare}
                        addToWatchlist={handleAddToWatchlist}
                        type={(movie as any).type || 'movie'}
                        onSkip={handleSkip}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="relative px-12">
                  {/* Left Arrow */}
                  {searchIndex > 0 && (
                    <button
                      onClick={handleSearchPrev}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-purple-500/90 hover:bg-purple-400 text-white shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95"
                      aria-label="Previous results"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                  )}

                  {/* Results Grid - Show 3 at a time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="wait">
                      {searchResults.slice(searchIndex, searchIndex + 3).map((movie, idx) => (
                        <motion.div
                          key={movie.id}
                          initial={{ opacity: 0, x: 50 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -50 }}
                          transition={{ duration: 0.3, delay: idx * 0.05 }}
                        >
                          <AIMovieCard
                            movie={movie}
                            idx={idx}
                            onRate={handleRate}
                            onShare={handleShare}
                            addToWatchlist={handleAddToWatchlist}
                            type={(movie as any).type || 'movie'}
                            onSkip={handleSkip}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Right Arrow */}
                  {searchIndex + 3 < searchResults.length && (
                    <button
                      onClick={handleSearchNext}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-purple-500/90 hover:bg-purple-400 text-white shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95"
                      aria-label="Next results"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  )}

                  {/* Debug Info */}
                  <div className="text-center mt-4 text-sm text-gray-400">
                    Showing {searchIndex + 1}-{Math.min(searchIndex + 3, searchResults.length)} of {searchResults.length} results
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Trending Section */}
      <Card className="bg-gradient-to-br from-cyan-500/5 to-blue-500/5 backdrop-blur-sm border-cyan-400/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
              <div>
                <h2 className="text-2xl font-bold text-white">Trending</h2>
                <p className="text-sm text-gray-400">
                  What everyone's watching right now
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={trendingWindow === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => loadTrendingMovies('day')}
                disabled={trendingLoading}
                className={trendingWindow === 'day' ? 'bg-cyan-500 hover:bg-cyan-400' : 'border-white/20 text-white hover:bg-white/10'}
              >
                Today
              </Button>
              <Button
                variant={trendingWindow === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => loadTrendingMovies('week')}
                disabled={trendingLoading}
                className={trendingWindow === 'week' ? 'bg-cyan-500 hover:bg-cyan-400' : 'border-white/20 text-white hover:bg-white/10'}
              >
                This Week
              </Button>
            </div>
          </div>

          {trendingLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : trendingMovies.length > 0 ? (
            <div className="relative px-12">
              {/* Left Arrow */}
              {trendingIndex > 0 && (
                <button
                  onClick={handleTrendingPrev}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-cyan-500/90 hover:bg-cyan-400 text-white shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95"
                  aria-label="Previous movies"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Movies Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="wait">
                  {trendingMovies.slice(trendingIndex, trendingIndex + 3).map((movie, idx) => (
                    <motion.div
                      key={movie.id}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                    >
                      <AIMovieCard
                        movie={movie}
                        idx={idx}
                        onRate={handleRate}
                        onShare={handleShare}
                        addToWatchlist={addToWatchlist}
                        onSkip={handleSkip}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Right Arrow */}
              {trendingIndex + 3 < trendingMovies.length && (
                <button
                  onClick={handleTrendingNext}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-cyan-500/90 hover:bg-cyan-400 text-white shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95"
                  aria-label="Next movies"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

              {/* Debug Info */}
              <div className="text-center mt-4 text-sm text-gray-400">
                Showing {trendingIndex + 1}-{Math.min(trendingIndex + 4, trendingMovies.length)} of {trendingMovies.length} movies
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* What's Popular Section */}
      <Card className="bg-gradient-to-br from-orange-500/5 to-red-500/5 backdrop-blur-sm border-orange-400/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Flame className="w-6 h-6 text-orange-400" />
              <div>
                <h2 className="text-2xl font-bold text-white">What's Popular</h2>
                <p className="text-sm text-gray-400">
                  Popular movies across different platforms
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <Button
                variant={popularCategory === 'streaming' ? 'default' : 'outline'}
                size="sm"
                onClick={() => loadPopularMovies('streaming')}
                disabled={popularLoading}
                className={popularCategory === 'streaming' ? 'bg-orange-500 hover:bg-orange-400' : 'border-white/20 text-white hover:bg-white/10'}
              >
                Streaming
              </Button>
              <Button
                variant={popularCategory === 'on_tv' ? 'default' : 'outline'}
                size="sm"
                onClick={() => loadPopularMovies('on_tv')}
                disabled={popularLoading}
                className={popularCategory === 'on_tv' ? 'bg-orange-500 hover:bg-orange-400' : 'border-white/20 text-white hover:bg-white/10'}
              >
                On TV
              </Button>
              <Button
                variant={popularCategory === 'for_rent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => loadPopularMovies('for_rent')}
                disabled={popularLoading}
                className={popularCategory === 'for_rent' ? 'bg-orange-500 hover:bg-orange-400' : 'border-white/20 text-white hover:bg-white/10'}
              >
                For Rent
              </Button>
              <Button
                variant={popularCategory === 'in_theaters' ? 'default' : 'outline'}
                size="sm"
                onClick={() => loadPopularMovies('in_theaters')}
                disabled={popularLoading}
                className={popularCategory === 'in_theaters' ? 'bg-orange-500 hover:bg-orange-400' : 'border-white/20 text-white hover:bg-white/10'}
              >
                In Theaters
              </Button>
            </div>
          </div>

          {popularLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
            </div>
          ) : popularMovies.length > 0 ? (
            <div className="relative px-12">
              {/* Left Arrow */}
              {popularIndex > 0 && (
                <button
                  onClick={handlePopularPrev}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-orange-500/90 hover:bg-orange-400 text-white shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95"
                  aria-label="Previous movies"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Movies Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="wait">
                  {popularMovies.slice(popularIndex, popularIndex + 3).map((movie, idx) => (
                    <motion.div
                      key={movie.id}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                    >
                      <AIMovieCard
                        movie={movie}
                        idx={idx}
                        onRate={handleRate}
                        onShare={handleShare}
                        addToWatchlist={addToWatchlist}
                        onSkip={handleSkip}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Right Arrow */}
              {popularIndex + 3 < popularMovies.length && (
                <button
                  onClick={handlePopularNext}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-orange-500/90 hover:bg-orange-400 text-white shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95"
                  aria-label="Next movies"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

              {/* Debug Info */}
              <div className="text-center mt-4 text-sm text-gray-400">
                Showing {popularIndex + 1}-{Math.min(popularIndex + 4, popularMovies.length)} of {popularMovies.length} movies
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

    </div>
  );
}

// AIMovieCard component - inline rating like Home page
function AIMovieCard({
  movie,
  idx,
  onRate,
  onShare,
  addToWatchlist,
  type,
  onSkip,
}: {
  movie: Movie;
  idx: number;
  onRate: (movieId: number, rating: Rating) => void;
  onShare: (movie: Movie) => void;
  addToWatchlist: (movie: Movie) => void;
  type?: 'movie' | 'tvshow';
  onSkip?: (movie: Movie) => void;
}) {
  const [showRatingOptions, setShowRatingOptions] = useState(false);

  const handleRate = (rating: Rating) => {
    onRate(movie.id, rating);
    setShowRatingOptions(false);
  };

  // Enrich movie with type if provided
  const enrichedMovie = {
    ...movie,
    type: type || (movie as any).type,
    mediaType: type === 'tvshow' ? 'tv' : type === 'movie' ? 'movie' : (movie as any).mediaType
  };

  return (
    <motion.div
      key={movie.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      transition={{ delay: Math.min(idx * 0.03, 0.5) }}
      className="space-y-3"
    >
      <div className="relative">
        <MovieCard movie={enrichedMovie} showActions={false} />
        
        {/* Badge is now handled inside MovieCard */}
        
        {/* Skip/Close button - Top Right Corner */}
        {onSkip && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSkip(movie);
            }}
            className="absolute top-2 right-2 z-30 p-1.5 rounded-full bg-black/70 backdrop-blur-sm border border-white/30 hover:scale-110 hover:bg-red-500/90 transition-all duration-200 shadow-lg"
            title="Skip this movie"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}
        
        {/* Action buttons at bottom of poster */}
        <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 px-3 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToWatchlist(movie);
            }}
            className="p-2 rounded-full bg-black/70 backdrop-blur-sm border border-white/30 hover:scale-110 hover:bg-red-500/90 transition-all duration-200 shadow-lg"
            title="Add to Watchlist"
          >
            <Heart className="w-4 h-4 text-white fill-white" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(movie);
            }}
            className="p-2 rounded-full bg-black/70 backdrop-blur-sm border border-white/30 hover:scale-110 hover:bg-cyan-500/90 transition-all duration-200 shadow-lg"
            title="Share with Friends"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
      
      {/* Facebook-style Rate Buttons */}
      <div className="relative flex justify-center gap-2 pt-2">
        <div className="relative">
          <button
            onClick={() => setShowRatingOptions(!showRatingOptions)}
            className="group relative px-5 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-400/40 hover:border-purple-300/50 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-purple-300 group-hover:text-purple-200 transition-colors" />
              <span className="text-sm font-semibold text-white">Rate</span>
            </div>
          </button>

          {/* Facebook-style popup with rating options */}
          <AnimatePresence>
            {showRatingOptions && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"
              >
                <div className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-2 flex gap-1">
                  {/* Awful */}
                  <button
                    onClick={() => handleRate("awful")}
                    className="group flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-rose-500/20 transition-all"
                    title="Awful"
                  >
                    <span className="text-2xl group-hover:scale-125 transition-transform">😖</span>
                    <span className="text-[10px] text-gray-300 group-hover:text-white font-medium">Awful</span>
                  </button>

                  {/* Meh */}
                  <button
                    onClick={() => handleRate("meh")}
                    className="group flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-amber-500/20 transition-all"
                    title="Meh"
                  >
                    <span className="text-2xl group-hover:scale-125 transition-transform">😐</span>
                    <span className="text-[10px] text-gray-300 group-hover:text-white font-medium">Meh</span>
                  </button>

                  {/* Good */}
                  <button
                    onClick={() => handleRate("good")}
                    className="group flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-sky-500/20 transition-all"
                    title="Good"
                  >
                    <span className="text-2xl group-hover:scale-125 transition-transform">😊</span>
                    <span className="text-[10px] text-gray-300 group-hover:text-white font-medium">Good</span>
                  </button>

                  {/* Amazing */}
                  <button
                    onClick={() => handleRate("amazing")}
                    className="group flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-emerald-500/20 transition-all"
                    title="Amazing"
                  >
                    <span className="text-2xl group-hover:scale-125 transition-transform">🤩</span>
                    <span className="text-[10px] text-gray-300 group-hover:text-white font-medium">Amazing</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Not Interested Button */}
        <button
          onClick={() => handleRate("not-interested")}
          className="px-5 py-2 rounded-lg bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/40 hover:border-gray-400/50 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-gray-300" />
            <span className="text-sm font-semibold text-gray-300">Not Interested</span>
          </div>
        </button>
      </div>
    </motion.div>
  );
}

// AITvShowCard component - for TV shows
function AITvShowCard({
  tvShow,
  idx,
  onRate,
  onShare,
  addToWatchlist,
}: {
  tvShow: TvShow;
  idx: number;
  onRate: (tvShowId: number, rating: Rating) => void;
  onShare: (tvShow: any) => void;
  addToWatchlist: (tvShow: any) => void;
}) {
  const [showRatingOptions, setShowRatingOptions] = useState(false);

  const handleRate = (rating: Rating) => {
    onRate(tvShow.id, rating);
    setShowRatingOptions(false);
  };

  // Enrich TV show with type
  const enrichedTvShow = {
    ...tvShow,
    type: 'tvshow' as const,
    mediaType: 'tv' as const
  };

  return (
    <motion.div
      key={tvShow.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      transition={{ delay: Math.min(idx * 0.03, 0.5) }}
      className="space-y-3"
    >
      <div className="relative">
        {/* Use MovieCard but pass TV show as movie (they have compatible structure) */}
        <MovieCard movie={enrichedTvShow as any} showActions={false} />
        
        {/* Badge is now handled inside MovieCard */}
        
        {/* Seasons info - Below Match Percentage on Right */}
        {tvShow.numberOfSeasons && (
          <div className="absolute top-11 right-3 z-20 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm border border-white/30">
            <span className="text-xs font-semibold text-white">
              {tvShow.numberOfSeasons} Season{tvShow.numberOfSeasons > 1 ? 's' : ''}
            </span>
          </div>
        )}
        
        {/* Action buttons at bottom of poster */}
        <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 px-3 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToWatchlist(tvShow);
            }}
            className="p-2 rounded-full bg-black/70 backdrop-blur-sm border border-white/30 hover:scale-110 hover:bg-red-500/90 transition-all duration-200 shadow-lg"
            title="Add to Watchlist"
          >
            <Heart className="w-4 h-4 text-white fill-white" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(tvShow);
            }}
            className="p-2 rounded-full bg-black/70 backdrop-blur-sm border border-white/30 hover:scale-110 hover:bg-cyan-500/90 transition-all duration-200 shadow-lg"
            title="Share with Friends"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
      
      {/* Facebook-style Rate Buttons */}
      <div className="relative flex justify-center gap-2 pt-2">
        <div className="relative">
          <button
            onClick={() => setShowRatingOptions(!showRatingOptions)}
            className="group relative px-5 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-400/40 hover:border-purple-300/50 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-purple-300 group-hover:text-purple-200 transition-colors" />
              <span className="text-sm font-semibold text-white">Rate</span>
            </div>
          </button>

          {/* Facebook-style popup with rating options */}
          <AnimatePresence>
            {showRatingOptions && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"
              >
                <div className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-2 flex gap-1">
                  {/* Awful */}
                  <button
                    onClick={() => handleRate("awful")}
                    className="group flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-rose-500/20 transition-all"
                    title="Awful"
                  >
                    <span className="text-2xl group-hover:scale-125 transition-transform">😖</span>
                    <span className="text-[10px] text-gray-300 group-hover:text-white font-medium">Awful</span>
                  </button>

                  {/* Meh */}
                  <button
                    onClick={() => handleRate("meh")}
                    className="group flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-amber-500/20 transition-all"
                    title="Meh"
                  >
                    <span className="text-2xl group-hover:scale-125 transition-transform">😐</span>
                    <span className="text-[10px] text-gray-300 group-hover:text-white font-medium">Meh</span>
                  </button>

                  {/* Good */}
                  <button
                    onClick={() => handleRate("good")}
                    className="group flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-sky-500/20 transition-all"
                    title="Good"
                  >
                    <span className="text-2xl group-hover:scale-125 transition-transform">😊</span>
                    <span className="text-[10px] text-gray-300 group-hover:text-white font-medium">Good</span>
                  </button>

                  {/* Amazing */}
                  <button
                    onClick={() => handleRate("amazing")}
                    className="group flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-emerald-500/20 transition-all"
                    title="Amazing"
                  >
                    <span className="text-2xl group-hover:scale-125 transition-transform">🤩</span>
                    <span className="text-[10px] text-gray-300 group-hover:text-white font-medium">Amazing</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Not Interested Button */}
        <button
          onClick={() => handleRate("not-interested")}
          className="px-5 py-2 rounded-lg bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/40 hover:border-gray-400/50 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-gray-300" />
            <span className="text-sm font-semibold text-gray-300">Not Interested</span>
          </div>
        </button>
      </div>
    </motion.div>
  );
}
