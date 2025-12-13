"use client";

import { useState, useEffect } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieTitle: string;
  movieYear: number;
  movieId?: number;
}

interface Friend {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export function ShareModal({ isOpen, onClose, movieTitle, movieYear, movieId }: ShareModalProps) {
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [shared, setShared] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  // Load friends when modal opens
  useEffect(() => {
    if (isOpen) {
      loadFriends();
    } else {
      // Reset state when modal closes
      setSelectedFriends([]);
      setShared(false);
      setMessage("");
    }
  }, [isOpen]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/friends');
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
      } else {
        console.error('Failed to load friends');
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleShare = async () => {
    if (selectedFriends.length === 0 || !movieId) return;
    
    setSending(true);
    try {
      const response = await fetch('/api/friends/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          friendIds: selectedFriends,
          movieId,
          movieTitle,
          movieYear,
          message: message.trim() || `Check out ${movieTitle}!`,
        }),
      });

      if (response.ok) {
        setShared(true);
        setTimeout(() => {
          setShared(false);
          setSelectedFriends([]);
          setMessage("");
          onClose();
        }, 1500);
      } else {
        const error = await response.json();
        console.error('Failed to send recommendations:', error);
        alert('Failed to send recommendations. Please try again.');
      }
    } catch (error) {
      console.error('Error sending recommendations:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Helper function to get initials from name
  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md"
          >
            <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl shadow-2xl shadow-cyan-500/20 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h3 className="text-lg font-bold text-white">Share with friends</h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Movie Info */}
              <div className="px-6 py-3 bg-white/5 border-b border-white/10">
                <p className="text-sm text-gray-300">
                  <span className="font-semibold text-white">{movieTitle}</span>
                  <span className="text-gray-500"> ({movieYear})</span>
                </p>
              </div>

              {/* Message/Comment Input */}
              <div className="px-6 py-4 border-b border-white/10">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Add a message (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`I think you'll love ${movieTitle}! 🎬`}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                  rows={3}
                  maxLength={200}
                  disabled={sending}
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {message.length}/200
                </p>
              </div>

              {/* Friends List */}
              <div className="px-6 py-4 max-h-[300px] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                  </div>
                ) : friends.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm mb-4">You don't have any friends yet.</p>
                    <a
                      href="/friends"
                      className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                    >
                      Add friends →
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {friends.map((friend) => {
                      const isSelected = selectedFriends.includes(friend.id);
                      return (
                        <button
                          key={friend.id}
                          onClick={() => toggleFriend(friend.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                            isSelected
                              ? "bg-cyan-500/20 border-2 border-cyan-500"
                              : "bg-white/5 border-2 border-transparent hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="relative">
                              {friend.image ? (
                                <img
                                  src={friend.image}
                                  alt={friend.name || 'Friend'}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center font-bold text-black text-sm">
                                  {getInitials(friend.name)}
                                </div>
                              )}
                            </div>

                            {/* Name */}
                            <div className="text-left">
                              <p className="font-medium text-white">{friend.name || 'Friend'}</p>
                              <p className="text-xs text-gray-400">
                                {friend.email}
                              </p>
                            </div>
                          </div>

                          {/* Checkbox */}
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? "bg-cyan-500 border-cyan-500"
                                : "border-gray-600"
                            }`}
                          >
                            {isSelected && <Check className="w-4 h-4 text-black" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/10 flex gap-3">
                <button
                  onClick={onClose}
                  disabled={sending}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShare}
                  disabled={selectedFriends.length === 0 || shared || sending || !movieId}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                    selectedFriends.length > 0 && !shared && !sending && movieId
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-black hover:shadow-lg hover:shadow-cyan-500/50"
                      : "bg-gray-700 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {sending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </span>
                  ) : shared ? (
                    <span className="flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" />
                      Shared!
                    </span>
                  ) : (
                    `Share ${selectedFriends.length > 0 ? `(${selectedFriends.length})` : ""}`
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

