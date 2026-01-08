import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  Keyboard,
  ScrollView,
  Dimensions,
  Animated,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search as SearchIcon, X, Film, Tv, Sparkles, RefreshCw, Heart, Share2, ThumbsDown, EyeOff, ChevronLeft, ChevronRight, LogIn } from 'lucide-react-native';
import { MovieCard } from '../../components/MovieCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { LoadingBanner } from '../../components/LoadingBanner';
import { moviesApi, tvShowsApi, ratingsApi, watchlistApi } from '../../lib/api';
import { Colors, TMDB_IMAGE_BASE, LanguageNames } from '../../lib/constants';
import { Movie, TvShow, RatingType } from '../../lib/types';
import { useAppStore } from '../../lib/store';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

type SearchType = 'movies' | 'tvshows';
type ViewMode = 'search' | 'ai-movies' | 'ai-tvshows';

interface AIStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
}

// Memoized login prompt
const LoginPrompt = React.memo(({ onPress }: { onPress: () => void }) => (
  <View style={styles.loginPrompt}>
    <LogIn color={Colors.primary} size={64} />
    <Text style={styles.loginTitle}>Sign In Required</Text>
    <Text style={styles.loginSubtitle}>
      Please sign in to search for movies and get AI recommendations
    </Text>
    <TouchableOpacity style={styles.loginButton} onPress={onPress}>
      <Text style={styles.loginButtonText}>Sign In</Text>
    </TouchableOpacity>
  </View>
));

