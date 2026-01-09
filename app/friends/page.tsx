"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MovieCard } from "@/components/MovieCard";
import { Movie } from "@/lib/data";
import { useAppStore, Rating } from "@/lib/store";
import { 
  Search, 
  UserPlus, 
  Users, 
  Mail, 
  Check, 
  X, 
  Film, 
  Send,
  Loader2,
  UserMinus,
  Clock,
  Heart,
  Trash2,
  Sparkles
} from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  friendshipStatus?: string;
  isSentRequest?: boolean;
  isReceivedRequest?: boolean;
}

interface Friend {
  id: string;
  friendshipId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  languages?: string[];
  genres?: string[];
}

interface FriendRequest {
  id: string;
  user: User;
  createdAt: Date;
}

interface MovieRecommendation {
  id: string;
  movieId: number;
  movieTitle: string;
  movieYear: number | null;
  message: string | null;
  sender?: User;
  receiver?: User;
  seen: boolean;
  acknowledged: boolean;
  createdAt: Date;
}

export default function FriendsPage() {
  const { data: session, status } = useSession();
  const addToWatchlist = useAppStore((state) => state.addToWatchlist);
  const rated = useAppStore((state) => state.rated);
  
  // Changed default tab to "recommendations"
  const [activeTab, setActiveTab] = useState<"recommendations" | "friends" | "requests">("recommendations");
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Friends state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  
  // Requests state
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  
  // Recommendations state
  const [receivedRecommendations, setReceivedRecommendations] = useState<MovieRecommendation[]>([]);
  const [sentRecommendations, setSentRecommendations] = useState<MovieRecommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  
  // Movie data state
  const [recommendedMovies, setRecommendedMovies] = useState<Movie[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(false);
  
  // Track which recommendations are being processed
  const [processingRecommendations, setProcessingRecommendations] = useState<Set<string>>(new Set());

  // Load recommendations on mount (default tab)
  useEffect(() => {
    if (status === "authenticated") {
      loadRecommendations();
    }
  }, [status]);

  // Load friends only when Friends tab is selected
  useEffect(() => {
    if (status === "authenticated" && activeTab === "friends" && !friends.length) {
      loadFriends();
    }
  }, [status, activeTab]);

  // Load requests only when Requests tab is selected
  useEffect(() => {
    if (status === "authenticated" && activeTab === "requests") {
      loadRequests();
    }
  }, [status, activeTab]);

  // Search users
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  // Fetch movie details for recommendations
  useEffect(() => {
    if (receivedRecommendations.length > 0) {
      fetchMovieDetailsForRecommendations();
    }
  }, [receivedRecommendations]);

  const fetchMovieDetailsForRecommendations = async () => {
    setLoadingMovies(true);
    try {
      const movieIds = Array.from(new Set(receivedRecommendations.map(r => r.movieId)));
      
      console.log('Fetching movie details for recommendations:', {
        movieIds,
        recommendationsCount: receivedRecommendations.length,
      });

      const movieDetailsPromises = movieIds.map(async (movieId) => {
        try {
          console.log(`Fetching movie details for ID: ${movieId}`);
          const response = await fetch(`/api/movies/${movieId}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`Successfully fetched movie: ${data.movie?.title} (ID: ${movieId})`);
            return data.movie;
          } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error(`Failed to fetch movie ${movieId}:`, response.status, errorData);
            return null;
          }
        } catch (error) {
          console.error(`Error fetching movie ${movieId}:`, error);
          return null;
        }
      });

      const movies = await Promise.all(movieDetailsPromises);
      const validMovies = movies.filter(m => m !== null);
      
      console.log('Movie details fetched:', {
        totalMovies: validMovies.length,
        movies: validMovies.map(m => ({ id: m.id, title: m.title })),
      });
      
      setRecommendedMovies(validMovies);
    } catch (error) {
      console.error("Error fetching movie details:", error);
    } finally {
      setLoadingMovies(false);
    }
  };

  const searchUsers = async () => {
    setSearching(true);
    try {
      const response = await fetch(`/api/friends/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearching(false);
    }
  };

  const loadFriends = async () => {
    setLoadingFriends(true);
    try {
      const response = await fetch("/api/friends");
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends);
      }
    } catch (error) {
      console.error("Error loading friends:", error);
    } finally {
      setLoadingFriends(false);
    }
  };

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      const response = await fetch("/api/friends/requests");
      if (response.ok) {
        const data = await response.json();
        setReceivedRequests(data.received);
        setSentRequests(data.sent);
      }
    } catch (error) {
      console.error("Error loading requests:", error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      console.log('Loading friend recommendations...');
      const response = await fetch("/api/friends/recommendations");
      
      if (response.ok) {
        const data = await response.json();
        console.log('Recommendations loaded:', {
          received: data.received?.length || 0,
          sent: data.sent?.length || 0,
          receivedData: data.received,
        });
        setReceivedRecommendations(data.received || []);
        setSentRecommendations(data.sent || []);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error("Failed to load recommendations:", response.status, errorData);
      }
    } catch (error) {
      console.error("Error loading recommendations:", error);
    } finally {
      setLoadingRecommendations(false);
    }
  };


  const sendFriendRequest = async (userId: string) => {
    try {
      const response = await fetch("/api/friends/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (response.ok) {
        setSearchResults(prev =>
          prev.map(user =>
            user.id === userId
              ? { ...user, friendshipStatus: "pending", isSentRequest: true }
              : user
          )
        );
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
  };

  const respondToRequest = async (requestId: string, action: "accept" | "reject") => {
    try {
      const response = await fetch(`/api/friends/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      
      if (response.ok) {
        loadRequests();
        if (action === "accept") {
          loadFriends();
        }
      } else {
        const data = await response.json();
        console.error(`Failed to ${action} friend request:`, data);
      }
    } catch (error) {
      console.error("Error responding to request:", error);
    }
  };

  const removeFriend = async (friendshipId: string) => {
    if (!confirm("Are you sure you want to remove this friend?")) return;
    
    try {
      const response = await fetch("/api/friends", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId }),
      });
      if (response.ok) {
        loadFriends();
      }
    } catch (error) {
      console.error("Error removing friend:", error);
    }
  };

  const handleRate = async (movieId: number, rating: Rating) => {
    try {
      const movie = recommendedMovies.find(m => m.id === movieId);
      if (!movie) return;

      const response = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId,
          movieTitle: movie.title,
          movieYear: movie.year,
          rating,
        }),
      });

      if (response.ok) {
        // Mark the recommendation as acknowledged so it doesn't appear again
        const recommendation = receivedRecommendations.find(r => r.movieId === movieId);
        if (recommendation) {
          await fetch(`/api/friends/recommendations/${recommendation.id}`, {
            method: "DELETE",
          });
          setReceivedRecommendations(prev => prev.filter(r => r.id !== recommendation.id));
        }
        
        // Remove the movie from display after rating
        setRecommendedMovies(prev => prev.filter(m => m.id !== movieId));
      }
    } catch (error) {
      console.error("Failed to save rating:", error);
    }
  };

  const handleAddToWatchlist = async (movie: Movie) => {
    // Find the recommendation first
    const recommendation = receivedRecommendations.find(r => r.movieId === movie.id);
    if (!recommendation) {
      console.error("Recommendation not found for movie");
      return;
    }

    // Prevent double-clicks
    if (processingRecommendations.has(recommendation.id)) {
      console.log("Already processing this recommendation");
      return;
    }

    try {
      // Mark as processing
      setProcessingRecommendations(prev => new Set(prev).add(recommendation.id));

      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: movie.id,
          movieTitle: movie.title,
          movieYear: movie.year,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        addToWatchlist(movie);
        
        if (data.alreadyExists) {
          console.log("Movie already in watchlist");
        } else {
          console.log("Added to watchlist successfully");
        }
        
        // Mark recommendation as acknowledged in database
        const deleteResponse = await fetch(`/api/friends/recommendations/${recommendation.id}`, {
          method: "DELETE",
        });

        if (deleteResponse.ok) {
          console.log("Recommendation marked as acknowledged in database");
        }

        // Remove from local state
        setReceivedRecommendations(prev => prev.filter(r => r.id !== recommendation.id));
        setRecommendedMovies(prev => prev.filter(m => m.id !== movie.id));
      } else {
        console.error("Failed to add to watchlist:", data);
        alert("Failed to add to watchlist. Please try again.");
      }
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      alert("An error occurred. Please try again.");
    } finally {
      // Remove from processing set
      setProcessingRecommendations(prev => {
        const newSet = new Set(prev);
        newSet.delete(recommendation.id);
        return newSet;
      });
    }
  };

  const handleRemoveRecommendation = async (recommendationId: string) => {
    // Prevent double-clicks
    if (processingRecommendations.has(recommendationId)) {
      console.log("Already processing this recommendation");
      return;
    }

    try {
      // Mark as processing
      setProcessingRecommendations(prev => new Set(prev).add(recommendationId));

      const response = await fetch(`/api/friends/recommendations/${recommendationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove from both recommendations and movies display
        const recommendation = receivedRecommendations.find(r => r.id === recommendationId);
        if (recommendation) {
          setReceivedRecommendations(prev => prev.filter(r => r.id !== recommendationId));
          setRecommendedMovies(prev => prev.filter(m => m.id !== recommendation.movieId));
        }
      } else {
        console.error("Failed to remove recommendation");
        alert("Failed to dismiss recommendation. Please try again.");
      }
    } catch (error) {
      console.error("Error removing recommendation:", error);
      alert("An error occurred. Please try again.");
    } finally {
      // Remove from processing set
      setProcessingRecommendations(prev => {
        const newSet = new Set(prev);
        newSet.delete(recommendationId);
        return newSet;
      });
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-20">
        <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">Please log in to access friends</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
              Friends & Recommendations
            </h1>
            <p className="text-sm sm:text-base text-gray-400">
              Discover movies your friends think you'll love
            </p>
          </div>
        </div>
      </motion.div>

      {/* Search Bar */}
      {activeTab === "friends" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-cyan-400" />
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-4 max-h-64 overflow-y-auto space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center font-bold text-black text-sm">
                          {user.name?.charAt(0) || user.email?.charAt(0) || "?"}
                        </div>
                        <div>
                          <h3 className="font-semibold text-white text-sm">{user.name || "Anonymous"}</h3>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                      {user.friendshipStatus === "accepted" ? (
                        <Badge className="bg-green-500 text-white">Friends</Badge>
                      ) : user.friendshipStatus === "pending" && user.isSentRequest ? (
                        <Badge className="bg-yellow-500 text-black">Pending</Badge>
                      ) : user.friendshipStatus === "pending" && user.isReceivedRequest ? (
                        <Badge className="bg-blue-500 text-white">Respond</Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => sendFriendRequest(user.id)}
                          className="bg-cyan-500 hover:bg-cyan-400 text-black"
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 border-b border-white/10 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setActiveTab("recommendations")}
          className={`px-2 sm:px-4 py-2 font-semibold transition-all whitespace-nowrap text-xs sm:text-sm min-h-[44px] ${
            activeTab === "recommendations"
              ? "text-cyan-400 border-b-2 border-cyan-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Sparkles className="inline w-4 h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Recommendations</span>
          <span className="sm:hidden">Recs</span>
          <span className="ml-1">({receivedRecommendations.filter(r => !r.seen).length})</span>
        </button>
        <button
          onClick={() => setActiveTab("friends")}
          className={`px-2 sm:px-4 py-2 font-semibold transition-all whitespace-nowrap text-xs sm:text-sm min-h-[44px] ${
            activeTab === "friends"
              ? "text-cyan-400 border-b-2 border-cyan-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Users className="inline w-4 h-4 mr-1 sm:mr-2" />
          Friends ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-2 sm:px-4 py-2 font-semibold transition-all whitespace-nowrap text-xs sm:text-sm min-h-[44px] ${
            activeTab === "requests"
              ? "text-cyan-400 border-b-2 border-cyan-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Mail className="inline w-4 h-4 mr-1 sm:mr-2" />
          Requests ({receivedRequests.length})
        </button>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* Recommendations Tab - Now Default and with Movie Cards */}
        {activeTab === "recommendations" && (
          <motion.div
            key="recommendations"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {loadingRecommendations || loadingMovies ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
                <p className="text-gray-400">Loading recommendations...</p>
              </div>
            ) : receivedRecommendations.length === 0 ? (
              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardContent className="py-20 text-center">
                  <Film className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No Recommendations Yet</h3>
                  <p className="text-gray-400 max-w-md mx-auto">
                    Connect with friends and ask them to recommend movies you'd love!
                  </p>
                  <Button
                    onClick={() => setActiveTab("friends")}
                    className="mt-6 bg-cyan-500 hover:bg-cyan-400 text-black"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    View Friends
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {receivedRecommendations.map((rec, idx) => {
                    const movie = recommendedMovies.find(m => m.id === rec.movieId);
                    
                    // Show placeholder if movie details haven't loaded yet
                    if (!movie) {
                      console.warn(`Movie not found for recommendation:`, {
                        recId: rec.id,
                        movieId: rec.movieId,
                        movieTitle: rec.movieTitle,
                        availableMovies: recommendedMovies.map(m => ({ id: m.id, title: m.title })),
                      });
                      
                      return (
                        <motion.div
                          key={rec.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                            <CardContent className="pt-6">
                              <div className="text-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">{rec.movieTitle}</p>
                                <p className="text-xs text-gray-500">Loading details...</p>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    }

                  return (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="relative group"
                    >
                      {/* Friend's recommendation badge */}
                      <div className="absolute -top-3 left-3 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg">
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center font-bold text-purple-500 text-xs">
                          {rec.sender?.name?.charAt(0) || "?"}
                        </div>
                        <span className="text-xs font-semibold text-white">
                          {rec.sender?.name?.split(' ')[0] || "Friend"} recommends
                        </span>
                      </div>

                      <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all mt-4">
                        <CardContent className="p-0">
                          <MovieCard
                            movie={movie}
                            showActions={false}
                            enableAIEnrichment={false}
                            compactMode={true}
                          />

                          {/* Personal Message */}
                          {rec.message && (
                            <div className="px-4 py-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-t border-white/10">
                              <p className="text-sm text-cyan-300 italic">
                                "{rec.message}"
                              </p>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="p-4 flex gap-2 border-t border-white/10">
                            <Button
                              size="sm"
                              onClick={() => handleAddToWatchlist(movie)}
                              disabled={processingRecommendations.has(rec.id)}
                              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {processingRecommendations.has(rec.id) ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  Adding...
                                </>
                              ) : (
                                <>
                                  <Heart className="w-4 h-4 mr-1" />
                                  Watchlist
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRemoveRecommendation(rec.id)}
                              disabled={processingRecommendations.has(rec.id)}
                              variant="outline"
                              className="border-red-400/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Sent Recommendations Section */}
            {sentRecommendations.length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Send className="w-6 h-6 text-cyan-400" />
                  Your Recommendations
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {sentRecommendations.map((rec) => (
                    <Card key={rec.id} className="bg-white/5 backdrop-blur-sm border-white/10">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-white text-sm">{rec.movieTitle}</h3>
                            {rec.movieYear && (
                              <p className="text-xs text-gray-400">({rec.movieYear})</p>
                            )}
                          </div>
                          <Badge className={rec.seen ? "bg-green-500 text-white" : "bg-yellow-500 text-black"}>
                            {rec.seen ? "Seen" : "New"}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400">
                          To: {rec.receiver?.name?.split(' ')[0] || "Friend"}
                        </p>
                        {rec.message && (
                          <p className="text-xs text-cyan-400 italic mt-2 line-clamp-2">
                            "{rec.message}"
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Friends Tab */}
        {activeTab === "friends" && (
          <motion.div
            key="friends"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {loadingFriends ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
              </div>
            ) : friends.length === 0 ? (
              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardContent className="py-12 text-center">
                  <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No friends yet. Search above to add friends!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {friends.map((friend, idx) => (
                  <motion.div
                    key={friend.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center font-bold text-black">
                              {friend.name?.charAt(0) || "?"}
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">{friend.name || "Anonymous"}</h3>
                              <p className="text-xs text-gray-400">{friend.email}</p>
                              <div className="flex gap-1 mt-1">
                                {friend.languages?.slice(0, 3).map((lang, i) => (
                                  <Badge key={i} className="text-xs bg-cyan-500/20 text-cyan-300">
                                    {lang}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFriend(friend.friendshipId)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <motion.div
            key="requests"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {loadingRequests ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
              </div>
            ) : (
              <>
                {/* Received Requests */}
                <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Friend Requests
                      <Badge className="bg-cyan-500 text-black ml-2">{receivedRequests.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {receivedRequests.length === 0 ? (
                      <p className="text-gray-400 text-center py-4">No pending requests</p>
                    ) : (
                      receivedRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center font-bold text-black">
                              {request.user.name?.charAt(0) || "?"}
                            </div>
                            <div>
                              <h3 className="font-semibold text-white text-sm">{request.user.name}</h3>
                              <p className="text-xs text-gray-400">{request.user.email}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => respondToRequest(request.id, "accept")}
                              className="bg-green-500 hover:bg-green-400 text-white"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => respondToRequest(request.id, "reject")}
                              className="border-red-400 text-red-400 hover:bg-red-500/10"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Sent Requests */}
                {sentRequests.length > 0 && (
                  <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Pending Requests
                        <Badge className="bg-yellow-500 text-black ml-2">{sentRequests.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {sentRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center font-bold text-black">
                              {request.user.name?.charAt(0) || "?"}
                            </div>
                            <div>
                              <h3 className="font-semibold text-white text-sm">{request.user.name}</h3>
                              <p className="text-xs text-gray-400">{request.user.email}</p>
                            </div>
                          </div>
                          <Badge className="bg-yellow-500 text-black">Pending</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
