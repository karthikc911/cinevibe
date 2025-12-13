"use client";

import { useEffect } from "react";
import { Rating } from "@/lib/store";

interface RatingPillsProps {
  onRate: (rating: Rating) => void;
  movieId?: number;
  layoutMode?: "inline" | "u-shape";
}

const RATING_OPTIONS = [
  { value: "awful" as Rating, label: "Awful", key: "1" },
  { value: "meh" as Rating, label: "Meh", key: "2" },
  { value: "good" as Rating, label: "Good", key: "3" },
  { value: "amazing" as Rating, label: "Amazing", key: "4" },
];

const ACTION_OPTIONS = [
  { value: "not-seen" as Rating, label: "Not Seen", key: "5" },
  { value: "not-interested" as Rating, label: "Not Interested", key: "6" },
];

export function RatingPills({ onRate, movieId, layoutMode = "inline" }: RatingPillsProps) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const allOptions = [...RATING_OPTIONS, ...ACTION_OPTIONS];
      const option = allOptions.find((r) => r.key === e.key);
      if (option) {
        onRate(option.value);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [onRate]);

  if (layoutMode === "u-shape") {
    // Curved layout for Rate page with radiant, elegant colors
    return (
      <div className="relative w-full max-w-2xl mx-auto space-y-2" data-testid="rating-pills">
        {/* Rating Options - Curved Arc Layout */}
        <div className="relative flex items-end justify-center gap-3" style={{ height: '140px' }}>
          {/* Awful - Left side, elevated */}
          <button
            onClick={() => onRate(RATING_OPTIONS[0].value)}
            data-testid={`rating-${RATING_OPTIONS[0].value}`}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-500/30 via-red-500/40 to-pink-500/30 hover:from-rose-400/50 hover:via-red-400/60 hover:to-pink-400/50 border border-rose-400/30 hover:border-rose-300/50 text-rose-100 transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-rose-300/40 shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_30px_rgba(244,63,94,0.5)] flex items-center justify-center font-semibold text-sm backdrop-blur-md"
            style={{ marginBottom: '40px' }}
            aria-label={`Rate as ${RATING_OPTIONS[0].label}`}
          >
            <span className="leading-tight drop-shadow-lg">{RATING_OPTIONS[0].label}</span>
          </button>

          {/* Meh - Slightly elevated */}
          <button
            onClick={() => onRate(RATING_OPTIONS[1].value)}
            data-testid={`rating-${RATING_OPTIONS[1].value}`}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/30 via-yellow-500/40 to-orange-500/30 hover:from-amber-400/50 hover:via-yellow-400/60 hover:to-orange-400/50 border border-amber-400/30 hover:border-amber-300/50 text-amber-100 transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-300/40 shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_30px_rgba(251,191,36,0.5)] flex items-center justify-center font-semibold text-sm backdrop-blur-md"
            style={{ marginBottom: '20px' }}
            aria-label={`Rate as ${RATING_OPTIONS[1].label}`}
          >
            <span className="leading-tight drop-shadow-lg">{RATING_OPTIONS[1].label}</span>
          </button>

          {/* Good - Slightly elevated */}
          <button
            onClick={() => onRate(RATING_OPTIONS[2].value)}
            data-testid={`rating-${RATING_OPTIONS[2].value}`}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-500/30 via-blue-500/40 to-cyan-500/30 hover:from-sky-400/50 hover:via-blue-400/60 hover:to-cyan-400/50 border border-sky-400/30 hover:border-sky-300/50 text-sky-100 transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-300/40 shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:shadow-[0_0_30px_rgba(56,189,248,0.5)] flex items-center justify-center font-semibold text-sm backdrop-blur-md"
            style={{ marginBottom: '20px' }}
            aria-label={`Rate as ${RATING_OPTIONS[2].label}`}
          >
            <span className="leading-tight drop-shadow-lg">{RATING_OPTIONS[2].label}</span>
          </button>

          {/* Amazing - Right side, elevated */}
          <button
            onClick={() => onRate(RATING_OPTIONS[3].value)}
            data-testid={`rating-${RATING_OPTIONS[3].value}`}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/30 via-green-500/40 to-teal-500/30 hover:from-emerald-400/50 hover:via-green-400/60 hover:to-teal-400/50 border border-emerald-400/30 hover:border-emerald-300/50 text-emerald-100 transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:shadow-[0_0_30px_rgba(52,211,153,0.5)] flex items-center justify-center font-semibold text-sm backdrop-blur-md"
            style={{ marginBottom: '40px' }}
            aria-label={`Rate as ${RATING_OPTIONS[3].label}`}
          >
            <span className="leading-tight drop-shadow-lg">{RATING_OPTIONS[3].label}</span>
          </button>
        </div>

        {/* Action Buttons Below */}
        <div className="flex items-center justify-center gap-3">
          {/* Not Seen */}
          <button
            onClick={() => onRate(ACTION_OPTIONS[0].value)}
            data-testid={`rating-${ACTION_OPTIONS[0].value}`}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-slate-600/40 via-gray-600/50 to-slate-600/40 hover:from-slate-500/60 hover:via-gray-500/70 hover:to-slate-500/60 border border-slate-500/30 hover:border-slate-400/50 text-slate-200 hover:text-white transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-slate-400/40 shadow-md text-sm font-medium backdrop-blur-md"
            aria-label={`Mark as ${ACTION_OPTIONS[0].label}`}
          >
            {ACTION_OPTIONS[0].label}
          </button>
          
          {/* Not Interested - Different color */}
          <button
            onClick={() => onRate(ACTION_OPTIONS[1].value)}
            data-testid={`rating-${ACTION_OPTIONS[1].value}`}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600/40 via-violet-600/50 to-purple-600/40 hover:from-purple-500/60 hover:via-violet-500/70 hover:to-purple-500/60 border border-purple-500/30 hover:border-purple-400/50 text-purple-200 hover:text-white transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-400/40 shadow-md text-sm font-medium backdrop-blur-md"
            aria-label={`Mark as ${ACTION_OPTIONS[1].label}`}
          >
            {ACTION_OPTIONS[1].label}
          </button>
        </div>
      </div>
    );
  }

  // Default inline layout
  const allOptions = [...RATING_OPTIONS, ...ACTION_OPTIONS];
  return (
    <div className="flex gap-2 flex-wrap justify-center" data-testid="rating-pills">
      {allOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onRate(option.value)}
          data-testid={`rating-${option.value}`}
          className="px-4 py-2.5 lg:py-2 rounded-lg bg-white/10 hover:bg-cyan-500 active:bg-cyan-400 border border-white/20 hover:border-cyan-400 text-sm font-semibold text-white hover:text-black active:text-black transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-lg touch-manipulation min-h-[44px] lg:min-h-0"
          aria-label={`Rate as ${option.label}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

