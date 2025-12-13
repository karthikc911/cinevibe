"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check } from "lucide-react";

const LANGUAGES = [
  "English",
  "Hindi",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Korean",
  "Japanese",
  "Italian",
];

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [moviePreference, setMoviePreference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      // Check if user has already completed onboarding
      checkOnboardingStatus();
    }
  }, [status]);

  const checkOnboardingStatus = async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        if (data.user?.onboardingComplete) {
          // Already completed, redirect to home
          router.push("/");
          return;
        }
        // Pre-fill if they have existing preferences
        if (data.user?.languages?.length > 0) {
          setSelectedLanguages(data.user.languages);
        }
        if (data.user?.moviePreference) {
          setMoviePreference(data.user.moviePreference);
        }
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const handleSubmit = async () => {
    if (selectedLanguages.length === 0) {
      console.warn("Please select at least one language");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          languages: selectedLanguages,
          moviePreference: moviePreference.trim(),
        }),
      });

      if (response.ok) {
        router.push("/");
      } else {
        const error = await response.json();
        console.error(error.error || "Failed to save preferences");
      }
    } catch (error) {
      console.error("Onboarding error:", error);
      console.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl"
      >
        <Card className="bg-gradient-to-br from-gray-900 to-black border-cyan-400/30">
          <CardContent className="pt-8 pb-8 px-6">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center font-bold text-black text-2xl mx-auto mb-4">
                CM
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome to CineMate! 🎬
              </h1>
              <p className="text-gray-400">
                Let's personalize your movie experience
              </p>
            </div>

            {/* Language Selection */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">
                1. Which languages do you prefer?
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Select all languages you enjoy watching movies in
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {LANGUAGES.map((lang) => {
                  const isSelected = selectedLanguages.includes(lang);
                  return (
                    <motion.button
                      key={lang}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => toggleLanguage(lang)}
                      className={`relative px-4 py-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400 text-white"
                          : "bg-white/5 border-white/10 text-gray-300 hover:border-white/30"
                      }`}
                    >
                      <span className="font-medium">{lang}</span>
                      {isSelected && (
                        <Check className="absolute top-2 right-2 w-5 h-5 text-cyan-400" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
              {selectedLanguages.length > 0 && (
                <p className="text-sm text-cyan-400 mt-3">
                  ✓ {selectedLanguages.length} language{selectedLanguages.length > 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            {/* Movie Preference */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-white mb-4">
                2. Tell us about your movie taste (Optional)
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Share your favorite genres, directors, themes, or what you're looking for
              </p>
              <textarea
                value={moviePreference}
                onChange={(e) => setMoviePreference(e.target.value)}
                placeholder="e.g., I love sci-fi thrillers, Christopher Nolan films, movies with plot twists, indie dramas..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-colors resize-none"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-2">
                {moviePreference.length}/500 characters
              </p>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={selectedLanguages.length === 0 || isSubmitting}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue to CineMate
                  <span className="ml-2">→</span>
                </>
              )}
            </Button>

            {/* Skip Option */}
            <div className="text-center mt-4">
              <button
                onClick={() => router.push("/")}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Skip for now
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

