"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, CheckCircle, XCircle, Search } from "lucide-react";

export default function FixMoviesPage() {
  const [movieIds, setMovieIds] = useState("603, 550, 27205"); // The Matrix, Fight Club, Inception
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setResults([]);

    try {
      const ids = movieIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

      console.log('🔄 Refreshing movies:', ids);

      const response = await fetch('/api/movies/bulk-refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieIds: ids }),
      });

      const data = await response.json();
      console.log('✅ Refresh results:', data);

      setResults(data.results || []);
    } catch (error) {
      console.error('❌ Error refreshing movies:', error);
      alert('Error refreshing movies. Check console for details.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setSearching(true);
    setSearchResults([]);

    try {
      console.log('🔍 Searching for:', searchTerm);

      // Search TMDB
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY || ''}&query=${encodeURIComponent(searchTerm)}`
      );

      const data = await response.json();
      console.log('✅ Search results:', data.results?.slice(0, 5));

      setSearchResults(data.results?.slice(0, 10) || []);
    } catch (error) {
      console.error('❌ Error searching:', error);
    } finally {
      setSearching(false);
    }
  };

  const addMovieId = (id: number) => {
    const currentIds = movieIds.split(',').map(i => i.trim()).filter(Boolean);
    if (!currentIds.includes(id.toString())) {
      setMovieIds([...currentIds, id].join(', '));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border-cyan-400/30">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-white flex items-center gap-3">
              <RefreshCw className="w-8 h-8 text-cyan-400" />
              Fix Movie Metadata
            </CardTitle>
            <p className="text-gray-400 mt-2">
              Refresh movies with incorrect data (wrong language, missing poster, etc.)
            </p>
          </CardHeader>
        </Card>

        {/* Search Movies */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Movies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for a movie (e.g., The Matrix, Paatal Lok)"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
              <Button
                onClick={handleSearch}
                disabled={searching || !searchTerm.trim()}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
              >
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Click to add movie ID to refresh list:</p>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {searchResults.map((movie) => (
                    <div
                      key={movie.id}
                      onClick={() => addMovieId(movie.id)}
                      className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                    >
                      {movie.poster_path && (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                          alt={movie.title}
                          className="w-12 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-semibold text-white">{movie.title}</div>
                        <div className="text-sm text-gray-400">
                          {movie.release_date?.split('-')[0]} • ID: {movie.id} • Lang: {movie.original_language?.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Refresh Movies */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Movie IDs to Refresh</CardTitle>
            <p className="text-sm text-gray-400 mt-2">
              Enter TMDB movie IDs separated by commas (e.g., 603, 550, 27205)
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                value={movieIds}
                onChange={(e) => setMovieIds(e.target.value)}
                placeholder="603, 550, 27205"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-500">
                Common issues: The Matrix (603), Fight Club (550), Inception (27205)
              </p>
            </div>

            <Button
              onClick={handleRefresh}
              disabled={refreshing || !movieIds.trim()}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold"
            >
              {refreshing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Refresh from TMDB
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-4 rounded-lg ${
                      result.status === 'success'
                        ? 'bg-emerald-500/20 border border-emerald-400/30'
                        : 'bg-rose-500/20 border border-rose-400/30'
                    }`}
                  >
                    {result.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-white">
                        Movie ID: {result.movieId}
                      </div>
                      {result.title && (
                        <div className="text-sm text-gray-300">
                          {result.title} ({result.language?.toUpperCase()})
                        </div>
                      )}
                      {result.error && (
                        <div className="text-sm text-rose-300">{result.error}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg">How to Use</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-300 space-y-2 text-sm">
            <p>1. <strong>Search</strong> for movies using the search box above</p>
            <p>2. <strong>Click</strong> on search results to add their IDs</p>
            <p>3. Or <strong>enter TMDB movie IDs</strong> directly (separated by commas)</p>
            <p>4. <strong>Click "Refresh from TMDB"</strong> to update the database</p>
            <p>5. <strong>Verify</strong> the changes in your watchlist or rate page</p>
            <p className="text-cyan-400 mt-4">
              💡 Tip: After refreshing, hard reload your browser (Cmd/Ctrl + Shift + R) to see changes
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

