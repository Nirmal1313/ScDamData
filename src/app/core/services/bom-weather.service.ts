
import { Injectable, inject, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, throwError, interval, Subscription } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { NewBomWeatherModel } from '../models/weatherBOM.module';
import { ApiResponse } from '../models/api.model';
import { LoggerService } from './logger.service';

export interface BomWeatherState {
  data: NewBomWeatherModel | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

@Injectable({
  providedIn: 'root',
})
export class BomWeatherService implements OnDestroy {
  private logger = inject(LoggerService);

  private weatherStateSubject = new BehaviorSubject<BomWeatherState>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  });

  public weatherState$ = this.weatherStateSubject.asObservable();

  // Auto-refresh configuration
  private refreshSubscription?: Subscription;
  private readonly REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
  private isAutoRefreshEnabled = false;

  constructor(private apiService: ApiService) {}

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  /**
   * Get weather data - makes a fresh API call each time
   * Automatically starts auto-refresh on first call if not already started
   */
  public getWeatherData(bypassCache = false): Observable<NewBomWeatherModel> {
    this.weatherStateSubject.next({
      ...this.weatherStateSubject.value,
      loading: true,
      error: null,
    });

    const params = bypassCache ? { 'Cache-Control': 'no-cache' } : undefined;
    return this.apiService.get<NewBomWeatherModel>('WeatherForecast/latestBomWeather', params, 'main').pipe(
      map((response: ApiResponse<NewBomWeatherModel>) => response.data || (response as any)),
      tap((data: NewBomWeatherModel) => {
        this.weatherStateSubject.next({
          data,
          loading: false,
          error: null,
          lastUpdated: new Date(),
        });

        // Start auto-refresh after first successful fetch
        if (!this.isAutoRefreshEnabled) {
          this.startAutoRefresh();
        }
      }),
      catchError((error) => {
        this.logger.error('BomWeatherService: Error fetching data:', error);
        this.weatherStateSubject.next({
          ...this.weatherStateSubject.value,
          loading: false,
          error: error.message || 'Failed to fetch BOM weather data',
        });
        return throwError(() => new Error('Failed to fetch BOM weather data'));
      })
    );
  }

  /**
   * Force refresh - alias for getWeatherData for backward compatibility
   */
  public forceRefresh(): Observable<NewBomWeatherModel> {
    return this.getWeatherData(true);
  }

  /**
   * Start automatic refresh every 5 minutes
   * Automatically bypasses cache to get fresh data
   */
  private startAutoRefresh(): void {
    if (this.isAutoRefreshEnabled) {
      return;
    }

    this.logger.info('BomWeatherService: Starting auto-refresh (every 5 minutes)');
    this.isAutoRefreshEnabled = true;

    this.refreshSubscription = interval(this.REFRESH_INTERVAL).subscribe(() => {
      this.logger.debug('BomWeatherService: Auto-refresh triggered');
      // Bypass cache on auto-refresh to ensure fresh data
      this.getWeatherData(true).subscribe({
        error: (error) => {
          this.logger.warn('BomWeatherService: Auto-refresh failed', error);
        }
      });
    });
  }

  /**
   * Stop automatic refresh
   */
  public stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.logger.info('BomWeatherService: Stopping auto-refresh');
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
      this.isAutoRefreshEnabled = false;
    }
  }

  /**
   * Get the last update timestamp
   */
  public getLastUpdated(): Date | null {
    return this.weatherStateSubject.value.lastUpdated;
  }

  /**
   * Check if auto-refresh is currently enabled
   */
  public isAutoRefreshActive(): boolean {
    return this.isAutoRefreshEnabled;
  }
}
