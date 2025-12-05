import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { timeout, catchError, throwError } from 'rxjs';
import { LoggerService } from '../services/logger.service';

/**
 * HTTP Timeout Interceptor
 *
 * Implements timeouts for all HTTP requests to prevent long waits.
 * Weather endpoints get 3 minutes for Playwright browser initialization.
 * Other endpoints timeout after 60 seconds.
 */
export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(LoggerService);

  // Weather endpoints need more time for Playwright browser initialization
  const isWeatherEndpoint = req.url.includes('WeatherForecast') || req.url.includes('weather');
  const TIMEOUT_MS = isWeatherEndpoint ? 180000 : 60000; // 3 minutes for weather, 60 seconds for others

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
