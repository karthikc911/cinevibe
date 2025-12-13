"use client";

import { useState } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { MovieCard } from "./MovieCard";
import { Movie } from "@/lib/data";
import { Rating } from "@/lib/store";

interface SwipeCardProps {
  movie: Movie;
  onSwipe: (direction: "like" | "dislike") => void;
}

export function SwipeCard({ movie, onSwipe }: SwipeCardProps) {
  const [exitX, setExitX] = useState(0);
  
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-30, 0, 30]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

  // Show Like/Dislike indicators based on swipe direction
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const dislikeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const swipeThreshold = 100;
    
    if (info.offset.x > swipeThreshold) {
      // Swipe right - Like
      setExitX(1000);
      onSwipe("like");
    } else if (info.offset.x < -swipeThreshold) {
      // Swipe left - Dislike
      setExitX(-1000);
      onSwipe("dislike");
    }
  };

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing flex items-center justify-center"
      style={{
        x,
        rotate,
        opacity,
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ scale: 1, opacity: 1 }}
      animate={exitX !== 0 ? { x: exitX, opacity: 0 } : { x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Like Indicator - Right Side */}
      <motion.div
        className="absolute top-8 right-8 z-20 px-6 py-3 rounded-2xl bg-green-500 border-4 border-white rotate-12 pointer-events-none"
        style={{ opacity: likeOpacity }}
      >
        <span className="text-3xl font-black text-white drop-shadow-lg">LIKE</span>
      </motion.div>

      {/* Dislike Indicator - Left Side */}
      <motion.div
        className="absolute top-8 left-8 z-20 px-6 py-3 rounded-2xl bg-red-500 border-4 border-white -rotate-12 pointer-events-none"
        style={{ opacity: dislikeOpacity }}
      >
        <span className="text-3xl font-black text-white drop-shadow-lg">NOPE</span>
      </motion.div>

      {/* Movie Card - Minimal for swipe */}
      <div className="pointer-events-none w-full max-h-full overflow-hidden">
        <MovieCard movie={movie} showActions={false} minimal={true} />
      </div>
    </motion.div>
  );
}

