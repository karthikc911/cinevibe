/**
 * Performance utilities for fast navigation and responsive UI
 */

import { InteractionManager } from 'react-native';

/**
 * Runs a callback after all interactions and animations complete.
 * This ensures navigation feels instant by deferring heavy work.
 * Catches and logs errors to prevent silent failures.
 * 
 * @param task Function to run after interactions
 * @returns Cleanup function to cancel the scheduled work
 */
export function runAfterInteractions(task: () => void | Promise<void>): () => void {
  const handle = InteractionManager.runAfterInteractions(async () => {
    try {
      await task();
    } catch (error) {
      if (__DEV__) {
        console.error('[PERF] runAfterInteractions task error:', error);
      }
    }
  });
  return () => handle.cancel();
}

// Alias for backwards compatibility
export const runAfterNavInteractions = runAfterInteractions;

/**
 * Maps over an array with limited concurrency, useful for parallel API calls
 * without overwhelming the network or device.
 * Uses a worker pool pattern for efficiency.
 * 
 * @param items Array of items to process
 * @param mapper Async function to process each item
 * @param concurrency Maximum number of concurrent operations (default: 5)
 * @returns Promise resolving to array of results
 */
export async function pMap<T, R>(
  items: T[],
  mapper: (item: T, index: number) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  if (items.length === 0) return [];
  
  const results: R[] = new Array(items.length);
  let currentIndex = 0;
  let hasError = false;
  
  const worker = async (): Promise<void> => {
    while (currentIndex < items.length && !hasError) {
      const index = currentIndex++;
      try {
        results[index] = await mapper(items[index], index);
      } catch (error) {
        // Continue processing other items, store undefined for failed
        if (__DEV__) {
          console.warn(`[PERF] pMap item ${index} failed:`, error);
        }
        results[index] = undefined as unknown as R;
      }
    }
  };
  
  // Create worker pool with min(concurrency, items.length) workers
  const workerCount = Math.min(concurrency, items.length);
  const workers: Promise<void>[] = [];
  
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }
  
  await Promise.all(workers);
  
  return results;
}

/**
 * DEV-only performance instrumentation helpers
 */
export const perfLog = {
  /**
   * Log screen focus event with timestamp
   */
  focus: (screenName: string): void => {
    if (__DEV__) {
      console.log(`[PERF] 📱 ${screenName} focused at ${Date.now()}`);
    }
  },
  
  /**
   * Log when loading UI is rendered
   */
  loadingRendered: (screenName: string): void => {
    if (__DEV__) {
      console.log(`[PERF] ⏳ ${screenName} loading UI rendered at ${Date.now()}`);
    }
  },
  
  /**
   * Log when content is rendered (loading complete)
   */
  contentRendered: (screenName: string): void => {
    if (__DEV__) {
      console.log(`[PERF] ✅ ${screenName} content rendered at ${Date.now()}`);
    }
  },
  
  /**
   * Create a timer for measuring load duration
   */
  startTimer: (label: string): (() => void) => {
    if (!__DEV__) return () => {};
    
    const start = performance.now();
    console.log(`[PERF] ⏱️ ${label} started`);
    
    return () => {
      const duration = (performance.now() - start).toFixed(2);
      console.log(`[PERF] ⏱️ ${label} completed in ${duration}ms`);
    };
  },
  
  /**
   * Log data loading phase
   */
  dataLoad: (screenName: string, phase: 'cache' | 'network' | 'enrich', status: 'start' | 'end', count?: number): void => {
    if (__DEV__) {
      const countStr = count !== undefined ? ` (${count} items)` : '';
      console.log(`[PERF] 📊 ${screenName} ${phase} ${status}${countStr}`);
    }
  },
};

/**
 * FlatList performance configuration
 * Use these props on FlatList for optimal rendering
 */
export const FLATLIST_PERF_CONFIG = {
  initialNumToRender: 10,
  maxToRenderPerBatch: 10,
  updateCellsBatchingPeriod: 50,
  windowSize: 5,
  removeClippedSubviews: true,
} as const;
