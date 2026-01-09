import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Bookmark, Film, Tv, Star, LogIn } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { EmptyState } from '../../components/EmptyState';
import { MovieDetailModal } from '../../components/MovieDetailModal';
import { ShareMovieModal } from '../../components/ShareMovieModal';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { watchlistApi, moviesApi, tvShowsApi } from '../../lib/api';
import { useAppStore } from '../../lib/store';
import { Colors, TMDB_IMAGE_BASE, LanguageNames } from '../../lib/constants';
import { WatchlistItem, TvShowWatchlistItem, Movie, TvShow } from '../../lib/types';
import { movieWatchlistCache, tvShowWatchlistCache, movieDetailsCache, tvShowDetailsCache } from '../../lib/cache';
import { runAfterInteractions, pMap, perfLog, FLATLIST_PERF_CONFIG } from '../../lib/perf';

const { width } = Dimensions.get('window');
const SCREEN_NAME = 'Watchlist';

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

// Memoized login prompt
const LoginPrompt = memo(({ onPress }: { onPress: () => void }) => (
  <View style={styles.loginPrompt}>
    <LogIn color={Colors.primary} size={64} />
    <Text style={styles.loginTitle}>Sign In Required</Text>
    <Text style={styles.loginSubtitle}>
      Please sign in to view and manage your watchlist
    </Text>
    <TouchableOpacity style={styles.loginButton} onPress={onPress}>
      <Text style={styles.loginButtonText}>Sign In</Text>
    </TouchableOpacity>
  </View>
));

// Memoized card component for better FlatList performance
const WatchlistCard = memo(({ 
  item, 
  isTV, 
  onPress 
}: { 
  item: EnrichedWatchlistItem; 
  isTV: boolean;
  onPress: () => void;
}) => {
  const posterUrl = item.poster?.startsWith('http') ? item.poster : item.poster ? `${TMDB_IMAGE_BASE}${item.poster}` : null;
  const lang = item.lang ? LanguageNames[item.lang] || item.lang.toUpperCase() : 'N/A';
  const imdbRating = item.imdb || item.imdbRating;

  const formatRating = (rating: number | string | undefined) => {
    if (!rating) return null;
    const num = typeof rating === 'string' ? parseFloat(rating) : rating;
    return num.toFixed(1);
  };

  return (
    <TouchableOpacity style={styles.cardContainer} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.posterSection}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.poster} contentFit="cover" />
        ) : (
          <View style={styles.noPoster}>
            <Text style={styles.noPosterEmoji}>🎬</Text>
          </View>
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.posterGradient} />
        <View style={styles.languageBadge}>
          <Text style={styles.badgeText}>{lang}</Text>
        </View>
        <View style={[styles.typeBadge, isTV ? styles.typeBadgeTV : styles.typeBadgeMovie]}>
          {isTV ? <Tv color="#fff" size={10} /> : <Film color="#fff" size={10} />}
          <Text style={styles.badgeText}>{isTV ? 'TV' : 'Movie'}</Text>
        </View>
      </View>

      <View style={styles.contentSection}>
        <Text style={styles.title} numberOfLines={2}>{item.movieTitle}</Text>
        
        <View style={styles.metaRow}>
          {(item.year || item.movieYear) && <Text style={styles.year}>{item.year || item.movieYear}</Text>}
          {item.genres && item.genres.length > 0 && (
            <Text style={styles.genres} numberOfLines={1}>• {item.genres.slice(0, 2).join(', ')}</Text>
          )}
        </View>

        {imdbRating && (
          <View style={styles.ratingContainer}>
            <Star color="#fbbf24" size={14} fill="#fbbf24" />
            <Text style={styles.ratingText}>{formatRating(imdbRating)}/10</Text>
            <Text style={styles.imdbLabel}>IMDB</Text>
          </View>
        )}

        {(item.summary || item.overview) && (
          <Text style={styles.summary} numberOfLines={2}>{String(item.summary || item.overview)}</Text>
        )}

        <Text style={styles.tapHint}>Tap for details →</Text>
      </View>
    </TouchableOpacity>
  );
});

