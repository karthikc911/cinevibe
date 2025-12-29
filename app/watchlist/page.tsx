"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Tv, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MovieCard } from "@/components/MovieCard";
import { ShareModal } from "@/components/ShareModal";
import { useAppStore } from "@/lib/store";
import { Movie, TvShow } from "@/lib/data";

type WatchlistTab = "movies" | "tvshows" | "all";

export default function WatchlistPage() {
  const [activeTab, setActiveTab] = useState<WatchlistTab>("all");
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set());
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [movieToShare, setMovieToShare] = useState<Movie | null>(null);
  const [tvShowWatchlist, setTvShowWatchlist] = useState<TvShow[]>([]);
  const [loadingTvShows, setLoadingTvShows] = useState(true);
  const [movieWatchlist, setMovieWatchlist] = useState<Movie[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const { watchlist, removeFromWatchlist, rateMovie } = useAppStore();

  // Fetch movie watchlist from database
  useEffect(() => {
    const fetchMovieWatchlist = async () => {
      try {
        console.log('🎬 Fetching movie watchlist from database...');
        const response = await fetch("/api/watchlist");
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('❌ Failed to fetch movie watchlist:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
          });
          setLoadingMovies(false);
          return;
        }
        
        const data = await response.json();
        console.log('✅ Movie watchlist fetched:', data.watchlist?.length || 0, 'items');
        
        if (!data.watchlist || data.watchlist.length === 0) {
          console.log('ℹ️ No movies in watchlist');
          setMovieWatchlist([]);
          setLoadingMovies(false);
          return;
        }
        
        // Fetch full movie details for each watchlist item
        const moviesWithDetails = await Promise.all(
          (data.watchlist || []).map(async (item: any) => {
            try {
              const movieResponse = await fetch(`/api/movies/${item.movieId}`);
              if (movieResponse.ok) {
                const movieData = await movieResponse.json();
                console.log('✅ Movie fetched:', item.movieTitle);
                
                // Check if the movie title matches what we expected
                const fetchedTitle = movieData.movie?.title?.toLowerCase()?.trim();
                const expectedTitle = item.movieTitle?.toLowerCase()?.trim();
                
                // Compare titles - if they don't match, fix the data
                const titlesMatch = fetchedTitle === expectedTitle || 
                  fetchedTitle?.includes(expectedTitle) || 
                  expectedTitle?.includes(fetchedTitle);
                
                if (!titlesMatch && expectedTitle) {
                  console.warn(`⚠️ Title mismatch for ID ${item.movieId}!`);
                  console.warn(`  Expected: "${item.movieTitle}"`);
                  console.warn(`  Got: "${movieData.movie?.title}"`);
                  console.log('🔧 Attempting to fix movie data...');
                  
                  // Call the search-and-fix API to correct the data
                  try {
                    const fixResponse = await fetch('/api/movies/search-and-fix', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        movieId: item.movieId,
                        expectedTitle: item.movieTitle,
                        expectedYear: item.movieYear,
                      }),
                    });
                    
                    if (fixResponse.ok) {
                      const fixData = await fixResponse.json();
                      console.log('✅ Movie data fixed:', fixData.movie?.title);
                      
                      return {
                        ...fixData.movie,
                        id: fixData.movie?.id || item.movieId,
                        title: fixData.movie?.title || item.movieTitle,
                        year: fixData.movie?.year || item.movieYear,
                        type: 'movie',
                        mediaType: 'movie',
                      };
                    }
                  } catch (fixError) {
                    console.error('❌ Failed to fix movie:', fixError);
                  }
                }
                
                console.log('  - Poster URL:', movieData.movie?.poster);
                
                const enrichedMovie = {
                  ...movieData.movie,
                  id: item.movieId,
                  title: item.movieTitle,
                  year: item.movieYear,
                  type: 'movie',
                  mediaType: 'movie',
                };
                
                console.log('  - Final movie object poster:', enrichedMovie.poster);
                return enrichedMovie;
              } else {
                console.warn(`⚠️ Failed to fetch movie ${item.movieId}, status: ${movieResponse.status}`);
              }
            } catch (error) {
              console.error(`❌ Error fetching movie ${item.movieId}:`, error);
            }
            // Fallback if fetch fails
            console.warn(`⚠️ Using fallback data for movie ${item.movieId}: ${item.movieTitle}`);
            return null;
          })
        );
        
        // Filter out null values and log final count
        const validMovies = moviesWithDetails.filter(Boolean);
        console.log('✅ Valid movies with full data:', validMovies.length);
        
        setMovieWatchlist(validMovies);
        console.log('✅ Movie watchlist with details:', validMovies.length, 'items');
      } catch (error) {
        console.error("❌ Error fetching movie watchlist:", error);
      } finally {
        setLoadingMovies(false);
      }
    };

    fetchMovieWatchlist();
  }, []);

  // Fetch TV show watchlist from API
  useEffect(() => {
    const fetchTvShowWatchlist = async () => {
      try {
        const response = await fetch("/api/tvshow-watchlist");
        if (response.ok) {
          const data = await response.json();
          
          // Fetch full TV show details for each watchlist item
          const tvShowsWithDetails = await Promise.all(
            data.watchlist.map(async (item: any) => {
              try {
                const showResponse = await fetch(`/api/tvshows/${item.tvShowId}`);
                if (showResponse.ok) {
                  const showData = await showResponse.json();
                  console.log('✅ TV Show fetched:', item.tvShowName);
                  console.log('  - Show data:', showData);
                  return {
                    ...showData,
                    id: item.tvShowId,
                    name: item.tvShowName,
                    title: item.tvShowName,
                    year: item.tvShowYear,
                    type: 'tvshow', // Explicitly mark as TV show
                    mediaType: 'tv', // For compatibility
                  };
                }
              } catch (error) {
                console.error(`❌ Error fetching TV show ${item.tvShowId}:`, error);
              }
              // Fallback if fetch fails
              console.warn(`⚠️ Using fallback for TV show: ${item.tvShowName}`);
              return {
                id: item.tvShowId,
                name: item.tvShowName,
                title: item.tvShowName,
                year: item.tvShowYear,
                poster: '',
                lang: 'Unknown',
                type: 'tvshow', // Explicitly mark as TV show
                mediaType: 'tv', // For compatibility
              };
            })
          );
          
          setTvShowWatchlist(tvShowsWithDetails.filter(Boolean));
        }
      } catch (error) {
        console.error("Error fetching TV show watchlist:", error);
      } finally {
        setLoadingTvShows(false);
      }
    };

    fetchTvShowWatchlist();
  }, []);

  const toggleWatched = (movieId: number) => {
    setWatchedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(movieId)) {
        newSet.delete(movieId);
      } else {
        newSet.add(movieId);
      }
      return newSet;
    });
  };

  const handleShare = (movie: Movie) => {
    setMovieToShare(movie);
    setShareModalOpen(true);
  };

  const handleRemoveMovie = async (movieId: number) => {
    try {
      const response = await fetch(`/api/watchlist?movieId=${movieId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMovieWatchlist((prev) => prev.filter((movie) => movie.id !== movieId));
        removeFromWatchlist(movieId); // Also remove from Zustand store
        console.log("✅ Removed movie from watchlist");
      } else {
        console.error("❌ Failed to remove movie from watchlist");
      }
    } catch (error) {
      console.error("❌ Error removing movie from watchlist:", error);
    }
  };

  const handleRemoveTvShow = async (tvShowId: number) => {
    try {
      const response = await fetch(`/api/tvshow-watchlist?tvShowId=${tvShowId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTvShowWatchlist((prev) => prev.filter((show) => show.id !== tvShowId));
        console.log("Removed TV show from watchlist");
      } else {
        console.error("Failed to remove TV show from watchlist");
      }
    } catch (error) {
      console.error("Error removing TV show from watchlist:", error);
    }
  };

  // Use database watchlist
  const moviesOnly = movieWatchlist;
  const tvShowsOnly = tvShowWatchlist;

  // Apply tab filtering
  const filteredMovies = activeTab === "tvshows" ? [] : moviesOnly;
  const filteredTvShows = activeTab === "movies" ? [] : tvShowsOnly;

  const tabs: { id: WatchlistTab; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "All", icon: null },
    { id: "movies", label: "Movies", icon: <Film className="w-4 h-4" /> },
    { id: "tvshows", label: "TV Shows", icon: <Tv className="w-4 h-4" /> },
  ];

  const totalCount = moviesOnly.length + tvShowsOnly.length;

  // Show loading state
  if (loadingMovies || loadingTvShows) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
          <p className="text-gray-400">Loading your watchlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold text-white">My Watchlist</h1>
          <Badge className="bg-cyan-500 text-black">
            {totalCount} {totalCount === 1 ? "item" : "items"}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? "bg-cyan-500 text-black"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
            data-testid={`tab-${tab.id}`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === "movies" && ` (${moviesOnly.length})`}
            {tab.id === "tvshows" && ` (${tvShowsOnly.length})`}
          </button>
        ))}
      </div>

      {/* Empty State - Show only when BOTH are empty */}
      {filteredMovies.length === 0 && filteredTvShows.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📽️</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Your watchlist is empty
          </h3>
          <p className="text-gray-400 mb-6">
            Add movies or TV shows to your watchlist from search or recommendations
          </p>
          <Button
            onClick={() => (window.location.href = "/")}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
          >
            Discover Content
          </Button>
        </div>
      ) : (
        <>
          {/* Movies Section */}
          {filteredMovies.length > 0 && (
            <div>
              {activeTab === "all" && (
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Film className="w-6 h-6 text-cyan-400" />
                  Movies ({filteredMovies.length})
                </h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMovies.map((movie, idx) => (
                  <motion.div
                    key={movie.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="space-y-3"
                  >
                    <MovieCard
                      movie={movie}
                      onRate={(rating) => rateMovie(movie, rating)}
                      showActions={false}
                    />
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={watchedIds.has(movie.id) ? "default" : "outline"}
                        onClick={() => toggleWatched(movie.id)}
                        className={
                          watchedIds.has(movie.id)
                            ? "flex-1 bg-green-500 hover:bg-green-400 text-black"
                            : "flex-1 border-white/20 text-white hover:bg-white/10"
                        }
                        data-testid={`watched-${movie.id}`}
                      >
                        {watchedIds.has(movie.id) ? "✓ Watched" : "Mark Watched"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShare(movie)}
                        className="border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10"
                        data-testid={`share-${movie.id}`}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveMovie(movie.id)}
                        className="border-red-400/50 text-red-400 hover:bg-red-400/10"
                        data-testid={`remove-${movie.id}`}
                      >
                        Remove
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* TV Shows Section */}
      {filteredTvShows.length > 0 && (
        <div className="mt-8">
          {activeTab === "all" && (
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Tv className="w-6 h-6 text-purple-400" />
              TV Shows ({filteredTvShows.length})
            </h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTvShows.map((tvShow, idx) => (
              <motion.div
                key={tvShow.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="space-y-3"
              >
                    <MovieCard
                      movie={tvShow as any}
                      showActions={false}
                    />
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={watchedIds.has(tvShow.id) ? "default" : "outline"}
                    onClick={() => toggleWatched(tvShow.id)}
                    className={
                      watchedIds.has(tvShow.id)
                        ? "flex-1 bg-green-500 hover:bg-green-400 text-black"
                        : "flex-1 border-white/20 text-white hover:bg-white/10"
                    }
                  >
                    {watchedIds.has(tvShow.id) ? "✓ Watched" : "Mark Watched"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveTvShow(tvShow.id)}
                    className="border-red-400/50 text-red-400 hover:bg-red-400/10"
                  >
                    Remove
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

