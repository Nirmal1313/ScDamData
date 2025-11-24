import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of, tap } from 'rxjs';
import { LoggerService } from '../services/logger.service';

/**
 * HTTP Cache Entry
 * Stores cached response with timestamp for TTL validation
 */
interface CacheEntry {
  response: HttpResponse<any>;
  timestamp: number;
}

/**
 * HTTP Caching Interceptor
 *
 * Implements LRU (Least Recently Used) caching for GET requests:
 * - Only caches successful GET requests (status 200)
 * - TTL: 5 minutes (300,000ms)
 * - Max cache size: 100 entries
 * - Evicts least recently used entries when cache is full
 *
 * Cache Key Format: `${method}:${url}`
 *
 * Non-cacheable requests:
 * - Non-GET methods (POST, PUT, DELETE, PATCH)
 * - Requests with no-cache header
 * - Failed responses (status !== 200)
 */
export const cachingInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(LoggerService);
  const cacheTTL = 5 * 60 * 1000; // 5 minutes
  const maxCacheSize = 100;

  // Only cache GET requests
  if (req.method !== 'GET') {
    return next(req);
  }

  // Check for no-cache header
  if (req.headers.get('Cache-Control') === 'no-cache') {
    logger.debug('Skipping cache due to no-cache header', { url: req.url });
    return next(req);
  }

  const cacheKey = `${req.method}:${req.urlWithParams}`;
  const cachedEntry = httpCache.get(cacheKey);

  // Check if cached entry exists and is not expired
  if (cachedEntry) {
    const age = Date.now() - cachedEntry.timestamp;

    if (age < cacheTTL) {
      logger.debug(`Cache HIT: ${cacheKey}`, { age: `${Math.round(age / 1000)}s` });

      // Update LRU: move to end (most recently used)
      httpCache.delete(cacheKey);
      httpCache.set(cacheKey, cachedEntry);

      return of(cachedEntry.response.clone());
    } else {
      logger.debug(`Cache EXPIRED: ${cacheKey}`, { age: `${Math.round(age / 1000)}s` });
      httpCache.delete(cacheKey);
    }
  } else {
    logger.debug(`Cache MISS: ${cacheKey}`);
  }

  // Make the request and cache successful responses
  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse && event.status === 200) {
        // Evict oldest entry if cache is full (LRU eviction)
        if (httpCache.size >= maxCacheSize) {
          const oldestKey = httpCache.keys().next().value;
          if (oldestKey) {
            logger.debug(`Cache FULL, evicting: ${oldestKey}`);
            httpCache.delete(oldestKey);
          }
        }

        // Add to cache
        httpCache.set(cacheKey, {
          response: event.clone(),
          timestamp: Date.now()
        });

        logger.debug(`Cache SET: ${cacheKey}`, { cacheSize: httpCache.size });
      }
    })
  );
};

/**
 * Global HTTP cache storage
 * Uses Map to maintain insertion order for LRU eviction
 */
const httpCache = new Map<string, CacheEntry>();

/**
 * Clear entire HTTP cache
 * Useful for logout or manual cache invalidation
 */
export function clearHttpCache(): void {
  const logger = inject(LoggerService);
  logger.info('Clearing HTTP cache', { entriesCleared: httpCache.size });
  httpCache.clear();
}

/**
 * Clear specific cache entries by URL pattern
 * @param urlPattern - Regex pattern to match URLs
 */
export function clearHttpCacheByPattern(urlPattern: RegExp): void {
  const logger = inject(LoggerService);
  let clearedCount = 0;

  for (const key of httpCache.keys()) {
    const url = key.split(':')[1]; // Extract URL from "METHOD:URL"
    if (urlPattern.test(url)) {
      httpCache.delete(key);
      clearedCount++;
    }
  }

  logger.info('Cleared HTTP cache entries by pattern', {
    pattern: urlPattern.source,
    entriesCleared: clearedCount
  });
}
