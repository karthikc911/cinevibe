import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Film, Tv, Star, Calendar } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, TMDB_IMAGE_BASE, RatingColors, LanguageNames } from '../lib/constants';
import { ratingsApi } from '../lib/api';
import { useAppStore } from '../lib/store';
import { movieRatingsCache, tvShowRatingsCache } from '../lib/cache';

interface Rating {
  id: string;
  movieId?: number;
  tvShowId?: number;
  movieTitle?: string;
  tvShowName?: string;
  movieYear?: number;
  tvShowYear?: number;
  rating: string;
  createdAt: string;
  poster?: string;
  lang?: string;
}

type ContentType = 'movies' | 'tvshows';

export default function RatingsListScreen() {
  const router = useRouter();
  const { isUsingDemoMode } = useAppStore();
  
  // Memoize back handler for instant response
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);
  const [activeTab, setActiveTab] = useState<ContentType>('movies');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [movieRatings, setMovieRatings] = useState<Rating[]>([]);
  const [tvShowRatings, setTvShowRatings] = useState<Rating[]>([]);

  useEffect(() => {
    loadRatings();
  }, []);

  const loadRatings = async (isRefresh = false) => {
    // Step 1: Show cached data IMMEDIATELY
    if (!isRefresh) {
      const [cachedMovies, cachedTvShows] = await Promise.all([
        movieRatingsCache.get(),
        tvShowRatingsCache.get(),
      ]);

      if (cachedMovies.data && cachedMovies.data.length > 0) {
        setMovieRatings(cachedMovies.data);
      }
      if (cachedTvShows.data && cachedTvShows.data.length > 0) {
        setTvShowRatings(cachedTvShows.data);
      }

      // If we have cache, hide loading immediately
      if ((cachedMovies.data && cachedMovies.data.length > 0) || 
          (cachedTvShows.data && cachedTvShows.data.length > 0)) {
        setLoading(false);
        // If cache is fresh, we're done
        if (!cachedMovies.isStale && !cachedTvShows.isStale) {
          return;
        }
      } else {
        setLoading(true);
      }
    }

    // Step 2: Fetch fresh data in background
    try {
      if (!isUsingDemoMode) {
        const [movies, tvShows] = await Promise.all([
          ratingsApi.getRatings().catch(() => []),
          ratingsApi.getTvShowRatings().catch(() => []),
        ]);
        
        // Sort by date (newest first)
        const sortedMovies = movies.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const sortedTvShows = tvShows.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setMovieRatings(sortedMovies);
        setTvShowRatings(sortedTvShows);

        // Cache the results
        if (sortedMovies.length > 0) {
          await movieRatingsCache.set(sortedMovies);
        }
        if (sortedTvShows.length > 0) {
          await tvShowRatingsCache.set(sortedTvShows);
        }
      } else {
        // Demo data
        setMovieRatings([
          { id: '1', movieId: 550, movieTitle: 'Fight Club', movieYear: 1999, rating: 'amazing', createdAt: new Date().toISOString(), lang: 'en' },
          { id: '2', movieId: 13, movieTitle: 'Forrest Gump', movieYear: 1994, rating: 'good', createdAt: new Date().toISOString(), lang: 'en' },
          { id: '3', movieId: 680, movieTitle: 'Pulp Fiction', movieYear: 1994, rating: 'amazing', createdAt: new Date().toISOString(), lang: 'en' },
        ]);
        setTvShowRatings([
          { id: '1', tvShowId: 1396, tvShowName: 'Breaking Bad', tvShowYear: 2008, rating: 'amazing', createdAt: new Date().toISOString(), lang: 'en' },
        ]);
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadRatings(true);
  };

  const getRatingEmoji = (rating: string) => {
    const emojiMap: Record<string, string> = {
      'amazing': '🤩',
      'good': '👍',
      'meh': '😐',
      'awful': '😫',
      'bad': '👎',
      'not-interested': '🚫',
      'skipped': '⏭️',
      'not-seen': '👁️',
    };
    return emojiMap[rating] || '⭐';
  };

  const getRatingLabel = (rating: string) => {
    const labelMap: Record<string, string> = {
      'amazing': 'Amazing',
      'good': 'Good',
      'meh': 'Meh',
      'awful': 'Awful',
      'bad': 'Bad',
      'not-interested': 'Not Interested',
      'skipped': 'Skipped',
      'not-seen': 'Not Seen',
    };
    return labelMap[rating] || rating;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderRatingItem = ({ item }: { item: Rating }) => {
    const title = item.movieTitle || item.tvShowName || 'Unknown';
    const year = item.movieYear || item.tvShowYear;
    const posterUrl = item.poster?.startsWith('http')
      ? item.poster
      : item.poster
      ? `${TMDB_IMAGE_BASE}${item.poster}`
      : null;
    
    const lang = item.lang ? (LanguageNames[item.lang] || item.lang.toUpperCase()) : 'N/A';
    const ratingColor = RatingColors[item.rating] || Colors.textSecondary;

    return (
      <TouchableOpacity style={styles.ratingCard} activeOpacity={0.8}>
        <View style={styles.posterContainer}>
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              style={styles.poster}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.noPoster}>
              <Text style={styles.noPosterEmoji}>🎬</Text>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.posterGradient}
          />
          <View style={styles.languageBadge}>
            <Text style={styles.badgeText}>{lang}</Text>
          </View>
        </View>
        
        <View style={styles.contentContainer}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          <View style={styles.metaRow}>
            {year && <Text style={styles.year}>{year}</Text>}
            {activeTab === 'tvshows' && <Tv color={Colors.textSecondary} size={12} />}
            {activeTab === 'movies' && <Film color={Colors.textSecondary} size={12} />}
          </View>
          <View style={styles.ratingContainer}>
            <View style={[styles.ratingBadge, { backgroundColor: ratingColor + '30', borderColor: ratingColor }]}>
              <Text style={styles.ratingEmoji}>{getRatingEmoji(item.rating)}</Text>
              <Text style={[styles.ratingLabel, { color: ratingColor }]}>
                {getRatingLabel(item.rating)}
              </Text>
            </View>
          </View>
          <View style={styles.dateContainer}>
            <Calendar color={Colors.textMuted} size={12} />
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const data = activeTab === 'movies' ? movieRatings : tvShowRatings;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed
          ]} 
          onPress={handleBack}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <ArrowLeft color={Colors.text} size={24} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Star color={Colors.primary} size={24} />
          <Text style={styles.headerTitle}>My Ratings</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'movies' && styles.activeTab]}
          onPress={() => setActiveTab('movies')}
        >
          <Film color={activeTab === 'movies' ? Colors.background : Colors.textSecondary} size={16} />
          <Text style={[styles.tabText, activeTab === 'movies' && styles.activeTabText]}>
            Movies ({movieRatings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tvshows' && styles.activeTabTV]}
          onPress={() => setActiveTab('tvshows')}
        >
          <Tv color={activeTab === 'tvshows' ? Colors.background : Colors.textSecondary} size={16} />
          <Text style={[styles.tabText, activeTab === 'tvshows' && styles.activeTabText]}>
            TV Shows ({tvShowRatings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your ratings...</Text>
        </View>
      ) : data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>⭐</Text>
          <Text style={styles.emptyTitle}>No ratings yet</Text>
          <Text style={styles.emptyMessage}>
            Start rating {activeTab === 'movies' ? 'movies' : 'TV shows'} to see them here
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={renderRatingItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  backButtonPressed: {
    backgroundColor: Colors.surface,
    transform: [{ scale: 0.95 }],
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  activeTabTV: {
    backgroundColor: '#9333ea',
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyMessage: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  ratingCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  posterContainer: {
    width: 100,
    height: 140,
    position: 'relative',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  noPoster: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  noPosterEmoji: {
    fontSize: 32,
  },
  posterGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
  },
  languageBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  year: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  ratingContainer: {
    marginTop: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  ratingEmoji: {
    fontSize: 14,
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  dateText: {
    color: Colors.textMuted,
    fontSize: 11,
  },
});

