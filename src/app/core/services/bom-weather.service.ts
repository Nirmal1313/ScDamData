

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, throwError, timer, Subscription } from 'rxjs';
import { tap, catchError, shareReplay, switchMap, filter, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ConfigService } from './config.service';
import { AuthService } from './auth.service';
import { NewBomWeatherModel } from '../models/weatherBOM.module';
import { ApiResponse } from '../models/api.model';

// State interface for BOM weather data
export interface BomWeatherState {
  data: NewBomWeatherModel | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  callCount: number;
}

// Configuration interface
export interface BomWeatherCacheConfig {
  maxCallCount: number;
  cacheExpiryMinutes: number;
}

@Injectable({
  providedIn: 'root',
})
export class BomWeatherService implements OnDestroy {
  // Configuration for caching behavior
  private readonly config: BomWeatherCacheConfig = {
    maxCallCount: 5, // Refresh after 5 component accesses
    cacheExpiryMinutes: 5, // Cache expires after 5 minutes
  };

  // State management using BehaviorSubject for reactive data sharing
  private weatherStateSubject = new BehaviorSubject<BomWeatherState>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
    callCount: 0,
  });

  // Public observable for components to subscribe to
  public weatherState$ = this.weatherStateSubject.asObservable();

  // Shared observable for the actual weather data
  private weatherDataCache$: Observable<NewBomWeatherModel> | null = null;

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
   * - Prevents duplicate concurrent calls by setting cache immediately
   */
  public getWeatherData(): Observable<NewBomWeatherModel> {
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
   * Force refresh the weather data regardless of cache state
   */
  public forceRefresh(): Observable<NewBomWeatherModel> {
    this.resetCallCount();
    return this.fetchWeatherData();
  }

  /**
   * Fetch weather data from API
   * Sets cache immediately to prevent duplicate concurrent calls
   */
  private fetchWeatherData(): Observable<NewBomWeatherModel> {
    // If already loading, return the existing cached observable
    if (this.weatherDataCache$ && this.weatherStateSubject.value.loading) {
      return this.weatherDataCache$;
    }

    // Update loading state
    this.updateState({ loading: true, error: null });

    // Get the API endpoint from config
    const endpoint = this.configService.getApiUrl('weatherBOM' as any);

    // Create new observable and cache it IMMEDIATELY to prevent duplicate calls
    this.weatherDataCache$ = this.apiService.get<NewBomWeatherModel>(endpoint, undefined, 'main').pipe(
      tap((response: ApiResponse<NewBomWeatherModel>) => {
        // Check if response has data property or is the data itself
        const weatherData = response.data || (response as any);
        // Update state with successful data
        this.updateState({
          data: weatherData,
          loading: false,
          error: null,
          lastUpdated: new Date(),
        });
      }),
      catchError((error) => {
        console.error('BomWeatherService: Error fetching data:', error);
        // Update state with error
        this.updateState({
          loading: false,
          error: error.message || 'Failed to fetch BOM weather data',
        });
        return throwError(() => error);
      }),
      map((response: ApiResponse<NewBomWeatherModel>) => response.data || (response as any)),
      shareReplay(1)
    );

    return this.weatherDataCache$;
  }

  /**
   * Check if data should be refreshed based on call count and cache expiry
   */
  private shouldRefreshData(state: BomWeatherState): boolean {
    // Refresh if no data exists
    if (!state.data) {
      return true;
    }

    // Refresh if call count exceeds max
    if (state.callCount >= this.config.maxCallCount) {
      return true;
    }

    // Refresh if cache has expired
    if (state.lastUpdated) {
      const now = new Date();
      const diffMinutes = (now.getTime() - state.lastUpdated.getTime()) / (1000 * 60);
      if (diffMinutes >= this.config.cacheExpiryMinutes) {
        return true;
      }
    }

    return false;
  }

  /**
   * Start automatic refresh timer
   */
  private startAutoRefresh(intervalMinutes: number): void {
    // Stop any existing refresh
    this.stopAutoRefresh();

    // Create new refresh subscription
    this.autoRefreshSubscription = timer(0, intervalMinutes * 60 * 1000)
      .pipe(switchMap(() => this.fetchWeatherData()))
      .subscribe({
        next: () => {
        },
        error: (error) => {
          console.error('Error during BOM weather auto-refresh:', error);
        },
      });
  }

  /**
   * Stop automatic refresh
   */
  private stopAutoRefresh(): void {
    if (this.autoRefreshSubscription) {
      this.autoRefreshSubscription.unsubscribe();
      this.autoRefreshSubscription = undefined;
    }
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
    this.updateState({
      callCount: 0,
    });
  }

  /**
   * Update the weather state
   */
  private updateState(partialState: Partial<BomWeatherState>): void {
    const currentState = this.weatherStateSubject.value;
    this.weatherStateSubject.next({
      ...currentState,
      ...partialState,
    });
  }

  /**
   * Get current weather state (synchronous)
   */
  public getCurrentState(): BomWeatherState {
    return this.weatherStateSubject.value;
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

  /**
   * Get a specific location's data from the current state
   */
  public getLocationData(locationKey: string): Observable<any> {
    return this.weatherState$.pipe(
      filter((state) => state.data !== null),
      tap((state) => {
        if (state.data && state.data.locations[locationKey]) {
          return state.data.locations[locationKey];
        }
        throw new Error(`Location ${locationKey} not found`);
      })
    );
  }
}
