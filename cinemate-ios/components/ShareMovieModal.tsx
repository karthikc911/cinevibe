import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { X, Send, User, Check, MessageCircle } from 'lucide-react-native';
import { Colors } from '../lib/constants';
import { friendsApi } from '../lib/api';
import { Image } from 'expo-image';
import { runAfterInteractions, perfLog, FLATLIST_PERF_CONFIG } from '../lib/perf';

interface Friend {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface ShareMovieModalProps {
  visible: boolean;
  onClose: () => void;
  movieId: number;
  movieTitle: string;
  movieYear?: number;
  isTV?: boolean;
}

// Memoized friend item for better FlatList performance
const FriendItem = memo(({ 
  item, 
  isSelected, 
  onToggle 
}: { 
  item: Friend;
  isSelected: boolean;
  onToggle: (id: string) => void;
}) => (
  <TouchableOpacity
    style={[styles.friendItem, isSelected && styles.friendItemSelected]}
    onPress={() => onToggle(item.id)}
    activeOpacity={0.7}
  >
    <View style={styles.friendAvatar}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.avatarImage} />
      ) : (
        <User color={Colors.textSecondary} size={20} />
      )}
    </View>
    <View style={styles.friendInfo}>
      <Text style={styles.friendName}>{item.name}</Text>
      <Text style={styles.friendEmail}>{item.email}</Text>
    </View>
    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
      {isSelected && <Check color="#fff" size={16} />}
    </View>
  </TouchableOpacity>
));

export function ShareMovieModal({
  visible,
  onClose,
  movieId,
  movieTitle,
  movieYear = 0,
  isTV = false,
}: ShareMovieModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Refs for cancellation
  const isMounted = useRef(true);
  const loadCancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    isMounted.current = true;
    
    if (visible) {
      // Reset state IMMEDIATELY - modal renders with loading state
      setSelectedFriends([]);
      setMessage('');
      setLoading(true);
      
      if (__DEV__) {
        perfLog.focus('ShareMovieModal');
        perfLog.loadingRendered('ShareMovieModal');
      }
      
      // Fetch friends AFTER modal animation completes (non-blocking)
      loadCancelRef.current = runAfterInteractions(() => {
        if (isMounted.current) {
          loadFriends();
        }
      });
    } else {
      // Modal closing - cancel any pending load
      if (loadCancelRef.current) {
        loadCancelRef.current();
        loadCancelRef.current = null;
      }
    }
    
    return () => {
      isMounted.current = false;
      if (loadCancelRef.current) {
        loadCancelRef.current();
        loadCancelRef.current = null;
      }
    };
  }, [visible]);

  const loadFriends = async () => {
    const endTimer = perfLog.startTimer('ShareMovieModal loadFriends');
    try {
      const friendsList = await friendsApi.getFriends();
      if (isMounted.current) {
        setFriends(friendsList || []);
        if (__DEV__) {
          perfLog.contentRendered('ShareMovieModal');
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[ShareMovieModal] Error loading friends:', error);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
      endTimer();
    }
  };

  const handleClose = useCallback(() => {
    // Cancel any pending operations
    if (loadCancelRef.current) {
      loadCancelRef.current();
      loadCancelRef.current = null;
    }
    onClose();
  }, [onClose]);

  const toggleFriend = useCallback((friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  }, []);

  const handleShare = useCallback(async () => {
    if (selectedFriends.length === 0) {
      Alert.alert('Select Friends', 'Please select at least one friend to share with.');
      return;
    }

    setSending(true);
    try {
      await friendsApi.recommendMovie(
        selectedFriends, 
        movieId, 
        movieTitle, 
        movieYear,
        message || undefined
      );
      Alert.alert('Success!', `"${movieTitle}" has been shared with ${selectedFriends.length} friend(s).`);
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to share. Please try again.');
    } finally {
      if (isMounted.current) {
        setSending(false);
      }
    }
  }, [selectedFriends, movieId, movieTitle, movieYear, message, onClose]);

  // Memoized renderItem for FlatList
  const renderFriend = useCallback(({ item }: { item: Friend }) => (
    <FriendItem
      item={item}
      isSelected={selectedFriends.includes(item.id)}
      onToggle={toggleFriend}
    />
  ), [selectedFriends, toggleFriend]);

  // Stable keyExtractor
  const keyExtractor = useCallback((item: Friend) => item.id, []);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed
              ]}
              onPress={handleClose}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <X color={Colors.text} size={24} />
            </Pressable>
            <Text style={styles.headerTitle}>Share with Friends</Text>
            <View style={styles.closeButton} />
          </View>

          {/* Movie Info */}
          <View style={styles.movieInfo}>
            <Text style={styles.movieTitle} numberOfLines={2}>{movieTitle}</Text>
            <Text style={styles.movieType}>{isTV ? '📺 TV Show' : '🎬 Movie'}</Text>
          </View>

          {/* Friends List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading friends...</Text>
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <User color={Colors.textMuted} size={48} />
              <Text style={styles.emptyTitle}>No friends yet</Text>
              <Text style={styles.emptyMessage}>
                Add friends to share recommendations
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Select friends to share with:</Text>
              <FlatList
                data={friends}
                renderItem={renderFriend}
                keyExtractor={keyExtractor}
                style={styles.friendsList}
                contentContainerStyle={styles.friendsListContent}
                showsVerticalScrollIndicator={false}
                {...FLATLIST_PERF_CONFIG}
              />
            </>
          )}

          {/* Message Input */}
          {friends.length > 0 && !loading && (
            <View style={styles.messageContainer}>
              <MessageCircle color={Colors.textMuted} size={18} />
              <TextInput
                style={styles.messageInput}
                placeholder="Add a message (optional)"
                placeholderTextColor={Colors.textMuted}
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={200}
              />
            </View>
          )}

          {/* Share Button */}
          {friends.length > 0 && !loading && (
            <TouchableOpacity
              style={[
                styles.shareButton,
                selectedFriends.length === 0 && styles.shareButtonDisabled
              ]}
              onPress={handleShare}
              disabled={sending || selectedFriends.length === 0}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Send color="#fff" size={18} />
                  <Text style={styles.shareButtonText}>
                    Share with {selectedFriends.length > 0 ? selectedFriends.length : ''} Friend{selectedFriends.length !== 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  closeButtonPressed: {
    backgroundColor: Colors.surface,
    transform: [{ scale: 0.95 }],
  },
  headerTitle: {
    flex: 1,
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  movieInfo: {
    padding: 16,
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  movieTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  movieType: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyMessage: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  friendsList: {
    maxHeight: 250,
  },
  friendsListContent: {
    paddingHorizontal: 16,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 8,
  },
  friendItemSelected: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  friendEmail: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  messageInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    minHeight: 40,
    maxHeight: 80,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
