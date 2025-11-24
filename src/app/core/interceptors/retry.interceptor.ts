import { HttpInterceptorFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { retry, timer, mergeMap, throwError, tap, catchError } from 'rxjs';
import { LoggerService } from '../services/logger.service';
import { PerformanceMonitoringService } from '../services/performance-monitoring.service';

/**
 * HTTP Retry Interceptor
 *
 * Implements exponential backoff retry strategy for transient HTTP errors:
 * - 408 Request Timeout
 * - 429 Too Many Requests
 * - 5xx Server Errors
 *
 * Retry Configuration:
 * - Maximum retries: 3
 * - Initial delay: 1000ms
 * - Backoff multiplier: 2 (exponential)
 * - Max delay: 10000ms
 *
 * Non-retryable errors (4xx except 408 and 429) fail immediately
 */
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(LoggerService);
  const performanceMonitoring = inject(PerformanceMonitoringService);
  const maxRetries = 3;
  const initialDelay = 1000;
  const maxDelay = 10000;
  const backoffMultiplier = 2;
  const startTime = performance.now();

  return next(req).pipe(
    tap(event => {
      // Record successful API call on response
      if (event instanceof HttpResponse) {
        const duration = performance.now() - startTime;
        performanceMonitoring.recordApiMetric(
          req.url,
          duration,
          event.status,
          req.method
        );
      }
    }),
    catchError(error => {
      // Record failed API call
      const duration = performance.now() - startTime;
      if (error instanceof HttpErrorResponse) {
        performanceMonitoring.recordApiMetric(
          req.url,
          duration,
          error.status,
          req.method
        );
      }
      return throwError(() => error);
    }),
    retry({
      count: maxRetries,
      delay: (error, retryCount) => {
        // Only retry specific errors
        if (error instanceof HttpErrorResponse) {
          const shouldRetry =
            error.status === 408 ||  // Request Timeout
            error.status === 429 ||  // Too Many Requests
            (error.status >= 500 && error.status < 600); // Server Errors

          if (!shouldRetry) {
            logger.warn(`Non-retryable HTTP error ${error.status}, failing immediately`);
            return throwError(() => error);
          }

          // Calculate exponential backoff delay
          const delay = Math.min(
            initialDelay * Math.pow(backoffMultiplier, retryCount - 1),
            maxDelay
          );

          logger.info(
            `Retrying HTTP request (attempt ${retryCount}/${maxRetries}) after ${delay}ms`,
            {
              url: req.url,
              method: req.method,
              status: error.status,
              statusText: error.statusText
            }
          );

          return timer(delay);
        }

        // Non-HTTP errors shouldn't be retried
        return throwError(() => error);
      }
    })
  );
};
