"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Star, Bookmark, Users, User } from "lucide-react";
import { motion } from "framer-motion";

const TABS = [
  { label: "Home", path: "/", icon: Home },
  { label: "Rate", path: "/rate", icon: Star },
  { label: "Watchlist", path: "/watchlist", icon: Bookmark },
  { label: "Friends", path: "/friends", icon: Users },
  { label: "Profile", path: "/profile", icon: User },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-gray-900/95 backdrop-blur-lg border-t border-white/10"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around px-2 pt-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.path;
          
          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              className="relative flex flex-col items-center justify-center min-w-[60px] py-2 px-3 transition-colors"
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-cyan-500/10 rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              
              {/* Icon */}
              <div className="relative">
                <Icon
                  className={`w-6 h-6 transition-colors ${
                    isActive ? "text-cyan-400" : "text-gray-400"
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              
              {/* Label */}
              <span
                className={`text-[10px] mt-1 font-medium transition-colors ${
                  isActive ? "text-cyan-400" : "text-gray-400"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

