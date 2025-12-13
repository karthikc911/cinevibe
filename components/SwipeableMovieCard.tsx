"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { MovieCard } from "./MovieCard";
import { MovieMeta } from "./MovieMeta";
import { Movie } from "@/lib/data";
import { Rating } from "@/lib/store";

interface SwipeableMovieCardProps {
  movie: Movie;
  onRate: (rating: Rating) => void;
  showInstructions?: boolean;
}

export function SwipeableMovieCard({ movie, onRate, showInstructions = false }: SwipeableMovieCardProps) {
  const [isSwiping, setIsSwiping] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Hide hint after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Transform values for visual feedback
  const rotate = useTransform(x, [-200, 0, 200], [-25, 0, 25]);
  const opacity = useTransform(
    x,
    [-200, -150, 0, 150, 200],
    [0.5, 1, 1, 1, 0.5]
  );

  const handleDragEnd = (_: any, info: any) => {
    const swipeThreshold = 100;
    const swipeVelocityThreshold = 500;

    const xOffset = info.offset.x;
    const yOffset = info.offset.y;
    const xVelocity = info.velocity.x;
    const yVelocity = info.velocity.y;

    // Determine if it's a valid swipe
    if (
      Math.abs(xOffset) > swipeThreshold ||
      Math.abs(xVelocity) > swipeVelocityThreshold ||
      Math.abs(yOffset) > swipeThreshold ||
      Math.abs(yVelocity) > swipeVelocityThreshold
    ) {
      // Swipe left - Awful
      if (xOffset < -swipeThreshold || xVelocity < -swipeVelocityThreshold) {
        onRate("awful");
        return;
      }

      // Swipe right - Good
      if (xOffset > swipeThreshold || xVelocity > swipeVelocityThreshold) {
        onRate("good");
        return;
      }

      // Swipe down - Not seen
      if (yOffset > swipeThreshold || yVelocity > swipeVelocityThreshold) {
        onRate("not-seen");
        return;
      }
    }

    // Reset position if no valid swipe
    x.set(0);
    y.set(0);
    setIsSwiping(false);
  };

  const handleTap = () => {
    // Tap for Amazing
    onRate("amazing");
  };

  // Show swipe indicators based on drag direction
  const showLeftIndicator = useTransform(x, (value) => value < -50);
  const showRightIndicator = useTransform(x, (value) => value > 50);
  const showDownIndicator = useTransform(y, (value) => value > 50);

  return (
    <div className="relative">
      {/* Swipe Indicators - Mobile only */}
      <div className="lg:hidden absolute inset-0 pointer-events-none z-0">
        {/* Left - Awful */}
        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-red-500 text-white px-4 py-2 rounded-r-lg font-bold opacity-0"
          style={{ opacity: useTransform(x, [-200, -50, 0], [1, 0.5, 0]) }}
        >
          👎 Awful
        </motion.div>

        {/* Right - Good */}
        <motion.div
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-green-500 text-white px-4 py-2 rounded-l-lg font-bold opacity-0"
          style={{ opacity: useTransform(x, [0, 50, 200], [0, 0.5, 1]) }}
        >
          👍 Good
        </motion.div>

        {/* Down - Not Seen */}
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-gray-500 text-white px-4 py-2 rounded-t-lg font-bold opacity-0"
          style={{ opacity: useTransform(y, [0, 50, 200], [0, 0.5, 1]) }}
        >
          👁️ Not Seen
        </motion.div>

        {/* Center - Tap for Amazing - show briefly on first load */}
        {!isSwiping && showHint && (
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-500/90 backdrop-blur-sm text-black px-4 py-2 rounded-lg font-bold pointer-events-none shadow-lg"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.8, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
          >
            Tap → 🌟 Amazing
          </motion.div>
        )}
      </div>

      {/* Swipeable Card - Mobile */}
      <motion.div
        ref={cardRef}
        className="lg:hidden relative z-10 cursor-grab active:cursor-grabbing touch-none"
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.7}
        style={{ x, y, rotate, opacity }}
        onDragStart={() => setIsSwiping(true)}
        onDragEnd={handleDragEnd}
        onTap={handleTap}
        whileTap={{ scale: 0.95 }}
      >
        <div className="pointer-events-none">
          <MovieCard movie={movie} showActions={false} />
        </div>
      </motion.div>

      {/* Static Card - Desktop */}
      <div className="hidden lg:block">
        <MovieCard movie={movie} showActions={false} />
      </div>

      {/* Movie Meta - Always visible */}
      <div className="mt-3">
        <MovieMeta movie={movie} />
      </div>

      {/* Instructions for mobile - show on first card only */}
      {showInstructions && (
        <motion.div
          className="lg:hidden mt-2 p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-xs text-cyan-300 text-center font-medium">
            ← Swipe left: Awful | Swipe right: Good →<br />
            ↓ Swipe down: Not Seen | Tap: Amazing 🌟
          </p>
        </motion.div>
      )}
    </div>
  );
}

