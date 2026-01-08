import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Linking,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  X, 
  Star, 
  Film, 
  Tv, 
  DollarSign, 
  TrendingUp, 
  Heart,
  Share2,
  Trash2,
  ExternalLink
} from 'lucide-react-native';
import { Movie, TvShow } from '../lib/types';
import { Colors, LanguageNames, TMDB_IMAGE_BASE } from '../lib/constants';

const { width, height } = Dimensions.get('window');

interface MovieDetailModalProps {
  visible: boolean;
  movie: Movie | TvShow | null;
  onClose: () => void;
  onAddToWatchlist?: () => void;
  onRemoveFromWatchlist?: () => void;
  onShare?: () => void;
  isInWatchlist?: boolean;
}

export function MovieDetailModal({
  visible,
  movie,
  onClose,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  onShare,
  isInWatchlist = false,
}: MovieDetailModalProps) {
  if (!movie) return null;

  const title = 'title' in movie ? movie.title : movie.name;
  const posterUrl = movie.poster?.startsWith('http')
    ? movie.poster
    : movie.poster
    ? `${TMDB_IMAGE_BASE}${movie.poster}`
    : null;
  const languageName = (movie.lang && LanguageNames[movie.lang]) || movie.lang?.toUpperCase() || 'N/A';
  const isTV = 'name' in movie || movie.type === 'tvshow' || movie.mediaType === 'tv';
  const imdbRating = movie.imdb || movie.imdbRating;
  const voteCount = movie.imdbVoterCount || movie.voteCount;

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

  const handleGoogleSearch = () => {
    const query = encodeURIComponent(`${title} ${movie.year || ''}`);
    Linking.openURL(`https://www.google.com/search?q=${query}`);
  };

  // Close immediately on touch start (not waiting for release)
  const handleCloseStart = useCallback(() => {
    // Fire immediately on touch start for instant response
    onClose();
  }, [onClose]);

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Swipe indicator at top */}
        <View style={styles.swipeIndicatorContainer}>
          <View style={styles.swipeIndicator} />
        </View>
        
        {/* Header with Close Button (optional - swipe down works too) */}
        <View style={styles.header}>
          <Pressable 
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed
            ]} 
            onPressIn={handleCloseStart}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <X color={Colors.text} size={24} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Poster */}
          <View style={styles.posterContainer}>
            {posterUrl ? (
              <Image source={{ uri: posterUrl }} style={styles.poster} contentFit="cover" />
            ) : (
              <View style={styles.noPoster}>
                <Text style={styles.noPosterEmoji}>🎬</Text>
                <Text style={styles.noPosterText}>{title}</Text>
              </View>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(15,15,26,0.8)', Colors.background]}
              style={styles.posterGradient}
            />
            {/* Badges */}
            <View style={styles.languageBadge}>
              <Text style={styles.badgeText}>{languageName}</Text>
            </View>
            <View style={[styles.typeBadge, isTV ? styles.typeBadgeTV : styles.typeBadgeMovie]}>
              {isTV ? <Tv color="#fff" size={12} /> : <Film color="#fff" size={12} />}
              <Text style={styles.badgeText}>{isTV ? 'TV Show' : 'Movie'}</Text>
            </View>
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.title}>{title}</Text>
            
            {/* Year and Genres */}
            <View style={styles.metaRow}>
              {movie.year && <Text style={styles.year}>{movie.year}</Text>}
              {movie.genres && movie.genres.length > 0 && (
                <Text style={styles.genres}>• {movie.genres.join(', ')}</Text>
              )}
            </View>

            {/* IMDB Rating */}
            {(imdbRating || voteCount) && (
              <View style={styles.ratingSection}>
                <View style={styles.imdbBadge}>
                  <Star color="#fbbf24" size={20} fill="#fbbf24" />
                  <View style={styles.imdbContent}>
                    {imdbRating && (
                      <Text style={styles.imdbRating}>{formatRating(imdbRating)}/10</Text>
                    )}
                    {voteCount && (
                      <Text style={styles.voteCount}>{formatNumber(voteCount)} votes</Text>
                    )}
                  </View>
                  <Text style={styles.imdbLabel}>IMDB</Text>
                </View>
                <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSearch}>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleText}>Search Google</Text>
                  <ExternalLink color="#4285F4" size={14} />
                </TouchableOpacity>
              </View>
            )}

            {/* Plot Summary */}
            {(movie.summary || movie.overview) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Plot Summary</Text>
                <Text style={styles.summary}>{String(movie.summary || movie.overview)}</Text>
              </View>
            )}

            {/* User Review Summary */}
            {movie.userReviewSummary && (
              <View style={styles.reviewSection}>
                <Text style={styles.reviewLabel}>👥 IMDB User Reviews Summary</Text>
                <Text style={styles.reviewText}>{String(movie.userReviewSummary)}</Text>
              </View>
            )}

            {/* Budget and Box Office */}
            {((movie as any).budget || (movie as any).boxOffice) && (
              <View style={styles.financialSection}>
                <Text style={styles.sectionTitle}>💰 Financial Info</Text>
                <View style={styles.financialRow}>
                  {(movie as any).budget && (
                    <View style={styles.financialItem}>
                      <DollarSign color={Colors.success} size={18} />
                      <View>
                        <Text style={styles.financialLabel}>Budget</Text>
                        <Text style={[styles.financialValue, { color: Colors.success }]}>
                          {formatNumber((movie as any).budget)}
                        </Text>
                      </View>
                    </View>
                  )}
                  {(movie as any).boxOffice && (
                    <View style={styles.financialItem}>
                      <TrendingUp color={Colors.primary} size={18} />
                      <View>
                        <Text style={styles.financialLabel}>Box Office</Text>
                        <Text style={[styles.financialValue, { color: Colors.primary }]}>
                          {formatNumber((movie as any).boxOffice)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsSection}>
              {isInWatchlist ? (
                <TouchableOpacity style={styles.removeButton} onPress={onRemoveFromWatchlist}>
                  <Trash2 color={Colors.error} size={18} />
                  <Text style={styles.removeButtonText}>Remove from Watchlist</Text>
                </TouchableOpacity>
              ) : onAddToWatchlist ? (
                <TouchableOpacity style={styles.watchlistButton} onPress={onAddToWatchlist}>
                  <Heart color="#f472b6" size={18} />
                  <Text style={styles.watchlistButtonText}>Add to Watchlist</Text>
                </TouchableOpacity>
              ) : null}
              
              {onShare && (
                <TouchableOpacity style={styles.shareButton} onPress={onShare}>
                  <Share2 color="#60a5fa" size={18} />
                  <Text style={styles.shareButtonText}>Share with Friend</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  swipeIndicatorContainer: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 18,
  },
  closeButtonPressed: {
    backgroundColor: Colors.border,
    opacity: 0.8,
  },
  headerTitle: {
    flex: 1,
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  posterContainer: {
    height: 400,
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
  posterGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  languageBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  typeBadge: {
    position: 'absolute',
    top: 50,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  typeBadgeMovie: {
    backgroundColor: 'rgba(6, 182, 212, 0.9)',
  },
  typeBadgeTV: {
    backgroundColor: 'rgba(147, 51, 234, 0.9)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    padding: 20,
  },
  title: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  year: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  genres: {
    color: Colors.primary,
    fontSize: 14,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  imdbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  imdbContent: {
    alignItems: 'flex-start',
  },
  imdbRating: {
    color: '#fcd34d',
    fontSize: 18,
    fontWeight: '700',
  },
  voteCount: {
    color: 'rgba(251, 191, 36, 0.7)',
    fontSize: 11,
    marginTop: 2,
  },
  imdbLabel: {
    color: 'rgba(251, 191, 36, 0.6)',
    fontSize: 10,
    marginLeft: 4,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleIcon: {
    color: '#4285F4',
    fontSize: 18,
    fontWeight: '700',
  },
  googleText: {
    color: '#333',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  summary: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 24,
  },
  reviewSection: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    marginBottom: 20,
  },
  reviewLabel: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  reviewText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  financialSection: {
    marginBottom: 20,
  },
  financialRow: {
    flexDirection: 'row',
    gap: 16,
  },
  financialItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.2)',
  },
  financialLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  financialValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  actionsSection: {
    gap: 12,
    marginTop: 10,
    marginBottom: 40,
  },
  watchlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(244, 114, 182, 0.2)',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(244, 114, 182, 0.4)',
  },
  watchlistButtonText: {
    color: '#f472b6',
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.4)',
  },
  removeButtonText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.4)',
  },
  shareButtonText: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '600',
  },
});

