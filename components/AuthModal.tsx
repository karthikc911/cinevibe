"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Link from "next/link";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  // Prevent body scroll on mobile when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-gray-900 to-black border-white/20 text-white p-0 rounded-2xl max-w-md w-[95vw] sm:w-[90vw] overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="relative">
          {/* Close button - Larger touch target on mobile */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 md:top-4 md:right-4 z-10 p-2 md:p-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 p-6 md:p-8 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-4xl md:text-5xl mb-3 md:mb-4">🎬</div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Join CineVibe</h2>
              <p className="text-white/90 text-sm md:text-sm">
                Sign in to rate movies, get personalized recommendations, and more!
              </p>
            </motion.div>
          </div>

          {/* Content */}
          <div className="p-5 md:p-6 space-y-4">
            <div className="space-y-3">
              <Link href="/login" className="block">
                <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 active:from-cyan-600 active:to-blue-600 text-white font-semibold py-6 text-base md:text-lg min-h-[52px] md:min-h-[56px]">
                  Log In
                </Button>
              </Link>
              
              <Link href="/signup" className="block">
                <Button variant="outline" className="w-full border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 active:bg-cyan-400/20 font-semibold py-6 text-base md:text-lg min-h-[52px] md:min-h-[56px]">
                  Sign Up
                </Button>
              </Link>
            </div>

            {/* Features */}
            <div className="pt-4 space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-9 h-9 md:w-8 md:h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  ⭐
                </div>
                <span>Rate movies and build your taste profile</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-9 h-9 md:w-8 md:h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  🤖
                </div>
                <span>Get AI-powered personalized recommendations</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-9 h-9 md:w-8 md:h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  📚
                </div>
                <span>Create your watchlist and share with friends</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              <p className="text-xs text-gray-500 text-center">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
