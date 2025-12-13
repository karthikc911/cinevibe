"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { MOVIES } from "@/lib/data";

export default function TestWatchlistPage() {
  const { data: session } = useSession();
  const { watchlist: localWatchlist, addToWatchlist } = useAppStore();
  const [dbWatchlist, setDbWatchlist] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Fetch database watchlist
  const fetchDbWatchlist = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/watchlist/debug");
      const data = await response.json();
      setDbWatchlist(data);
      setMessage("");
    } catch (error) {
      setMessage("Error fetching database watchlist");
      console.error(error);
    }
    setLoading(false);
  };

  // Add test movie to watchlist
  const addTestMovie = async () => {
    const testMovie = MOVIES[0]; // Use first movie as test
    setMessage(`Adding "${testMovie.title}" to watchlist...`);
    
    try {
      await addToWatchlist(testMovie);
      setMessage(`✅ Added "${testMovie.title}" to watchlist! Refreshing database...`);
      
      // Wait a bit for backend to process
      setTimeout(() => {
        fetchDbWatchlist();
      }, 1000);
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    }
  };

  useEffect(() => {
    if (session) {
      fetchDbWatchlist();
    }
  }, [session]);

  if (!session) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-bold text-white mb-4">
          Please sign in to test watchlist
        </h1>
        <Button onClick={() => window.location.href = "/login"}>
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2">
          🧪 Watchlist Test & Debug
        </h1>
        <p className="text-gray-400">
          Validate that watchlist items are syncing to the database
        </p>
      </div>

      {/* User Info */}
      <Card className="p-6 bg-white/5 backdrop-blur-sm border-white/10">
        <h2 className="text-xl font-bold text-white mb-4">Session Info</h2>
        <div className="space-y-2 text-sm">
          <p className="text-gray-300">
            <strong>User:</strong> {session.user?.name}
          </p>
          <p className="text-gray-300">
            <strong>Email:</strong> {session.user?.email}
          </p>
          <p className="text-gray-300">
            <strong>User ID:</strong> {session.user?.id || "N/A"}
          </p>
        </div>
      </Card>

      {/* Actions */}
      <Card className="p-6 bg-white/5 backdrop-blur-sm border-white/10">
        <h2 className="text-xl font-bold text-white mb-4">Actions</h2>
        <div className="flex gap-3">
          <Button
            onClick={addTestMovie}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
            disabled={loading}
          >
            ➕ Add Test Movie
          </Button>
          <Button
            onClick={fetchDbWatchlist}
            variant="outline"
            className="border-white/20 text-white"
            disabled={loading}
          >
            🔄 Refresh Database
          </Button>
        </div>
        {message && (
          <div className="mt-4 p-3 rounded-lg bg-white/10 text-white text-sm">
            {message}
          </div>
        )}
      </Card>

      {/* Local Storage Watchlist */}
      <Card className="p-6 bg-white/5 backdrop-blur-sm border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">
            Local Storage (Zustand)
          </h2>
          <Badge className="bg-purple-500 text-white">
            {localWatchlist.length} items
          </Badge>
        </div>
        <div className="space-y-2">
          {localWatchlist.length > 0 ? (
            localWatchlist.slice(0, 10).map((movie) => (
              <div
                key={movie.id}
                className="p-3 rounded-lg bg-white/5 flex items-center justify-between"
              >
                <div>
                  <p className="text-white font-medium">{movie.title}</p>
                  <p className="text-gray-400 text-xs">
                    ID: {movie.id} • {movie.year || "N/A"}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-sm">No items in local storage</p>
          )}
        </div>
      </Card>

      {/* Database Watchlist */}
      <Card className="p-6 bg-white/5 backdrop-blur-sm border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">
            Database (PostgreSQL)
          </h2>
          <Badge className="bg-cyan-500 text-black">
            {dbWatchlist?.watchlistCount || 0} items
          </Badge>
        </div>
        
        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : dbWatchlist ? (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-green-400 text-sm">
                ✅ {dbWatchlist.message}
              </p>
            </div>
            
            <div className="space-y-2">
              {dbWatchlist.watchlist && dbWatchlist.watchlist.length > 0 ? (
                dbWatchlist.watchlist.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-white/5 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-white font-medium">{item.movieTitle}</p>
                      <p className="text-gray-400 text-xs">
                        Movie ID: {item.movieId} • {item.movieYear || "N/A"}
                      </p>
                      <p className="text-gray-500 text-xs">
                        Added: {new Date(item.addedAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      DB ID: {item.id.slice(0, 8)}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm">No items in database</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Click refresh to load database watchlist</p>
        )}
      </Card>

      {/* Instructions */}
      <Card className="p-6 bg-blue-500/10 border-blue-500/30">
        <h3 className="text-lg font-bold text-blue-400 mb-3">
          📋 How to Test
        </h3>
        <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
          <li>Click "Add Test Movie" to add a movie to your watchlist</li>
          <li>Check that the item appears in both "Local Storage" and "Database" sections</li>
          <li>Go to the <a href="/home" className="text-cyan-400 hover:underline">Home Page</a> and hover over a movie → Click "+ Watchlist"</li>
          <li>Return here and click "Refresh Database" to see the new item</li>
          <li>Go to <a href="/watchlist" className="text-cyan-400 hover:underline">Watchlist Page</a> to see all items</li>
        </ol>
      </Card>

      {/* Comparison */}
      {localWatchlist.length !== dbWatchlist?.watchlistCount && dbWatchlist && (
        <Card className="p-6 bg-yellow-500/10 border-yellow-500/30">
          <h3 className="text-lg font-bold text-yellow-400 mb-2">
            ⚠️ Sync Mismatch Detected
          </h3>
          <p className="text-gray-300 text-sm">
            Local storage has {localWatchlist.length} items but database has{" "}
            {dbWatchlist.watchlistCount} items. This might be expected if you
            just added items (backend sync takes a moment).
          </p>
        </Card>
      )}
    </div>
  );
}

