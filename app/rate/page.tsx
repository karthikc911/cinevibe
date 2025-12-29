"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MovieCard } from "@/components/MovieCard";
import { RatingPills } from "@/components/RatingPills";
import { Movie, TvShow } from "@/lib/data";
import { useAppStore, Rating } from "@/lib/store";
import { Loader2, Sparkles, ChevronLeft, Heart, X, ThumbsUp, Tv, List } from "lucide-react";
import Link from "next/link";

export default function RatePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  // Movies state
  const [movies, setMovies] = useState<Movie[]>([]);
  const [previousMovies, setPreviousMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  
  // TV Shows state
  const [tvShows, setTvShows] = useState<TvShow[]>([]);
  const [previousTvShows, setPreviousTvShows] = useState<TvShow[]>([]);
  const [tvLoading, setTvLoading] = useState(false);
  
  // UI state
  const [isMobile, setIsMobile] = useState(false);
  const [showNav, setShowNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { rateMovie, addToWatchlist } = useAppStore();
  
  // Track initial load attempts
  const hasLoadedMovies = useRef(false);
  const hasLoadedTvShows = useRef(false);
  
  // Always initialize motion hooks (even if not used) to comply with Rules of Hooks
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-25, 0, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  
  // Swipe indicator opacities - must be declared at top level even if only used on mobile
  const leftSwipeOpacity = useTransform(x, [-200, -50, 0], [1, 0.5, 0]);
  const rightSwipeOpacity = useTransform(x, [0, 50, 200], [0, 0.5, 1]);

  // Detect mobile - initialize on mount
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    
    // Check immediately on mount
    checkMobile();
    
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle scroll to show/hide nav on mobile
  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down - hide nav
        setShowNav(false);
      } else {
        // Scrolling up - show nav
        setShowNav(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile, lastScrollY]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Debug: Track TV shows state changes
  useEffect(() => {
    console.log('📊 TV Shows State Changed:', {
      count: tvShows.length,
      loading: tvLoading,
      hasFirst: !!tvShows[0],
      shouldShowCard: tvShows.length > 0 && tvShows[0],
      shouldShowButton: !tvLoading && tvShows.length === 0,
      shouldShowLoading: tvLoading && tvShows.length === 0
    });
  }, [tvShows, tvLoading]);

  // Auto-load movies and TV shows on mount
  useEffect(() => {
    console.log('🔍 Rate Page useEffect - Status:', status, 'Movies:', movies.length, 'TV Shows:', tvShows.length);
    console.log('🔍 Refs - hasLoadedMovies:', hasLoadedMovies.current, 'hasLoadedTvShows:', hasLoadedTvShows.current);
    console.log('🔍 Loading states - moviesLoading:', loading, 'tvLoading:', tvLoading);
    
    if (status === "authenticated") {
      // Load movies if not already loaded and not currently loading
      if (movies.length === 0 && !hasLoadedMovies.current && !loading) {
        console.log('🎬 Auto-loading movies...');
        hasLoadedMovies.current = true;
        loadMovies();
      }
      
      // Load TV shows if not already loaded and not currently loading
      if (tvShows.length === 0 && !hasLoadedTvShows.current && !tvLoading) {
        console.log('📺 Auto-loading TV shows...');
        hasLoadedTvShows.current = true;
        loadTvShows();
      }
    }
  }, [status, movies.length, tvShows.length, loading, tvLoading]);

  const loadMovies = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/random-movies", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        const newMovies = data.movies || [];

        // Deduplicate by ID
        const uniqueMap = new Map();
        newMovies.forEach((movie: any) => {
          if (!uniqueMap.has(movie.id)) {
            uniqueMap.set(movie.id, movie);
          }
        });

        const uniqueMovies = Array.from(uniqueMap.values());
        
        // Auto-fix missing posters
        for (const movie of uniqueMovies) {
          if (!movie.poster || movie.poster === '') {
            try {
              const fixResponse = await fetch(`/api/movies/${movie.id}/fix-poster`, {
                method: "POST",
              });
              if (fixResponse.ok) {
                const fixedData = await fixResponse.json();
                if (fixedData.poster) {
                  movie.poster = fixedData.poster;
                }
              }
            } catch (error) {
              console.error(`Failed to fix poster for movie ${movie.id}:`, error);
            }
          }
        }

        setMovies(uniqueMovies);
      }
    } catch (error) {
      console.error("Failed to load movies for rating:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTvShows = async () => {
    console.log('📺 loadTvShows() called - Starting fetch...');
    setTvLoading(true);
    let success = false;
    
    try {
      const response = await fetch("/api/search/smart-picks-tvshows?count=10", {
        method: "POST",
      });

      console.log('📺 API Response received:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📺 Response data:', data);
        
        const newTvShows = data.tvShows || [];
        console.log('📺 Extracted TV shows array:', {
          length: newTvShows.length,
          isArray: Array.isArray(newTvShows)
        });

        if (newTvShows.length > 0) {
          console.log('📺 TV Shows details:');
          newTvShows.forEach((show: any, idx: number) => {
            console.log(`  ${idx + 1}. ${show.name || show.title} (ID: ${show.id}) - Poster: ${show.poster?.substring(0, 50)}...`);
          });

          // Deduplicate by ID
          const uniqueMap = new Map();
          newTvShows.forEach((show: any) => {
            if (!uniqueMap.has(show.id)) {
              uniqueMap.set(show.id, show);
            }
          });

          const uniqueTvShows = Array.from(uniqueMap.values());
          
          console.log('📺 Setting TV shows state with', uniqueTvShows.length, 'unique shows');
          setTvShows(uniqueTvShows);
          console.log('📺 ✅ TV shows state updated successfully');
          success = true;
        } else {
          console.warn('📺 ⚠️ No TV shows returned from API - resetting hasLoadedTvShows');
          hasLoadedTvShows.current = false; // Reset so it can be retried
        }
      } else {
        console.error('📺 ❌ API request failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('📺 Error response:', errorText);
        hasLoadedTvShows.current = false; // Reset so it can be retried
      }
    } catch (error) {
      console.error("📺 ❌ Exception in loadTvShows:", error);
      hasLoadedTvShows.current = false; // Reset so it can be retried
    } finally {
      console.log('📺 Setting tvLoading to false. Success:', success);
      setTvLoading(false);
      
      // If failed, the ref is already reset above, so the useEffect can retry
      if (!success) {
        console.log('📺 Load failed - hasLoadedTvShows reset to false for retry');
      }
    }
  };

  const handleBack = () => {
    if (previousMovies.length === 0) return;
    
    // Get the last previous movie
    const lastMovie = previousMovies[previousMovies.length - 1];
    
    // Add it back to the front of current movies
    setMovies((prev) => [lastMovie, ...prev]);
    
    // Remove from previous history
    setPreviousMovies((prev) => prev.slice(0, -1));
  };

  const handleBackTv = () => {
    if (previousTvShows.length === 0) return;
    
    // Get the last previous TV show
    const lastTvShow = previousTvShows[previousTvShows.length - 1];
    
    // Add it back to the front of current TV shows
    setTvShows((prev) => [lastTvShow, ...prev]);
    
    // Remove from previous history
    setPreviousTvShows((prev) => prev.slice(0, -1));
  };

  const handleAddToWatchlist = async () => {
    if (movies.length === 0) return;
    
    const movie = movies[0];
    
    // Save current movie to history before adding to watchlist
    setPreviousMovies((prev) => [...prev, movie]);
    
    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: movie.id,
          movieTitle: movie.title,
          movieYear: movie.year,
        }),
      });

      if (response.ok) {
        addToWatchlist(movie);
        console.log("Added to watchlist successfully");
        
        // Remove from current list and show next movie
        setMovies((prev) => {
          const filtered = prev.filter((m) => m.id !== movie.id);
          // Auto-load more if we're down to last movie
          if (filtered.length === 0) {
            loadMovies();
          }
          return filtered;
        });
      } else {
        console.error("Failed to add to watchlist");
        // Remove from previousMovies if add failed
        setPreviousMovies((prev) => prev.slice(0, -1));
      }
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      // Remove from previousMovies if error occurred
      setPreviousMovies((prev) => prev.slice(0, -1));
    }
  };

  const handleSwipe = (event: any, info: PanInfo) => {
    if (!movies[0]) return;
    
    const threshold = 100;
    const swipeVelocity = Math.abs(info.velocity.x);
    
    if (Math.abs(info.offset.x) > threshold || swipeVelocity > 500) {
      if (info.offset.x > 0) {
        // Swiped right - Good
        handleRate(movies[0].id, "good");
      } else {
        // Swiped left - Awful
        handleRate(movies[0].id, "awful");
      }
    } else {
      // Reset position if swipe was not strong enough
      x.set(0);
    }
  };

  const handleRate = async (movieId: number, rating: Rating) => {
    const movie = movies.find((m) => m.id === movieId);
    if (!movie) return;

    // Reset swipe position
    x.set(0);

    // Save current movie to history before rating
    setPreviousMovies((prev) => [...prev, movie]);

    // Save rating to database
    try {
      const response = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: movie.id,
          movieTitle: movie.title,
          movieYear: movie.year,
          rating,
        }),
      });

      if (!response.ok) {
        console.error("Failed to save rating");
        return;
      }

      // Update local state
      rateMovie(movie, rating);
      
      // Remove rated movie and load new one if needed
      setMovies((prev) => {
        const filtered = prev.filter((m) => m.id !== movieId);
        // Auto-load more if we're down to last movie
        if (filtered.length === 0) {
          loadMovies();
        }
        return filtered;
      });
    } catch (error) {
      console.error("Error saving rating:", error);
    }
  };

  const handleAddToWatchlistTv = async () => {
    if (tvShows.length === 0) return;
    
    const tvShow = tvShows[0];
    
    // Save current TV show to history before adding to watchlist
    setPreviousTvShows((prev) => [...prev, tvShow]);
    
    try {
      const response = await fetch("/api/tvshow-watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tvShowId: tvShow.id,
          tvShowName: tvShow.name,
          tvShowYear: tvShow.year,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.alreadyExists) {
          console.log("TV show already in watchlist");
        } else {
          console.log("Added TV show to watchlist successfully");
        }
        
        // Remove from current list
        setTvShows((prev) => {
          const filtered = prev.filter((show) => show.id !== tvShow.id);
          // Auto-load more if we're down to last show
          if (filtered.length === 0) {
            loadTvShows();
          }
          return filtered;
        });
      } else {
        console.error("Failed to add TV show to watchlist");
      }
    } catch (error) {
      console.error("Error adding TV show to watchlist:", error);
    }
  };

  const handleSwipeTv = (event: any, info: PanInfo) => {
    if (!tvShows[0]) return;
    
    const threshold = 100;
    const swipeVelocity = Math.abs(info.velocity.x);
    
    if (Math.abs(info.offset.x) > threshold || swipeVelocity > 500) {
      if (info.offset.x > 0) {
        // Swiped right - Good
        handleRateTv(tvShows[0].id, "good");
      } else {
        // Swiped left - Awful
        handleRateTv(tvShows[0].id, "awful");
      }
    } else {
      // Reset position if swipe was not strong enough
      x.set(0);
    }
  };

  const handleRateTv = async (tvShowId: number, rating: Rating) => {
    const tvShow = tvShows.find((s) => s.id === tvShowId);
    if (!tvShow) {
      console.error('❌ TV show not found:', tvShowId);
      return;
    }

    console.log('⭐ Rating TV show:', tvShow.name, '→', rating);

    // Reset swipe position
    x.set(0);

    // Save current TV show to history before rating
    setPreviousTvShows((prev) => [...prev, tvShow]);

    // Save rating to database
    try {
      const response = await fetch("/api/tvshow-ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tvShowId: tvShow.id,
          tvShowName: tvShow.name,
          tvShowYear: tvShow.year,
          rating,
        }),
      });

      if (!response.ok) {
        console.error("Failed to save TV show rating");
        return;
      }

      console.log("✅ TV show rated successfully");
      
      // Remove rated TV show and load new one if needed
      setTvShows((prev) => {
        console.log('📺 Current TV shows count:', prev.length);
        const filtered = prev.filter((s) => s.id !== tvShowId);
        console.log('📺 After filtering:', filtered.length);
        
        // Auto-load more if we're down to last TV show
        if (filtered.length === 0) {
          console.log('📺 No TV shows left, loading more...');
          loadTvShows();
        }
        return filtered;
      });
    } catch (error) {
      console.error("Error saving TV show rating:", error);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Header - Hidden on mobile when scrolling down */}
      <motion.div 
        className="space-y-4"
        animate={{ 
          opacity: isMobile ? (showNav ? 1 : 0) : 1,
          y: isMobile ? (showNav ? 0 : -20) : 0
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-5xl font-bold text-white flex items-center gap-3">
              <span className="text-4xl">⭐</span>
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Rate Movies
              </span>
            </h1>
            <p className="text-xl text-gray-400 mt-2">
              Rate movies to help us understand your taste and improve recommendations
            </p>
          </div>
          
          {/* View My Ratings Button */}
          <Link href="/my-ratings">
            <Button 
              variant="outline"
              className="border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10 hover:border-cyan-400 transition-all shadow-lg hover:shadow-cyan-400/20"
            >
              <List className="w-5 h-5 mr-2" />
              <span className="font-semibold">View My Ratings</span>
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Generate Button */}
      {movies.length === 0 && (
        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border-cyan-400/30">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                  <span>🎬</span>
                  <span>Discover Movies to Rate</span>
                </h3>
                <p className="text-sm text-gray-400 mt-2">
                  We'll show you a diverse selection of movies from 2000 to now. Rate them to help us understand your taste!
                </p>
              </div>
              <Button
                onClick={loadMovies}
                disabled={loading}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading Movies...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Movies to Rate
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Single Movie Card - Centered with Navigation */}
      {movies.length > 0 && (
        <div className="flex items-center justify-center gap-6">
          {/* Back Button - Left - Hidden on mobile */}
          {!isMobile && (
            <Button
              onClick={handleBack}
              disabled={previousMovies.length === 0}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-500/20 to-gray-600/20 hover:from-gray-500/40 hover:to-gray-600/40 border-2 border-gray-400/30 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-110 active:scale-95 shadow-lg flex items-center justify-center"
              aria-label="Go back to previous movie"
            >
              <ChevronLeft className="w-8 h-8 text-white" strokeWidth={3} />
            </Button>
          )}

          <AnimatePresence mode="wait">
            {movies[0] && (
              <motion.div
                key={movies[0].id}
                initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                transition={{ 
                  duration: 0.5,
                  type: "spring",
                  stiffness: 100,
                  damping: 15
                }}
                className="w-full max-w-2xl"
                style={isMobile ? { x, rotate, opacity } : {}}
                drag={isMobile ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={isMobile ? handleSwipe : undefined}
              >
                <Card className="bg-gradient-to-br from-cyan-500/5 to-blue-500/5 backdrop-blur-sm border-cyan-400/20 overflow-hidden relative">
                  {/* Swipe Indicators for Mobile */}
                  {isMobile && (
                    <>
                      {/* Left Swipe Indicator - Awful */}
                      <motion.div
                        className="absolute inset-0 bg-red-500/80 backdrop-blur-sm flex items-center justify-center z-10"
                        style={{
                          opacity: leftSwipeOpacity
                        }}
                      >
                        <X className="w-32 h-32 text-white" strokeWidth={3} />
                      </motion.div>

                      {/* Right Swipe Indicator - Good */}
                      <motion.div
                        className="absolute inset-0 bg-green-500/80 backdrop-blur-sm flex items-center justify-center z-10"
                        style={{
                          opacity: rightSwipeOpacity
                        }}
                      >
                        <ThumbsUp className="w-32 h-32 text-white" strokeWidth={3} />
                      </motion.div>
                    </>
                  )}

                  <CardContent className="p-6 relative z-20">
                    <div className="relative max-h-[65vh] overflow-hidden">
                      <MovieCard 
                        movie={movies[0]} 
                        showActions={false}
                        enableAIEnrichment={false}
                        compactMode={true}
                      />
                    </div>
                    
                    {/* Rating Pills below - reduced gap */}
                    {!isMobile && (
                      <div className="mt-3 flex justify-center">
                        <RatingPills
                          onRate={(rating) => handleRate(movies[0].id, rating)}
                          movieId={movies[0].id}
                          layoutMode="u-shape"
                        />
                      </div>
                    )}

                    {/* Mobile Action Buttons */}
                    {isMobile && (
                      <div className="mt-6 flex flex-col gap-3">
                        <p className="text-center text-sm text-gray-400">
                          Swipe left to dislike • Swipe right to like
                        </p>
                        <div className="flex gap-3 justify-center">
                          <Button
                            onClick={() => handleRate(movies[0].id, "not-seen")}
                            variant="outline"
                            className="flex-1 border-white/20 text-white hover:bg-white/10"
                          >
                            Not Seen
                          </Button>
                          <Button
                            onClick={() => handleRate(movies[0].id, "not-interested")}
                            variant="outline"
                            className="flex-1 border-white/20 text-white hover:bg-white/10"
                          >
                            Not Interested
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Watchlist Button - Right - Hidden on mobile */}
          {!isMobile && (
            <Button
              onClick={handleAddToWatchlist}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-red-500/20 hover:from-pink-500/40 hover:to-red-500/40 border-2 border-pink-400/30 hover:border-pink-400 transition-all hover:scale-110 active:scale-95 shadow-lg flex items-center justify-center"
              aria-label="Add to watchlist"
            >
              <Heart className="w-8 h-8 text-pink-300" strokeWidth={2.5} />
            </Button>
          )}
        </div>
      )}

      {/* Empty State after all rated */}
      {!loading && movies.length === 0 && (
        <Card className="bg-gradient-to-br from-cyan-500/5 to-blue-500/5 backdrop-blur-sm border-cyan-400/20">
          <CardContent className="pt-6">
            <div className="text-center py-12 space-y-4">
              <div className="text-6xl">🎉</div>
              <h3 className="text-2xl font-bold text-white">All Caught Up!</h3>
              <p className="text-gray-400">
                You've rated all the movies. Click "Generate More" to get new movies to rate.
              </p>
              <Button
                onClick={loadMovies}
                disabled={loading}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold px-8 py-4 text-lg mt-4"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Generate More Movies
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TV SHOWS SECTION */}
      <div className="border-t-2 border-purple-500/30 pt-8 mt-12">
        {/* TV Shows Header */}
        <motion.div 
          className="space-y-4 mb-6"
          animate={{ 
            opacity: isMobile ? (showNav ? 1 : 0) : 1,
            y: isMobile ? (showNav ? 0 : -20) : 0
          }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-5xl font-bold text-white flex items-center gap-3">
            <Tv className="w-12 h-12 text-purple-400" />
            <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              Rate TV Shows
            </span>
          </h1>
          <p className="text-xl text-gray-400">
            Rate TV shows to help us understand your taste and improve recommendations
          </p>
        </motion.div>

        {/* Loading State for TV Shows */}
        {tvLoading && tvShows.length === 0 && (
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border-purple-400/30">
            <CardContent className="pt-6">
              <div className="text-center py-12 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin mx-auto text-purple-400" />
                <h3 className="text-xl font-bold text-white">Loading TV Shows...</h3>
                <p className="text-sm text-gray-400">
                  Finding the perfect TV shows for you
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generate Button for TV Shows - Only show when not loading and no shows */}
        {!tvLoading && tvShows.length === 0 && (
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border-purple-400/30">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                    <Tv className="w-6 h-6" />
                    <span>Discover TV Shows to Rate</span>
                  </h3>
                  <p className="text-sm text-gray-400 mt-2">
                    We'll show you a diverse selection of TV shows. Rate them to help us understand your taste!
                  </p>
                </div>
                <Button
                  onClick={() => {
                    console.log('📺 Generate TV Shows button clicked');
                    hasLoadedTvShows.current = false; // Reset before loading
                    loadTvShows();
                  }}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-semibold px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate TV Shows
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TV Shows Card - Centered with Navigation - Show when we have shows */}
        {tvShows.length > 0 && tvShows[0] && (
          <div className="flex items-center justify-center gap-6">
            {/* Back Button - Left - Hidden on mobile */}
            {!isMobile && (
              <Button
                onClick={handleBackTv}
                disabled={previousTvShows.length === 0}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-500/20 to-gray-600/20 hover:from-gray-500/40 hover:to-gray-600/40 border-2 border-gray-400/30 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-110 active:scale-95 shadow-lg flex items-center justify-center"
                aria-label="Go back to previous TV show"
              >
                <ChevronLeft className="w-8 h-8 text-white" strokeWidth={3} />
              </Button>
            )}

            <AnimatePresence mode="wait">
              {tvShows[0] && (
                <motion.div
                  key={tvShows[0].id}
                  initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                  transition={{ 
                    duration: 0.5,
                    type: "spring",
                    stiffness: 100,
                    damping: 15
                  }}
                  className="w-full max-w-2xl"
                  style={isMobile ? { x, rotate, opacity } : {}}
                  drag={isMobile ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.7}
                  onDragEnd={isMobile ? handleSwipeTv : undefined}
                >
                  <Card className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 backdrop-blur-sm border-purple-400/20 overflow-hidden relative">
                    {/* Swipe Indicators for Mobile */}
                    {isMobile && (
                      <>
                        {/* Left Swipe Indicator - Awful */}
                        <motion.div
                          className="absolute inset-0 bg-red-500/80 backdrop-blur-sm flex items-center justify-center z-10"
                          style={{
                            opacity: leftSwipeOpacity
                          }}
                        >
                          <X className="w-32 h-32 text-white" strokeWidth={3} />
                        </motion.div>

                        {/* Right Swipe Indicator - Good */}
                        <motion.div
                          className="absolute inset-0 bg-green-500/80 backdrop-blur-sm flex items-center justify-center z-10"
                          style={{
                            opacity: rightSwipeOpacity
                          }}
                        >
                          <ThumbsUp className="w-32 h-32 text-white" strokeWidth={3} />
                        </motion.div>
                      </>
                    )}

                    <CardContent className="p-6 relative z-20">
                      {/* TV Show Badge - Below Language Badge on Left */}
                      <div className="absolute top-[60px] left-8 z-30 px-2 py-1 rounded-md bg-purple-600/90 backdrop-blur-sm border border-purple-400/50">
                        <div className="flex items-center gap-1">
                          <Tv className="w-3 h-3 text-white" />
                          <span className="text-xs font-bold text-white">TV</span>
                        </div>
                      </div>

                      {/* Seasons Badge - Top Right */}
                      {tvShows[0].numberOfSeasons && (
                        <div className="absolute top-9 right-9 z-30 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm border border-white/30">
                          <span className="text-xs font-semibold text-white">
                            {tvShows[0].numberOfSeasons} Season{tvShows[0].numberOfSeasons > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

                      <div className="relative max-h-[65vh] overflow-hidden">
                        <MovieCard 
                          movie={tvShows[0] as any} 
                          showActions={false}
                          enableAIEnrichment={false}
                          compactMode={true}
                        />
                      </div>
                      
                      {/* Rating Pills below - reduced gap */}
                      {!isMobile && (
                        <div className="mt-3 flex justify-center">
                          <RatingPills
                            onRate={(rating) => handleRateTv(tvShows[0].id, rating)}
                            movieId={tvShows[0].id}
                            layoutMode="u-shape"
                          />
                        </div>
                      )}

                      {/* Mobile Action Buttons */}
                      {isMobile && (
                        <div className="mt-6 flex flex-col gap-3">
                          <p className="text-center text-sm text-gray-400">
                            Swipe left to dislike • Swipe right to like
                          </p>
                          <div className="flex gap-3 justify-center">
                            <Button
                              onClick={() => handleRateTv(tvShows[0].id, "not-seen")}
                              variant="outline"
                              className="flex-1 border-white/20 text-white hover:bg-white/10"
                            >
                              Not Seen
                            </Button>
                            <Button
                              onClick={() => handleRateTv(tvShows[0].id, "not-interested")}
                              variant="outline"
                              className="flex-1 border-white/20 text-white hover:bg-white/10"
                            >
                              Not Interested
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Watchlist Button - Right - Hidden on mobile */}
            {!isMobile && (
              <Button
                onClick={handleAddToWatchlistTv}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-red-500/20 hover:from-pink-500/40 hover:to-red-500/40 border-2 border-pink-400/30 hover:border-pink-400 transition-all hover:scale-110 active:scale-95 shadow-lg flex items-center justify-center"
                aria-label="Add to watchlist"
              >
                <Heart className="w-8 h-8 text-pink-300" strokeWidth={2.5} />
              </Button>
            )}
          </div>
        )}

        {/* Empty State after all TV shows rated */}
        {!tvLoading && tvShows.length === 0 && (
          <Card className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 backdrop-blur-sm border-purple-400/20">
            <CardContent className="pt-6">
              <div className="text-center py-12 space-y-4">
                <div className="text-6xl">🎉</div>
                <h3 className="text-2xl font-bold text-white">All Caught Up!</h3>
                <p className="text-gray-400">
                  You've rated all the TV shows. Click "Generate More" to get new TV shows to rate.
                </p>
                <Button
                  onClick={() => {
                    console.log('📺 Generate More TV Shows button clicked');
                    hasLoadedTvShows.current = false; // Reset before loading
                    loadTvShows();
                  }}
                  disabled={tvLoading}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-semibold px-8 py-4 text-lg mt-4"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate More TV Shows
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

