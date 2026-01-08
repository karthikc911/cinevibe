import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Star,
  RefreshCw,
  ChevronLeft,
  Heart,
  Tv,
  Film,
  List,
  ArrowLeft,
  Home,
  Share2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { useAppStore } from '../lib/store';
import { Colors, LanguageNames, TMDB_IMAGE_BASE } from '../lib/constants';
import { Movie, TvShow, RatingType } from '../lib/types';
import { MOVIES_TO_RATE, TVSHOWS_TO_RATE } from '../lib/mockData';
import { moviesApi, tvShowsApi, ratingsApi, watchlistApi } from '../lib/api';
import { rateMoviesCache, rateTvShowsCache } from '../lib/cache';

const { width, height } = Dimensions.get('window');

// Rating button configuration matching the website
const RATING_OPTIONS: { value: RatingType; label: string; emoji: string; color: string; bgColor: string }[] = [
  { value: 'awful', label: 'Awful', emoji: '😫', color: '#f43f5e', bgColor: 'rgba(244, 63, 94, 0.4)' },
  { value: 'meh', label: 'Meh', emoji: '😐', color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.4)' },
  { value: 'good', label: 'Good', emoji: '👍', color: '#38bdf8', bgColor: 'rgba(56, 189, 248, 0.4)' },
  { value: 'amazing', label: 'Amazing', emoji: '🤩', color: '#34d399', bgColor: 'rgba(52, 211, 153, 0.4)' },
];

const ACTION_OPTIONS: { value: RatingType; label: string; color: string; bgColor: string }[] = [
  { value: 'not-seen', label: 'Not Seen', color: '#94a3b8', bgColor: 'rgba(148, 163, 184, 0.5)' },
  { value: 'not-interested', label: 'Skip', color: '#a78bfa', bgColor: 'rgba(167, 139, 250, 0.5)' },
];

type ContentType = 'movies' | 'tvshows';

