import React, { useState, useEffect } from 'react';
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
import { User, Star, Film, Tv, LogOut, Settings, ChevronRight, Heart } from 'lucide-react-native';
import { useAppStore } from '../../lib/store';
import { Colors, RatingColors } from '../../lib/constants';
import { DEMO_RATINGS, DEMO_WATCHLIST } from '../../lib/mockData';
import { ratingsApi, watchlistApi, authApi } from '../../lib/api';

interface RatingStats {
  total: number;
  amazing: number;
  good: number;
  meh: number;
  bad: number;
  'not-interested': number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isUsingDemoMode, logout, clearAll } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [watchlistCount, setWatchlistCount] = useState(0);
  
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

  useEffect(() => {
    loadStats();
  }, [isUsingDemoMode]);

  const loadStats = async () => {
    if (isUsingDemoMode) {
      // Demo stats
      setMovieStats({
        total: 45,
        amazing: 12,
        good: 18,
        meh: 8,
        bad: 4,
        'not-interested': 3,
      });
      setTvStats({
        total: 23,
        amazing: 8,
        good: 10,
        meh: 3,
        bad: 1,
        'not-interested': 1,
      });
      setWatchlistCount(DEMO_WATCHLIST.length + 5);
      setLoading(false);
      return;
    }

    try {
      // Fetch real stats from API
      const [movieRatings, tvRatings, watchlist, tvWatchlist] = await Promise.all([
        ratingsApi.getRatings().catch(() => []),
        ratingsApi.getTvShowRatings().catch(() => []),
        watchlistApi.getWatchlist().catch(() => []),
        watchlistApi.getTvShowWatchlist().catch(() => []),
      ]);

      // Calculate movie stats
      const mStats: RatingStats = {
        total: movieRatings.length,
        amazing: 0,
        good: 0,
        meh: 0,
        bad: 0,
        'not-interested': 0,
      };
      movieRatings.forEach((r: any) => {
        if (r.rating === 'amazing') mStats.amazing++;
        else if (r.rating === 'good') mStats.good++;
        else if (r.rating === 'meh') mStats.meh++;
        else if (r.rating === 'awful' || r.rating === 'bad') mStats.bad++;
        else if (r.rating === 'not-interested' || r.rating === 'skipped') mStats['not-interested']++;
      });
      setMovieStats(mStats);

      // Calculate TV stats
      const tStats: RatingStats = {
        total: tvRatings.length,
        amazing: 0,
        good: 0,
        meh: 0,
        bad: 0,
        'not-interested': 0,
      };
      tvRatings.forEach((r: any) => {
        if (r.rating === 'amazing') tStats.amazing++;
        else if (r.rating === 'good') tStats.good++;
        else if (r.rating === 'meh') tStats.meh++;
        else if (r.rating === 'awful' || r.rating === 'bad') tStats.bad++;
        else if (r.rating === 'not-interested' || r.rating === 'skipped') tStats['not-interested']++;
      });
      setTvStats(tStats);

      setWatchlistCount(watchlist.length + tvWatchlist.length);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          // Clear auth token
          await authApi.clearToken();
          logout();
          clearAll();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <User color={Colors.primary} size={40} />
            </View>
          </View>
          <Text style={styles.name}>{user?.name || 'Demo User'}</Text>
          <Text style={styles.email}>{user?.email || 'demo@cinemate.app'}</Text>
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Heart color={Colors.error} size={14} fill={Colors.error} />
              <Text style={styles.badgeText}>Movie Enthusiast</Text>
            </View>
          </View>
        </View>

        {/* Stats Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Activity</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Film color={Colors.primary} size={24} />
              <Text style={styles.statNumber}>{movieStats.total}</Text>
              <Text style={styles.statLabel}>Movies Rated</Text>
            </View>
            <View style={styles.statCard}>
              <Tv color={Colors.secondary} size={24} />
              <Text style={styles.statNumber}>{tvStats.total}</Text>
              <Text style={styles.statLabel}>TV Shows Rated</Text>
            </View>
            <View style={styles.statCard}>
              <Star color={Colors.warning} size={24} />
              <Text style={styles.statNumber}>{watchlistCount}</Text>
              <Text style={styles.statLabel}>In Watchlist</Text>
            </View>
          </View>
        </View>

        {/* Movie Ratings Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Movie Ratings</Text>
          <View style={styles.ratingsBreakdown}>
            {[
              { key: 'amazing', label: '🤩 Amazing', count: movieStats.amazing },
              { key: 'good', label: '👍 Good', count: movieStats.good },
              { key: 'meh', label: '😐 Meh', count: movieStats.meh },
              { key: 'bad', label: '👎 Bad', count: movieStats.bad },
              { key: 'not-interested', label: '🚫 Not Interested', count: movieStats['not-interested'] },
            ].map((item) => (
              <View key={item.key} style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>{item.label}</Text>
                <View style={styles.ratingBarContainer}>
                  <View
                    style={[
                      styles.ratingBar,
                      {
                        width: movieStats.total > 0 ? `${(item.count / movieStats.total) * 100}%` : '0%',
                        backgroundColor: RatingColors[item.key],
                      },
                    ]}
                  />
                </View>
                <Text style={styles.ratingCount}>{item.count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* TV Show Ratings Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TV Show Ratings</Text>
          <View style={styles.ratingsBreakdown}>
            {[
              { key: 'amazing', label: '🤩 Amazing', count: tvStats.amazing },
              { key: 'good', label: '👍 Good', count: tvStats.good },
              { key: 'meh', label: '😐 Meh', count: tvStats.meh },
              { key: 'bad', label: '👎 Bad', count: tvStats.bad },
              { key: 'not-interested', label: '🚫 Not Interested', count: tvStats['not-interested'] },
            ].map((item) => (
              <View key={item.key} style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>{item.label}</Text>
                <View style={styles.ratingBarContainer}>
                  <View
                    style={[
                      styles.ratingBar,
                      {
                        width: tvStats.total > 0 ? `${(item.count / tvStats.total) * 100}%` : '0%',
                        backgroundColor: RatingColors[item.key],
                      },
                    ]}
                  />
                </View>
                <Text style={styles.ratingCount}>{item.count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/rate')}>
            <Star color={Colors.primary} size={22} />
            <Text style={styles.menuText}>Rate Movies</Text>
            <ChevronRight color={Colors.textMuted} size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/preferences')}>
            <Settings color={Colors.textSecondary} size={22} />
            <Text style={styles.menuText}>Preferences</Text>
            <ChevronRight color={Colors.textMuted} size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <LogOut color={Colors.error} size={22} />
            <Text style={[styles.menuText, { color: Colors.error }]}>Log Out</Text>
            <ChevronRight color={Colors.textMuted} size={20} />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>CineVibe</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
          {isUsingDemoMode && (
            <Text style={styles.demoNote}>
              Demo mode - Using mock data
            </Text>
          )}
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
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  name: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  ratingsBreakdown: {
    gap: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingLabel: {
    color: Colors.text,
    fontSize: 13,
    width: 120,
  },
  ratingBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  ratingBar: {
    height: '100%',
    borderRadius: 4,
  },
  ratingCount: {
    color: Colors.textSecondary,
    fontSize: 13,
    width: 30,
    textAlign: 'right',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  menuText: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  appName: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  version: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  demoNote: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
