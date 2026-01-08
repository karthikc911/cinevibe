import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { TrendingUp, Film, Tv, RefreshCw, Flame } from 'lucide-react-native';
import { MovieCard } from '../../components/MovieCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { moviesApi, tvShowsApi, ratingsApi, watchlistApi } from '../../lib/api';
import { useAppStore } from '../../lib/store';
import { Colors } from '../../lib/constants';
import { Movie, TvShow, RatingType } from '../../lib/types';
import { RatingButtonGroup } from '../../components/RatingButton';
import { TRENDING_MOVIES, TRENDING_TVSHOWS } from '../../lib/mockData';
import { trendingMoviesCache, trendingTvShowsCache } from '../../lib/cache';

type ContentType = 'movies' | 'tvshows';

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ContentType>('movies');
  const [refreshing, setRefreshing] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [ratingItem, setRatingItem] = useState<Movie | TvShow | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [tvShows, setTvShows] = useState<TvShow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [useLocalData, setUseLocalData] = useState(false);
  const [isReady, setIsReady] = useState(false); // Component ready to show content

  const { user, isUsingDemoMode, isSessionRestored, addToMovieWatchlist, addToTvShowWatchlist } = useAppStore();
  const isMounted = useRef(true);
  const hasLoadedMovies = useRef(false);
  const hasLoadedTvShows = useRef(false);
  const loadSessionRef = useRef(0); // Track load session to abort stale requests

  const loadData = useCallback(async (isRefresh = false, currentTab?: ContentType) => {
    // Increment session to invalidate any previous in-flight requests
    const currentSession = ++loadSessionRef.current;
    
    // Helper to check if this load session is still valid
    const isSessionValid = () => isMounted.current && loadSessionRef.current === currentSession;
    
    const tab = currentTab || activeTab;
    console.log(`[HOME] Loading ${tab} data, isRefresh: ${isRefresh}`);
    
    try {
      setError(null);

      if (tab === 'movies') {
        // Step 1: Show cached or mock data IMMEDIATELY (never empty)
        if (!isRefresh) {
          const { data: cachedMovies, isStale } = await trendingMoviesCache.get();
          if (!isSessionValid()) return;
          if (cachedMovies && cachedMovies.length > 0) {
            console.log('[HOME] Showing cached movies:', cachedMovies.length);
            setMovies(cachedMovies);
            if (!isStale) {
              setRefreshing(false);
              return;
            }
          } else {
            // Show mock data immediately while fetching
            console.log('[HOME] No cache, showing mock movies while fetching');
            setMovies(TRENDING_MOVIES);
          }
        }

        // Step 2: Always try to fetch fresh data from API (trending is public)
        try {
          console.log('[HOME] Fetching trending movies from API...');
          const result = await moviesApi.getTrending('day');
          
          if (!isSessionValid()) return;
          
          if (result && result.length > 0) {
            console.log('[HOME] Got movies from API:', result.length);
            setMovies(result);
            trendingMoviesCache.set(result).catch(() => {});
          }
          // If API returns empty, keep showing current data (mock or cached)
        } catch (apiError: any) {
          console.log('[HOME] API error:', apiError?.message, '- keeping current data');
          // Keep showing current data, don't clear it
        }
      } else {
        // Step 1: Show cached or mock TV shows IMMEDIATELY (never empty)
        if (!isRefresh) {
          const { data: cachedTvShows, isStale } = await trendingTvShowsCache.get();
          if (!isSessionValid()) return;
          if (cachedTvShows && cachedTvShows.length > 0) {
            console.log('[HOME] Showing cached TV shows:', cachedTvShows.length);
            setTvShows(cachedTvShows);
            if (!isStale) {
              setRefreshing(false);
              return;
            }
          } else {
            // Show mock data immediately while fetching
            console.log('[HOME] No cache, showing mock TV shows while fetching');
            setTvShows(TRENDING_TVSHOWS);
          }
        }

        // Step 2: Always try to fetch fresh data from API (trending is public)
        try {
          console.log('[HOME] Fetching trending TV shows from API...');
          const response = await tvShowsApi.getTrending('day');
          
          if (!isSessionValid()) return;
          
          if (response && response.length > 0) {
            console.log('[HOME] Got TV shows from API:', response.length);
            setTvShows(response);
            trendingTvShowsCache.set(response).catch(() => {});
          }
          // If API returns empty, keep showing current data (mock or cached)
        } catch (apiError: any) {
          console.log('[HOME] API error:', apiError?.message, '- keeping current data');
          // Keep showing current data, don't clear it
        }
      }
    } catch (err: any) {
      console.error('[HOME] Error loading data:', err);
      // Don't set error - just keep showing current data
    } finally {
      if (isSessionValid()) {
        setRefreshing(false);
        setDataLoading(false);
      }
    }
  }, [activeTab]);

  // Load trending data on mount
  useEffect(() => {
    isMounted.current = true;
    
    // Show shell immediately
    setIsReady(true);
    
    // Load trending movies
    console.log('[HOME] Loading trending movies...');
    
    if (!hasLoadedMovies.current) {
      hasLoadedMovies.current = true;
      // Double requestAnimationFrame GUARANTEES a paint has occurred
      // First rAF: Browser commits the frame with loading screen
      // Second rAF: Now we can safely load data
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isMounted.current) loadData(false, 'movies');
        });
      });
    } else {
      // Already loaded, hide loading banner immediately
      setDataLoading(false);
    }
    
    return () => {
      loadSessionRef.current++;
      isMounted.current = false;
    };
  }, [loadData]);
  
  // Load TV shows when tab switches
  useEffect(() => {
    if (activeTab === 'tvshows') {
      if (!hasLoadedTvShows.current) {
        hasLoadedTvShows.current = true;
        setDataLoading(true); // Show loading for TV shows
        loadData(false, 'tvshows');
      } else {
        // Already loaded, hide loading banner
        setDataLoading(false);
      }
    } else if (activeTab === 'movies') {
      // Switching back to movies, hide loading if already loaded
      if (hasLoadedMovies.current) {
        setDataLoading(false);
      }
    }
  }, [activeTab, loadData]);
  
  // Handle focus changes
  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      return () => {
        loadSessionRef.current++;
        isMounted.current = false;
      };
    }, [])
  );
  
  // Load when switching tabs within this screen
  const handleTabChange = (tab: ContentType) => {
    setActiveTab(tab);
    if (tab === 'movies' && !hasLoadedMovies.current) {
      hasLoadedMovies.current = true;
      loadData(false, 'movies');
    } else if (tab === 'tvshows' && !hasLoadedTvShows.current) {
      hasLoadedTvShows.current = true;
      loadData(false, 'tvshows');
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleMoviePress = (item: Movie | TvShow) => {
    setRatingItem(item);
  };

  const handleRate = async (rating: RatingType) => {
    if (!ratingItem) return;

    const title = ('title' in ratingItem ? ratingItem.title : ratingItem.name) || 'Unknown';

    try {
      if (!useLocalData && !isUsingDemoMode) {
        if (activeTab === 'movies') {
          await ratingsApi.rateMovie(ratingItem.id, title, ratingItem.year, rating);
        } else {
          await ratingsApi.rateTvShow(ratingItem.id, title, ratingItem.year, rating);
        }
      }

      // Remove rated item from list
      if (activeTab === 'movies') {
        setMovies(prev => prev.filter(m => m.id !== ratingItem.id));
      } else {
        setTvShows(prev => prev.filter(s => s.id !== ratingItem.id));
      }

      setRatingItem(null);
    } catch (err) {
      console.error('Error rating:', err);
      Alert.alert('Error', 'Failed to save rating. Please try again.');
    }
  };

  const handleAddToWatchlist = async (item: Movie | TvShow) => {
    const title = ('title' in item ? item.title : item.name) || 'Unknown';

    try {
      if (!useLocalData && !isUsingDemoMode) {
        if (activeTab === 'movies') {
          await watchlistApi.addToWatchlist(item.id, title, item.year);
        } else {
          await watchlistApi.addTvShowToWatchlist(item.id, title, item.year);
        }
      }

      const watchlistItem = {
        id: item.id.toString(),
        movieId: item.id,
        movieTitle: title,
        movieYear: item.year,
        addedAt: new Date().toISOString(),
      };

      if (activeTab === 'movies') {
        addToMovieWatchlist(watchlistItem);
      } else {
        addToTvShowWatchlist(watchlistItem);
      }

      Alert.alert('Added!', `"${title}" added to watchlist`);
    } catch (err) {
      console.error('Error adding to watchlist:', err);
      Alert.alert('Error', 'Failed to add to watchlist.');
    }
  };

  const data = activeTab === 'movies' ? movies : tvShows;

  const renderItem = ({ item }: { item: Movie | TvShow }) => (
    <MovieCard
      movie={item}
      onPress={() => handleMoviePress(item)}
      onAddToWatchlist={() => handleAddToWatchlist(item)}
      showMatch={false}
    />
  );

  // Show full-screen loading while data is loading
  if (dataLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingSpinner message={`Loading trending ${activeTab}...`} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Flame color={Colors.warning} size={28} />
          <Text style={styles.title}>Trending</Text>
          {isUsingDemoMode && (
            <View style={styles.demoBadge}>
              <Text style={styles.demoText}>DEMO</Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle}>
          {user ? `Hey ${user.name?.split(' ')[0]}! ` : ''}
          What's popular today on TMDB
        </Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'movies' && styles.activeTab]}
          onPress={() => handleTabChange('movies')}
          activeOpacity={0.7}
        >
          <Film color={activeTab === 'movies' ? Colors.background : Colors.textSecondary} size={18} />
          <Text style={[styles.tabText, activeTab === 'movies' && styles.activeTabText]}>
            Movies
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tvshows' && styles.activeTab]}
          onPress={() => handleTabChange('tvshows')}
          activeOpacity={0.7}
        >
          <Tv color={activeTab === 'tvshows' ? Colors.background : Colors.textSecondary} size={18} />
          <Text style={[styles.tabText, activeTab === 'tvshows' && styles.activeTabText]}>
            TV Shows
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
          <RefreshCw color={Colors.textSecondary} size={18} />
        </TouchableOpacity>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Content */}
      {data.length === 0 && !isReady ? (
        <LoadingSpinner message={`Loading trending ${activeTab === 'movies' ? 'movies' : 'TV shows'}...`} />
      ) : data.length === 0 ? (
        <EmptyState
          emoji="🎬"
          title="No content available"
          message="Pull down to refresh and try again"
        />
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
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

      {/* Rating Modal */}
      {ratingItem && (
        <View style={styles.ratingOverlay}>
          <TouchableOpacity
            style={styles.overlayBackground}
            onPress={() => setRatingItem(null)}
          />
          <View style={styles.ratingModal}>
            <Text style={styles.ratingTitle}>
              {'title' in ratingItem ? ratingItem.title : ratingItem.name}
            </Text>
            <Text style={styles.ratingYear}>
              {ratingItem.year} • {ratingItem.lang?.toUpperCase()}
            </Text>
            <Text style={styles.ratingSubtitle}>How would you rate this?</Text>
            <RatingButtonGroup onRate={handleRate} size="large" />
            <TouchableOpacity
              style={styles.watchlistButton}
              onPress={() => {
                handleAddToWatchlist(ratingItem);
                setRatingItem(null);
              }}
            >
              <Text style={styles.watchlistText}>+ Add to Watchlist Instead</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setRatingItem(null)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  demoBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  demoText: {
    color: Colors.background,
    fontSize: 10,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
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
  tabText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.background,
  },
  refreshBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
  },
  ratingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  ratingModal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  ratingTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  ratingYear: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  ratingSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  watchlistButton: {
    marginTop: 16,
    padding: 14,
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
  },
  watchlistText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
});
