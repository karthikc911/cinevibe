"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Movie } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Rating } from "@/lib/store";
import { ExternalLink, Plus, Share2 } from "lucide-react";
import { MovieMeta } from "@/components/MovieMeta";

interface MovieCardProps {
  movie: Movie;
  onAddToWatchlist?: () => void;
  onRate?: (rating: Rating) => void;
  showActions?: boolean;
  minimal?: boolean;
  enableAIEnrichment?: boolean;
  compactMode?: boolean;
}

export function MovieCard({
  movie,
  onAddToWatchlist,
  onRate,
  showActions = true,
  minimal = false,
  enableAIEnrichment = false,
  compactMode = false,
}: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichedMovie, setEnrichedMovie] = useState<Movie>(movie);

  // Check if poster URL is valid
  const hasPoster = movie.poster && movie.poster.trim() !== '';

  // Convert language code to full name
  const getFullLanguageName = (code: string): string => {
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
    return languageMap[code.toLowerCase()] || code.toUpperCase();
  };

  // Format rating to 1 decimal
  const formatRating = (rating: number | string | undefined) => {
    if (!rating) return null;
    const num = typeof rating === 'string' ? parseFloat(rating) : rating;
    return num.toFixed(1);
  };

  // Format large numbers (budget, box office, vote count)
  const formatNumber = (num: number | null | undefined) => {
    if (!num) return null;
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Google search link
  const googleSearchLink = `https://www.google.com/search?q=${encodeURIComponent(movie.title + ' ' + (movie.year || ''))}`;

  // Check if movie has AI-enriched data
  const isEnriched = !!((enrichedMovie as any).imdbVoterCount || (enrichedMovie as any).userReviewSummary || (enrichedMovie as any).budget || (enrichedMovie as any).boxOffice);

  // Handle AI enrichment
  const handleEnrich = async () => {
    if (isEnriching || isEnriched) return;
    
    setIsEnriching(true);
    try {
      const response = await fetch(`/api/movies/enrich/${movie.id}`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setEnrichedMovie(data.movie);
      }
    } catch (error) {
      console.error('Failed to enrich movie:', error);
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <motion.div
      className="group relative rounded-2xl overflow-hidden bg-gradient-to-b from-white/5 to-transparent border border-white/10 hover:border-cyan-400/50 transition-all"
      whileHover={{ y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      data-testid={`movie-card-${movie.id}`}
    >
      {/* Poster - Adaptive Size */}
      <div className={`relative w-full overflow-hidden bg-gray-900 ${compactMode ? 'h-64' : 'h-48'}`}>
        {hasPoster && !imageError ? (
          <Image
            src={movie.poster}
            alt={`${movie.title} poster`}
            fill
            className="object-cover object-top"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-gray-500">
            <div className="text-center p-4">
              <div className="text-3xl mb-1">🎬</div>
              <div className="text-xs font-medium line-clamp-2">{movie.title}</div>
            </div>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />

        {/* Top Badges */}
        {!minimal && (
          <>
            {/* Language Badge - Top Left */}
            <Badge
              variant="secondary"
              className="absolute top-2 left-2 text-xs bg-black/70 backdrop-blur-sm text-white border border-white/20 font-medium z-10"
            >
              {getFullLanguageName(movie.language || movie.lang || 'en')}
            </Badge>

            {/* Movie/TV Type Badge - Below Language Badge */}
            {((movie as any).type || (movie as any).mediaType) && (
              <Badge
                variant="secondary"
                className={`absolute top-8 left-2 text-xs backdrop-blur-sm border font-medium z-10 ${
                  ((movie as any).type === 'tvshow' || (movie as any).mediaType === 'tv')
                    ? 'bg-purple-600/90 border-purple-400/50 text-white'
                    : 'bg-cyan-600/90 border-cyan-400/50 text-white'
                }`}
              >
                <div className="flex items-center gap-1">
                  {((movie as any).type === 'tvshow' || (movie as any).mediaType === 'tv') ? (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="2" y="7" width="20" height="15" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="17 2 12 7 7 2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>TV</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="7" y1="2" x2="7" y2="22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="17" y1="2" x2="17" y2="22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="2" y1="12" x2="22" y2="12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="2" y1="7" x2="7" y2="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="2" y1="17" x2="7" y2="17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="17" y1="17" x2="22" y2="17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <line x1="17" y1="7" x2="22" y2="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Movie</span>
                    </>
                  )}
                </div>
              </Badge>
            )}

            {/* Match Percentage Badge - Top Right (Clickable) */}
            {movie.matchPercent && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof window !== 'undefined') {
                    (window as any)[`openMatchModal_${movie.id}`]?.();
                  }
                }}
                className="absolute top-2 right-2 px-2 py-1 rounded-full bg-gradient-to-r from-cyan-500/90 to-blue-500/90 border-2 border-cyan-400/80 backdrop-blur-sm z-10 hover:from-cyan-500 hover:to-blue-500 hover:border-cyan-300 transition-all duration-200 cursor-pointer group shadow-lg hover:shadow-cyan-500/50 hover:scale-105"
                title="Click to see match reasoning"
              >
                <span className="text-white text-xs font-bold flex items-center gap-1">
                  💯 {movie.matchPercent}%
                  <svg className="w-3 h-3 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                    <line x1="12" y1="16" x2="12" y2="12" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="8" r="0.5" fill="currentColor" strokeWidth="1"/>
                  </svg>
                </span>
              </button>
            )}
          </>
        )}

      </div>

      {/* Movie Metadata Section */}
      <div className="p-3 space-y-2">
        {/* Title and Year */}
        <div>
          <h3 className="font-bold text-white text-sm line-clamp-2">
            {movie.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            {movie.year && (
              <span className="text-xs text-gray-400">{movie.year}</span>
            )}
            {movie.genres && movie.genres.length > 0 && (
              <span className="text-xs text-cyan-400">• {movie.genres.slice(0, 2).join(', ')}</span>
            )}
          </div>
        </div>

        {/* IMDB Rating, Vote Count & Google Link - Single Row */}
        {!minimal && ((enrichedMovie as any).imdb || (enrichedMovie as any).imdbRating || (enrichedMovie as any).imdbVoterCount) && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* IMDB Rating with Vote Count */}
            {((enrichedMovie as any).imdb || (enrichedMovie as any).imdbRating) && (
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-500/20 border border-yellow-500/30">
                <span className="text-yellow-400 text-lg">★</span>
                <div className="flex flex-col">
                  <span className="text-yellow-300 text-sm font-bold leading-none">
                    {formatRating((enrichedMovie as any).imdbRating || (enrichedMovie as any).imdb)}/10
                  </span>
                  {(enrichedMovie as any).imdbVoterCount && (
                    <span className="text-yellow-400/70 text-[9px] leading-none mt-0.5">
                      {formatNumber((enrichedMovie as any).imdbVoterCount)} votes
                    </span>
                  )}
                </div>
                <span className="text-yellow-400/60 text-[9px] ml-1">IMDB</span>
              </div>
            )}
            {/* Just vote count if no rating */}
            {!((enrichedMovie as any).imdb || (enrichedMovie as any).imdbRating) && (enrichedMovie as any).imdbVoterCount && (
              <div className="px-2 py-1 rounded bg-yellow-500/20 text-xs font-semibold text-yellow-300">
                {formatNumber((enrichedMovie as any).imdbVoterCount)} votes
              </div>
            )}

            {/* Google Search Link - Beside IMDB */}
            <a
              href={googleSearchLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/95 hover:bg-white text-black transition-all shadow-md hover:shadow-lg transform hover:scale-105 cursor-pointer"
              title={`Search "${movie.title}" on Google`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-[11px] font-semibold">Google</span>
            </a>
          </div>
        )}

        {/* Plot Summary (spoiler-free) - NO TRUNCATION */}
        {enrichedMovie.summary && (
          <div className="space-y-1">
            <p className="text-xs text-gray-300 leading-relaxed">
              {enrichedMovie.summary}
            </p>
          </div>
        )}

        {/* User Review Summary from IMDB - Full Text */}
        {enrichedMovie.userReviewSummary && enrichedMovie.userReviewSummary !== enrichedMovie.summary && (
          <div className="space-y-1 p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
            <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wide">
              User Reviews (IMDB)
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              {enrichedMovie.userReviewSummary}
            </p>
          </div>
        )}

        {/* Budget and Box Office - HIGHLIGHTED */}
        {(enrichedMovie.budget || enrichedMovie.boxOffice) && (
          <div className="grid grid-cols-2 gap-2 p-2 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg border border-green-500/20">
            {enrichedMovie.budget && (
              <div className="text-center">
                <div className="text-[9px] font-semibold text-green-400 uppercase tracking-wide">
                  Budget
                </div>
                <div className="text-sm font-bold text-green-300 mt-0.5">
                  {formatNumber(enrichedMovie.budget)}
                </div>
              </div>
            )}
            {enrichedMovie.boxOffice && (
              <div className="text-center">
                <div className="text-[9px] font-semibold text-blue-400 uppercase tracking-wide">
                  Box Office
                </div>
                <div className="text-sm font-bold text-blue-300 mt-0.5">
                  {formatNumber(enrichedMovie.boxOffice)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {/* AI Enrichment Button - Only show if not enriched and enabled */}
          {enableAIEnrichment && !isEnriched && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEnrich();
              }}
              disabled={isEnriching}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-400/30 transition-all text-xs shadow-sm disabled:opacity-50"
              title="Generate AI Details (IMDB ratings, reviews, budget, etc.)"
            >
              {isEnriching ? (
                <>
                  <svg className="w-3.5 h-3.5 text-cyan-300 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-white/90 font-medium">Loading...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="text-white/90 font-medium text-[10px]">AI Details</span>
                </>
              )}
            </button>
          )}

          {/* Watchlist Button - Plus Icon - Always Visible */}
          {onAddToWatchlist && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToWatchlist();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-400/30 transition-all text-xs shadow-sm"
              data-testid="add-to-watchlist"
              title="Add to Watchlist"
            >
              <Plus className="w-3.5 h-3.5 text-purple-300 font-bold" strokeWidth={2.5} />
              <span className="text-white/90 font-medium">Watchlist</span>
            </button>
          )}

          {/* Share Button - Instagram Style - Always Visible */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Implement share functionality
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-yellow-500/20 via-pink-500/20 to-purple-500/20 hover:from-yellow-500/30 hover:via-pink-500/30 hover:to-purple-500/30 border border-pink-400/30 transition-all shadow-sm"
            title="Share with Friends"
          >
            <Share2 className="w-3.5 h-3.5 text-pink-300" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Rating Panel - Shows below card on hover */}
      <AnimatePresence>
        {showActions && onRate && isHovered && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-gradient-to-b from-black/40 via-black/60 to-black/80 backdrop-blur-md border-t border-white/10">
              {/* Rating Options - Curved Arc */}
              <div className="relative flex items-end justify-center gap-2" style={{ height: '110px' }}>
                {/* Awful */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRate("awful");
                  }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500/30 via-red-500/40 to-pink-500/30 hover:from-rose-400/50 hover:via-red-400/60 hover:to-pink-400/50 border border-rose-400/30 hover:border-rose-300/50 text-rose-100 transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-rose-300/40 shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:shadow-[0_0_25px_rgba(244,63,94,0.5)] flex items-center justify-center font-semibold text-xs backdrop-blur-md"
                  style={{ marginBottom: '32px' }}
                >
                  <span className="leading-tight drop-shadow-lg">Awful</span>
                </button>

                {/* Meh */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRate("meh");
                  }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/30 via-yellow-500/40 to-orange-500/30 hover:from-amber-400/50 hover:via-yellow-400/60 hover:to-orange-400/50 border border-amber-400/30 hover:border-amber-300/50 text-amber-100 transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-300/40 shadow-[0_0_15px_rgba(251,191,36,0.3)] hover:shadow-[0_0_25px_rgba(251,191,36,0.5)] flex items-center justify-center font-semibold text-xs backdrop-blur-md"
                  style={{ marginBottom: '16px' }}
                >
                  <span className="leading-tight drop-shadow-lg">Meh</span>
                </button>

                {/* Good */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRate("good");
                  }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-500/30 via-blue-500/40 to-cyan-500/30 hover:from-sky-400/50 hover:via-blue-400/60 hover:to-cyan-400/50 border border-sky-400/30 hover:border-sky-300/50 text-sky-100 transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-300/40 shadow-[0_0_15px_rgba(56,189,248,0.3)] hover:shadow-[0_0_25px_rgba(56,189,248,0.5)] flex items-center justify-center font-semibold text-xs backdrop-blur-md"
                  style={{ marginBottom: '16px' }}
                >
                  <span className="leading-tight drop-shadow-lg">Good</span>
                </button>

                {/* Amazing */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRate("amazing");
                  }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/30 via-green-500/40 to-teal-500/30 hover:from-emerald-400/50 hover:via-green-400/60 hover:to-teal-400/50 border border-emerald-400/30 hover:border-emerald-300/50 text-emerald-100 transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 shadow-[0_0_15px_rgba(52,211,153,0.3)] hover:shadow-[0_0_25px_rgba(52,211,153,0.5)] flex items-center justify-center font-semibold text-xs backdrop-blur-md"
                  style={{ marginBottom: '32px' }}
                >
                  <span className="leading-tight drop-shadow-lg">Amazing</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-2 mt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRate("not-seen");
                  }}
                  className="px-4 py-1.5 rounded-md bg-gradient-to-r from-slate-600/40 via-gray-600/50 to-slate-600/40 hover:from-slate-500/60 hover:via-gray-500/70 hover:to-slate-500/60 border border-slate-500/30 hover:border-slate-400/50 text-slate-200 hover:text-white transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-slate-400/40 shadow-md text-xs font-medium backdrop-blur-md"
                >
                  Not Seen
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRate("not-interested");
                  }}
                  className="px-4 py-1.5 rounded-md bg-gradient-to-r from-purple-600/40 via-violet-600/50 to-purple-600/40 hover:from-purple-500/60 hover:via-violet-500/70 hover:to-purple-500/60 border border-purple-500/30 hover:border-purple-400/50 text-purple-200 hover:text-white transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-400/40 shadow-md text-xs font-medium backdrop-blur-md"
                >
                  Not Interested
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MovieMeta Component - Only for Modal, no visible UI */}
      {!minimal && movie.matchPercent && (
        <MovieMeta movie={enrichedMovie} />
      )}
    </motion.div>
  );
}
