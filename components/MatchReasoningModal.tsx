"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Star, TrendingUp, Calendar, Globe, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MatchReason {
  factor: string;
  score: number;
  description: string;
  icon: "heart" | "star" | "trending" | "calendar" | "globe" | "sparkles";
}

interface MatchReasoningModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieTitle: string;
  matchPercentage: number;
  reasons: MatchReason[];
}

export function MatchReasoningModal({
  isOpen,
  onClose,
  movieTitle,
  matchPercentage,
  reasons
}: MatchReasoningModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case "heart":
        return Heart;
      case "star":
        return Star;
      case "trending":
        return TrendingUp;
      case "calendar":
        return Calendar;
      case "globe":
        return Globe;
      case "sparkles":
        return Sparkles;
      default:
        return Sparkles;
    }
  };

  const getColor = (score: number) => {
    if (score >= 25) return "text-green-400";
    if (score >= 15) return "text-cyan-400";
    if (score >= 10) return "text-yellow-400";
    return "text-gray-400";
  };

  const getBgColor = (score: number) => {
    if (score >= 25) return "bg-green-500/20 border-green-400/30";
    if (score >= 15) return "bg-cyan-500/20 border-cyan-400/30";
    if (score >= 10) return "bg-yellow-500/20 border-yellow-400/30";
    return "bg-gray-500/20 border-gray-400/30";
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm -z-10" />

          {/* Modal - Compact Size */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md my-8 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="bg-gradient-to-br from-purple-900/95 via-blue-900/95 to-pink-900/95 backdrop-blur-xl border border-purple-500/30 shadow-2xl">
              <CardContent className="p-0">
                {/* Scrollable Content - Compact */}
                <div className="max-h-[70vh] overflow-y-auto">
                  <div className="p-4">
                  {/* Header - Compact */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-white mb-1">
                        Why This Match?
                      </h2>
                      <p className="text-gray-300 text-sm line-clamp-1">
                        {movieTitle}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                      }}
                      className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white hover:text-red-400"
                      aria-label="Close modal"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Match Score - Compact */}
                  <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Overall Match</p>
                        <p className="text-3xl font-bold text-white">
                          {matchPercentage}%
                        </p>
                      </div>
                      <div className="relative w-16 h-16">
                        <svg className="transform -rotate-90 w-16 h-16">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="5"
                            fill="none"
                            className="text-gray-700"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="5"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 28}`}
                            strokeDashoffset={`${
                              2 * Math.PI * 28 * (1 - matchPercentage / 100)
                            }`}
                            style={{
                              stroke: matchPercentage >= 80 ? "#4ade80" : 
                                      matchPercentage >= 60 ? "#22d3ee" : "#fbbf24"
                            }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Breakdown - Concise */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-white/70 mb-2">
                      Why We Recommend This
                    </h3>
                    {reasons.map((reason, index) => {
                      const Icon = getIcon(reason.icon);
                      return (
                        <div
                          key={reason.factor}
                          className="flex items-start gap-2 p-2 rounded-lg bg-white/5 border border-white/10"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            <Icon className={`w-4 h-4 ${getColor(reason.score)}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-300">
                              {reason.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

