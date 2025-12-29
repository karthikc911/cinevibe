import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Share2, Star, Film, Tv, Heart, ThumbsDown, Eye, EyeOff, DollarSign, TrendingUp } from 'lucide-react-native';
import { Movie, TvShow, RatingType } from '../lib/types';
import { Colors, LanguageNames, TMDB_IMAGE_BASE, DEFAULT_POSTER } from '../lib/constants';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
const FULL_CARD_WIDTH = width - 32;
// Movie posters have a 2:3 aspect ratio
const POSTER_ASPECT_RATIO = 1.5;

interface MovieCardProps {
  movie: Movie | TvShow;
  onPress?: () => void;
  onAddToWatchlist?: () => void;
  onShare?: () => void;
  onRate?: (rating: RatingType) => void;
  showMatch?: boolean;
  compact?: boolean;
  fullWidth?: boolean; // For swipeable cards
  showActions?: boolean;
  showRatingButtons?: boolean;
}

export function MovieCard({
  movie,
  onPress,
  onAddToWatchlist,
  onShare,
  onRate,
  showMatch = false,
  compact = false,
  fullWidth = false,
  showActions = true,
  showRatingButtons = false,
}: MovieCardProps) {
  const [imageError, setImageError] = useState(false);

  const title = 'title' in movie ? movie.title : movie.name;
  const posterUrl = movie.poster?.startsWith('http')
    ? movie.poster
    : movie.poster
    ? `${TMDB_IMAGE_BASE}${movie.poster}`
    : null;

  const languageName = LanguageNames[movie.lang] || movie.lang?.toUpperCase() || 'N/A';
  const isTV = 'name' in movie || movie.type === 'tvshow' || movie.mediaType === 'tv';

  // Google search link
  const handleGoogleSearch = () => {
    const query = encodeURIComponent(`${title} ${movie.year || ''}`);
    Linking.openURL(`https://www.google.com/search?q=${query}`);
  };

  // Format IMDB rating
  const formatRating = (rating: number | string | undefined) => {
    if (!rating) return null;
    const num = typeof rating === 'string' ? parseFloat(rating) : rating;
    return num.toFixed(1);
  };

  // Format large numbers (budget, box office, vote count)
  const formatNumber = (num: number | null | undefined) => {
    if (!num) return null;
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(0)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const imdbRating = movie.imdb || movie.imdbRating;
  const voteCount = movie.imdbVoterCount || movie.voteCount;
  const cardWidth = fullWidth ? FULL_CARD_WIDTH : (compact ? CARD_WIDTH * 0.9 : CARD_WIDTH);
  // Use proper aspect ratio for full width cards to show complete poster
  // For compact/grid cards, use fixed heights that look good in grid
  const imageHeight = fullWidth 
    ? Math.min(cardWidth * POSTER_ASPECT_RATIO, 450) // Full poster but max 450px 
    : (compact ? 140 : 200);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { width: cardWidth },
        fullWidth && styles.containerFullWidth,
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Poster */}
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        {posterUrl && !imageError ? (
          <Image
            source={{ uri: posterUrl }}
            style={styles.poster}
            contentFit={fullWidth ? "contain" : "cover"}
            contentPosition="top"
            transition={200}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.noPoster}>
            <Text style={styles.noPosterEmoji}>🎬</Text>
            <Text style={styles.noPosterText} numberOfLines={2}>{title}</Text>
          </View>
        )}

        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
          style={styles.gradient}
        />

        {/* Language Badge - Top Left */}
        <View style={styles.languageBadge}>
          <Text style={styles.languageText}>{languageName}</Text>
        </View>

        {/* Type Badge - Below Language */}
        <View style={[styles.typeBadge, isTV ? styles.typeBadgeTV : styles.typeBadgeMovie]}>
          {isTV ? <Tv color="#fff" size={10} /> : <Film color="#fff" size={10} />}
          <Text style={styles.typeText}>{isTV ? 'TV' : 'Movie'}</Text>
        </View>

        {/* Match Percentage - Top Right */}
        {showMatch && movie.matchPercent && (
          <View style={styles.matchBadge}>
            <Text style={styles.matchText}>💯 {movie.matchPercent}%</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={[styles.content, fullWidth && styles.contentFullWidth]}>
        {/* Title and Year */}
        <Text style={[styles.title, fullWidth && styles.titleFullWidth]} numberOfLines={2}>
          {title || 'Untitled'}
        </Text>
        <View style={styles.metaRow}>
          {movie.year ? <Text style={styles.year}>{movie.year}</Text> : null}
          {Array.isArray(movie.genres) && movie.genres.length > 0 ? (
            <Text style={styles.genres}>• {movie.genres.slice(0, 2).join(', ')}</Text>
          ) : null}
        </View>

        {/* IMDB Rating Row with Votes and Google */}
        {(imdbRating || voteCount) && (
          <View style={styles.ratingRow}>
            {imdbRating && (
              <View style={styles.imdbBadge}>
                <Star color="#fbbf24" size={14} fill="#fbbf24" />
                <View style={styles.imdbContent}>
                  <Text style={styles.imdbRating}>{formatRating(imdbRating)}/10</Text>
                  {voteCount && (
                    <Text style={styles.voteCount}>{formatNumber(voteCount)} votes</Text>
                  )}
                </View>
                <Text style={styles.imdbLabel}>IMDB</Text>
              </View>
            )}
            {!imdbRating && voteCount && (
              <View style={styles.voteBadge}>
                <Text style={styles.voteOnly}>{formatNumber(voteCount)} votes</Text>
              </View>
            )}
            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSearch}>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleText}>Google</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Plot Summary */}
        {(movie.summary || movie.overview) && (
          <Text style={[styles.summary, fullWidth && styles.summaryFullWidth]} numberOfLines={fullWidth ? 5 : 3}>
            {String(movie.summary || movie.overview)}
          </Text>
        )}

        {/* User Review Summary from IMDB */}
        {movie.userReviewSummary && movie.userReviewSummary !== movie.summary && (
          <View style={styles.reviewContainer}>
            <Text style={styles.reviewLabel}>User Reviews (IMDB)</Text>
            <Text style={styles.reviewText} numberOfLines={fullWidth ? 4 : 2}>
              {String(movie.userReviewSummary)}
            </Text>
          </View>
        )}

        {/* Budget and Box Office */}
        {(movie.budget || movie.boxOffice) && (
          <View style={styles.financialRow}>
            {movie.budget && (
              <View style={styles.financialItem}>
                <DollarSign color={Colors.success} size={12} />
                <View>
                  <Text style={styles.financialLabel}>Budget</Text>
                  <Text style={[styles.financialValue, { color: Colors.success }]}>
                    {formatNumber(movie.budget)}
                  </Text>
                </View>
              </View>
            )}
            {movie.boxOffice && (
              <View style={styles.financialItem}>
                <TrendingUp color={Colors.primary} size={12} />
                <View>
                  <Text style={styles.financialLabel}>Box Office</Text>
                  <Text style={[styles.financialValue, { color: Colors.primary }]}>
                    {formatNumber(movie.boxOffice)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Match Reason */}
        {movie.matchReason && (
          <View style={styles.matchReasonContainer}>
            <Text style={styles.matchReasonText} numberOfLines={2}>
              {String(movie.matchReason)}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        {showActions && (
          <View style={styles.actions}>
            {onAddToWatchlist && (
              <TouchableOpacity style={styles.watchlistBtn} onPress={onAddToWatchlist}>
                <Heart color="#f472b6" size={14} strokeWidth={2.5} />
                <Text style={styles.watchlistText}>Watchlist</Text>
              </TouchableOpacity>
            )}
            {onShare && (
              <TouchableOpacity style={styles.shareBtn} onPress={onShare}>
                <Share2 color="#f472b6" size={14} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Rating Buttons - For swipeable cards */}
        {showRatingButtons && onRate && (
          <View style={styles.ratingSection}>
            <View style={styles.ratingButtonsRow}>
              <TouchableOpacity
                style={[styles.ratingBtn, styles.ratingBtnAwful]}
                onPress={() => onRate('awful')}
              >
                <Text style={styles.ratingEmoji}>😫</Text>
                <Text style={[styles.ratingLabel, { color: '#f43f5e' }]}>Awful</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ratingBtn, styles.ratingBtnMeh]}
                onPress={() => onRate('meh')}
              >
                <Text style={styles.ratingEmoji}>😐</Text>
                <Text style={[styles.ratingLabel, { color: '#fbbf24' }]}>Meh</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ratingBtn, styles.ratingBtnGood]}
                onPress={() => onRate('good')}
              >
                <Text style={styles.ratingEmoji}>👍</Text>
                <Text style={[styles.ratingLabel, { color: '#38bdf8' }]}>Good</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ratingBtn, styles.ratingBtnAmazing]}
                onPress={() => onRate('amazing')}
              >
                <Text style={styles.ratingEmoji}>🤩</Text>
                <Text style={[styles.ratingLabel, { color: '#34d399' }]}>Amazing</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => onRate('not-seen')}
              >
                <EyeOff color={Colors.textMuted} size={14} />
                <Text style={styles.secondaryText}>Not Seen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => onRate('not-interested')}
              >
                <ThumbsDown color="#a78bfa" size={14} />
                <Text style={[styles.secondaryText, { color: '#a78bfa' }]}>Skip</Text>
              </TouchableOpacity>
              {onAddToWatchlist && (
                <TouchableOpacity style={styles.secondaryBtn} onPress={onAddToWatchlist}>
                  <Heart color="#f472b6" size={14} />
                  <Text style={[styles.secondaryText, { color: '#f472b6' }]}>Watchlist</Text>
                </TouchableOpacity>
              )}
              {onShare && (
                <TouchableOpacity style={styles.secondaryBtn} onPress={onShare}>
                  <Share2 color="#60a5fa" size={14} />
                  <Text style={[styles.secondaryText, { color: '#60a5fa' }]}>Share</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  containerFullWidth: {
    marginHorizontal: 16,
  },
  imageContainer: {
    width: '100%',
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
  },
  noPosterEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  noPosterText: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  languageBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  languageText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  typeBadge: {
    position: 'absolute',
    top: 34,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeMovie: {
    backgroundColor: 'rgba(6, 182, 212, 0.9)',
    borderColor: 'rgba(6, 182, 212, 0.5)',
  },
  typeBadgeTV: {
    backgroundColor: 'rgba(147, 51, 234, 0.9)',
    borderColor: 'rgba(147, 51, 234, 0.5)',
  },
  typeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  matchBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(6, 182, 212, 0.8)',
  },
  matchText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    padding: 12,
  },
  contentFullWidth: {
    padding: 16,
  },
  title: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  titleFullWidth: {
    fontSize: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  year: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  genres: {
    color: Colors.primary,
    fontSize: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  imdbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  imdbContent: {
    alignItems: 'flex-start',
  },
  imdbRating: {
    color: '#fcd34d',
    fontSize: 13,
    fontWeight: '700',
  },
  voteCount: {
    color: 'rgba(251, 191, 36, 0.7)',
    fontSize: 9,
    marginTop: 1,
  },
  voteBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  voteOnly: {
    color: '#fcd34d',
    fontSize: 11,
    fontWeight: '600',
  },
  imdbLabel: {
    color: 'rgba(251, 191, 36, 0.6)',
    fontSize: 9,
    marginLeft: 2,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  googleIcon: {
    color: '#4285F4',
    fontSize: 14,
    fontWeight: '700',
  },
  googleText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '600',
  },
  summary: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  summaryFullWidth: {
    fontSize: 14,
    lineHeight: 22,
  },
  reviewContainer: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    marginBottom: 10,
  },
  reviewLabel: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  reviewText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  financialRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.2)',
    marginBottom: 10,
  },
  financialItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  financialLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  financialValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  matchReasonContainer: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    marginBottom: 10,
  },
  matchReasonText: {
    color: Colors.primary,
    fontSize: 11,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  watchlistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(244, 114, 182, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(244, 114, 182, 0.3)',
  },
  watchlistText: {
    color: '#f472b6',
    fontSize: 12,
    fontWeight: '600',
  },
  shareBtn: {
    backgroundColor: 'rgba(244, 114, 182, 0.2)',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(244, 114, 182, 0.3)',
  },
  ratingSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  ratingButtonsRow: {
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
    gap: 12,
    flexWrap: 'wrap',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  secondaryText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
});
