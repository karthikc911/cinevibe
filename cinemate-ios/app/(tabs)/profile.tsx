import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, Star, Film, Tv, LogOut, Settings, ChevronRight, Heart, LogIn, ThumbsUp } from 'lucide-react-native';
import { useAppStore } from '../../lib/store';
import { Colors, RatingColors } from '../../lib/constants';
import { DEMO_RATINGS, DEMO_WATCHLIST } from '../../lib/mockData';
import { ratingsApi, watchlistApi, authApi } from '../../lib/api';
import { movieRatingsCache, tvShowRatingsCache, movieWatchlistCache, tvShowWatchlistCache } from '../../lib/cache';
import { LoadingSpinner } from '../../components/LoadingSpinner';

interface RatingStats {
  total: number;
  amazing: number;
  good: number;
  meh: number;
  bad: number;
  'not-interested': number;
}

// Memoized login prompt
const LoginPrompt = memo(({ onPress }: { onPress: () => void }) => (
  <View style={styles.loginPrompt}>
    <LogIn color={Colors.primary} size={64} />
    <Text style={styles.loginTitle}>Sign In Required</Text>
    <Text style={styles.loginSubtitle}>
      Please sign in to view your profile and ratings
    </Text>
    <TouchableOpacity style={styles.loginButton} onPress={onPress}>
      <Text style={styles.loginButtonText}>Sign In</Text>
    </TouchableOpacity>
  </View>
));

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isUsingDemoMode, isSessionRestored, logout, clearAll } = useAppStore();
  
  // State
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const isMounted = useRef(true);
  const hasLoaded = useRef(false);
  const loadSessionRef = useRef(0);
  
  const [movieStats, setMovieStats] = useState<RatingStats>({
    total: 0,
    amazing: 0,
    good: 0,
    meh: 0,
    bad: 0,
    'not-interested': 0,
  });

  const [tvStats, setTvStats] = useState<RatingStats>({
    total: 0,
    amazing: 0,
    good: 0,
    meh: 0,
    bad: 0,
    'not-interested': 0,
  });

  const calculateStats = (ratings: any[]): RatingStats => {
    const stats: RatingStats = {
      total: ratings.length,
      amazing: 0,
      good: 0,
      meh: 0,
      bad: 0,
      'not-interested': 0,
    };
    ratings.forEach((r: any) => {
      if (r.rating === 'amazing') stats.amazing++;
      else if (r.rating === 'good') stats.good++;
      else if (r.rating === 'meh') stats.meh++;
      else if (r.rating === 'awful' || r.rating === 'bad') stats.bad++;
      else if (r.rating === 'not-interested' || r.rating === 'skipped') stats['not-interested']++;
    });
    return stats;
  };

  const loadStats = useCallback(async () => {
    const currentSession = ++loadSessionRef.current;
    const isSessionValid = () => isMounted.current && loadSessionRef.current === currentSession;

    if (isUsingDemoMode) {
      const movieRatings = DEMO_RATINGS.filter((r: any) => r.type !== 'tvshow');
      const tvRatings = DEMO_RATINGS.filter((r: any) => r.type === 'tvshow');
      setMovieStats(calculateStats(movieRatings));
      setTvStats(calculateStats(tvRatings));
      setWatchlistCount(DEMO_WATCHLIST.length);
      setDataLoading(false);
      return;
    }

    // Show cached data IMMEDIATELY
    try {
      const [cachedMovieRatings, cachedTvRatings, cachedMovieWatchlist, cachedTvWatchlist] = await Promise.all([
        movieRatingsCache.get(),
        tvShowRatingsCache.get(),
        movieWatchlistCache.get(),
        tvShowWatchlistCache.get(),
      ]);

      if (!isSessionValid()) return;

      if (cachedMovieRatings.data) setMovieStats(calculateStats(cachedMovieRatings.data));
      if (cachedTvRatings.data) setTvStats(calculateStats(cachedTvRatings.data));
      setWatchlistCount((cachedMovieWatchlist.data?.length || 0) + (cachedTvWatchlist.data?.length || 0));
      setDataLoading(false);

      if (!cachedMovieRatings.isStale && !cachedTvRatings.isStale) return;
    } catch (e) {}

    // Fetch fresh data
    try {
      const [movieRatings, tvRatings, movieWatchlist, tvWatchlist] = await Promise.all([
        ratingsApi.getRatings().catch(() => []),
        ratingsApi.getTvShowRatings().catch(() => []),
        watchlistApi.getWatchlist().catch(() => []),
        watchlistApi.getTvShowWatchlist().catch(() => []),
      ]);

      if (!isSessionValid()) return;

      setMovieStats(calculateStats(movieRatings || []));
      setTvStats(calculateStats(tvRatings || []));
      setWatchlistCount((movieWatchlist?.length || 0) + (tvWatchlist?.length || 0));

      // Cache (fire and forget)
      if (movieRatings?.length) movieRatingsCache.set(movieRatings).catch(() => {});
      if (tvRatings?.length) tvShowRatingsCache.set(tvRatings).catch(() => {});
    } catch (error) {
      console.error('[PROFILE] Error loading stats:', error);
    } finally {
      if (isSessionValid()) {
        setDataLoading(false);
      }
    }
  }, [isUsingDemoMode]);

  // Load data when authenticated
  useEffect(() => {
    isMounted.current = true;
    
    if (isSessionRestored && isAuthenticated) {
      if (!hasLoaded.current) {
        hasLoaded.current = true;
        // Keep dataLoading true and load data
        // Double requestAnimationFrame GUARANTEES a paint has occurred
        // First rAF: Browser commits the frame with loading screen
        // Second rAF: Now we can safely load data
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (isMounted.current) loadStats();
          });
        });
      } else {
        // Already loaded, turn off loading
        setDataLoading(false);
      }
    } else if (isSessionRestored && !isAuthenticated) {
      // Not authenticated, no need to show loading
      setDataLoading(false);
    }
    // If session not restored yet, keep showing loading
    
    return () => {
      loadSessionRef.current++;
      isMounted.current = false;
    };
  }, [isSessionRestored, isAuthenticated, loadStats]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await authApi.clearToken();
          clearAll();
          logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const totalRatings = movieStats.total + tvStats.total;

  const renderStatItem = (label: string, value: number, color: string) => (
    <View style={styles.statItem}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );

  // Show loading while session is being restored
  if (!isSessionRestored) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Initializing..." />
      </SafeAreaView>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <LoginPrompt onPress={() => router.push('/login')} />
      </SafeAreaView>
    );
  }

  // Show full-screen loading while data is loading
  if (dataLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading profile..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <User color={Colors.primary} size={40} />
              </View>
              {isUsingDemoMode && (
                <View style={styles.demoBadge}>
                  <Text style={styles.demoBadgeText}>DEMO</Text>
                </View>
              )}
            </View>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
          </View>

          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <Star color={Colors.primary} size={20} fill={Colors.primary} />
              <Text style={styles.quickStatValue}>{totalRatings}</Text>
              <Text style={styles.quickStatLabel}>Ratings</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Heart color={Colors.error} size={20} fill={Colors.error} />
              <Text style={styles.quickStatValue}>{watchlistCount}</Text>
              <Text style={styles.quickStatLabel}>Watchlist</Text>
            </View>
          </View>

          {/* Movie Ratings */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Film color={Colors.primary} size={20} />
              <Text style={styles.sectionTitle}>Movie Ratings</Text>
              <Text style={styles.sectionCount}>{movieStats.total}</Text>
            </View>
            {dataLoading && movieStats.total === 0 ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <View style={styles.statsGrid}>
                {renderStatItem('Amazing', movieStats.amazing, RatingColors.amazing)}
                {renderStatItem('Good', movieStats.good, RatingColors.good)}
                {renderStatItem('Meh', movieStats.meh, RatingColors.meh)}
                {renderStatItem('Bad', movieStats.bad, RatingColors.bad)}
                {renderStatItem('Skip', movieStats['not-interested'], RatingColors.skip)}
              </View>
            )}
          </View>

          {/* TV Show Ratings */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Tv color="#9333ea" size={20} />
              <Text style={styles.sectionTitle}>TV Show Ratings</Text>
              <Text style={styles.sectionCount}>{tvStats.total}</Text>
            </View>
            {dataLoading && tvStats.total === 0 ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <View style={styles.statsGrid}>
                {renderStatItem('Amazing', tvStats.amazing, RatingColors.amazing)}
                {renderStatItem('Good', tvStats.good, RatingColors.good)}
                {renderStatItem('Meh', tvStats.meh, RatingColors.meh)}
                {renderStatItem('Bad', tvStats.bad, RatingColors.bad)}
                {renderStatItem('Skip', tvStats['not-interested'], RatingColors.skip)}
              </View>
            )}
          </View>

          {/* Menu Items */}
          <View style={styles.menuSection}>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/rate')}>
              <ThumbsUp color={Colors.primary} size={20} />
              <Text style={styles.menuText}>Rate Movies & TV Shows</Text>
              <ChevronRight color={Colors.textMuted} size={20} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/ratings-list')}>
              <Star color={Colors.textSecondary} size={20} />
              <Text style={styles.menuText}>View All Ratings</Text>
              <ChevronRight color={Colors.textMuted} size={20} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/preferences')}>
              <Settings color={Colors.textSecondary} size={20} />
              <Text style={styles.menuText}>Preferences</Text>
              <ChevronRight color={Colors.textMuted} size={20} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
              <LogOut color={Colors.error} size={20} />
              <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loginPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 24,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
  },
  loginButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  demoBadge: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    transform: [{ translateX: -20 }],
    backgroundColor: Colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  demoBadgeText: {
    color: Colors.background,
    fontSize: 10,
    fontWeight: '700',
  },
  userName: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
  },
  userEmail: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 20,
    marginBottom: 24,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
  },
  quickStatLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
  sectionCount: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  statValue: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  menuSection: {
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  menuText: {
    color: Colors.text,
    fontSize: 16,
    flex: 1,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: Colors.error,
  },
});
