"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Rating } from "@/lib/store";

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRate: (rating: Rating) => void;
  movieTitle?: string;
}

const RATING_OPTIONS = [
  { 
    value: "awful" as Rating, 
    label: "Awful", 
    emoji: "😖",
    gradient: "from-rose-500/20 via-red-500/30 to-pink-500/20",
    hoverGradient: "from-rose-400/40 via-red-400/50 to-pink-400/40",
    border: "border-rose-400/40",
    hoverBorder: "border-rose-300/60"
  },
  { 
    value: "meh" as Rating, 
    label: "Meh", 
    emoji: "😐",
    gradient: "from-amber-500/20 via-yellow-500/30 to-orange-500/20",
    hoverGradient: "from-amber-400/40 via-yellow-400/50 to-orange-400/40",
    border: "border-amber-400/40",
    hoverBorder: "border-amber-300/60"
  },
  { 
    value: "good" as Rating, 
    label: "Good", 
    emoji: "😊",
    gradient: "from-sky-500/20 via-blue-500/30 to-cyan-500/20",
    hoverGradient: "from-sky-400/40 via-blue-400/50 to-cyan-400/40",
    border: "border-sky-400/40",
    hoverBorder: "border-sky-300/60"
  },
  { 
    value: "amazing" as Rating, 
    label: "Amazing", 
    emoji: "🤩",
    gradient: "from-emerald-500/20 via-green-500/30 to-teal-500/20",
    hoverGradient: "from-emerald-400/40 via-green-400/50 to-teal-400/40",
    border: "border-emerald-400/40",
    hoverBorder: "border-emerald-300/60"
  },
  { 
    value: "not-interested" as Rating, 
    label: "Not Interested", 
    emoji: "🚫",
    gradient: "from-purple-500/20 via-violet-500/30 to-purple-500/20",
    hoverGradient: "from-purple-400/40 via-violet-400/50 to-purple-400/40",
    border: "border-purple-400/40",
    hoverBorder: "border-purple-300/60"
  },
];

export function RatingModal({ isOpen, onClose, onRate, movieTitle }: RatingModalProps) {
  const handleRate = (rating: Rating) => {
    onRate(rating);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-sm"
          >
            <div className="bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-cyan-500/20 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
                <h3 className="text-lg font-bold text-white">Rate this movie</h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {movieTitle && (
                <div className="px-5 py-2 bg-white/5 border-b border-white/10">
                  <p className="text-sm text-gray-400 truncate">{movieTitle}</p>
                </div>
              )}

              {/* Rating Options */}
              <div className="p-5 space-y-3">
                {RATING_OPTIONS.map((option, index) => (
                  <motion.button
                    key={option.value}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleRate(option.value)}
                    className={`w-full group relative overflow-hidden rounded-xl border-2 ${option.border} hover:${option.hoverBorder} transition-all duration-300 hover:scale-[1.02] active:scale-95`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r ${option.gradient} group-hover:${option.hoverGradient} transition-all duration-300`} />
                    <div className="relative flex items-center gap-4 px-5 py-4">
                      <span className="text-3xl">{option.emoji}</span>
                      <span className="text-lg font-semibold text-white group-hover:text-white transition-colors">
                        {option.label}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

