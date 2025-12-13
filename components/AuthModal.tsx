"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";
import Link from "next/link";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-gray-900 to-black border-white/20 text-white p-0 rounded-2xl max-w-md w-[90vw] overflow-hidden">
        <div className="relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 p-8 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-5xl mb-4">🎬</div>
              <h2 className="text-3xl font-bold text-white mb-2">Join CineMate</h2>
              <p className="text-white/90 text-sm">
                Sign in to rate movies, get personalized recommendations, and more!
              </p>
            </motion.div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              <Link href="/login" className="block">
                <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold py-6 text-lg">
                  Log In
                </Button>
              </Link>
              
              <Link href="/signup" className="block">
                <Button variant="outline" className="w-full border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 font-semibold py-6 text-lg">
                  Sign Up
                </Button>
              </Link>
            </div>

            {/* Features */}
            <div className="pt-4 space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  ⭐
                </div>
                <span>Rate movies and build your taste profile</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  🤖
                </div>
                <span>Get AI-powered personalized recommendations</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  📚
                </div>
                <span>Create your watchlist and share with friends</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
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

