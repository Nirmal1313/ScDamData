import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

/**
 * Centralized logging service that respects production environment.
 * In production, only warnings and errors are logged to console.
 * All logs are buffered for debugging purposes.
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  private isProd = environment.production;
  private logBuffer: LogEntry[] = [];
  private readonly MAX_BUFFER = 100;

  /**
   * Log debug information (disabled by default for cleaner console)
   * Still captured in buffer for debugging if needed
   */
  debug(message: string, ...args: unknown[]): void {
    // Only log in buffer, don't output to console to keep it clean
    this.addToBuffer('debug', message, args);
  }

  /**
   * Log informational messages (disabled by default for cleaner console)
   * Enable by setting environment.logLevel to 'debug' if needed
   */
  info(message: string, ...args: unknown[]): void {
    // Only log in buffer, don't output to console to keep it clean
    this.addToBuffer('info', message, args);
  }

  /**
   * Log warning messages (always logged)
   */
  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args);
    this.addToBuffer('warn', message, args);
  }

  /**
   * Log error messages (always logged)
   * TODO: Integrate with monitoring service (Application Insights, Sentry, etc.)
   */
  error(message: string, error?: unknown): void {
    console.error(`[ERROR] ${message}`, error);
    this.addToBuffer('error', message, error);

    // TODO: Send to monitoring service
    // this.sendToMonitoring({ message, error });
  }

  /**
   * Add log entry to buffer with automatic size management
   */
  private addToBuffer(level: LogLevel, message: string, data?: unknown): void {
    this.logBuffer.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    });

    // Remove oldest entry if buffer is full
    if (this.logBuffer.length > this.MAX_BUFFER) {
      this.logBuffer.shift();
    }
  }

  /**
   * Get all buffered log entries (useful for debugging)
   */
  getLogs(): LogEntry[] {
    return [...this.logBuffer];
  }

  /**
   * Clear all buffered log entries
   */
  clearLogs(): void {
    this.logBuffer = [];
  }
}
