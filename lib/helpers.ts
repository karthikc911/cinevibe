/**
 * Hash a string to a number within a range [0, max)
 * Used to deterministically pick OTT icons based on movie title
 */
export function hashToIndex(str: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % max;
}

/**
 * Get profile strength based on rated count
 */
export function getProfileStrength(ratedCount: number): "Weak" | "Strong" {
  return ratedCount >= 100 ? "Strong" : "Weak";
}

/**
 * Shuffle an array (Fisher-Yates algorithm)
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

