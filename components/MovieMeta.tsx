"use client";

import { useState } from "react";
import { Movie } from "@/lib/data";
import { MatchReasoningModal } from "@/components/MatchReasoningModal";

interface MovieMetaProps {
  movie: Movie;
  onMatchClick?: () => void;
}

export function MovieMeta({ movie, onMatchClick }: MovieMetaProps) {
  const [showMatchModal, setShowMatchModal] = useState(false);

  // Handle click internally if no external handler provided
  const handleMatchClick = () => {
    if (onMatchClick) {
      onMatchClick();
    }
    setShowMatchModal(true);
  };

  // Expose the click handler through a global function
  if (typeof window !== 'undefined' && movie.matchPercent) {
    (window as any)[`openMatchModal_${movie.id}`] = handleMatchClick;
  }

  // Only render the modal, no duplicate UI elements
  return (
    <>
      {/* Match Reasoning Modal */}
      {movie.matchPercent && movie.matchReasons && (
        <MatchReasoningModal
          isOpen={showMatchModal}
          onClose={() => setShowMatchModal(false)}
          movieTitle={movie.title || (movie as any).name || ""}
          matchPercentage={movie.matchPercent}
          reasons={movie.matchReasons}
        />
      )}
    </>
  );
}

