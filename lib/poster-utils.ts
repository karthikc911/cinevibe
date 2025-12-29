/**
 * Utility functions for formatting movie/TV show poster URLs
 */

/**
 * Format poster path to full TMDB URL
 * @param posterPath - The poster path from TMDB or database
 * @returns Formatted full URL or empty string if no poster
 */
export function formatPosterUrl(posterPath: string | null | undefined): string {
  if (!posterPath) return '';
  
  // If already a full URL, return as is
  if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) {
    return posterPath;
  }
  
  // If it's a TMDB path (starts with /), prepend base URL
  if (posterPath.startsWith('/')) {
    return `https://image.tmdb.org/t/p/w500${posterPath}`;
  }
  
  // Otherwise, return empty string (invalid format)
  return '';
}

/**
 * Format poster URL with different size
 * @param posterPath - The poster path from TMDB or database
 * @param size - TMDB image size (w92, w154, w185, w342, w500, w780, original)
 * @returns Formatted full URL or empty string if no poster
 */
export function formatPosterUrlWithSize(
  posterPath: string | null | undefined, 
  size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'
): string {
  if (!posterPath) return '';
  
  // If already a full URL, return as is
  if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) {
    return posterPath;
  }
  
  // If it's a TMDB path (starts with /), prepend base URL with size
  if (posterPath.startsWith('/')) {
    return `https://image.tmdb.org/t/p/${size}${posterPath}`;
  }
  
  // Otherwise, return empty string (invalid format)
  return '';
}