export default function WatchlistScreen() {
  const router = useRouter();
  const { isAuthenticated, isUsingDemoMode, isSessionRestored } = useAppStore();
  
  // State
  const [activeTab, setActiveTab] = useState<WatchlistTab>('movies');
  const [refreshing, setRefreshing] = useState(false);
  const [movieItems, setMovieItems] = useState<EnrichedWatchlistItem[]>([]);
  const [tvItems, setTvItems] = useState<EnrichedWatchlistItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<EnrichedWatchlistItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  const isMounted = useRef(true);
  const hasLoaded = useRef(false);
  const loadSessionRef = useRef(0);
  const loadingLoggedRef = useRef(false);

  // Log screen focus
  useFocusEffect(
    useCallback(() => {
      perfLog.focus(SCREEN_NAME);
      return () => {};
    }, [])
  );

  const loadWatchlist = useCallback(async (isRefresh = false) => {
    const currentSession = ++loadSessionRef.current;
    const isSessionValid = () => isMounted.current && loadSessionRef.current === currentSession;
    const endTimer = perfLog.startTimer(`${SCREEN_NAME} loadWatchlist`);
    
    if (isUsingDemoMode) {
      setMovieItems([]);
      setTvItems([]);
      setDataLoading(false);
      setRefreshing(false);
      endTimer();
      return;
    }

    // Show cached data IMMEDIATELY
    if (!isRefresh) {
      perfLog.dataLoad(SCREEN_NAME, 'cache', 'start');
      const [cachedMovies, cachedTvShows] = await Promise.all([
        movieWatchlistCache.get(),
        tvShowWatchlistCache.get(),
      ]);

      if (!isSessionValid()) { endTimer(); return; }

      const movieCount = cachedMovies.data?.length || 0;
      const tvCount = cachedTvShows.data?.length || 0;
      perfLog.dataLoad(SCREEN_NAME, 'cache', 'end', movieCount + tvCount);

      if (cachedMovies.data && cachedMovies.data.length > 0) setMovieItems(cachedMovies.data);
      if (cachedTvShows.data && cachedTvShows.data.length > 0) setTvItems(cachedTvShows.data);
      
      if ((cachedMovies.data && cachedMovies.data.length > 0) || (cachedTvShows.data && cachedTvShows.data.length > 0)) {
        setDataLoading(false);
        if (!cachedMovies.isStale && !cachedTvShows.isStale) {
          setRefreshing(false);
          endTimer();
          return;
        }
      }
    }

    // Fetch fresh data - basic items only
    try {
      perfLog.dataLoad(SCREEN_NAME, 'network', 'start');
      const [moviesRes, tvShowsRes] = await Promise.all([
        watchlistApi.getWatchlist().catch(() => []),
        watchlistApi.getTvShowWatchlist().catch(() => []),
      ]);

      if (!isSessionValid()) { endTimer(); return; }
      perfLog.dataLoad(SCREEN_NAME, 'network', 'end', (moviesRes?.length || 0) + (tvShowsRes?.length || 0));

      // Render BASIC items immediately (no detail enrichment)
      const basicMovies = (moviesRes || []).map((item: WatchlistItem) => ({
        ...item,
        year: item.movieYear,
      } as EnrichedWatchlistItem));

      const basicTvShows = (tvShowsRes || []).map((item: TvShowWatchlistItem) => ({
        id: item.id,
        movieId: item.tvShowId,
        movieTitle: item.tvShowName,
        movieYear: item.tvShowYear || 0,
        addedAt: item.addedAt,
        year: item.tvShowYear,
      } as EnrichedWatchlistItem));

      if (!isSessionValid()) { endTimer(); return; }
      
      setMovieItems(basicMovies);
      setTvItems(basicTvShows);
      
      // UI is now responsive - turn off loading BEFORE enrichment
      setDataLoading(false);
      setRefreshing(false);
      endTimer();

      // Enrich details AFTER navigation completes (non-blocking)
      runAfterInteractions(async () => {
        if (!isSessionValid()) return;
        perfLog.dataLoad(SCREEN_NAME, 'enrich', 'start');

        // Enrich movies in parallel with concurrency limit
        const enrichedMovies = await pMap(
          moviesRes || [],
          async (item: WatchlistItem) => {
            if (!isSessionValid()) return { ...item, year: item.movieYear } as EnrichedWatchlistItem;

            try {
              // Check cache first
              const { data: cachedDetails } = await movieDetailsCache.get(item.movieId);
              if (cachedDetails) {
                return {
                  ...item,
                  poster: cachedDetails?.poster,
                  lang: cachedDetails?.lang,
                  genres: cachedDetails?.genres,
                  summary: cachedDetails?.summary || cachedDetails?.overview,
                  imdb: cachedDetails?.imdb,
                  imdbRating: cachedDetails?.imdbRating,
                  year: cachedDetails?.year || item.movieYear,
                };
              }

              // Fetch with timeout
              const details = await Promise.race([
                moviesApi.getMovieDetails(item.movieId),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
              ]) as any;
              
              if (details) movieDetailsCache.set(item.movieId, details).catch(() => {});

              return {
                ...item,
                poster: details?.poster,
                lang: details?.lang,
                genres: details?.genres,
                summary: details?.summary || details?.overview,
                imdb: details?.imdb,
                imdbRating: details?.imdbRating,
                year: details?.year || item.movieYear,
              };
            } catch {
              return { ...item, year: item.movieYear } as EnrichedWatchlistItem;
            }
          },
          5 // concurrency limit
        );

        if (!isSessionValid()) return;
        setMovieItems(enrichedMovies);
        if (enrichedMovies.length > 0) movieWatchlistCache.set(enrichedMovies).catch(() => {});

        // Enrich TV shows in parallel with concurrency limit
        const enrichedTvShows = await pMap(
          tvShowsRes || [],
          async (item: TvShowWatchlistItem) => {
            if (!isSessionValid()) return {
              id: item.id,
              movieId: item.tvShowId,
              movieTitle: item.tvShowName,
              movieYear: item.tvShowYear || 0,
              addedAt: item.addedAt,
              year: item.tvShowYear,
            } as EnrichedWatchlistItem;

            try {
              // Check cache first
              const { data: cachedDetails } = await tvShowDetailsCache.get(item.tvShowId);
              if (cachedDetails) {
                return {
                  id: item.id,
                  movieId: item.tvShowId,
                  movieTitle: item.tvShowName,
                  movieYear: item.tvShowYear || 0,
                  addedAt: item.addedAt,
                  poster: cachedDetails?.poster,
                  lang: cachedDetails?.lang,
                  genres: cachedDetails?.genres,
                  summary: cachedDetails?.summary || cachedDetails?.overview,
                  imdb: cachedDetails?.imdb,
                  imdbRating: cachedDetails?.imdbRating,
                  year: cachedDetails?.year || item.tvShowYear,
                };
              }

              // Fetch with timeout
              const details = await Promise.race([
                tvShowsApi.getTvShowDetails(item.tvShowId),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
              ]) as any;
              
              if (details) tvShowDetailsCache.set(item.tvShowId, details).catch(() => {});

              return {
                id: item.id,
                movieId: item.tvShowId,
                movieTitle: item.tvShowName,
                movieYear: item.tvShowYear || 0,
                addedAt: item.addedAt,
                poster: details?.poster,
                lang: details?.lang,
                genres: details?.genres,
                summary: details?.summary || details?.overview,
                imdb: details?.imdb,
                imdbRating: details?.imdbRating,
                year: details?.year || item.tvShowYear,
              };
            } catch {
              return {
                id: item.id,
                movieId: item.tvShowId,
                movieTitle: item.tvShowName,
                movieYear: item.tvShowYear || 0,
                addedAt: item.addedAt,
                year: item.tvShowYear,
              } as EnrichedWatchlistItem;
            }
          },
          5 // concurrency limit
        );

        if (!isSessionValid()) return;
        setTvItems(enrichedTvShows);
        if (enrichedTvShows.length > 0) tvShowWatchlistCache.set(enrichedTvShows).catch(() => {});
        perfLog.dataLoad(SCREEN_NAME, 'enrich', 'end', enrichedMovies.length + enrichedTvShows.length);
      });
    } catch (error) {
      console.error('[WATCHLIST] Error:', error);
      setDataLoading(false);
      setRefreshing(false);
      endTimer();
    }
  }, [isUsingDemoMode]);

  // Load data when authenticated
  useEffect(() => {
    isMounted.current = true;
    
    if (isSessionRestored && isAuthenticated) {
      if (!hasLoaded.current) {
        hasLoaded.current = true;
        // Double requestAnimationFrame GUARANTEES a paint has occurred
        // This ensures the loading spinner renders before heavy work starts
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (isMounted.current) loadWatchlist();
          });
        });
      } else {
        setDataLoading(false);
      }
    } else if (isSessionRestored && !isAuthenticated) {
      setDataLoading(false);
    }
    
    return () => {
      loadSessionRef.current++;
      isMounted.current = false;
    };
  }, [isSessionRestored, isAuthenticated, loadWatchlist]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadWatchlist(true);
  }, [loadWatchlist]);

  const handleCardPress = useCallback((item: EnrichedWatchlistItem) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  }, []);

  const handleRemove = useCallback(async (item: EnrichedWatchlistItem, type: WatchlistTab) => {
    Alert.alert('Remove from Watchlist', `Remove "${item.movieTitle}"?`, [
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
            Alert.alert('Error', 'Failed to remove item.');
          }
        },
      },
    ]);
  }, []);

  const handleShare = useCallback((item: EnrichedWatchlistItem) => {
    setSelectedItem(item);
    setShowShareModal(true);
  }, []);

  const data = activeTab === 'movies' ? movieItems : tvItems;

  // Memoized renderItem for FlatList
  const renderItem = useCallback(({ item }: { item: EnrichedWatchlistItem }) => (
    <WatchlistCard
      item={item}
      isTV={activeTab === 'tvshows'}
      onPress={() => handleCardPress(item)}
    />
  ), [activeTab, handleCardPress]);

  // Stable keyExtractor
  const keyExtractor = useCallback((item: EnrichedWatchlistItem) => 
    `${item.id || item.movieId}`, []);

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
    type: activeTab === 'tvshows' ? 'tvshow' : 'movie',
  } as Movie | TvShow : null;

  // Show loading while session is being restored
  if (!isSessionRestored) {
    if (!loadingLoggedRef.current) {
      loadingLoggedRef.current = true;
      perfLog.loadingRendered(SCREEN_NAME);
    }
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingSpinner message="Initializing..." />
      </SafeAreaView>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoginPrompt onPress={() => router.push('/login')} />
      </SafeAreaView>
    );
  }

  // Show full-screen loading while data is loading
  if (dataLoading) {
    if (!loadingLoggedRef.current) {
      loadingLoggedRef.current = true;
      perfLog.loadingRendered(SCREEN_NAME);
    }
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingSpinner message="Loading watchlist..." />
      </SafeAreaView>
    );
  }

  // Log content rendered
  if (loadingLoggedRef.current) {
    perfLog.contentRendered(SCREEN_NAME);
    loadingLoggedRef.current = false;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Bookmark color={Colors.primary} size={24} />
              <Text style={styles.headerTitle}>Watchlist</Text>
            </View>
            <Text style={styles.count}>{movieItems.length + tvItems.length} items</Text>
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
            dataLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading your watchlist...</Text>
              </View>
            ) : (
              <EmptyState
                emoji="📽️"
                title="Your watchlist is empty"
                message={`Add ${activeTab === 'movies' ? 'movies' : 'TV shows'} to watch later`}
              />
            )
          ) : (
            <FlatList
              data={data}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
              }
              showsVerticalScrollIndicator={false}
              {...FLATLIST_PERF_CONFIG}
            />
          )}
        </>

      <MovieDetailModal
        visible={showDetailModal}
        movie={selectedMovieData}
        onClose={() => setShowDetailModal(false)}
        onRemoveFromWatchlist={() => selectedItem && handleRemove(selectedItem, activeTab)}
        onShare={() => {
          setShowDetailModal(false);
          if (selectedItem) {
            setTimeout(() => handleShare(selectedItem), 100);
          }
        }}
        isInWatchlist={true}
      />

      {/* Share with Friend Modal */}
      {selectedItem && (
        <ShareMovieModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          movieId={selectedItem.movieId}
          movieTitle={selectedItem.movieTitle}
          movieYear={selectedItem.year || selectedItem.movieYear}
          isTV={activeTab === 'tvshows'}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 12,
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
  },
  noPosterEmoji: {
    fontSize: 32,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeMovie: {
    backgroundColor: Colors.primary,
  },
  typeBadgeTV: {
    backgroundColor: '#9333ea',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  contentSection: {
    flex: 1,
    padding: 12,
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
  },
  year: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  genres: {
    color: Colors.textMuted,
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
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '600',
  },
  imdbLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    marginLeft: 4,
  },
  summary: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  tapHint: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
});
