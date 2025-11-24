import { ErrorHandler, Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { LoggerService } from '../services/logger.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private logger = inject(LoggerService);

  handleError(error: Error | HttpErrorResponse): void {
    let errorMessage = '';
    let errorStack = '';

    if (error instanceof HttpErrorResponse) {
      // Server-side error
      errorMessage = `HTTP Error: ${error.status} - ${error.message}`;
      this.logger.error('HTTP Error:', {
        status: error.status,
        message: error.message,
        url: error.url,
        error: error.error
      });
    } else {
      // Client-side error
      errorMessage = error.message || 'An unexpected error occurred';
      errorStack = error.stack || '';
      this.logger.error('Client Error:', {
        message: errorMessage,
        stack: errorStack,
        error: error
      });
    }

    // TODO: Send error to monitoring service (e.g., Sentry, Application Insights)
    this.logErrorToMonitoringService(errorMessage, errorStack, error);

    // Show user-friendly error notification if needed
    // You can inject a notification service here
  }

  private logErrorToMonitoringService(
    message: string,
    stack: string,
    originalError: Error | HttpErrorResponse
  ): void {
    // Placeholder for monitoring service integration
    // Example: Sentry.captureException(originalError);
    // Example: ApplicationInsights.trackException(originalError);

    // For now, just log to console in a structured way
    const errorReport = {
      timestamp: new Date().toISOString(),
      message,
      stack,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
    };

    this.logger.error('Error Report:', errorReport);
  }
}
