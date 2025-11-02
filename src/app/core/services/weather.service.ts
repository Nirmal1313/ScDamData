/**
 * Weather Service
 *
 * Responsibilities:
 * 1. Fetch weather data from API after successful login
 * 2. Cache data and refresh after every 5 component accesses
 * 3. Share data across multiple components using Observable pattern
 * 4. Handle loading and error states
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles weather data management
 * - Open/Closed: Extensible through configuration without modification
 * - Liskov Substitution: Can be replaced with any IWeatherService implementation
 * - Interface Segregation: Focused public API
 * - Dependency Inversion: Depends on abstractions (ApiService, ConfigService)
 */

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, throwError, timer, Subscription } from 'rxjs';
import { tap, catchError, shareReplay, switchMap, filter, take } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ConfigService } from './config.service';
import { AuthService } from './auth.service';
import { BomWeatherResult, WeatherState, WeatherCacheConfig } from '../models/weather.model';
import { ApiResponse } from '../models/api.model';

@Injectable({
  providedIn: 'root',
})
export class WeatherService implements OnDestroy {
  // Configuration for caching behavior
  private readonly config: WeatherCacheConfig = {
    maxCallCount: 5, // Refresh after 5 component accesses
    cacheExpiryMinutes: 30, // Cache expires after 30 minutes
  };

