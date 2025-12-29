"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Glow } from "./Glow";
import { User, LogOut, Settings, ChevronDown, Search, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { label: "Home", path: "/" },
  { label: "Rate", path: "/rate" },
  { label: "Watchlist", path: "/watchlist" },
  { label: "Friends", path: "/friends" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/discover" });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;

    setIsSearching(true);
    
    // Navigate to discover page with search query
    router.push(`/discover?search=${encodeURIComponent(searchQuery.trim())}`);
    
    setIsSearching(false);
  };

  return (
    <div className="min-h-screen relative">
      <Glow />
      
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-black/30 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            {/* Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center font-bold text-black text-lg">
                CM
              </div>
              <div className="hidden md:block">
                <h1 className="text-xl font-bold text-white">CineVibe</h1>
                <p className="text-xs text-gray-400">
                  Discover & Rate Your Perfect Movies
                </p>
              </div>
            </div>

            {/* Search Bar - Only show if logged in - Click to navigate to Home page */}
            {session?.user && (
              <div 
                onClick={() => router.push('/')}
                className="flex-1 max-w-xl cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    router.push('/');
                  }
                }}
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <div
                    className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-lg text-gray-500 hover:border-cyan-400/50 transition-all"
                  >
                    Search movies, get AI recommendations...
                  </div>
                </div>
              </div>
            )}

            {/* User Menu - Only show if logged in */}
            {session?.user && (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/30 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center font-bold text-black text-sm">
                    {session.user.name?.charAt(0) || session.user.email?.charAt(0) || 'U'}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium text-white">{session.user.name || 'User'}</p>
                    <p className="text-xs text-gray-400">{session.user.email}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-56 rounded-lg bg-gray-900 border border-white/10 shadow-2xl overflow-hidden"
                    >
                      <div className="p-3 border-b border-white/10">
                        <p className="text-sm font-medium text-white truncate">{session.user.name || 'User'}</p>
                        <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
                      </div>

                      <div className="p-2 space-y-1">
                        <button
                          onClick={() => {
                            router.push('/profile');
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-white hover:bg-white/10 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Profile & Settings</span>
                        </button>

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Log Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Navigation Tabs - Only show if logged in */}
          {session?.user && (
            <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/50"
                        : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
