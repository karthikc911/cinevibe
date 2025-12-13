"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AIBotProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
}

export function AIBot({ onSearch, isSearching }: AIBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const handleSubmit = () => {
    if (query.trim()) {
      onSearch(query);
    }
  };

  return (
    <>
      {/* Collapsed State - Cute Bot Face */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed right-6 bottom-6 z-50"
          >
            <motion.button
              onClick={() => setIsOpen(true)}
              className="relative group"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
              
              {/* Bot Face Container */}
              <div className="relative w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-2xl flex items-center justify-center">
                {/* Cute Bot Face */}
                <div className="relative">
                  {/* Eyes */}
                  <div className="flex gap-2 mb-1">
                    <motion.div
                      className="w-2 h-2 bg-white rounded-full"
                      animate={{ scaleY: [1, 0.1, 1] }}
                      transition={{ repeat: Infinity, duration: 3, repeatDelay: 2 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-white rounded-full"
                      animate={{ scaleY: [1, 0.1, 1] }}
                      transition={{ repeat: Infinity, duration: 3, repeatDelay: 2 }}
                    />
                  </div>
                  {/* Smile */}
                  <motion.div
                    className="w-4 h-2 border-b-2 border-white rounded-b-full"
                    animate={{ scaleX: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                </div>
              </div>

              {/* Wave Hand */}
              <motion.div
                className="absolute -top-2 -right-2 text-2xl"
                animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, repeatDelay: 1 }}
              >
                👋
              </motion.div>

              {/* "Hi!" Speech Bubble */}
              <motion.div
                className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-purple-600 px-3 py-1 rounded-full text-sm font-bold shadow-lg"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: [0, 1, 1, 0], y: [5, 0, 0, -5] }}
                transition={{ repeat: Infinity, duration: 4, repeatDelay: 2 }}
              >
                Hi! 💬
              </motion.div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded State - Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, x: 400, y: 400 }}
            animate={{ scale: 1, opacity: 1, x: 0, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, x: 400, y: 400 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed right-6 bottom-6 z-50 w-96"
          >
            <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl border-purple-400/30 shadow-2xl">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">AI Assistant</h3>
                      <p className="text-xs text-gray-400">Ask me anything!</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-gray-400">
                  🎬 I can help you find movies based on your mood, preferences, or any specific criteria!
                </p>

                <div className="relative">
                  <textarea
                    placeholder="e.g., 'Find me a mind-bending thriller like Inception' or 'Show me best Korean dramas from 2023'"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    rows={4}
                    className="w-full bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-lg p-3 text-sm resize-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={!query.trim() || isSearching}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-semibold"
                >
                  {isSearching ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Searching...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Ask AI
                    </span>
                  )}
                </Button>

                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-gray-500 text-center">
                    💡 Be specific about genres, actors, or themes!
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

