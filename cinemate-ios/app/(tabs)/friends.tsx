import React, { useState, useEffect, useCallback } from 'react';
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
import { Search, UserPlus, Users, Check, X, User, Mail, Film, MessageCircle, Star, Tv } from 'lucide-react-native';
import { Colors, TMDB_IMAGE_BASE, LanguageNames } from '../../lib/constants';
import { useAppStore } from '../../lib/store';
import { friendsApi, moviesApi } from '../../lib/api';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

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

export default function FriendsTabScreen() {
  const { isUsingDemoMode } = useAppStore();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'recommendations' | 'search'>('friends');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  
  const [friends, setFriends] = useState<Friend[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<Suggestion[]>([]);
  const [movieRecommendations, setMovieRecommendations] = useState<MovieRecommendation[]>([]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isUsingDemoMode) {
      setFriends([
        { id: '1', name: 'Demo Friend', email: 'friend@demo.com' },
      ]);
      setReceivedRequests([]);
      setMovieRecommendations([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (!isRefresh) setLoading(true);

      const [friendsData, requestsData, recommendationsData] = await Promise.all([
        friendsApi.getFriends().catch(() => []),
        friendsApi.getPendingRequests().catch(() => ({ received: [], sent: [] })),
        friendsApi.getRecommendations().catch(() => ({ received: [], sent: [] })),
      ]);

      setFriends(friendsData || []);
      setReceivedRequests(requestsData?.received || []);
      
      // Fetch movie details for recommendations
      const recsWithDetails = await Promise.all(
        (recommendationsData?.received || []).map(async (rec: MovieRecommendation) => {
          try {
            const movieDetails = await moviesApi.getMovieDetails(rec.movieId);
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
        })
      );
      setMovieRecommendations(recsWithDetails);
    } catch (error) {
      console.error('Error loading friends data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isUsingDemoMode]);

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      Alert.alert('Error', 'Search query must be at least 2 characters');
      return;
    }
    
    if (isUsingDemoMode) {
      setSearchResults([
        { id: '999', name: 'Search Result User', email: 'search@demo.com' },
      ]);
      return;
    }

    setSearching(true);
    try {
      const results = await friendsApi.searchUsers(searchQuery);
      const filteredResults = (results || []).filter((user: Suggestion) => 
        user.friendshipStatus === 'none' || !user.friendshipStatus
      );
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    if (isUsingDemoMode) {
      Alert.alert('Demo Mode', 'Friend requests are disabled in demo mode');
      return;
    }

    try {
      await friendsApi.sendFriendRequest(userId);
      Alert.alert('Success', 'Friend request sent!');
      setSearchResults(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (isUsingDemoMode) {
      Alert.alert('Demo Mode', 'This feature is disabled in demo mode');
      return;
    }

    try {
      await friendsApi.acceptFriendRequest(requestId);
      Alert.alert('Success', 'Friend request accepted!');
      loadData();
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (isUsingDemoMode) {
      Alert.alert('Demo Mode', 'This feature is disabled in demo mode');
      return;
    }

    try {
      await friendsApi.rejectFriendRequest(requestId);
      setReceivedRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject request');
    }
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <View style={styles.itemContainer}>
      <View style={styles.avatar}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.avatarImage} />
        ) : (
          <User color={Colors.primary} size={24} />
        )}
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name || 'Unknown'}</Text>
        <Text style={styles.itemEmail}>{item.email}</Text>
      </View>
    </View>
  );

  const renderRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.itemContainer}>
      <View style={styles.avatar}>
        {item.user?.image ? (
          <Image source={{ uri: item.user.image }} style={styles.avatarImage} />
        ) : (
          <User color={Colors.warning} size={24} />
        )}
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.user?.name || 'Unknown'}</Text>
        <Text style={styles.itemEmail}>{item.user?.email || ''}</Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.acceptBtn]}
          onPress={() => handleAcceptRequest(item.id)}
        >
          <Check color="#fff" size={18} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={() => handleRejectRequest(item.id)}
        >
          <X color="#fff" size={18} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchResult = ({ item }: { item: Suggestion }) => (
    <View style={styles.itemContainer}>
      <View style={styles.avatar}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.avatarImage} />
        ) : (
          <User color={Colors.secondary} size={24} />
        )}
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name || 'Unknown'}</Text>
        <Text style={styles.itemEmail}>{item.email}</Text>
      </View>
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => handleSendRequest(item.id)}
      >
        <UserPlus color={Colors.primary} size={20} />
      </TouchableOpacity>
    </View>
  );

  const formatRating = (rating: number | string | undefined) => {
    if (!rating) return null;
    const num = typeof rating === 'string' ? parseFloat(rating) : rating;
    return num.toFixed(1);
  };

  const renderRecommendation = ({ item }: { item: MovieRecommendation }) => {
    const posterUrl = item.poster?.startsWith('http')
      ? item.poster
      : item.poster
      ? `${TMDB_IMAGE_BASE}${item.poster}`
      : null;
    const languageName = item.lang ? (LanguageNames[item.lang] || item.lang.toUpperCase()) : 'N/A';

    return (
      <View style={styles.recommendationContainer}>
        {/* Sender Info */}
        <View style={styles.recommendationHeader}>
          <View style={styles.avatar}>
            {item.sender?.image ? (
              <Image source={{ uri: item.sender.image }} style={styles.avatarImage} />
            ) : (
              <User color={Colors.primary} size={20} />
            )}
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.sender?.name || 'A friend'}</Text>
            <Text style={styles.recommendedText}>recommended this movie</Text>
          </View>
        </View>

        {/* Movie Card with Poster */}
        <View style={styles.movieCardEnhanced}>
          {posterUrl ? (
            <View style={styles.moviePosterContainer}>
              <Image source={{ uri: posterUrl }} style={styles.moviePoster} contentFit="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.posterOverlay}
              />
              <View style={styles.langBadge}>
                <Text style={styles.langText}>{languageName}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.noPosterContainer}>
              <Film color={Colors.textMuted} size={32} />
            </View>
          )}
          <View style={styles.movieDetails}>
            <Text style={styles.movieTitleEnhanced} numberOfLines={2}>{item.movieTitle}</Text>
            <View style={styles.movieMetaRow}>
              {item.movieYear && <Text style={styles.movieYearText}>{item.movieYear}</Text>}
              {item.genres && item.genres.length > 0 && (
                <Text style={styles.genresText}>• {item.genres.slice(0, 2).join(', ')}</Text>
              )}
            </View>
            {item.imdbRating && (
              <View style={styles.ratingBadge}>
                <Star color="#fbbf24" size={12} fill="#fbbf24" />
                <Text style={styles.ratingText}>{formatRating(item.imdbRating)}/10</Text>
              </View>
            )}
            {item.summary && (
              <Text style={styles.summaryText} numberOfLines={2}>{String(item.summary)}</Text>
            )}
          </View>
        </View>

        {/* Message */}
        {item.message && (
          <View style={styles.messageContainer}>
            <MessageCircle color={Colors.textMuted} size={14} />
            <Text style={styles.messageText}>"{item.message}"</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Users color={Colors.primary} size={24} />
        <Text style={styles.title}>Friends</Text>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScrollView}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
            onPress={() => setActiveTab('friends')}
          >
            <Users color={activeTab === 'friends' ? Colors.background : Colors.textSecondary} size={14} />
            <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
              Friends ({friends.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <Mail color={activeTab === 'requests' ? Colors.background : Colors.textSecondary} size={14} />
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              Requests ({receivedRequests.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'recommendations' && styles.activeTab]}
            onPress={() => setActiveTab('recommendations')}
          >
            <Film color={activeTab === 'recommendations' ? Colors.background : Colors.textSecondary} size={14} />
            <Text style={[styles.tabText, activeTab === 'recommendations' && styles.activeTabText]}>
              Movies ({movieRecommendations.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'search' && styles.activeTab]}
            onPress={() => setActiveTab('search')}
          >
            <Search color={activeTab === 'search' ? Colors.background : Colors.textSecondary} size={14} />
            <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
              Find
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Search Tab Content */}
      {activeTab === 'search' && (
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
              returnKeyType="search"
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <X color={Colors.textMuted} size={20} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
            {searching ? (
              <ActivityIndicator size="small" color={Colors.background} />
            ) : (
              <Text style={styles.searchBtnText}>Go</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {activeTab === 'friends' ? (
        friends.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users color={Colors.textMuted} size={48} />
            <Text style={styles.emptyTitle}>No friends yet</Text>
            <Text style={styles.emptyText}>Search for users to add them as friends</Text>
          </View>
        ) : (
          <FlatList
            data={friends}
            renderItem={renderFriend}
            keyExtractor={(item) => item.id || item.friendshipId || Math.random().toString()}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.primary}
              />
            }
          />
        )
      ) : activeTab === 'requests' ? (
        receivedRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Mail color={Colors.textMuted} size={48} />
            <Text style={styles.emptyTitle}>No pending requests</Text>
            <Text style={styles.emptyText}>Friend requests will appear here</Text>
          </View>
        ) : (
          <FlatList
            data={receivedRequests}
            renderItem={renderRequest}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.primary}
              />
            }
          />
        )
      ) : activeTab === 'recommendations' ? (
        movieRecommendations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Film color={Colors.textMuted} size={48} />
            <Text style={styles.emptyTitle}>No movie recommendations</Text>
            <Text style={styles.emptyText}>Movie suggestions from friends will appear here</Text>
          </View>
        ) : (
          <FlatList
            data={movieRecommendations}
            renderItem={renderRecommendation}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.primary}
              />
            }
          />
        )
      ) : (
        searchResults.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Search color={Colors.textMuted} size={48} />
            <Text style={styles.emptyTitle}>Search for users</Text>
            <Text style={styles.emptyText}>Enter a name or email to find friends</Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
          />
        )
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
  loadingText: {
    color: Colors.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  tabScrollView: {
    maxHeight: 56,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.background,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
  },
  searchBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: {
    color: Colors.background,
    fontWeight: '600',
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemEmail: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: Colors.success,
  },
  rejectBtn: {
    backgroundColor: Colors.error,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  recommendationContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  recommendedText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  movieCardEnhanced: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    overflow: 'hidden',
  },
  moviePosterContainer: {
    width: 100,
    height: 150,
    position: 'relative',
  },
  moviePoster: {
    width: '100%',
    height: '100%',
  },
  posterOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  noPosterContainer: {
    width: 100,
    height: 150,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  langText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  movieDetails: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  movieTitleEnhanced: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  movieMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  movieYearText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  genresText: {
    color: Colors.primary,
    fontSize: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  ratingText: {
    color: '#fcd34d',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryText: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  messageText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    fontStyle: 'italic',
  },
});