export default function RateScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ratingInProgress, setRatingInProgress] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentType>('movies');
  
  // Movies
  const [movies, setMovies] = useState<Movie[]>([]);
  const [previousMovies, setPreviousMovies] = useState<Movie[]>([]);
  const [moviesRatedCount, setMoviesRatedCount] = useState(0);
  
  // TV Shows
  const [tvShows, setTvShows] = useState<TvShow[]>([]);
  const [previousTvShows, setPreviousTvShows] = useState<TvShow[]>([]);
  const [tvShowsRatedCount, setTvShowsRatedCount] = useState(0);

  const { user, addToMovieWatchlist, addToTvShowWatchlist, isUsingDemoMode } = useAppStore();
  const isMounted = useRef(true);

  const loadMovies = useCallback(async () => {
    console.log('[RATE] Loading movies for rating...');
    console.log('[RATE] User preferences:', { 
      languages: user?.languages || 'None', 
      genres: user?.genres || 'None',
      isDemo: isUsingDemoMode 
    });
    
    // Step 1: Show cached data IMMEDIATELY
    const { data: cachedMovies, isStale } = await rateMoviesCache.get();
    if (!isMounted.current) return;
    
    if (cachedMovies && cachedMovies.length > 0) {
      setMovies(cachedMovies);
      setLoading(false);
      // If cache is fresh, we're done
      if (!isStale) return;
    } else {
      setLoading(true);
    }

    // Step 2: Fetch fresh data in background
    try {
      if (!isUsingDemoMode) {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 8000)
        );
        const apiPromise = moviesApi.getRateMovies();
        
        const result = await Promise.race([apiPromise, timeoutPromise]) as any;
        if (!isMounted.current) return;
        
        console.log('[RATE] Loaded', result?.length || 0, 'movies from API');
        if (result && result.length > 0) {
          setMovies(result);
          // Cache the results (fire and forget)
          rateMoviesCache.set(result);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.log('[RATE] API unavailable or slow:', e);
    }
    
    if (!isMounted.current) return;
    
    // Fallback to mock data only if we have nothing
    setMovies(prev => prev.length === 0 ? [...MOVIES_TO_RATE] : prev);
    setLoading(false);
  }, [isUsingDemoMode, user]);

  const loadTvShows = useCallback(async () => {
    // Step 1: Show cached data IMMEDIATELY
    const { data: cachedTvShows, isStale } = await rateTvShowsCache.get();
    if (!isMounted.current) return;
    
    if (cachedTvShows && cachedTvShows.length > 0) {
      setTvShows(cachedTvShows);
      setLoading(false);
      if (!isStale) return;
    } else {
      setLoading(true);
    }

    // Step 2: Fetch fresh data in background
    try {
      if (!isUsingDemoMode) {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 8000)
        );
        const apiPromise = tvShowsApi.getSmartPicks();
        
        const result = await Promise.race([apiPromise, timeoutPromise]) as any;
        if (!isMounted.current) return;
        
        if (result && result.tvShows && result.tvShows.length > 0) {
          setTvShows(result.tvShows);
          // Cache the results (fire and forget)
          rateTvShowsCache.set(result.tvShows);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.log('[RATE] API unavailable or slow for TV shows');
    }
    
    if (!isMounted.current) return;
    
    // Fallback to mock data only if we have nothing
    setTvShows(prev => prev.length === 0 ? [...TVSHOWS_TO_RATE] : prev);
    setLoading(false);
  }, [isUsingDemoMode]);

  useEffect(() => {
    isMounted.current = true;
    
    if (activeTab === 'movies') {
      if (movies.length === 0) loadMovies();
    } else {
      if (tvShows.length === 0) loadTvShows();
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [activeTab]);

  const currentMovie = movies[0];
  const currentTvShow = tvShows[0];
  const currentItem = activeTab === 'movies' ? currentMovie : currentTvShow;

  const handleRate = async (rating: RatingType) => {
    if (!currentItem || ratingInProgress) return;
    
    setRatingInProgress(true);
    
    try {
      if (!isUsingDemoMode) {
        if (activeTab === 'movies' && currentMovie) {
          await ratingsApi.rateMovie(
            currentMovie.id,
            currentMovie.title,
            currentMovie.year,
            rating
          );
        } else if (currentTvShow) {
          await ratingsApi.rateTvShow(
            currentTvShow.id,
            currentTvShow.name || currentTvShow.title || 'Unknown',
            currentTvShow.year || 0,
            rating
          );
        }
      }
    } catch (e) {
      console.log('Rating save failed, continuing locally');
    }

    if (activeTab === 'movies' && currentMovie) {
      setPreviousMovies(prev => [...prev, currentMovie]);
      setMovies(prev => prev.slice(1));
      setMoviesRatedCount(prev => prev + 1);
    } else if (currentTvShow) {
      setPreviousTvShows(prev => [...prev, currentTvShow]);
      setTvShows(prev => prev.slice(1));
      setTvShowsRatedCount(prev => prev + 1);
    }
    
    setRatingInProgress(false);
  };

  const handleBack = () => {
    if (activeTab === 'movies') {
      if (previousMovies.length === 0) return;
      const lastMovie = previousMovies[previousMovies.length - 1];
      setMovies(prev => [lastMovie, ...prev]);
      setPreviousMovies(prev => prev.slice(0, -1));
    } else {
      if (previousTvShows.length === 0) return;
      const lastTvShow = previousTvShows[previousTvShows.length - 1];
      setTvShows(prev => [lastTvShow, ...prev]);
      setPreviousTvShows(prev => prev.slice(0, -1));
    }
  };

  const handleAddToWatchlist = async () => {
    if (!currentItem) return;

    try {
      if (!isUsingDemoMode) {
        if (activeTab === 'movies' && currentMovie) {
          await watchlistApi.addToWatchlist(
            currentMovie.id,
            currentMovie.title,
            currentMovie.year
          );
        } else if (currentTvShow) {
          await watchlistApi.addTvShowToWatchlist(
            currentTvShow.id,
            currentTvShow.name || currentTvShow.title || 'Unknown',
            currentTvShow.year || 0
          );
        }
      }
    } catch (e) {
      console.log('Watchlist save failed, continuing locally');
    }

    const title = activeTab === 'movies' 
      ? currentMovie?.title 
      : (currentTvShow?.name || currentTvShow?.title);
    
    Alert.alert('Added!', `"${title}" added to watchlist`);

    if (activeTab === 'movies' && currentMovie) {
      setPreviousMovies(prev => [...prev, currentMovie]);
      setMovies(prev => prev.slice(1));
    } else if (currentTvShow) {
      setPreviousTvShows(prev => [...prev, currentTvShow]);
      setTvShows(prev => prev.slice(1));
    }
  };

  // Get current item details
  const title = activeTab === 'movies' 
    ? currentMovie?.title 
    : (currentTvShow?.name || currentTvShow?.title);
  const year = currentItem?.year;
  const lang = currentItem?.lang;
  const languageName = lang ? (LanguageNames[lang] || lang.toUpperCase()) : '';
  const posterUrl = currentItem?.poster?.startsWith('http')
    ? currentItem.poster
    : currentItem?.poster
    ? `${TMDB_IMAGE_BASE}${currentItem.poster}`
    : null;
  const isTV = activeTab === 'tvshows';
  const previousCount = activeTab === 'movies' ? previousMovies.length : previousTvShows.length;
  const totalCount = activeTab === 'movies' ? movies.length : tvShows.length;
  const ratedCount = activeTab === 'movies' ? moviesRatedCount : tvShowsRatedCount;

  // NEVER block navigation - page shows immediately

  const isEmpty = (activeTab === 'movies' && movies.length === 0) || 
                  (activeTab === 'tvshows' && tvShows.length === 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft color={Colors.text} size={22} />
          </TouchableOpacity>
          <Star color={Colors.primary} size={24} />
          <Text style={styles.title}>Rate</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(tabs)')}>
            <Home color={Colors.textSecondary} size={18} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => activeTab === 'movies' ? loadMovies() : loadTvShows()}>
            <RefreshCw color={Colors.textSecondary} size={18} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Preferences indicator */}
      {user?.languages && user.languages.length > 0 && (
        <View style={styles.preferencesIndicator}>
          <Text style={styles.preferencesText}>
            📍 {user.languages.slice(0, 3).join(', ')}{user.languages.length > 3 ? ` +${user.languages.length - 3}` : ''} 
            {user.genres && user.genres.length > 0 ? ` • ${user.genres.slice(0, 2).join(', ')}${user.genres.length > 2 ? ` +${user.genres.length - 2}` : ''}` : ''}
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'movies' && styles.activeTab]}
          onPress={() => setActiveTab('movies')}
        >
          <Film color={activeTab === 'movies' ? Colors.background : Colors.textSecondary} size={16} />
          <Text style={[styles.tabText, activeTab === 'movies' && styles.activeTabText]}>Movies</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tvshows' && styles.activeTabTV]}
          onPress={() => setActiveTab('tvshows')}
        >
          <Tv color={activeTab === 'tvshows' ? Colors.background : Colors.textSecondary} size={16} />
          <Text style={[styles.tabText, activeTab === 'tvshows' && styles.activeTabText]}>TV Shows</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: totalCount > 0 ? `${(ratedCount / (ratedCount + totalCount)) * 100}%` : '0%' },
            activeTab === 'tvshows' && styles.progressFillTV,
          ]}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner message={`Loading ${activeTab === 'movies' ? 'movies' : 'TV shows'}...`} />
        </View>
      ) : isEmpty ? (
        <EmptyState
          emoji="🎉"
          title="All caught up!"
          message={`You've rated ${ratedCount} ${activeTab}. Generate more to continue!`}
          actionLabel="Generate More"
          onAction={() => activeTab === 'movies' ? loadMovies() : loadTvShows()}
        />
      ) : (
        <View style={styles.mainContainer}>
          {/* Full Screen Movie Card with Overlapping UI */}
          <View style={styles.movieContainer}>
            {/* Back Button - Top Left */}
            <TouchableOpacity
              style={[styles.floatingButton, styles.backButton, previousCount === 0 && styles.buttonDisabled]}
              onPress={handleBack}
              disabled={previousCount === 0}
            >
              <ChevronLeft color={previousCount > 0 ? '#fff' : 'rgba(255,255,255,0.3)'} size={26} strokeWidth={3} />
            </TouchableOpacity>

            {/* Watchlist Button - Top Right */}
            <TouchableOpacity style={[styles.floatingButton, styles.watchlistButton]} onPress={handleAddToWatchlist}>
              <Heart color="#f472b6" size={22} strokeWidth={2.5} />
            </TouchableOpacity>

            {/* Share Button - Below Watchlist */}
            <TouchableOpacity style={[styles.floatingButton, styles.shareButton]} onPress={() => Alert.alert('Share', `Share "${title}" with a friend (Coming soon)`)}>
              <Share2 color="#60a5fa" size={20} strokeWidth={2.5} />
            </TouchableOpacity>

            {/* Poster */}
            {posterUrl ? (
              <Image
                key={currentItem?.id} // Force remount when movie/tvshow changes
                source={{ uri: posterUrl }}
                style={styles.fullPoster}
                contentFit="contain"
                contentPosition="top"
                transition={300}
              />
            ) : (
              <View style={styles.noPoster}>
                <Text style={styles.noPosterEmoji}>🎬</Text>
                <Text style={styles.noPosterText}>{title}</Text>
              </View>
            )}

            {/* Gradient Overlay at Bottom */}
            <LinearGradient
              colors={['transparent', 'rgba(15,15,26,0.6)', 'rgba(15,15,26,0.95)', Colors.background]}
              style={styles.bottomGradient}
            >
              {/* Movie Info - Clean & Simple */}
              <View style={styles.movieInfo}>
                {/* Badges Row */}
                <View style={styles.badgesRow}>
                  <View style={styles.languageBadge}>
                    <Text style={styles.badgeText}>{languageName}</Text>
                  </View>
                  <View style={[styles.typeBadge, isTV ? styles.typeBadgeTV : styles.typeBadgeMovie]}>
                    {isTV ? <Tv color="#fff" size={12} /> : <Film color="#fff" size={12} />}
                    <Text style={styles.badgeText}>{isTV ? 'TV' : 'Movie'}</Text>
                  </View>
                  <Text style={styles.yearText}>{year}</Text>
                </View>

                {/* Title */}
                <Text style={styles.movieTitle} numberOfLines={2}>{title}</Text>
              </View>

              {/* Rating Buttons - Curved Arc */}
              <View style={styles.ratingSection}>
                <View style={styles.ratingArc}>
                  {RATING_OPTIONS.map((option, index) => {
                    const heights = [28, 8, 8, 28];
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.ratingCircle,
                          { 
                            backgroundColor: option.bgColor,
                            borderColor: option.color,
                            marginBottom: heights[index],
                          }
                        ]}
                        onPress={() => handleRate(option.value)}
                        disabled={ratingInProgress}
                      >
                        <Text style={styles.ratingEmoji}>{option.emoji}</Text>
                        <Text style={[styles.ratingLabel, { color: option.color }]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  {ACTION_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.actionButton, { backgroundColor: option.bgColor, borderColor: option.color }]}
                      onPress={() => handleRate(option.value)}
                      disabled={ratingInProgress}
                    >
                      <Text style={[styles.actionButtonText, { color: option.color }]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </LinearGradient>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  backBtn: {
    padding: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
  },
  homeBtn: {
    padding: 8,
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  refreshBtn: {
    padding: 8,
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  preferencesIndicator: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(6, 182, 212, 0.2)',
  },
  preferencesText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
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
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.background,
  },
  progressBar: {
    height: 3,
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressFillTV: {
    backgroundColor: '#9333ea',
  },
  mainContainer: {
    flex: 1,
  },
  movieContainer: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  floatingButton: {
    position: 'absolute',
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  watchlistButton: {
    top: 12,
    right: 12,
    backgroundColor: 'rgba(244, 114, 182, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(244, 114, 182, 0.4)',
  },
  shareButton: {
    top: 60,
    right: 12,
    backgroundColor: 'rgba(96, 165, 250, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.4)',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  fullPoster: {
    width: '100%',
    height: '100%',
  },
  noPoster: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  noPosterEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  noPosterText: {
    color: Colors.textMuted,
    fontSize: 18,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  movieInfo: {
    marginBottom: 16,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  languageBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeMovie: {
    backgroundColor: 'rgba(6, 182, 212, 0.8)',
  },
  typeBadgeTV: {
    backgroundColor: 'rgba(147, 51, 234, 0.8)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  yearText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  movieTitle: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  ratingSection: {
    paddingTop: 8,
  },
  ratingArc: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 10,
    height: 100,
    marginBottom: 12,
  },
  ratingCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  ratingEmoji: {
    fontSize: 22,
    marginBottom: 1,
  },
  ratingLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
