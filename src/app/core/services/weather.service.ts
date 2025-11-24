/**
 * Weather Service - Simple data fetching without caching
 */

import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { ConfigService } from './config.service';
import { BomWeatherResult } from '../models/weather.model';
import { ApiResponse } from '../models/api.model';
import { LoggerService } from './logger.service';

export interface WeatherState {
  data: BomWeatherResult | null;
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class WeatherService {
  private logger = inject(LoggerService);

  private weatherStateSubject = new BehaviorSubject<WeatherState>({
    data: null,
    loading: false,
    error: null,
  });

  public weatherState$ = this.weatherStateSubject.asObservable();

  constructor(
    private apiService: ApiService,
    private configService: ConfigService
  ) {}

  /**
   * Get weather data - makes a fresh API call each time
   */
  public getWeatherData(): Observable<BomWeatherResult> {
    const apiUrl = this.configService.getApiUrl('weather');

    this.weatherStateSubject.next({
      ...this.weatherStateSubject.value,
      loading: true,
      error: null,
    });

    return this.apiService.directGet<ApiResponse<BomWeatherResult>>(apiUrl).pipe(
      map((response: ApiResponse<BomWeatherResult>) => {
        return response.data || (response as any);
      }),
      tap((data: BomWeatherResult) => {
        this.weatherStateSubject.next({
          data,
          loading: false,
          error: null,
        });
      }),
      catchError((error) => {
        this.logger.error('Error fetching weather data:', error);
        this.weatherStateSubject.next({
          ...this.weatherStateSubject.value,
          loading: false,
          error: error.message || 'Failed to fetch weather data',
        });
        return throwError(() => new Error('Failed to fetch weather data'));
      })
    );
  }
}
