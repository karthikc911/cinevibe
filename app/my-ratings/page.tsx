"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft, ChevronRight, ArrowLeft, Filter, Download } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface RatedMovie {
  id: string;
  movieId: number;
  movieTitle: string;
  movieYear: string | null;
  rating: string;
  createdAt: string;
  movieDetails?: any;
}

type RatingFilter = "all" | "amazing" | "good" | "meh" | "awful" | "not-interested" | "skipped";

const ITEMS_PER_PAGE = 20; // Good for list view

export default function MyRatingsPage() {
  const { data: session, status } = useSession();
  const [ratings, setRatings] = useState<RatedMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [exporting, setExporting] = useState(false);

  // Load ratings from database (now includes movie details directly)
  useEffect(() => {
    const loadRatings = async () => {
      if (!session?.user?.email) return;

      try {
        console.log('🔄 Loading all ratings from database...');
        setLoading(true);
        
        const response = await fetch('/api/ratings');
        if (response.ok) {
          const data = await response.json();
          const ratingsData = data.ratings || [];
          setRatings(ratingsData);
          console.log('✅ Loaded', ratingsData.length, 'ratings from database');
          console.log('📋 Sample rating with movie details:', ratingsData[0]);
        } else {
          console.error('❌ Failed to load ratings:', response.status);
        }
      } catch (error) {
        console.error('❌ Error loading ratings:', error);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      loadRatings();
    }
  }, [session?.user?.email, status]);

  // Download ratings as CSV (movie details now pre-loaded from API)
  const downloadCSV = async () => {
    console.log('📥 Starting CSV export...');

    // Create CSV data with properly formatted language (details already loaded)
    const csvData = ratings.map(rating => {
      const language = rating.movieDetails?.language || rating.movieDetails?.lang || 'unknown';
      const formattedLanguage = formatLanguage(language);
      
      return {
        'Movie Title': rating.movieTitle,
        'Year': rating.movieYear || 'N/A',
        'Rating': getRatingLabel(rating.rating),
        'Language': formattedLanguage,
        'IMDb Rating': rating.movieDetails?.imdb || 'N/A',
        'Genres': rating.movieDetails?.genres?.join(', ') || 'N/A',
        'Rated On': new Date(rating.createdAt).toLocaleDateString(),
      };
    });

    console.log('📊 CSV Data prepared:', csvData.slice(0, 3)); // Log first 3 for verification

    const headers = Object.keys(csvData[0] || {}).join(',');
    const rows = csvData.map(row => Object.values(row).map(val => `"${val}"`).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    console.log('✅ CSV Generated with', csvData.length, 'rows');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-movie-ratings-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    console.log('✅ CSV file downloaded successfully');
  };

  // Filter ratings based on selected rating type
  const filteredRatings = ratingFilter === "all" 
    ? ratings 
    : ratings.filter(r => r.rating === ratingFilter);

  // Pagination
  const totalPages = Math.ceil(filteredRatings.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentRatings = filteredRatings.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [ratingFilter]);

  // Get rating emoji
  const getRatingEmoji = (rating: string) => {
    switch (rating) {
      case "amazing": return "🤩";
      case "good": return "😊";
      case "meh": return "😐";
      case "awful": return "😖";
      case "not-interested": return "❌";
      default: return "⭐";
    }
  };

  // Get rating color
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "amazing": return "bg-emerald-500";
      case "good": return "bg-sky-500";
      case "meh": return "bg-amber-500";
      case "awful": return "bg-rose-500";
      case "not-interested": return "bg-gray-500";
      default: return "bg-cyan-500";
    }
  };

  // Get rating label
  const getRatingLabel = (rating: string) => {
    return rating.charAt(0).toUpperCase() + rating.slice(1).replace('-', ' ');
  };

  // Format language name
  const formatLanguage = (lang: string | undefined) => {
    if (!lang) return 'Unknown';
    
    const languageMap: Record<string, string> = {
      'en': 'English',
      'hi': 'Hindi',
      'ta': 'Tamil',
      'te': 'Telugu',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'ko': 'Korean',
      'ja': 'Japanese',
      'it': 'Italian',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'zh': 'Chinese',
    };
    
    // If it's already a full name, return as is
    if (lang.length > 2) return lang;
    
    // Otherwise, map the code to full name
    return languageMap[lang.toLowerCase()] || lang.toUpperCase();
  };

  // Count by rating type
  const ratingCounts = {
    all: ratings.length,
    amazing: ratings.filter(r => r.rating === "amazing").length,
    good: ratings.filter(r => r.rating === "good").length,
    meh: ratings.filter(r => r.rating === "meh").length,
    awful: ratings.filter(r => r.rating === "awful").length,
    "not-interested": ratings.filter(r => r.rating === "not-interested").length,
    skipped: ratings.filter(r => r.rating === "skipped").length,
  };

  // Calculate total rated vs not interested vs skipped
  const totalRated = ratingCounts.amazing + ratingCounts.good + ratingCounts.meh + ratingCounts.awful;
  const totalNotInterested = ratingCounts["not-interested"];
  const totalSkipped = ratingCounts.skipped;

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto" />
          <p className="text-gray-400">Loading your rated movies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/rate">
            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Rating
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-white">My Ratings</h1>
            <p className="text-gray-400 mt-1">
              {totalRated} rated • {totalNotInterested} not interested • {totalSkipped} skipped
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-cyan-500 text-black text-lg px-4 py-2">
            {filteredRatings.length} {filteredRatings.length === 1 ? "item" : "items"}
          </Badge>
          <Button
            onClick={async () => {
              setExporting(true);
              await downloadCSV();
              setExporting(false);
            }}
            disabled={ratings.length === 0 || exporting}
            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filter Buttons */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-gray-400 mr-2">Filter by rating:</span>
            
            <Button
              variant={ratingFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setRatingFilter("all")}
              className={ratingFilter === "all" ? "bg-cyan-500 hover:bg-cyan-400 text-black" : "border-white/20 text-white hover:bg-white/10"}
            >
              All ({ratingCounts.all})
            </Button>
            
            <Button
              variant={ratingFilter === "amazing" ? "default" : "outline"}
              size="sm"
              onClick={() => setRatingFilter("amazing")}
              className={ratingFilter === "amazing" ? "bg-emerald-500 hover:bg-emerald-400 text-white" : "border-white/20 text-white hover:bg-white/10"}
            >
              🤩 Amazing ({ratingCounts.amazing})
            </Button>
            
            <Button
              variant={ratingFilter === "good" ? "default" : "outline"}
              size="sm"
              onClick={() => setRatingFilter("good")}
              className={ratingFilter === "good" ? "bg-sky-500 hover:bg-sky-400 text-white" : "border-white/20 text-white hover:bg-white/10"}
            >
              😊 Good ({ratingCounts.good})
            </Button>
            
            <Button
              variant={ratingFilter === "meh" ? "default" : "outline"}
              size="sm"
              onClick={() => setRatingFilter("meh")}
              className={ratingFilter === "meh" ? "bg-amber-500 hover:bg-amber-400 text-white" : "border-white/20 text-white hover:bg-white/10"}
            >
              😐 Meh ({ratingCounts.meh})
            </Button>
            
            <Button
              variant={ratingFilter === "awful" ? "default" : "outline"}
              size="sm"
              onClick={() => setRatingFilter("awful")}
              className={ratingFilter === "awful" ? "bg-rose-500 hover:bg-rose-400 text-white" : "border-white/20 text-white hover:bg-white/10"}
            >
              😖 Awful ({ratingCounts.awful})
            </Button>
            
            <Button
              variant={ratingFilter === "not-interested" ? "default" : "outline"}
              size="sm"
              onClick={() => setRatingFilter("not-interested")}
              className={ratingFilter === "not-interested" ? "bg-gray-500 hover:bg-gray-400 text-white" : "border-white/20 text-white hover:bg-white/10"}
            >
              ❌ Not Interested ({ratingCounts["not-interested"]})
            </Button>
            
            <Button
              variant={ratingFilter === "skipped" ? "default" : "outline"}
              size="sm"
              onClick={() => setRatingFilter("skipped")}
              className={ratingFilter === "skipped" ? "bg-indigo-500 hover:bg-indigo-400 text-white" : "border-white/20 text-white hover:bg-white/10"}
            >
              ⏭️ Skipped ({ratingCounts.skipped})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ratings List */}
      {currentRatings.length > 0 ? (
        <div className="space-y-6">
          {/* List View - Paginated Table-like Layout */}
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-3 bg-white/5 border-b border-white/10 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-1">Poster</div>
              <div className="col-span-4">Movie Title</div>
              <div className="col-span-2">Language</div>
              <div className="col-span-1">Year</div>
              <div className="col-span-2">Rating</div>
              <div className="col-span-1">Date</div>
            </div>
            
            {/* List Items */}
            <div className="divide-y divide-white/5">
              {currentRatings.map((rating, idx) => {
                const movieLanguage = rating.movieDetails?.language || rating.movieDetails?.lang || 'unknown';
                const formattedLang = formatLanguage(movieLanguage);
                
                return (
                  <motion.div
                    key={rating.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-white/5 transition-colors"
                  >
                    {/* Row Number */}
                    <div className="col-span-1 text-gray-500 font-mono text-sm">
                      {startIndex + idx + 1}
                    </div>
                    
                    {/* Poster Thumbnail */}
                    <div className="col-span-1">
                      <div className="relative w-10 h-14 rounded overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 flex-shrink-0">
                        {rating.movieDetails?.poster ? (
                          <Image
                            src={rating.movieDetails.poster}
                            alt={rating.movieTitle}
                            fill
                            className="object-cover"
                            loading="lazy"
                            sizes="40px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-lg">🎬</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Movie Title */}
                    <div className="col-span-4">
                      <h3 className="text-white font-medium text-sm line-clamp-1">
                        {rating.movieTitle}
                      </h3>
                      {/* Mobile: Show language & year inline */}
                      <div className="md:hidden flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-cyan-600/20 text-cyan-300 border-cyan-500/30">
                          {formattedLang}
                        </Badge>
                        {rating.movieYear && (
                          <span className="text-gray-500 text-xs">{rating.movieYear}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Language */}
                    <div className="col-span-2 hidden md:block">
                      <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-cyan-600/20 text-cyan-300 border-cyan-500/30">
                        {formattedLang}
                      </Badge>
                    </div>
                    
                    {/* Year */}
                    <div className="col-span-1 hidden md:block">
                      <span className="text-gray-400 text-sm">
                        {rating.movieYear || '—'}
                      </span>
                    </div>
                    
                    {/* Rating */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRatingColor(rating.rating)} text-white`}>
                          <span>{getRatingEmoji(rating.rating)}</span>
                          <span className="hidden sm:inline">{getRatingLabel(rating.rating)}</span>
                        </span>
                      </div>
                    </div>
                    
                    {/* Date Rated */}
                    <div className="col-span-1 hidden md:block">
                      <span className="text-gray-500 text-xs">
                        {new Date(rating.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-white/20 text-white hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              
              <div className="flex items-center gap-2">
                <span className="text-white">Page</span>
                <Badge className="bg-cyan-500 text-black font-bold px-3">
                  {currentPage}
                </Badge>
                <span className="text-gray-400">of</span>
                <span className="text-white font-semibold">{totalPages}</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-white/20 text-white hover:bg-white/10 disabled:opacity-30"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Page Info */}
          <div className="text-center text-sm text-gray-400">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredRatings.length)} of {filteredRatings.length} ratings
          </div>
        </div>
      ) : (
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="text-6xl">🎬</div>
              <h3 className="text-xl font-semibold text-white">
                {ratingFilter === "all" ? "No ratings yet" : `No ${ratingFilter} ratings`}
              </h3>
              <p className="text-gray-400">
                {ratingFilter === "all" 
                  ? "Start rating movies to see them here!"
                  : "Try selecting a different filter"}
              </p>
              <Link href="/rate">
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold mt-4">
                  Start Rating Movies
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Summary */}
      <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border-cyan-400/30">
        <CardHeader>
          <CardTitle className="text-white">Rating Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🤩</div>
              <div className="text-2xl font-bold text-white">{ratingCounts.amazing}</div>
              <div className="text-xs text-gray-300">Amazing</div>
            </div>
            
            <div className="bg-sky-500/20 border border-sky-400/30 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">😊</div>
              <div className="text-2xl font-bold text-white">{ratingCounts.good}</div>
              <div className="text-xs text-gray-300">Good</div>
            </div>
            
            <div className="bg-amber-500/20 border border-amber-400/30 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">😐</div>
              <div className="text-2xl font-bold text-white">{ratingCounts.meh}</div>
              <div className="text-xs text-gray-300">Meh</div>
            </div>
            
            <div className="bg-rose-500/20 border border-rose-400/30 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">😖</div>
              <div className="text-2xl font-bold text-white">{ratingCounts.awful}</div>
              <div className="text-xs text-gray-300">Awful</div>
            </div>
            
            <div className="bg-gray-500/20 border border-gray-400/30 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">❌</div>
              <div className="text-2xl font-bold text-white">{ratingCounts["not-interested"]}</div>
              <div className="text-xs text-gray-300">Not Interested</div>
            </div>
            
            <div className="bg-indigo-500/20 border border-indigo-400/30 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">⏭️</div>
              <div className="text-2xl font-bold text-white">{ratingCounts.skipped}</div>
              <div className="text-xs text-gray-300">Skipped</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

