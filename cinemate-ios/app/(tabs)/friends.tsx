import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Search, UserPlus, Users, Check, X, User, Mail, Film, MessageCircle, Star, Tv, LogIn } from 'lucide-react-native';
import { Colors, TMDB_IMAGE_BASE, LanguageNames } from '../../lib/constants';
import { useAppStore } from '../../lib/store';
import { friendsApi, moviesApi } from '../../lib/api';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { runAfterInteractions, pMap, perfLog, FLATLIST_PERF_CONFIG } from '../../lib/perf';

const FRIENDS_CACHE_KEY = 'cache_friends_data';
const SCREEN_NAME = 'Friends';

interface Friend {
  id: string;
  friendshipId?: string;
  name: string;
  email: string;
  image?: string;
}

interface FriendRequest {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  createdAt: string;
}

interface Suggestion {
  id: string;
  name: string;
  email: string;
  image?: string;
  friendshipStatus?: string;
}

interface MovieRecommendation {
  id: string;
  movieId: number;
  movieTitle: string;
  movieYear?: number;
  message?: string;
  createdAt: string;
  poster?: string;
  lang?: string;
  imdbRating?: number;
  genres?: string[];
  summary?: string;
  sender: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

// Memoized login prompt component
const LoginPrompt = memo(({ onPress }: { onPress: () => void }) => (
  <View style={styles.loginPrompt}>
    <LogIn color={Colors.primary} size={64} />
    <Text style={styles.loginTitle}>Sign In Required</Text>
    <Text style={styles.loginSubtitle}>
      Please sign in to connect with friends and share recommendations
    </Text>
    <TouchableOpacity style={styles.loginButton} onPress={onPress}>
      <Text style={styles.loginButtonText}>Sign In</Text>
    </TouchableOpacity>
  </View>
));

// Memoized friend card
const FriendCard = memo(({ 
  item, 
  onRemove 
}: { 
  item: Friend;
  onRemove: (id: string) => void;
}) => (
  <View style={styles.friendCard}>
    <View style={styles.friendAvatar}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.avatarImage} />
      ) : (
        <User color={Colors.textSecondary} size={24} />
      )}
    </View>
    <View style={styles.friendInfo}>
      <Text style={styles.friendName}>{item.name}</Text>
      <Text style={styles.friendEmail}>{item.email}</Text>
    </View>
    <TouchableOpacity
      style={styles.removeButton}
      onPress={() => item.friendshipId && onRemove(item.friendshipId)}
    >
      <X color={Colors.error} size={20} />
    </TouchableOpacity>
  </View>
));

// Memoized request card
const RequestCard = memo(({ 
  item, 
  onAccept, 
  onReject 
}: { 
  item: FriendRequest;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) => (
  <View style={styles.requestCard}>
    <View style={styles.friendAvatar}>
      {item.user.image ? (
        <Image source={{ uri: item.user.image }} style={styles.avatarImage} />
      ) : (
        <User color={Colors.textSecondary} size={24} />
      )}
    </View>
    <View style={styles.friendInfo}>
      <Text style={styles.friendName}>{item.user.name}</Text>
      <Text style={styles.friendEmail}>{item.user.email}</Text>
    </View>
    <View style={styles.requestActions}>
      <TouchableOpacity style={styles.acceptButton} onPress={() => onAccept(item.id)}>
        <Check color={Colors.success} size={20} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.rejectButton} onPress={() => onReject(item.id)}>
        <X color={Colors.error} size={20} />
      </TouchableOpacity>
    </View>
  </View>
));

// Memoized recommendation card
const RecommendationCard = memo(({ item }: { item: MovieRecommendation }) => (
  <View style={styles.recommendationCard}>
    {item.poster && (
      <Image
        source={{ uri: `${TMDB_IMAGE_BASE}${item.poster}` }}
        style={styles.moviePoster}
        contentFit="cover"
      />
    )}
    <View style={styles.recommendationInfo}>
      <Text style={styles.movieTitle} numberOfLines={2}>{item.movieTitle}</Text>
      {item.movieYear && <Text style={styles.movieYear}>{item.movieYear}</Text>}
      <View style={styles.senderInfo}>
        <Text style={styles.fromText}>From: </Text>
        <Text style={styles.senderName}>{item.sender.name}</Text>
      </View>
      {item.message && <Text style={styles.messageText} numberOfLines={2}>{item.message}</Text>}
      {item.imdbRating && (
        <View style={styles.ratingBadge}>
          <Star color={Colors.warning} size={12} fill={Colors.warning} />
          <Text style={styles.ratingText}>{item.imdbRating.toFixed(1)}</Text>
        </View>
      )}
    </View>
  </View>
));

