import { Injectable, inject } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationError } from '@angular/router';
import { filter } from 'rxjs';
import { LoggerService } from './logger.service';
import { environment } from '../../../environments/environment';

/**
 * Performance Monitoring Service
 *
 * Tracks and reports key performance metrics:
 * - Core Web Vitals (LCP, FID, CLS)
 * - API response times
 * - Bundle sizes
 * - Route navigation performance
 * - Memory usage
 *
 * In production, metrics are batched and sent to analytics endpoint.
 * In development, metrics are logged to console.
 */
@Injectable({
  providedIn: 'root'
})
export class PerformanceMonitoringService {
  private logger = inject(LoggerService);
  private router = inject(Router);

  // Navigation performance tracking
  private navigationStart: number = 0;
  private routeMetrics: Map<string, PerformanceMetric> = new Map();

  // API performance tracking
  private apiMetrics: Map<string, ApiMetric[]> = new Map();
  private readonly MAX_API_METRICS = 100;

  // Core Web Vitals
  private coreWebVitals: CoreWebVitals = {
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null
  };

  // Batch reporting
  private metricsBuffer: any[] = [];
  private readonly BATCH_SIZE = 10;
  private readonly REPORT_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.initializeRouteTracking();
    this.initializeCoreWebVitals();
    this.schedulePeriodicReporting();
  }

  /**
   * Initialize route navigation tracking
   */
  private initializeRouteTracking(): void {
    // Track navigation start
    this.router.events
      .pipe(filter(event => event instanceof NavigationStart))
      .subscribe((event: any) => {
        this.navigationStart = performance.now();
        this.logger.debug('Navigation started', { url: event.url });
      });

    // Track navigation end
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const duration = performance.now() - this.navigationStart;
        this.recordRouteMetric(event.urlAfterRedirects, duration, 'success');
        this.logger.debug('Navigation completed', {
          url: event.urlAfterRedirects,
          duration: `${duration.toFixed(2)}ms`
        });
      });

    // Track navigation errors
    this.router.events
      .pipe(filter(event => event instanceof NavigationError))
      .subscribe((event: any) => {
        const duration = performance.now() - this.navigationStart;
        this.recordRouteMetric(event.url, duration, 'error');
        this.logger.error('Navigation error', {
          url: event.url,
          error: event.error,
          duration: `${duration.toFixed(2)}ms`
        });
      });
  }

  /**
   * Initialize Core Web Vitals tracking
   * Uses Performance Observer API
   */
  private initializeCoreWebVitals(): void {
    // Check browser support
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      this.logger.warn('PerformanceObserver not supported');
      return;
    }

    try {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        const lcp = lastEntry.renderTime || lastEntry.loadTime;
        this.coreWebVitals.lcp = lcp;
        this.logger.info('LCP measured', { lcp: `${lcp.toFixed(2)}ms` });
        this.reportMetric('lcp', lcp);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          const fid = entry.processingStart - entry.startTime;
          this.coreWebVitals.fid = fid;
          this.logger.info('FID measured', { fid: `${fid.toFixed(2)}ms` });
          this.reportMetric('fid', fid);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift (CLS)
      let clsScore = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsScore += entry.value;
          }
        });
        this.coreWebVitals.cls = clsScore;
        this.logger.info('CLS measured', { cls: clsScore.toFixed(4) });
        this.reportMetric('cls', clsScore);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Time to First Byte (TTFB)
      if (performance.timing) {
        window.addEventListener('load', () => {
          const ttfb = performance.timing.responseStart - performance.timing.requestStart;
          this.coreWebVitals.ttfb = ttfb;
          this.logger.info('TTFB measured', { ttfb: `${ttfb}ms` });
          this.reportMetric('ttfb', ttfb);
        });
      }
    } catch (error) {
      this.logger.error('Error initializing Core Web Vitals tracking', error);
    }
  }

  /**
   * Record route navigation metric
   */
  private recordRouteMetric(route: string, duration: number, status: 'success' | 'error'): void {
    const metric = this.routeMetrics.get(route) || {
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      errors: 0
    };

    metric.count++;
    metric.totalDuration += duration;
    metric.avgDuration = metric.totalDuration / metric.count;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    if (status === 'error') {
      metric.errors++;
    }

    this.routeMetrics.set(route, metric);
    this.reportMetric('route-navigation', duration, { route, status });
  }

  /**
   * Record API call metric
   */
  recordApiMetric(url: string, duration: number, status: number, method: string = 'GET'): void {
    const metric: ApiMetric = {
      url,
      duration,
      status,
      method,
      timestamp: Date.now()
    };

    const metrics = this.apiMetrics.get(url) || [];
    metrics.push(metric);

    // Keep only last MAX_API_METRICS entries per URL
    if (metrics.length > this.MAX_API_METRICS) {
      metrics.shift();
    }

    this.apiMetrics.set(url, metrics);
    this.reportMetric('api-call', duration, { url, status, method });

    // Warn on slow API calls (>3s)
    if (duration > 3000) {
      this.logger.warn('Slow API call detected', { url, duration: `${duration.toFixed(2)}ms`, method });
    }
  }

  /**
   * Get route performance statistics
   */
  getRouteStats(route?: string): Map<string, PerformanceMetric> | PerformanceMetric | null {
    if (route) {
      return this.routeMetrics.get(route) || null;
    }
    return this.routeMetrics;
  }

  /**
   * Get API performance statistics
   */
  getApiStats(url?: string): Map<string, ApiMetric[]> | ApiMetric[] | null {
    if (url) {
      return this.apiMetrics.get(url) || null;
    }
    return this.apiMetrics;
  }

  /**
   * Get average API response time for a URL
   */
  getAverageApiTime(url: string): number | null {
    const metrics = this.apiMetrics.get(url);
    if (!metrics || metrics.length === 0) {
      return null;
    }
    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }

  /**
   * Get Core Web Vitals
   */
  getCoreWebVitals(): CoreWebVitals {
    return { ...this.coreWebVitals };
  }

  /**
   * Get memory usage (if available)
   */
  getMemoryUsage(): MemoryInfo | null {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return null;
    }

    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    };
  }

  /**
   * Report a metric (batch or immediate)
   */
  private reportMetric(type: string, value: number, metadata?: any): void {
    const metric = {
      type,
      value,
      metadata,
      timestamp: Date.now(),
      url: this.router.url
    };

    if (environment.production) {
      // In production, batch metrics
      this.metricsBuffer.push(metric);
      if (this.metricsBuffer.length >= this.BATCH_SIZE) {
        this.flushMetrics();
      }
    } else {
      // In development, log immediately
      this.logger.debug('Performance metric', metric);
    }
  }

  /**
   * Schedule periodic metric reporting
   */
  private schedulePeriodicReporting(): void {
    if (environment.production) {
      setInterval(() => {
        this.flushMetrics();
      }, this.REPORT_INTERVAL);
    }
  }

  /**
   * Flush buffered metrics to analytics endpoint
   */
  private flushMetrics(): void {
    if (this.metricsBuffer.length === 0) {
      return;
    }

    const batch = [...this.metricsBuffer];
    this.metricsBuffer = [];

    // TODO: Send to analytics endpoint
    // For now, just log in production
    this.logger.info('Flushing performance metrics', {
      count: batch.length,
      types: [...new Set(batch.map(m => m.type))]
    });

    // Example: Send to analytics service
    // this.analyticsService.sendMetrics(batch).subscribe({
    //   next: () => this.logger.debug('Metrics sent successfully'),
    //   error: (error) => this.logger.error('Failed to send metrics', error)
    // });
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.routeMetrics.clear();
    this.apiMetrics.clear();
    this.metricsBuffer = [];
    this.logger.info('Performance metrics cleared');
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const report: PerformanceReport = {
      timestamp: Date.now(),
      coreWebVitals: this.getCoreWebVitals(),
      memory: this.getMemoryUsage(),
      routes: {},
      apis: {},
      summary: {
        totalRoutes: this.routeMetrics.size,
        totalApiCalls: Array.from(this.apiMetrics.values()).reduce((sum, arr) => sum + arr.length, 0),
        avgRouteTime: 0,
        avgApiTime: 0,
        errorRate: 0
      }
    };

    // Route summary
    let totalRouteTime = 0;
    let routeCount = 0;
    let errorCount = 0;
    this.routeMetrics.forEach((metric, route) => {
      report.routes[route] = metric;
      totalRouteTime += metric.totalDuration;
      routeCount += metric.count;
      errorCount += metric.errors;
    });
    report.summary.avgRouteTime = routeCount > 0 ? totalRouteTime / routeCount : 0;
    report.summary.errorRate = routeCount > 0 ? (errorCount / routeCount) * 100 : 0;

    // API summary
    let totalApiTime = 0;
    let apiCallCount = 0;
    this.apiMetrics.forEach((metrics, url) => {
      report.apis[url] = {
        count: metrics.length,
        avgDuration: this.getAverageApiTime(url) || 0,
        recent: metrics.slice(-5)
      };
      metrics.forEach(m => {
        totalApiTime += m.duration;
        apiCallCount++;
      });
    });
    report.summary.avgApiTime = apiCallCount > 0 ? totalApiTime / apiCallCount : 0;

    return report;
  }
}

// Types
interface PerformanceMetric {
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  errors: number;
}

interface ApiMetric {
  url: string;
  duration: number;
  status: number;
  method: string;
  timestamp: number;
}

interface CoreWebVitals {
  lcp: number | null;  // Largest Contentful Paint
  fid: number | null;  // First Input Delay
  cls: number | null;  // Cumulative Layout Shift
  ttfb: number | null; // Time to First Byte
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercent: number;
}

interface PerformanceReport {
  timestamp: number;
  coreWebVitals: CoreWebVitals;
  memory: MemoryInfo | null;
  routes: Record<string, PerformanceMetric>;
  apis: Record<string, {
    count: number;
    avgDuration: number;
    recent: ApiMetric[];
  }>;
  summary: {
    totalRoutes: number;
    totalApiCalls: number;
    avgRouteTime: number;
    avgApiTime: number;
    errorRate: number;
  };
}
