import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { timeout, catchError, throwError } from 'rxjs';
import { LoggerService } from '../services/logger.service';

/**
 * HTTP Timeout Interceptor
 *
 * Implements a 30-second timeout for all HTTP requests to prevent
 * long waits and improve user experience.
 *
 * If a request takes longer than 30 seconds, it will be cancelled
 * and an error will be thrown.
 */
export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(LoggerService);
  const TIMEOUT_MS = 30000; // 30 seconds

  return next(req).pipe(
    timeout(TIMEOUT_MS),
    catchError((error) => {
      // Check if the error is a timeout error
      if (error.name === 'TimeoutError') {
        logger.warn(`HTTP request timed out after ${TIMEOUT_MS}ms`, {
          url: req.url,
          method: req.method
        });

        // Create a more user-friendly error
        const timeoutError = {
          status: 0,
          statusText: 'Request Timeout',
          message: 'The request took too long to complete. Please try again.',
          error: 'timeout',
          name: 'TimeoutError'
        };

        return throwError(() => timeoutError);
      }

      // If not a timeout error, pass it through
      return throwError(() => error);
    })
  );
};
