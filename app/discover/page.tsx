"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MovieCard } from "@/components/MovieCard";
import { MovieMeta } from "@/components/MovieMeta";
import { RatingPills } from "@/components/RatingPills";
import { ShareModal } from "@/components/ShareModal";
import { AuthModal } from "@/components/AuthModal";
import { Movie } from "@/lib/data";
import { useAppStore, Rating } from "@/lib/store";
import { Send, Heart, Sparkles, Loader2, X, TrendingUp, Flame, Star, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

type TimeWindow = 'day' | 'week';
type PopularCategory = 'streaming' | 'on_tv' | 'for_rent' | 'in_theaters';

export default function DiscoverPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search");
  
  // AI Recommendations (Top Section)
  const [aiMovies, setAiMovies] = useState<Movie[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRatingsCount, setAiRatingsCount] = useState(0);
  const [aiInitialized, setAiInitialized] = useState(false);
  
  // Trending Section
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [trendingWindow, setTrendingWindow] = useState<TimeWindow>('day');
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingVisible, setTrendingVisible] = useState(false);
  
  // Popular Section
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [popularCategory, setPopularCategory] = useState<PopularCategory>('streaming');
  const [popularLoading, setPopularLoading] = useState(false);
  const [popularVisible, setPopularVisible] = useState(false);
  
  // Search
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Preview (unauthenticated)
  const [previewMovies, setPreviewMovies] = useState<Movie[]>([]);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewIndex, setPreviewIndex] = useState(0);
  
  // UI State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [movieToShare, setMovieToShare] = useState<Movie | null>(null);
  const [aiSearching, setAiSearching] = useState(false);

  // Refs for lazy loading
  const trendingRef = useRef<HTMLDivElement>(null);
  const popularRef = useRef<HTMLDivElement>(null);

  const { rateMovie, addToWatchlist } = useAppStore();

  // Load preview movies for unauthenticated users
  useEffect(() => {
    if (status === "unauthenticated") {
      loadPreviewMovies();
    }
  }, [status]);

  // Auto-generate AI recommendations on load (6 movies)
  useEffect(() => {
    if (status === "authenticated" && !searchQuery && !aiInitialized) {
      setAiInitialized(true);
      loadInitialAIRecommendations();
    }
  }, [status, searchQuery, aiInitialized]);

  // Lazy load trending movies when they come into view
  useEffect(() => {
    if (status !== "authenticated" || searchQuery) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !trendingVisible) {
            setTrendingVisible(true);
            loadTrendingMovies('day');
          }
        });
      },
      { rootMargin: '200px' }
    );

    if (trendingRef.current) {
      observer.observe(trendingRef.current);
    }

    return () => observer.disconnect();
  }, [status, searchQuery, trendingVisible]);

  // Lazy load popular movies when they come into view
  useEffect(() => {
    if (status !== "authenticated" || searchQuery) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !popularVisible) {
            setPopularVisible(true);
            loadPopularMovies('streaming');
          }
        });
      },
      { rootMargin: '200px' }
    );

    if (popularRef.current) {
      observer.observe(popularRef.current);
    }

    return () => observer.disconnect();
  }, [status, searchQuery, popularVisible]);

  // Handle search query changes
  useEffect(() => {
    if (status === "authenticated" && searchQuery) {
      performDatabaseSearch(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [status, searchQuery]);

  const loadPreviewMovies = async () => {
    setPreviewLoading(true);
    try {
      const response = await fetch('/api/preview-movies');
      if (response.ok) {
        const data = await response.json();
        // Load 12 movies (3 pages of 4)
        setPreviewMovies((data.movies || []).slice(0, 12));
      }
    } catch (error) {
      console.error('Failed to load preview movies:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Navigation functions for preview movies
  const handlePreviewPrev = () => {
    setPreviewIndex(prev => Math.max(0, prev - 4));
  };

  const handlePreviewNext = () => {
    setPreviewIndex(prev => Math.min(previewMovies.length - 4, prev + 4));
  };

  const loadInitialAIRecommendations = async () => {
    setAiLoading(true);
    try {
      const response = await fetch('/api/search/smart-picks?count=6', {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        setAiMovies(data.movies || []);
      } else {
        console.error('Failed to load AI recommendations');
      }
    } catch (error) {
      console.error('Error loading AI recommendations:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const loadSingleAIRecommendation = async () => {
    try {
      const response = await fetch('/api/recommendations/single', {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.movie) {
          // Add new movie to the end
          setAiMovies((prev) => [...prev, data.movie]);
        }
      } else {
        console.error('Failed to load single recommendation');
      }
    } catch (error) {
      console.error('Error loading single recommendation:', error);
    }
  };

  const loadAIRecommendations = async () => {
    setAiLoading(true);
    try {
      const response = await fetch('/api/search/smart-picks', {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        setAiMovies(data.movies || []);
      }
    } catch (error) {
      console.error('Failed to load AI recommendations:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const loadTrendingMovies = async (window: TimeWindow) => {
    setTrendingLoading(true);
    setTrendingWindow(window);
    try {
      const response = await fetch(`/api/tmdb/trending?timeWindow=${window}`);
      if (response.ok) {
        const data = await response.json();
        // Limit to 8 movies
        setTrendingMovies((data.movies || []).slice(0, 8));
      }
    } catch (error) {
      console.error('Failed to load trending movies:', error);
    } finally {
      setTrendingLoading(false);
    }
  };

  const loadPopularMovies = async (category: PopularCategory) => {
    setPopularLoading(true);
    setPopularCategory(category);
    try {
      const response = await fetch(`/api/tmdb/popular?category=${category}`);
      if (response.ok) {
        const data = await response.json();
        // Limit to 8 movies
        setPopularMovies((data.movies || []).slice(0, 8));
      }
    } catch (error) {
      console.error('Failed to load popular movies:', error);
    } finally {
      setPopularLoading(false);
    }
  };

  const performDatabaseSearch = async (query: string) => {
    setSearchLoading(true);
    try {
      // Detect if it's a sentence (natural language) or single movie name
      const wordCount = query.trim().split(/\s+/).length;
      const isSentence = wordCount > 3 || query.includes('?') || query.includes('like') || query.includes('similar') || query.includes('recommend');
      
      if (isSentence) {
        // Process via Perplexity for natural language queries
        const response = await fetch('/api/search/smart-picks?count=6', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.movies || []);
        }
      } else {
        // Single movie search - use existing Local DB → TMDB → Perplexity flow
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.movies || []);
        }
      }
    } catch (error) {
      console.error('Failed to search:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleRate = async (movieId: number, rating: Rating) => {
    const movie = [...aiMovies, ...trendingMovies, ...popularMovies, ...searchResults].find(m => m.id === movieId);
    if (!movie) return;

    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieId: movie.id,
          movieTitle: movie.title,
          movieYear: movie.year,
          rating,
        }),
      });

      if (response.ok) {
        rateMovie(movie, rating);
        
        // Check if this is an AI recommendation movie
        const isAIMovie = aiMovies.some(m => m.id === movieId);
        
        // Remove from lists
        setAiMovies(prev => prev.filter(m => m.id !== movieId));
        setTrendingMovies(prev => prev.filter(m => m.id !== movieId));
        setPopularMovies(prev => prev.filter(m => m.id !== movieId));
        setSearchResults(prev => prev.filter(m => m.id !== movieId));
        
        // If it's an AI movie, implement sliding window logic
        if (isAIMovie) {
          // Increment ratings count
          const newCount = aiRatingsCount + 1;
          setAiRatingsCount(newCount);
          
          // After every 3 ratings, auto-generate 1 new movie
          if (newCount % 3 === 0) {
            console.log('Auto-generating new movie after 3 ratings...');
            loadSingleAIRecommendation();
          }
        }
      }
    } catch (error) {
      console.error('Failed to save rating:', error);
    }
  };

  const handleShare = (movie: Movie) => {
    setMovieToShare(movie);
    setShareModalOpen(true);
  };

  const handleAISearch = async (query: string) => {
    setAiSearching(true);
    await performDatabaseSearch(query);
    setAiSearching(false);
  };

  // Show login/signup if not authenticated
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="space-y-6">
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

        {/* Header with CTA */}
        <div className="space-y-4 text-center">
          <h1 className="text-5xl font-bold text-white flex items-center justify-center gap-3">
            <span className="text-4xl">🎬</span>
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Discover & Rate Movies
            </span>
          </h1>
          <p className="text-xl text-gray-400">
            Personalized recommendations powered by AI
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link href="/login">
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold px-8 py-6 text-lg">
                Log In
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="outline" className="border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 font-semibold px-8 py-6 text-lg">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>

        {/* Preview Movies */}
        {previewLoading ? (
          <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border-cyan-400/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto" />
                  <p className="text-gray-400">Loading amazing movies...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : previewMovies.length > 0 ? (
          <Card className="bg-gradient-to-br from-cyan-500/5 to-blue-500/5 backdrop-blur-sm border-cyan-400/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-cyan-400" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">Popular Movies</h2>
                    <p className="text-sm text-gray-400">
                      Click any movie to rate and get personalized recommendations
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative px-12">
                {/* Left Arrow */}
                {previewIndex > 0 && (
                  <button
                    onClick={handlePreviewPrev}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-cyan-500/90 hover:bg-cyan-400 text-white shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95"
                    aria-label="Previous movies"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}

                {/* Movies Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <AnimatePresence mode="wait">
                    {previewMovies.slice(previewIndex, previewIndex + 4).map((movie, idx) => (
                      <motion.div
                        key={movie.id}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                        className="group/movie space-y-3 cursor-pointer"
                        onClick={() => setAuthModalOpen(true)}
                      >
                        <div className="relative">
                          <MovieCard movie={movie} showActions={false} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/movie:opacity-100 transition-opacity duration-200 flex items-end justify-center p-4 rounded-2xl">
                            <div className="text-center bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-lg font-semibold text-sm">
                              Click to Rate & Get Recommendations
                            </div>
                          </div>
                        </div>
                        <MovieMeta movie={movie} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Right Arrow */}
                {previewIndex + 4 < previewMovies.length && (
                  <button
                    onClick={handlePreviewNext}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-cyan-500/90 hover:bg-cyan-400 text-white shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95"
                    aria-label="Next movies"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}

                {/* Debug Info */}
                <div className="text-center mt-4 text-sm text-gray-400">
                  Showing {previewIndex + 1}-{Math.min(previewIndex + 4, previewMovies.length)} of {previewMovies.length} movies
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="mt-8 p-6 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-400/30 rounded-xl text-center">
                <h3 className="text-xl font-bold text-white mb-2">
                  Want to see your personalized recommendations?
                </h3>
                <p className="text-gray-400 mb-4">
                  Sign up now to rate movies and get AI-powered suggestions just for you
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link href="/signup">
                    <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold px-8 py-4">
                      Get Started Free
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" className="border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 font-semibold px-8 py-4">
                      Log In
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

  // Authenticated user view
  return (
    <div className="space-y-8">
      {/* Share Modal */}
      {movieToShare && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setMovieToShare(null);
          }}
          movieTitle={movieToShare.title}
          movieYear={movieToShare.year || 0}
          movieId={movieToShare.id}
        />
      )}

      {/* AIBot removed - functionality merged into search */}

      {/* Header */}
      <div className="space-y-4">
        {searchQuery ? (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <span>🔍</span>
                <span>Search Results for "{searchQuery}"</span>
              </h1>
              <p className="text-gray-400 mt-1">
                {searchLoading ? "Searching..." : `${searchResults.length} movie${searchResults.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
            <Button
              onClick={() => window.location.href = '/discover'}
              variant="outline"
              className="border-white/10 text-white hover:bg-white/10"
            >
              <X className="w-4 h-4 mr-2" />
              Clear Search
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-5xl font-bold text-white flex items-center gap-3">
              <span className="text-4xl">🎬</span>
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Discover & Rate Movies
              </span>
            </h1>
            <p className="text-xl text-gray-400">
              Personalized recommendations powered by AI
            </p>
          </>
        )}
      </div>

      {/* Search Results */}
      {searchQuery && (
        <MovieSection
          title="Search Results"
          movies={searchResults}
          loading={searchLoading}
          icon={<span>🔍</span>}
          onRate={handleRate}
          onShare={handleShare}
          addToWatchlist={addToWatchlist}
        />
      )}

      {/* AI Recommendations Section (Top) */}
      {!searchQuery && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border-purple-400/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-purple-400" />
                <div>
                  <h2 className="text-2xl font-bold text-white">AI Recommendations For You</h2>
                  <p className="text-sm text-gray-400">
                    {aiLoading ? 'Generating personalized picks...' : `${aiMovies.length} movies curated just for you`}
                  </p>
                </div>
              </div>
              {aiMovies.length > 0 && !aiLoading && (
                <Button
                  onClick={() => {
                    setAiMovies([]); // Clear existing movies
                    loadInitialAIRecommendations(); // Load 6 new ones
                  }}
                  disabled={aiLoading}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-semibold shadow-lg"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate More
                </Button>
              )}
            </div>

            {aiLoading && aiMovies.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              </div>
            ) : aiMovies.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {aiMovies.map((movie, idx) => (
                    <AIMovieCard
                      key={movie.id}
                      movie={movie}
                      idx={idx}
                      onRate={handleRate}
                      onShare={handleShare}
                      addToWatchlist={addToWatchlist}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* What's Popular Section - Moved above Trending */}
      {!searchQuery && (
        <div ref={popularRef}>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence mode="popLayout">
                  {popularMovies.map((movie, idx) => (
                    <MovieCardWithActions
                      key={movie.id}
                      movie={movie}
                      idx={idx}
                      onRate={handleRate}
                      onShare={handleShare}
                      addToWatchlist={addToWatchlist}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : null}
          </CardContent>
        </Card>
        </div>
      )}

      {/* Trending Section - Moved below Popular */}
      {!searchQuery && (
        <div ref={trendingRef}>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence mode="popLayout">
                  {trendingMovies.map((movie, idx) => (
                    <MovieCardWithActions
                      key={movie.id}
                      movie={movie}
                      idx={idx}
                      onRate={handleRate}
                      onShare={handleShare}
                      addToWatchlist={addToWatchlist}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : null}
          </CardContent>
        </Card>
        </div>
      )}
    </div>
  );
}

// Helper component for AI recommendation movie cards - inline rating like Facebook
function AIMovieCard({
  movie,
  idx,
  onRate,
  onShare,
  addToWatchlist,
}: {
  movie: Movie;
  idx: number;
  onRate: (movieId: number, rating: Rating) => void;
  onShare: (movie: Movie) => void;
  addToWatchlist: (movie: Movie) => void;
}) {
  const [showRatingOptions, setShowRatingOptions] = useState(false);

  const handleRate = (rating: Rating) => {
    onRate(movie.id, rating);
    setShowRatingOptions(false);
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
        <MovieCard movie={movie} showActions={false} />
        
        {/* Action buttons at bottom of poster, above title */}
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

// Helper component for movie card with actions (Trending/Popular)
function MovieCardWithActions({
  movie,
  idx,
  onRate,
  onShare,
  addToWatchlist,
}: {
  movie: Movie;
  idx: number;
  onRate: (movieId: number, rating: Rating) => void;
  onShare: (movie: Movie) => void;
  addToWatchlist: (movie: Movie) => void;
}) {
  return (
    <motion.div
      key={movie.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      transition={{ delay: Math.min(idx * 0.03, 0.5) }}
      className="group/movie space-y-3"
    >
      <div className="relative">
        <MovieCard movie={movie} showActions={false} />
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            addToWatchlist(movie);
          }}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 opacity-0 group-hover/movie:opacity-100 hover:scale-110 hover:bg-red-500/80 transition-all duration-200"
        >
          <Heart className="w-5 h-5 text-white fill-white" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare(movie);
          }}
          className="absolute top-3 left-3 z-20 p-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 opacity-0 group-hover/movie:opacity-100 hover:scale-110 hover:bg-cyan-500/80 transition-all duration-200"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
        
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover/movie:opacity-100 transition-opacity duration-200 flex items-center justify-center p-4 rounded-2xl">
          <RatingPills
            onRate={(rating) => onRate(movie.id, rating)}
            movieId={movie.id}
          />
        </div>
      </div>
    </motion.div>
  );
}

// Helper component for movie sections
function MovieSection({
  title,
  movies,
  loading,
  icon,
  onRate,
  onShare,
  addToWatchlist,
}: {
  title: string;
  movies: Movie[];
  loading: boolean;
  icon: React.ReactNode;
  onRate: (movieId: number, rating: Rating) => void;
  onShare: (movie: Movie) => void;
  addToWatchlist: (movie: Movie) => void;
}) {
  return (
    <Card className="bg-gradient-to-br from-cyan-500/5 to-blue-500/5 backdrop-blur-sm border-cyan-400/20">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-6">
          {icon}
          <div>
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <p className="text-sm text-gray-400">
              {movies.length} movie{movies.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : movies.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {movies.map((movie, idx) => (
                <MovieCardWithActions
                  key={movie.id}
                  movie={movie}
                  idx={idx}
                  onRate={onRate}
                  onShare={onShare}
                  addToWatchlist={addToWatchlist}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            No movies found
          </div>
        )}
      </CardContent>
    </Card>
  );
}
