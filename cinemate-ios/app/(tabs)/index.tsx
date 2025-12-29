import React, { useEffect, useState, useCallback } from 'react';
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

type ContentType = 'movies' | 'tvshows';

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ContentType>('movies');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratingItem, setRatingItem] = useState<Movie | TvShow | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [tvShows, setTvShows] = useState<TvShow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [useLocalData, setUseLocalData] = useState(false);

  const { user, isUsingDemoMode, addToMovieWatchlist, addToTvShowWatchlist } = useAppStore();

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      if (activeTab === 'movies') {
        try {
          // Fetch trending movies from TMDB
          const result = await moviesApi.getTrending('day');
          setMovies(result || []);
          setUseLocalData(false);
        } catch (apiError) {
          console.log('API unavailable, using mock data');
          setMovies(TRENDING_MOVIES);
          setUseLocalData(true);
        }
      } else {
        try {
          // Fetch trending TV shows from TMDB
          const response = await tvShowsApi.getTrending('day');
          setTvShows(response || []);
          setUseLocalData(false);
        } catch (apiError) {
          console.log('API unavailable, using mock data');
          setTvShows(TRENDING_TVSHOWS);
          setUseLocalData(true);
        }
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Failed to load trending content');
      if (activeTab === 'movies') {
        setMovies(TRENDING_MOVIES);
      } else {
        setTvShows(TRENDING_TVSHOWS);
      }
      setUseLocalData(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Flame color={Colors.warning} size={28} />
          <Text style={styles.title}>Trending</Text>
          {(useLocalData || isUsingDemoMode) && (
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
          onPress={() => setActiveTab('movies')}
        >
          <Film color={activeTab === 'movies' ? Colors.background : Colors.textSecondary} size={18} />
          <Text style={[styles.tabText, activeTab === 'movies' && styles.activeTabText]}>
            Movies
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tvshows' && styles.activeTab]}
          onPress={() => setActiveTab('tvshows')}
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
      {loading ? (
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
