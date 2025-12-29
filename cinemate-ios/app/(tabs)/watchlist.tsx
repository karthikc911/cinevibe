import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bookmark, Film, Tv, Trash2, Star, Share2 } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { MovieDetailModal } from '../../components/MovieDetailModal';
import { watchlistApi, moviesApi, tvShowsApi } from '../../lib/api';
import { useAppStore } from '../../lib/store';
import { Colors, TMDB_IMAGE_BASE, LanguageNames } from '../../lib/constants';
import { WatchlistItem, TvShowWatchlistItem, Movie, TvShow } from '../../lib/types';

const { width } = Dimensions.get('window');

type WatchlistTab = 'movies' | 'tvshows';

interface EnrichedWatchlistItem {
  id: string;
  movieId: number;
  movieTitle: string;
  movieYear: number;
  addedAt: string;
  poster?: string;
  backdrop?: string;
  lang?: string;
  genres?: string[];
  summary?: string;
  overview?: string;
  imdb?: number;
  imdbRating?: number;
  imdbVoterCount?: number;
  voteCount?: number;
  userReviewSummary?: string;
  budget?: number;
  boxOffice?: number;
  year?: number;
}

export default function WatchlistScreen() {
  const [activeTab, setActiveTab] = useState<WatchlistTab>('movies');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [movieItems, setMovieItems] = useState<EnrichedWatchlistItem[]>([]);
  const [tvItems, setTvItems] = useState<EnrichedWatchlistItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<EnrichedWatchlistItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { isUsingDemoMode } = useAppStore();

  const loadWatchlist = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      if (isUsingDemoMode) {
        setMovieItems([]);
        setTvItems([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      console.log('[WATCHLIST] Fetching watchlist...');
      
      const [moviesRes, tvShowsRes] = await Promise.all([
        watchlistApi.getWatchlist().catch((e) => {
          console.log('[WATCHLIST] Error fetching movies:', e);
          return [];
        }),
        watchlistApi.getTvShowWatchlist().catch((e) => {
          console.log('[WATCHLIST] Error fetching TV shows:', e);
          return [];
        }),
      ]);

      console.log('[WATCHLIST] Movies:', moviesRes?.length || 0);
      console.log('[WATCHLIST] TV Shows:', tvShowsRes?.length || 0);

      // Enrich movies with poster data
      const enrichedMovies = await Promise.all(
        (moviesRes || []).map(async (item: WatchlistItem) => {
          try {
            const details = await moviesApi.getMovieDetails(item.movieId);
            return {
              ...item,
              poster: details?.poster,
              backdrop: details?.backdrop,
              lang: details?.lang,
              genres: details?.genres,
              summary: details?.summary || details?.overview,
              overview: details?.overview,
              imdb: details?.imdb,
              imdbRating: details?.imdbRating,
              imdbVoterCount: details?.imdbVoterCount,
              voteCount: details?.voteCount,
              userReviewSummary: details?.userReviewSummary,
              budget: details?.budget,
              boxOffice: details?.boxOffice,
              year: details?.year || item.movieYear,
            };
          } catch (e) {
            console.log('[WATCHLIST] Error fetching movie details:', item.movieId, e);
            return { ...item, year: item.movieYear };
          }
        })
      );

      // Enrich TV shows with poster data
      const enrichedTvShows = await Promise.all(
        (tvShowsRes || []).map(async (item: TvShowWatchlistItem) => {
          try {
            const details = await tvShowsApi.getTvShowDetails(item.tvShowId);
            // Map tvShowId/tvShowName to movieId/movieTitle for consistent interface
            return {
              id: item.id,
              movieId: item.tvShowId,
              movieTitle: item.tvShowName,
              movieYear: item.tvShowYear || 0,
              addedAt: item.addedAt,
              poster: details?.poster,
              backdrop: details?.backdrop,
              lang: details?.lang,
              genres: details?.genres,
              summary: details?.summary || details?.overview,
              overview: details?.overview,
              imdb: details?.imdb,
              imdbRating: details?.imdbRating,
              imdbVoterCount: details?.imdbVoterCount,
              voteCount: details?.voteCount,
              userReviewSummary: details?.userReviewSummary,
              year: details?.year || item.tvShowYear,
            };
          } catch (e) {
            console.log('[WATCHLIST] Error fetching TV show details:', item.tvShowId, e);
            return { 
              id: item.id,
              movieId: item.tvShowId, 
              movieTitle: item.tvShowName,
              movieYear: item.tvShowYear || 0,
              addedAt: item.addedAt,
              year: item.tvShowYear,
            };
          }
        })
      );

      setMovieItems(enrichedMovies);
      setTvItems(enrichedTvShows);
    } catch (error) {
      console.error('[WATCHLIST] Error loading watchlist:', error);
      setMovieItems([]);
      setTvItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isUsingDemoMode]);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadWatchlist(true);
  };

  const handleCardPress = (item: EnrichedWatchlistItem) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleRemove = async (item: EnrichedWatchlistItem, type: WatchlistTab) => {
    Alert.alert(
      'Remove from Watchlist',
      `Remove "${item.movieTitle}" from your watchlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              if (type === 'movies') {
                await watchlistApi.removeFromWatchlist(item.movieId);
                setMovieItems((prev) => prev.filter((i) => i.movieId !== item.movieId));
              } else {
                await watchlistApi.removeTvShowFromWatchlist(item.movieId);
                setTvItems((prev) => prev.filter((i) => i.movieId !== item.movieId));
              }
              setShowDetailModal(false);
            } catch (error) {
              console.log('[WATCHLIST] Error removing:', error);
              Alert.alert('Error', 'Failed to remove item.');
            }
          },
        },
      ]
    );
  };

  const handleShare = (item: EnrichedWatchlistItem) => {
    Alert.alert('Share', `Share "${item.movieTitle}" with a friend (Coming soon)`);
  };

  const data = activeTab === 'movies' ? movieItems : tvItems;

  const formatRating = (rating: number | string | undefined) => {
    if (!rating) return null;
    const num = typeof rating === 'string' ? parseFloat(rating) : rating;
    return num.toFixed(1);
  };

  const renderItem = ({ item }: { item: EnrichedWatchlistItem }) => {
    const posterUrl = item.poster?.startsWith('http')
      ? item.poster
      : item.poster
      ? `${TMDB_IMAGE_BASE}${item.poster}`
      : null;

    const lang = item.lang
      ? LanguageNames[item.lang] || item.lang.toUpperCase()
      : 'N/A';

    const imdbRating = item.imdb || item.imdbRating;
    const isTV = activeTab === 'tvshows';

    return (
      <TouchableOpacity 
        style={styles.cardContainer}
        onPress={() => handleCardPress(item)}
        activeOpacity={0.8}
      >
        {/* Poster Section */}
        <View style={styles.posterSection}>
          {posterUrl ? (
            <Image source={{ uri: posterUrl }} style={styles.poster} contentFit="cover" />
          ) : (
            <View style={styles.noPoster}>
              <Text style={styles.noPosterEmoji}>🎬</Text>
              <Text style={styles.noPosterText} numberOfLines={2}>{item.movieTitle}</Text>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.posterGradient}
          />
          {/* Badges */}
          <View style={styles.languageBadge}>
            <Text style={styles.badgeText}>{lang}</Text>
          </View>
          <View style={[styles.typeBadge, isTV ? styles.typeBadgeTV : styles.typeBadgeMovie]}>
            {isTV ? <Tv color="#fff" size={10} /> : <Film color="#fff" size={10} />}
            <Text style={styles.badgeText}>{isTV ? 'TV' : 'Movie'}</Text>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          <Text style={styles.title} numberOfLines={2}>{item.movieTitle}</Text>
          
          <View style={styles.metaRow}>
            {(item.year || item.movieYear) && <Text style={styles.year}>{item.year || item.movieYear}</Text>}
            {item.genres && item.genres.length > 0 && (
              <Text style={styles.genres} numberOfLines={1}>• {item.genres.slice(0, 2).join(', ')}</Text>
            )}
          </View>

          {/* IMDB Rating */}
          {imdbRating && (
            <View style={styles.ratingContainer}>
              <Star color="#fbbf24" size={14} fill="#fbbf24" />
              <Text style={styles.ratingText}>{formatRating(imdbRating)}/10</Text>
              <Text style={styles.imdbLabel}>IMDB</Text>
            </View>
          )}

          {/* Summary */}
          {(item.summary || item.overview) && (
            <Text style={styles.summary} numberOfLines={2}>{String(item.summary || item.overview)}</Text>
          )}

          {/* Tap hint */}
          <Text style={styles.tapHint}>Tap for details →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading your watchlist..." />;
  }

  // Convert selected item to Movie/TvShow format for the modal
  const selectedMovieData: Movie | TvShow | null = selectedItem ? {
    id: selectedItem.movieId,
    title: selectedItem.movieTitle,
    name: activeTab === 'tvshows' ? selectedItem.movieTitle : undefined,
    year: selectedItem.year || parseInt(String(selectedItem.movieYear)) || 0,
    poster: selectedItem.poster,
    backdrop: selectedItem.backdrop,
    lang: selectedItem.lang,
    genres: selectedItem.genres,
    summary: selectedItem.summary,
    overview: selectedItem.overview,
    imdb: selectedItem.imdb,
    imdbRating: selectedItem.imdbRating,
    imdbVoterCount: selectedItem.imdbVoterCount,
    voteCount: selectedItem.voteCount,
    userReviewSummary: selectedItem.userReviewSummary,
    budget: selectedItem.budget,
    boxOffice: selectedItem.boxOffice,
    type: activeTab === 'tvshows' ? 'tvshow' : 'movie',
  } as Movie | TvShow : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Bookmark color={Colors.primary} size={24} />
          <Text style={styles.headerTitle}>Watchlist</Text>
        </View>
        <Text style={styles.count}>
          {movieItems.length + tvItems.length} items
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'movies' && styles.activeTab]}
          onPress={() => setActiveTab('movies')}
        >
          <Film color={activeTab === 'movies' ? Colors.background : Colors.textSecondary} size={18} />
          <Text style={[styles.tabText, activeTab === 'movies' && styles.activeTabText]}>
            Movies ({movieItems.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tvshows' && styles.activeTabTV]}
          onPress={() => setActiveTab('tvshows')}
        >
          <Tv color={activeTab === 'tvshows' ? Colors.background : Colors.textSecondary} size={18} />
          <Text style={[styles.tabText, activeTab === 'tvshows' && styles.activeTabText]}>
            TV Shows ({tvItems.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {data.length === 0 ? (
        <EmptyState
          emoji="📽️"
          title="Your watchlist is empty"
          message={`Add ${activeTab === 'movies' ? 'movies' : 'TV shows'} to watch later`}
        />
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.id || item.movieId}`}
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

      {/* Detail Modal */}
      <MovieDetailModal
        visible={showDetailModal}
        movie={selectedMovieData}
        onClose={() => setShowDetailModal(false)}
        onRemoveFromWatchlist={() => selectedItem && handleRemove(selectedItem, activeTab)}
        onShare={() => selectedItem && handleShare(selectedItem)}
        isInWatchlist={true}
      />
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
  headerTitle: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  count: {
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
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  cardContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  posterSection: {
    width: 120,
    height: 180,
    position: 'relative',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  noPoster: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  noPosterEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  noPosterText: {
    color: Colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  posterGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  languageBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadge: {
    position: 'absolute',
    top: 30,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeMovie: {
    backgroundColor: 'rgba(6, 182, 212, 0.9)',
  },
  typeBadgeTV: {
    backgroundColor: 'rgba(147, 51, 234, 0.9)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  contentSection: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  year: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  genres: {
    color: Colors.primary,
    fontSize: 12,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  ratingText: {
    color: '#fcd34d',
    fontSize: 13,
    fontWeight: '700',
  },
  imdbLabel: {
    color: 'rgba(251, 191, 36, 0.6)',
    fontSize: 9,
    marginLeft: 2,
  },
  summary: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
  tapHint: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 'auto',
  },
});