export default function SearchScreen() {
  const router = useRouter();
  const { isAuthenticated, isSessionRestored, isUsingDemoMode, addToMovieWatchlist, addToTvShowWatchlist } = useAppStore();
  
  // State
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('movies');
  const [viewMode, setViewMode] = useState<ViewMode>('search');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<(Movie | TvShow)[]>([]);
  const [aiMovies, setAiMovies] = useState<Movie[]>([]);
  const [aiTvShows, setAiTvShows] = useState<TvShow[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [aiSteps, setAiSteps] = useState<AIStep[]>([]);

  const updateStep = (stepId: string, updates: Partial<AIStep>) => {
    setAiSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    Keyboard.dismiss();
    setLoading(true);
    setHasSearched(true);
    setViewMode('search');
    
    console.log('[SEARCH] Starting search for:', query, 'Type:', searchType);
    
    // Set up AI steps for search
    const steps: AIStep[] = [
      { id: 'understanding', label: 'Understanding your query', status: 'loading' },
      { id: 'ai_search', label: 'Searching with AI (Perplexity)', status: 'pending' },
      { id: 'database_check', label: 'Checking database & TMDB', status: 'pending' },
      { id: 'enriching', label: 'Enriching with IMDB data', status: 'pending' },
    ];
    setAiSteps(steps);

    try {
      // Step 1: Understanding
      await new Promise(resolve => setTimeout(resolve, 400));
      updateStep('understanding', { status: 'completed' });
      updateStep('ai_search', { status: 'loading' });
      
      // Step 2: AI Search (using Perplexity like website)
      // The backend uses the query to search and considers user preferences
      console.log('[SEARCH] Calling Perplexity API with query:', query);
      
      // Search both movies and TV shows - Perplexity returns both
      let searchResults: (Movie | TvShow)[] = [];
      
      try {
        // Use Perplexity which returns both movies and TV shows
        if (searchType === 'movies') {
          searchResults = await moviesApi.searchMovies(query);
          console.log('[SEARCH] Movie results:', searchResults.length);
        } else {
          searchResults = await tvShowsApi.searchTvShows(query);
          console.log('[SEARCH] TV Show results:', searchResults.length);
        }
      } catch (searchError: any) {
        console.error('[SEARCH] Perplexity search error:', searchError?.message);
        throw searchError;
      }
      
      updateStep('ai_search', { status: 'completed' });
      updateStep('database_check', { status: 'completed' });
      updateStep('enriching', { status: 'loading' });
      
      // Step 4: Enrich
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStep('enriching', { status: 'completed' });
      
      console.log('[SEARCH] Final results count:', searchResults?.length || 0);
      setResults(searchResults || []);
      setAiSteps([]);
    } catch (error: any) {
      console.error('[SEARCH] Error:', error?.message || error);
      setAiSteps(prev => prev.map(step => 
        step.status === 'loading' ? { ...step, status: 'error' } : step
      ));
      Alert.alert('Search Error', `Failed to search: ${error?.message || 'Please try again.'}`);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAIMovies = async () => {
    setLoading(true);
    setViewMode('ai-movies');
    setCurrentIndex(0);
    
    console.log('[AI_MOVIES] Loading AI movie picks using user preferences...');
    
    const steps: AIStep[] = [
      { id: 'analyzing', label: 'Loading your preferences & ratings', status: 'loading' },
      { id: 'generating', label: 'AI generating personalized picks', status: 'pending' },
      { id: 'matching', label: 'Finding best matches', status: 'pending' },
      { id: 'enriching', label: 'Adding IMDB details', status: 'pending' },
    ];
    setAiSteps(steps);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('analyzing', { status: 'completed' });
      updateStep('generating', { status: 'loading' });
      
      // Backend loads user preferences (languages, genres) from DB
      // and uses them in Perplexity prompt to generate picks
      const result = await moviesApi.getSmartPicks();
      
      console.log('[AI_MOVIES] Received', result.movies?.length || 0, 'movies');
      
      updateStep('generating', { status: 'completed' });
      updateStep('matching', { status: 'completed' });
      updateStep('enriching', { status: 'loading' });
      
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStep('enriching', { status: 'completed' });
      
      setAiMovies(result.movies || []);
      setAiSteps([]);
    } catch (error: any) {
      console.error('[AI_MOVIES] Error:', error?.message || error);
      setAiSteps(prev => prev.map(step => 
        step.status === 'loading' ? { ...step, status: 'error' } : step
      ));
      Alert.alert('Error', `Failed to load AI recommendations: ${error?.message || 'Please try again.'}`);
      setAiMovies([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAITvShows = async () => {
    setLoading(true);
    setViewMode('ai-tvshows');
    setCurrentIndex(0);
    
    console.log('[AI_TVSHOWS] Loading AI TV show picks using user preferences...');
    
    const steps: AIStep[] = [
      { id: 'analyzing', label: 'Loading your preferences & ratings', status: 'loading' },
      { id: 'generating', label: 'AI generating personalized TV picks', status: 'pending' },
      { id: 'matching', label: 'Finding best matches', status: 'pending' },
      { id: 'enriching', label: 'Adding IMDB details', status: 'pending' },
    ];
    setAiSteps(steps);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('analyzing', { status: 'completed' });
      updateStep('generating', { status: 'loading' });
      
      // Backend loads user preferences (languages, genres) from DB
      // and uses them in Perplexity prompt to generate TV picks
      const result = await tvShowsApi.getSmartPicks();
      
      console.log('[AI_TVSHOWS] Received', result.tvShows?.length || 0, 'TV shows');
      
      updateStep('generating', { status: 'completed' });
      updateStep('matching', { status: 'completed' });
      updateStep('enriching', { status: 'loading' });
      
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStep('enriching', { status: 'completed' });
      
      setAiTvShows(result.tvShows || []);
      setAiSteps([]);
    } catch (error: any) {
      console.error('[AI_TVSHOWS] Error:', error?.message || error);
      setAiSteps(prev => prev.map(step => 
        step.status === 'loading' ? { ...step, status: 'error' } : step
      ));
      Alert.alert('Error', `Failed to load AI recommendations: ${error?.message || 'Please try again.'}`);
      setAiTvShows([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setViewMode('search');
    setAiSteps([]);
  };

  const nextCard = () => {
    const data = viewMode === 'ai-movies' ? aiMovies : aiTvShows;
    if (currentIndex < data.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const getCurrentItem = () => {
    const data = viewMode === 'ai-movies' ? aiMovies : aiTvShows;
    return data[currentIndex];
  };

  const handleRate = async (rating: RatingType) => {
    const currentItem = getCurrentItem();
    if (!currentItem) return;

    try {
      const title = ('title' in currentItem ? currentItem.title : currentItem.name) || 'Unknown';
      const isMovie = viewMode === 'ai-movies';
      
      if (!isUsingDemoMode) {
        if (isMovie) {
          await ratingsApi.rateMovie(currentItem.id, title, currentItem.year || 0, rating);
        } else {
          await ratingsApi.rateTvShow(currentItem.id, title, currentItem.year || 0, rating);
        }
      }
      
      // Move to next card
      nextCard();
    } catch (error) {
      console.error('Error rating:', error);
      Alert.alert('Error', 'Failed to save rating.');
    }
  };

  const handleAddToWatchlist = async (item: Movie | TvShow) => {
    try {
      const title = ('title' in item ? item.title : item.name) || 'Unknown';
      const isMovie = 'title' in item;
      
      if (!isUsingDemoMode) {
        if (isMovie) {
          await watchlistApi.addToWatchlist(item.id, title, item.year);
        } else {
          await watchlistApi.addTvShowToWatchlist(item.id, title, item.year);
        }
      }
      
      Alert.alert('Added!', `"${title}" added to watchlist`);
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      Alert.alert('Error', 'Failed to add to watchlist.');
    }
  };

  const handleShare = (item: Movie | TvShow) => {
    const title = 'title' in item ? item.title : item.name;
    Alert.alert('Share', `Share "${title}" with a friend (Coming soon)`);
  };

  // Format helpers
  const formatRating = (rating: number | string | undefined) => {
    if (!rating) return null;
    const num = typeof rating === 'string' ? parseFloat(rating) : rating;
    return num.toFixed(1);
  };

  const formatNumber = (num: number | null | undefined) => {
    if (!num) return null;
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(0)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  // AI Progress Panel
  const renderAIProgress = () => {
    if (aiSteps.length === 0) return null;
    
    return (
      <View style={styles.aiProgressContainer}>
        <Text style={styles.aiProgressTitle}>🤖 AI is thinking...</Text>
        {aiSteps.map((step, index) => (
          <View key={step.id} style={styles.aiStep}>
            <View style={[
              styles.aiStepIndicator,
              step.status === 'completed' && styles.aiStepCompleted,
              step.status === 'loading' && styles.aiStepLoading,
              step.status === 'error' && styles.aiStepError,
            ]}>
              {step.status === 'loading' ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : step.status === 'completed' ? (
                <Text style={styles.aiStepCheck}>✓</Text>
              ) : step.status === 'error' ? (
                <Text style={styles.aiStepCheck}>✕</Text>
              ) : (
                <Text style={styles.aiStepNumber}>{index + 1}</Text>
              )}
            </View>
            <Text style={[
              styles.aiStepLabel,
              step.status === 'completed' && styles.aiStepLabelCompleted,
              step.status === 'loading' && styles.aiStepLabelLoading,
            ]}>{step.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderSwipeableCard = () => {
    const item = getCurrentItem();
    if (!item) return null;

    const title = 'title' in item ? item.title : item.name;
    const posterUrl = item.poster?.startsWith('http')
      ? item.poster
      : item.poster
      ? `${TMDB_IMAGE_BASE}${item.poster}`
      : null;
    const languageName = (item.lang && LanguageNames[item.lang]) || item.lang?.toUpperCase() || 'N/A';
    const isTV = viewMode === 'ai-tvshows';
    const imdbRating = item.imdb || item.imdbRating;
    const voteCount = item.imdbVoterCount || item.voteCount;
    const data = viewMode === 'ai-movies' ? aiMovies : aiTvShows;

    return (
      <View style={styles.swipeContainer}>
        {/* Navigation Controls */}
        <View style={styles.navControls}>
          <TouchableOpacity 
            style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
            onPress={prevCard}
            disabled={currentIndex === 0}
          >
            <ChevronLeft color={currentIndex === 0 ? Colors.textMuted : Colors.text} size={28} />
          </TouchableOpacity>
          <Text style={styles.progressText}>{currentIndex + 1} / {data.length}</Text>
          <TouchableOpacity 
            style={[styles.navBtn, currentIndex >= data.length - 1 && styles.navBtnDisabled]}
            onPress={nextCard}
            disabled={currentIndex >= data.length - 1}
          >
            <ChevronRight color={currentIndex >= data.length - 1 ? Colors.textMuted : Colors.text} size={28} />
          </TouchableOpacity>
        </View>

        {/* Card */}
        <ScrollView style={styles.cardScrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.swipeCard}>
            {/* Poster */}
            <View style={styles.posterContainer}>
              {posterUrl ? (
                <Image source={{ uri: posterUrl }} style={styles.poster} contentFit="contain" contentPosition="top" />
              ) : (
                <View style={styles.noPoster}>
                  <Text style={styles.noPosterEmoji}>🎬</Text>
                  <Text style={styles.noPosterText}>{title}</Text>
                </View>
              )}
              <LinearGradient
                colors={['transparent', 'rgba(15,15,26,0.9)', Colors.background]}
                style={styles.posterGradient}
              />
              {/* Badges */}
              <View style={styles.languageBadge}>
                <Text style={styles.badgeText}>{languageName}</Text>
              </View>
              <View style={[styles.typeBadge, isTV ? styles.typeBadgeTV : styles.typeBadgeMovie]}>
                {isTV ? <Tv color="#fff" size={10} /> : <Film color="#fff" size={10} />}
                <Text style={styles.badgeText}>{isTV ? 'TV' : 'Movie'}</Text>
              </View>
              {item.matchPercent && (
                <View style={styles.matchBadge}>
                  <Text style={styles.matchText}>💯 {item.matchPercent}%</Text>
                </View>
              )}
            </View>

            {/* Content */}
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{title}</Text>
              <View style={styles.metaRow}>
                {item.year && <Text style={styles.metaYear}>{item.year}</Text>}
                {item.genres && item.genres.length > 0 && (
                  <Text style={styles.metaGenres}>• {item.genres.slice(0, 3).join(', ')}</Text>
                )}
              </View>

              {/* IMDB Rating Row */}
              {(imdbRating || voteCount) && (
                <View style={styles.ratingRow}>
                  {imdbRating && (
                    <View style={styles.imdbBadge}>
                      <Text style={styles.imdbStar}>★</Text>
                      <View>
                        <Text style={styles.imdbRating}>{formatRating(imdbRating)}/10</Text>
                        {voteCount && <Text style={styles.voteCount}>{formatNumber(voteCount)} votes</Text>}
                      </View>
                      <Text style={styles.imdbLabel}>IMDB</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Summary */}
              {(item.summary || item.overview) && (
                <Text style={styles.summary}>{String(item.summary || item.overview)}</Text>
              )}

              {/* User Review Summary */}
              {item.userReviewSummary && item.userReviewSummary !== item.summary && (
                <View style={styles.reviewBox}>
                  <Text style={styles.reviewLabel}>User Reviews (IMDB)</Text>
                  <Text style={styles.reviewText}>{String(item.userReviewSummary)}</Text>
                </View>
              )}

              {/* Budget/Box Office */}
              {((item as any).budget || (item as any).boxOffice) && (
                <View style={styles.financialRow}>
                  {(item as any).budget && (
                    <View style={styles.financialItem}>
                      <Text style={styles.financialLabel}>Budget</Text>
                      <Text style={[styles.financialValue, { color: Colors.success }]}>
                        {formatNumber((item as any).budget)}
                      </Text>
                    </View>
                  )}
                  {(item as any).boxOffice && (
                    <View style={styles.financialItem}>
                      <Text style={styles.financialLabel}>Box Office</Text>
                      <Text style={[styles.financialValue, { color: Colors.primary }]}>
                        {formatNumber((item as any).boxOffice)}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Match Reason */}
              {item.matchReason && (
                <View style={styles.matchReasonBox}>
                  <Text style={styles.matchReasonText}>{String(item.matchReason)}</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Rating Buttons */}
        <View style={styles.ratingButtonsContainer}>
          <View style={styles.mainRatings}>
            <TouchableOpacity style={[styles.ratingBtn, styles.ratingBtnAwful]} onPress={() => handleRate('awful')}>
              <Text style={styles.ratingEmoji}>😫</Text>
              <Text style={[styles.ratingLabel, { color: '#f43f5e' }]}>Awful</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ratingBtn, styles.ratingBtnMeh]} onPress={() => handleRate('meh')}>
              <Text style={styles.ratingEmoji}>😐</Text>
              <Text style={[styles.ratingLabel, { color: '#fbbf24' }]}>Meh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ratingBtn, styles.ratingBtnGood]} onPress={() => handleRate('good')}>
              <Text style={styles.ratingEmoji}>👍</Text>
              <Text style={[styles.ratingLabel, { color: '#38bdf8' }]}>Good</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ratingBtn, styles.ratingBtnAmazing]} onPress={() => handleRate('amazing')}>
              <Text style={styles.ratingEmoji}>🤩</Text>
              <Text style={[styles.ratingLabel, { color: '#34d399' }]}>Amazing</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.secondaryActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleRate('not-seen')}>
              <EyeOff color={Colors.textMuted} size={16} />
              <Text style={styles.actionText}>Not Seen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleRate('not-interested')}>
              <ThumbsDown color="#a78bfa" size={16} />
              <Text style={[styles.actionText, { color: '#a78bfa' }]}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleAddToWatchlist(item)}>
              <Heart color="#f472b6" size={16} />
              <Text style={[styles.actionText, { color: '#f472b6' }]}>Watchlist</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(item)}>
              <Share2 color="#60a5fa" size={16} />
              <Text style={[styles.actionText, { color: '#60a5fa' }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderSearchResults = () => (
    <FlatList
      data={results}
      renderItem={({ item }) => (
        <MovieCard
          movie={item}
          onAddToWatchlist={() => handleAddToWatchlist(item)}
          onShare={() => handleShare(item)}
          showMatch={false}
          fullWidth
          showActions
        />
      )}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.searchResultsList}
      showsVerticalScrollIndicator={false}
    />
  );

  // ALWAYS render shell immediately!
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Loading banner at top */}
      <LoadingBanner visible={loading} message="Searching..." />
      
      {/* Show login prompt if not authenticated */}
      {isSessionRestored && !isAuthenticated ? (
        <LoginPrompt onPress={() => router.push('/login')} />
      ) : (
        <>
      {/* Header - Only show when not in AI mode */}
      {viewMode === 'search' && (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>Discover</Text>
          </View>

          {/* AI Picks Section */}
          <View style={styles.aiSection}>
            <Text style={styles.sectionTitle}>🤖 AI Picks</Text>
            <View style={styles.aiButtonsRow}>
              <TouchableOpacity
                style={[styles.aiButton]}
                onPress={loadAIMovies}
                disabled={loading}
              >
                <Sparkles color={Colors.primary} size={18} />
                <Text style={[styles.aiButtonText]}>
                  AI Movie Picks
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.aiButton]}
                onPress={loadAITvShows}
                disabled={loading}
              >
                <Sparkles color={'#9333ea'} size={18} />
                <Text style={[styles.aiButtonText]}>
                  AI TV Picks
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Section */}
          <View style={styles.searchSection}>
            <Text style={styles.sectionTitle}>🔍 Search</Text>
            <View style={styles.searchInputContainer}>
              <SearchIcon color={Colors.textMuted} size={20} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search movies or TV shows..."
                placeholderTextColor={Colors.textMuted}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={clearSearch}>
                  <X color={Colors.textMuted} size={20} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[styles.typeTab, searchType === 'movies' && styles.activeTypeTab]}
                onPress={() => setSearchType('movies')}
              >
                <Film color={searchType === 'movies' ? Colors.background : Colors.textSecondary} size={16} />
                <Text style={[styles.typeText, searchType === 'movies' && styles.activeTypeText]}>Movies</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeTab, searchType === 'tvshows' && styles.activeTypeTab]}
                onPress={() => setSearchType('tvshows')}
              >
                <Tv color={searchType === 'tvshows' ? Colors.background : Colors.textSecondary} size={16} />
                <Text style={[styles.typeText, searchType === 'tvshows' && styles.activeTypeText]}>TV Shows</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* AI Mode Header */}
      {viewMode !== 'search' && (
        <View style={styles.aiModeHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setViewMode('search')}>
            <X color={Colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.aiModeTitle}>
            {viewMode === 'ai-movies' ? '🎬 AI Movie Picks' : '📺 AI TV Picks'}
          </Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={viewMode === 'ai-movies' ? loadAIMovies : loadAITvShows}
          >
            <RefreshCw color={Colors.primary} size={20} />
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {loading && aiSteps.length > 0 ? (
        <View style={styles.loadingContainer}>
          {renderAIProgress()}
        </View>
      ) : loading ? (
        <LoadingSpinner message="Searching..." />
      ) : viewMode === 'search' && hasSearched && results.length === 0 ? (
        <EmptyState emoji="🔍" title="No results" message={`No ${searchType} found for "${query}"`} />
      ) : viewMode === 'search' && !hasSearched ? (
        <EmptyState emoji="🎬" title="Start exploring" message="Use AI picks or search for content" />
      ) : viewMode === 'search' && results.length > 0 ? (
        renderSearchResults()
      ) : (viewMode === 'ai-movies' && aiMovies.length === 0) || (viewMode === 'ai-tvshows' && aiTvShows.length === 0) ? (
        <EmptyState emoji="🎯" title="No recommendations yet" message="Rate some content first for personalized AI picks" />
      ) : viewMode !== 'search' ? (
        renderSwipeableCard()
      ) : null}
        </>
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
    paddingBottom: 8,
  },
  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  aiSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  aiButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  aiButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  aiButtonActive: {
    backgroundColor: Colors.primary,
  },
  aiButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  aiButtonTextActive: {
    color: Colors.background,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  activeTypeTab: {
    backgroundColor: Colors.primary,
  },
  typeText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  activeTypeText: {
    color: Colors.background,
  },
  aiModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiModeTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultsList: {
    paddingBottom: 100,
  },
  aiProgressContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  aiProgressTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  aiStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  aiStepIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiStepCompleted: {
    backgroundColor: Colors.success,
  },
  aiStepLoading: {
    backgroundColor: Colors.primary,
  },
  aiStepError: {
    backgroundColor: Colors.error,
  },
  aiStepCheck: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  aiStepNumber: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  aiStepLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  aiStepLabelCompleted: {
    color: Colors.success,
  },
  aiStepLabelLoading: {
    color: Colors.primary,
  },
  // Swipeable Card Styles
  swipeContainer: {
    flex: 1,
  },
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 20,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  progressText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  cardScrollView: {
    flex: 1,
  },
  swipeCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  posterContainer: {
    height: 380,
    position: 'relative',
    backgroundColor: Colors.surface,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  noPoster: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noPosterEmoji: {
    fontSize: 60,
    marginBottom: 8,
  },
  noPosterText: {
    color: Colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
  },
  posterGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  languageBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  typeBadge: {
    position: 'absolute',
    top: 44,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeMovie: {
    backgroundColor: 'rgba(6, 182, 212, 0.9)',
  },
  typeBadgeTV: {
    backgroundColor: 'rgba(147, 51, 234, 0.9)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  matchBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(6, 182, 212, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(6, 182, 212, 0.6)',
  },
  matchText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  metaYear: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  metaGenres: {
    color: Colors.primary,
    fontSize: 13,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  imdbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  imdbStar: {
    color: '#fbbf24',
    fontSize: 18,
  },
  imdbRating: {
    color: '#fcd34d',
    fontSize: 14,
    fontWeight: '700',
  },
  voteCount: {
    color: 'rgba(251, 191, 36, 0.7)',
    fontSize: 10,
  },
  imdbLabel: {
    color: 'rgba(251, 191, 36, 0.6)',
    fontSize: 9,
    marginLeft: 4,
  },
  summary: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  reviewBox: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    marginBottom: 12,
  },
  reviewLabel: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  reviewText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  financialRow: {
    flexDirection: 'row',
    gap: 16,
    padding: 12,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.2)',
    marginBottom: 12,
  },
  financialItem: {
    flex: 1,
  },
  financialLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  financialValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  matchReasonBox: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  matchReasonText: {
    color: Colors.primary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  ratingButtonsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  mainRatings: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  ratingBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  ratingBtnAwful: {
    backgroundColor: 'rgba(244, 63, 94, 0.3)',
    borderColor: 'rgba(244, 63, 94, 0.5)',
  },
  ratingBtnMeh: {
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  ratingBtnGood: {
    backgroundColor: 'rgba(56, 189, 248, 0.3)',
    borderColor: 'rgba(56, 189, 248, 0.5)',
  },
  ratingBtnAmazing: {
    backgroundColor: 'rgba(52, 211, 153, 0.3)',
    borderColor: 'rgba(52, 211, 153, 0.5)',
  },
  ratingEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  ratingLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
});
