/**
 * Rate Limiter for TMDB API
 * TMDB allows 40 requests per second
 */

import { logger } from './logger';

class RateLimiter {
  private queue: Array<() => void> = [];
  private processing = false;
  private requestCount = 0;
  private windowStart = Date.now();
  private readonly maxRequestsPerSecond = 40;
  private readonly windowMs = 1000;

  async execute<T>(fn: () => Promise<T>, context: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue(context);
    });
  }

  private async processQueue(context: string) {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const elapsed = now - this.windowStart;

      // Reset window if a second has passed
      if (elapsed >= this.windowMs) {
        this.requestCount = 0;
        this.windowStart = now;
      }

      // Check if we can make more requests
      if (this.requestCount < this.maxRequestsPerSecond) {
        const task = this.queue.shift();
        if (task) {
          this.requestCount++;
          logger.info('RATE_LIMITER', `Executing request (${this.requestCount}/${this.maxRequestsPerSecond})`, {
            context,
            queueLength: this.queue.length,
          });
          await task();
        }
      } else {
        // Wait for the rest of the window
        const waitTime = this.windowMs - elapsed;
        logger.info('RATE_LIMITER', `Rate limit reached, waiting ${waitTime}ms`, {
          context,
          queueLength: this.queue.length,
        });
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    this.processing = false;
  }
}

export const tmdbRateLimiter = new RateLimiter();

