"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Glow } from "./Glow";
import { MobileTabBar } from "./MobileTabBar";
import { User, LogOut, Settings, ChevronDown, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { label: "Home", path: "/" },
  { label: "Rate", path: "/rate" },
  { label: "Watchlist", path: "/watchlist" },
  { label: "Friends", path: "/friends" },
] as const;

// Paths where mobile tab bar should be hidden
const HIDE_TAB_BAR_PATHS = [
  "/login",
  "/signup",
  "/onboarding",
  "/discover",
  "/fix-movies",
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Determine if mobile tab bar should be shown
  const showMobileTabBar = useMemo(() => {
    if (!session?.user) return false;
    if (HIDE_TAB_BAR_PATHS.some(path => pathname?.startsWith(path))) return false;
    if (pathname?.startsWith("/admin")) return false;
    return true;
  }, [session, pathname]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/discover" });
  };

  return (
    <div className="min-h-screen relative">
      <Glow />
      
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-black/30 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-4 mb-0 md:mb-4">
            {/* Logo */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center font-bold text-black text-sm md:text-lg">
                CM
              </div>
              <div className="block">
                <h1 className="text-base md:text-xl font-bold text-white">CineVibe</h1>
                <p className="text-[10px] md:text-xs text-gray-400 hidden sm:block">
                  Discover & Rate Your Perfect Movies
                </p>
              </div>
            </div>

            {/* Search Entry Point - Mobile - Click to navigate to Home page */}
            {session?.user && (
              <div 
                onClick={() => router.push('/')}
                className="flex-1 max-w-xl cursor-pointer md:block"
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    router.push('/');
                  }
                }}
              >
                <div className="relative">
                  <Search className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  <div className="w-full pl-8 md:pl-10 pr-3 md:pr-10 py-2 md:py-2.5 bg-white/5 border border-white/10 rounded-lg text-gray-500 hover:border-cyan-400/50 transition-all text-xs md:text-sm">
                    <span className="hidden sm:inline">Search movies, get AI recommendations...</span>
                    <span className="sm:hidden">Search...</span>
                  </div>
                </div>
              </div>
            )}

            {/* User Menu - Only show if logged in */}
            {session?.user && (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/30 transition-all min-h-[44px]"
                  aria-label="User menu"
                  aria-expanded={userMenuOpen}
                >
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center font-bold text-black text-xs md:text-sm">
                    {session.user.name?.charAt(0) || session.user.email?.charAt(0) || 'U'}
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-sm font-medium text-white">{session.user.name || 'User'}</p>
                    <p className="text-xs text-gray-400">{session.user.email}</p>
                  </div>
                  <ChevronDown className={`w-3 h-3 md:w-4 md:h-4 text-gray-400 transition-transform hidden sm:block ${userMenuOpen ? 'rotate-180' : ''}`} />
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
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-white hover:bg-white/10 transition-colors min-h-[44px]"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Profile & Settings</span>
                        </button>

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-red-400 hover:bg-red-500/10 transition-colors min-h-[44px]"
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

          {/* Desktop Navigation Tabs - Hidden on mobile, shown on md+ */}
          {session?.user && (
            <nav className="hidden md:flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all min-h-[44px] ${
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

      {/* Main Content with bottom padding on mobile when tab bar is visible */}
      <main 
        className={`relative z-10 max-w-7xl mx-auto px-4 py-4 md:py-8 ${
          showMobileTabBar ? 'pb-20 md:pb-8' : ''
        }`}
        style={{
          paddingBottom: showMobileTabBar 
            ? 'calc(5rem + env(safe-area-inset-bottom, 0px))' 
            : undefined
        }}
      >
        {children}
      </main>

      {/* Mobile Tab Bar */}
      {showMobileTabBar && <MobileTabBar />}
    </div>
  );
}