  // State management using BehaviorSubject for reactive data sharing
  private weatherStateSubject = new BehaviorSubject<WeatherState>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
    callCount: 0,
  });

  // Public observable for components to subscribe to
  public weatherState$ = this.weatherStateSubject.asObservable();

  // Shared observable for the actual weather data
  // Multiple subscriptions will share the same HTTP request
  private weatherDataCache$: Observable<BomWeatherResult> | null = null;

  private autoRefreshSubscription?: Subscription;

  constructor(
    private apiService: ApiService,
    private configService: ConfigService,
    private authService: AuthService
  ) {
    // Initialize weather fetch when user logs in
    this.initializeWeatherOnLogin();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  /**
   * Initialize weather data fetch when user successfully logs in
   */
  private initializeWeatherOnLogin(): void {
    this.authService.authState$
      .pipe(filter((state) => state.isAuthenticated && state.user !== null))
      .subscribe(() => {
        // Start auto-refresh every 5 minutes after login
        this.startAutoRefresh(5);
      });
  }

  /**
   * Get weather data - main method for components to use
   * Implements smart caching:
   * - Returns cached data if available and fresh
   * - Increments call count
   * - Refreshes data after maxCallCount or cache expiry
   */
  public getWeatherData(): Observable<BomWeatherResult> {
    const currentState = this.weatherStateSubject.value;

    // Check if we need to refresh the data
    const shouldRefresh = this.shouldRefreshData(currentState);

    if (shouldRefresh || !this.weatherDataCache$) {
      // Reset call count and fetch fresh data
      this.resetCallCount();
      return this.fetchWeatherData();
    }

    // Increment call count for cached data access
    this.incrementCallCount();

    // Return cached observable
    return this.weatherDataCache$;
  }

  /**
   * Force refresh weather data regardless of cache state
   */
  public forceRefresh(): Observable<BomWeatherResult> {
    this.resetCallCount();
    return this.fetchWeatherData();
  }

  /**
   * Get current weather state (synchronous)
   */
  public getCurrentWeatherState(): WeatherState {
    return this.weatherStateSubject.value;
  }

  /**
   * Get current weather data (synchronous)
   */
  public getCurrentWeatherData(): BomWeatherResult | null {
    return this.weatherStateSubject.value.data;
  }

  /**
   * Start auto-refresh timer (optional feature)
   * @param intervalMinutes Interval in minutes to refresh data
   */
  public startAutoRefresh(intervalMinutes: number = 5): void {
    this.stopAutoRefresh();

    this.autoRefreshSubscription = timer(0, intervalMinutes * 60 * 1000)
      .pipe(switchMap(() => this.fetchWeatherData()))
      .subscribe({
        next: () => {},
        error: (err) => console.error('Auto-refresh error:', err),
      });
  }

  /**
   * Stop auto-refresh timer
   */
  public stopAutoRefresh(): void {
    if (this.autoRefreshSubscription) {
      this.autoRefreshSubscription.unsubscribe();
      this.autoRefreshSubscription = undefined;
    }
  }

  /**
   * Check if data should be refreshed based on call count and cache expiry
   */
  private shouldRefreshData(state: WeatherState): boolean {
    // No data available
    if (!state.data || !state.lastUpdated) {
      return true;
    }

    // Check if call count exceeded
    if (state.callCount >= this.config.maxCallCount) {
      return true;
    }

    // Check if cache has expired
    const cacheAge = Date.now() - new Date(state.lastUpdated).getTime();
    const cacheExpiryMs = this.config.cacheExpiryMinutes * 60 * 1000;

    if (cacheAge > cacheExpiryMs) {
      return true;
    }

    return false;
  }

  /**
   * Fetch weather data from API
   * Uses shareReplay to ensure multiple simultaneous subscriptions
   * share the same HTTP request
   */
  private fetchWeatherData(): Observable<BomWeatherResult> {
    // Set loading state
    this.updateState({ loading: true, error: null });

    // Fetch and process the data
    // Use 'weather' as apiName which contains the full URL, pass empty string as endpoint
    const dataObservable = this.apiService
      .directGet<ApiResponse<BomWeatherResult>>(this.configService.getApiUrl('weather'))
      .pipe(
        tap((response: ApiResponse<BomWeatherResult>) => {
          // Extract data from ApiResponse wrapper
          const weatherData = response.data || (response as any);

          // Update state with successful data
          this.updateState({
            data: weatherData,
            loading: false,
            error: null,
            lastUpdated: new Date(),
            callCount: 0,
          });
        }),
        catchError((error) => {
          // Handle error and update state
          const errorMessage = this.extractErrorMessage(error);

          this.updateState({
            loading: false,
            error: errorMessage,
          });

          return throwError(() => error);
        }),
        // Extract the actual data from ApiResponse
        switchMap((response: ApiResponse<BomWeatherResult>) => {
          const data = response.data || (response as any);
          return data ? [data] : throwError(() => new Error('No weather data available'));
        }),
        // Share the observable among multiple subscribers
        // Replay the last value for late subscribers
        shareReplay(1)
      );

    // Cache the observable
    this.weatherDataCache$ = dataObservable;

    return dataObservable;
  }

  /**
   * Update the weather state
   */
  private updateState(partialState: Partial<WeatherState>): void {
    this.weatherStateSubject.next({
      ...this.weatherStateSubject.value,
      ...partialState,
    });
  }

  /**
   * Increment the call count
   */
  private incrementCallCount(): void {
    const currentState = this.weatherStateSubject.value;
    this.updateState({
      callCount: currentState.callCount + 1,
    });
  }

  /**
   * Reset the call count
   */
  private resetCallCount(): void {
    this.updateState({ callCount: 0 });
  }

  /**
   * Extract user-friendly error message
   */
  private extractErrorMessage(error: any): string {
    if (error?.error?.message) {
      return error.error.message;
    }

    if (error?.message) {
      return error.message;
    }

    switch (error?.status) {
      case 0:
        return 'Network error. Please check your connection.';
      case 401:
        return 'Unauthorized. Please login again.';
      case 403:
        return 'Access denied to weather data.';
      case 404:
        return 'Weather service not found.';
      case 500:
        return 'Weather service error. Please try again later.';
      default:
        return 'Failed to fetch weather data.';
    }
  }

  /**
   * Update configuration (optional - for runtime config changes)
   */
  public updateConfig(config: Partial<WeatherCacheConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Get current configuration
   */
  public getConfig(): WeatherCacheConfig {
    return { ...this.config };
  }

  /**
   * Clear cached data
   */
  public clearCache(): void {
    this.weatherDataCache$ = null;
    this.updateState({
      data: null,
      callCount: 0,
      lastUpdated: null,
      error: null,
    });
  }
}
