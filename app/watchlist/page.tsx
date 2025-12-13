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
  const { watchlist, removeFromWatchlist, rateMovie } = useAppStore();

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
                  return {
                    ...showData,
                    id: item.tvShowId,
                    name: item.tvShowName,
                    title: item.tvShowName,
                    year: item.tvShowYear,
                  };
                }
              } catch (error) {
                console.error(`Error fetching TV show ${item.tvShowId}:`, error);
              }
              // Fallback if fetch fails
              return {
                id: item.tvShowId,
                name: item.tvShowName,
                title: item.tvShowName,
                year: item.tvShowYear,
                poster: '',
                lang: 'Unknown',
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

  // Separate movies from TV shows based on type/mediaType
  const moviesOnly = watchlist.filter((item: any) => 
    !item.type || item.type === 'movie' || item.mediaType === 'movie' || 
    (!item.type && !item.mediaType && !item.numberOfSeasons) // Default to movie if no type specified
  );
  
  const tvShowsFromWatchlist = watchlist.filter((item: any) => 
    item.type === 'tvshow' || item.mediaType === 'tv' || 
    item.numberOfSeasons // Has seasons = TV show
  );
  
  // Debug logging
  useEffect(() => {
    console.log('📊 Watchlist Separation Debug:', {
      totalWatchlist: watchlist.length,
      moviesOnly: moviesOnly.length,
      tvShowsFromStore: tvShowsFromWatchlist.length,
      tvShowsFromAPI: tvShowWatchlist.length,
      movieTitles: moviesOnly.map((m: any) => `${m.title} (type: ${m.type || 'none'}, mediaType: ${m.mediaType || 'none'})`),
      tvShowTitles: [...tvShowsFromWatchlist, ...tvShowWatchlist].map((s: any) => `${s.name || s.title} (type: ${s.type || 'none'}, mediaType: ${s.mediaType || 'none'}, seasons: ${s.numberOfSeasons || 'none'})`)
    });
  }, [watchlist, tvShowWatchlist, moviesOnly.length, tvShowsFromWatchlist.length]);
  
  // Combine TV shows from both sources
  const allTvShows = [...tvShowWatchlist, ...tvShowsFromWatchlist];
  
  // Remove duplicates by id
  const uniqueTvShows = Array.from(
    new Map(allTvShows.map(show => [show.id, show])).values()
  );

  // Apply tab filtering
  const filteredMovies = activeTab === "tvshows" ? [] : moviesOnly;
  const filteredTvShows = activeTab === "movies" ? [] : uniqueTvShows;

  const tabs: { id: WatchlistTab; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "All", icon: null },
    { id: "movies", label: "Movies", icon: <Film className="w-4 h-4" /> },
    { id: "tvshows", label: "TV Shows", icon: <Tv className="w-4 h-4" /> },
  ];

  const totalCount = moviesOnly.length + uniqueTvShows.length;

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
            {tab.id === "tvshows" && ` (${uniqueTvShows.length})`}
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
                        onClick={() => removeFromWatchlist(movie.id)}
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