// Memoized search result card
const SearchResultCard = memo(({ 
  item, 
  onSendRequest 
}: { 
  item: Suggestion;
  onSendRequest: (id: string) => void;
}) => (
  <View style={styles.friendCard}>
    <View style={styles.friendAvatar}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.avatarImage} />
      ) : (
        <User color={Colors.textSecondary} size={24} />
      )}
    </View>
    <View style={styles.friendInfo}>
      <Text style={styles.friendName}>{item.name}</Text>
      <Text style={styles.friendEmail}>{item.email}</Text>
    </View>
    {item.friendshipStatus === 'pending' ? (
      <Text style={styles.pendingText}>Pending</Text>
    ) : item.friendshipStatus === 'accepted' ? (
      <Text style={styles.friendsText}>Friends</Text>
    ) : (
      <TouchableOpacity style={styles.addButton} onPress={() => onSendRequest(item.id)}>
        <UserPlus color={Colors.primary} size={20} />
      </TouchableOpacity>
    )}
  </View>
));

export default function FriendsTabScreen() {
  const router = useRouter();
  const { isAuthenticated, isUsingDemoMode, isSessionRestored } = useAppStore();
  
  // State
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'recommendations' | 'search'>('friends');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [friends, setFriends] = useState<Friend[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<Suggestion[]>([]);
  const [movieRecommendations, setMovieRecommendations] = useState<MovieRecommendation[]>([]);
  
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

  // Load data function - runs in background
  const loadData = useCallback(async (isRefresh = false) => {
    const currentSession = ++loadSessionRef.current;
    const isSessionValid = () => isMounted.current && loadSessionRef.current === currentSession;
    const endTimer = perfLog.startTimer(`${SCREEN_NAME} loadData`);
    
    if (isUsingDemoMode) {
      setFriends([{ id: '1', name: 'Demo Friend', email: 'friend@demo.com' }]);
      setReceivedRequests([]);
      setMovieRecommendations([]);
      setDataLoading(false);
      setRefreshing(false);
      endTimer();
      return;
    }

    // Show cached data IMMEDIATELY
    if (!isRefresh) {
      perfLog.dataLoad(SCREEN_NAME, 'cache', 'start');
      try {
        const cached = await AsyncStorage.getItem(FRIENDS_CACHE_KEY);
        if (!isSessionValid()) { endTimer(); return; }
        if (cached) {
          const { friends: f, requests: r, recommendations: rec } = JSON.parse(cached);
          const totalCount = (f?.length || 0) + (r?.length || 0) + (rec?.length || 0);
          perfLog.dataLoad(SCREEN_NAME, 'cache', 'end', totalCount);
          if (f?.length > 0) setFriends(f);
          if (r?.length > 0) setReceivedRequests(r);
          if (rec?.length > 0) setMovieRecommendations(rec);
          setDataLoading(false);
        }
      } catch (e) {
        perfLog.dataLoad(SCREEN_NAME, 'cache', 'end', 0);
      }
    }

    // Fetch fresh data - basic lists only
    try {
      perfLog.dataLoad(SCREEN_NAME, 'network', 'start');
      const [friendsData, requestsData, recommendationsData] = await Promise.all([
        friendsApi.getFriends().catch(() => []),
        friendsApi.getPendingRequests().catch(() => ({ received: [], sent: [] })),
        friendsApi.getRecommendations().catch(() => ({ received: [], sent: [] })),
      ]);

      if (!isSessionValid()) { endTimer(); return; }
      
      const receivedRecs = (recommendationsData?.received || []).slice(0, 10);
      const networkCount = (friendsData?.length || 0) + (requestsData?.received?.length || 0) + receivedRecs.length;
      perfLog.dataLoad(SCREEN_NAME, 'network', 'end', networkCount);
      
      // Render friends and requests IMMEDIATELY (no enrichment)
      setFriends(friendsData || []);
      setReceivedRequests(requestsData?.received || []);
      setMovieRecommendations(receivedRecs);
      
      // UI is now responsive - turn off loading BEFORE enrichment
      setDataLoading(false);
      setRefreshing(false);
      endTimer();
      
      // Enrich recommendations AFTER navigation completes (non-blocking)
      runAfterInteractions(async () => {
        if (!isSessionValid()) return;
        perfLog.dataLoad(SCREEN_NAME, 'enrich', 'start');

        // Enrich recommendations in parallel with concurrency limit
        const recsWithDetails = await pMap(
          receivedRecs,
          async (rec: MovieRecommendation) => {
            if (!isSessionValid()) return rec;

            try {
              const movieDetails = await Promise.race([
                moviesApi.getMovieDetails(rec.movieId),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
              ]) as any;

              return {
                ...rec,
                poster: movieDetails?.poster,
                lang: movieDetails?.lang,
                imdbRating: movieDetails?.imdb || movieDetails?.imdbRating,
                genres: movieDetails?.genres,
                summary: movieDetails?.summary || movieDetails?.overview,
              };
            } catch {
              return rec;
            }
          },
          5 // concurrency limit
        );

        if (!isSessionValid()) return;
        setMovieRecommendations(recsWithDetails);
        perfLog.dataLoad(SCREEN_NAME, 'enrich', 'end', recsWithDetails.length);

        // Cache enriched data (fire and forget)
        AsyncStorage.setItem(FRIENDS_CACHE_KEY, JSON.stringify({
          friends: friendsData || [],
          requests: requestsData?.received || [],
          recommendations: recsWithDetails,
        })).catch(() => {});
      });
    } catch (error) {
      console.error('[FRIENDS] Error:', error);
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
            if (isMounted.current) loadData();
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
  }, [isSessionRestored, isAuthenticated, loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await friendsApi.searchUsers(searchQuery);
      setSearchResults(results || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handleSendRequest = useCallback(async (userId: string) => {
    try {
      await friendsApi.sendFriendRequest(userId);
      Alert.alert('Success', 'Friend request sent!');
      setSearchResults(prev => prev.map(u => 
        u.id === userId ? { ...u, friendshipStatus: 'pending' } : u
      ));
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send request');
    }
  }, []);

  const handleAcceptRequest = useCallback(async (requestId: string) => {
    try {
      await friendsApi.acceptFriendRequest(requestId);
      setReceivedRequests(prev => prev.filter(r => r.id !== requestId));
      loadData(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to accept request');
    }
  }, [loadData]);

  const handleRejectRequest = useCallback(async (requestId: string) => {
    try {
      await friendsApi.rejectFriendRequest(requestId);
      setReceivedRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      Alert.alert('Error', 'Failed to reject request');
    }
  }, []);

  const handleRemoveFriend = useCallback(async (friendshipId: string) => {
    Alert.alert('Remove Friend', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await friendsApi.rejectFriendRequest(friendshipId);
            setFriends(prev => prev.filter(f => f.friendshipId !== friendshipId));
          } catch (error) {
            Alert.alert('Error', 'Failed to remove friend');
          }
        },
      },
    ]);
  }, []);

  // Tab renderer
  const renderTab = useCallback((tab: typeof activeTab, label: string, icon: React.ReactNode) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === tab && styles.activeTab]}
      onPress={() => setActiveTab(tab)}
    >
      {icon}
      <Text style={[styles.tabLabel, activeTab === tab && styles.activeTabLabel]}>{label}</Text>
    </TouchableOpacity>
  ), [activeTab]);

  // Memoized renderItem functions
  const renderFriendItem = useCallback(({ item }: { item: Friend }) => (
    <FriendCard item={item} onRemove={handleRemoveFriend} />
  ), [handleRemoveFriend]);

  const renderRequestItem = useCallback(({ item }: { item: FriendRequest }) => (
    <RequestCard item={item} onAccept={handleAcceptRequest} onReject={handleRejectRequest} />
  ), [handleAcceptRequest, handleRejectRequest]);

  const renderRecommendationItem = useCallback(({ item }: { item: MovieRecommendation }) => (
    <RecommendationCard item={item} />
  ), []);

  const renderSearchResultItem = useCallback(({ item }: { item: Suggestion }) => (
    <SearchResultCard item={item} onSendRequest={handleSendRequest} />
  ), [handleSendRequest]);

  // Stable keyExtractors
  const keyExtractorFriend = useCallback((item: Friend) => item.id, []);
  const keyExtractorRequest = useCallback((item: FriendRequest) => item.id, []);
  const keyExtractorRec = useCallback((item: MovieRecommendation) => item.id, []);
  const keyExtractorSearch = useCallback((item: Suggestion) => item.id, []);

  // Content based on active tab
  const renderContent = useCallback(() => {
    if (dataLoading && !friends.length && !receivedRequests.length) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'friends':
        return friends.length === 0 ? (
          <View style={styles.emptyState}>
            <Users color={Colors.textMuted} size={48} />
            <Text style={styles.emptyText}>No friends yet</Text>
            <Text style={styles.emptySubtext}>Search for friends to connect</Text>
          </View>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={keyExtractorFriend}
            renderItem={renderFriendItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
            }
            {...FLATLIST_PERF_CONFIG}
          />
        );

      case 'requests':
        return receivedRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Mail color={Colors.textMuted} size={48} />
            <Text style={styles.emptyText}>No pending requests</Text>
          </View>
        ) : (
          <FlatList
            data={receivedRequests}
            keyExtractor={keyExtractorRequest}
            renderItem={renderRequestItem}
            contentContainerStyle={styles.listContent}
            {...FLATLIST_PERF_CONFIG}
          />
        );

      case 'recommendations':
        return movieRecommendations.length === 0 ? (
          <View style={styles.emptyState}>
            <Film color={Colors.textMuted} size={48} />
            <Text style={styles.emptyText}>No recommendations yet</Text>
          </View>
        ) : (
          <FlatList
            data={movieRecommendations}
            keyExtractor={keyExtractorRec}
            renderItem={renderRecommendationItem}
            contentContainerStyle={styles.listContent}
            {...FLATLIST_PERF_CONFIG}
          />
        );

      case 'search':
        return (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Search color={Colors.textMuted} size={20} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or email..."
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {searching && <ActivityIndicator size="small" color={Colors.primary} />}
            </View>
            {searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={keyExtractorSearch}
                renderItem={renderSearchResultItem}
                contentContainerStyle={styles.listContent}
                {...FLATLIST_PERF_CONFIG}
              />
            ) : (
              <View style={styles.emptyState}>
                <Search color={Colors.textMuted} size={48} />
                <Text style={styles.emptyText}>Search for friends</Text>
              </View>
            )}
          </View>
        );
    }
  }, [
    activeTab, dataLoading, friends, receivedRequests, movieRecommendations, 
    searchResults, searchQuery, searching, refreshing,
    handleRefresh, handleSearch, renderFriendItem, renderRequestItem, 
    renderRecommendationItem, renderSearchResultItem,
    keyExtractorFriend, keyExtractorRequest, keyExtractorRec, keyExtractorSearch
  ]);

  // RENDER
  // Show loading while session is being restored
  if (!isSessionRestored) {
    if (!loadingLoggedRef.current) {
      loadingLoggedRef.current = true;
      perfLog.loadingRendered(SCREEN_NAME);
    }
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
    if (!loadingLoggedRef.current) {
      loadingLoggedRef.current = true;
      perfLog.loadingRendered(SCREEN_NAME);
    }
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading friends..." />
      </SafeAreaView>
    );
  }

  // Log content rendered
  if (loadingLoggedRef.current) {
    perfLog.contentRendered(SCREEN_NAME);
    loadingLoggedRef.current = false;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {renderTab('friends', 'Friends', <Users color={activeTab === 'friends' ? Colors.primary : Colors.textMuted} size={18} />)}
        {renderTab('requests', 'Requests', <Mail color={activeTab === 'requests' ? Colors.primary : Colors.textMuted} size={18} />)}
        {renderTab('recommendations', 'For You', <Film color={activeTab === 'recommendations' ? Colors.primary : Colors.textMuted} size={18} />)}
        {renderTab('search', 'Search', <Search color={activeTab === 'search' ? Colors.primary : Colors.textMuted} size={18} />)}
      </ScrollView>

      {/* Content */}
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    maxHeight: 50,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    gap: 6,
  },
  activeTab: {
    backgroundColor: Colors.primaryDark,
  },
  tabLabel: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabLabel: {
    color: Colors.primary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: 8,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  friendEmail: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    padding: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
  },
  rejectButton: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  addButton: {
    padding: 8,
    backgroundColor: Colors.primaryDark,
    borderRadius: 8,
  },
  pendingText: {
    color: Colors.warning,
    fontSize: 13,
    fontWeight: '600',
  },
  friendsText: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: '600',
  },
  searchContainer: {
    flex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: Colors.text,
    fontSize: 16,
  },
  recommendationCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  moviePoster: {
    width: 80,
    height: 120,
  },
  recommendationInfo: {
    flex: 1,
    padding: 12,
  },
  movieTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  movieYear: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  fromText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  senderName: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  messageText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  ratingText: {
    color: Colors.warning,
    fontSize: 12,
    fontWeight: '700',
  },
  loginPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loginTitle: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
  },
  loginSubtitle: {
    color: Colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  loginButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
});
