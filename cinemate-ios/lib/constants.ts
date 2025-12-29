// App theme colors
export const Colors = {
  background: '#0f0f1a',
  surface: '#1a1a2e',
  surfaceLight: '#252540',
  primary: '#06b6d4', // cyan
  primaryDark: '#0891b2',
  secondary: '#8b5cf6', // purple
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
  border: 'rgba(255, 255, 255, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.8)',
};

// Rating colors
export const RatingColors: Record<string, string> = {
  amazing: '#22c55e',
  good: '#06b6d4',
  meh: '#f59e0b',
  bad: '#ef4444',
  'not-interested': '#6b7280',
};

// Rating labels
export const RatingLabels: Record<string, string> = {
  amazing: '🤩 Amazing',
  good: '👍 Good',
  meh: '😐 Meh',
  bad: '👎 Bad',
  'not-interested': '🚫 Not Interested',
};

// Language codes to names
export const LanguageNames: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  ml: 'Malayalam',
  kn: 'Kannada',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
};

// TMDB image base URL
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// Default poster placeholder
export const DEFAULT_POSTER = 'https://via.placeholder.com/300x450?text=No+Poster';

