// src/app/core/services/water-level.service.ts
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from './config.service';
import { LoggerService } from './logger.service';
import { ScrivenerCR1000Result } from '../models/water-level.model';

@Injectable({
  providedIn: 'root',
})
export class WaterLevelService {
  private logger = inject(LoggerService);

  constructor(private http: HttpClient, private configService: ConfigService) {}

  /**
   * Get water level data from the Scrivener CR1000 API
   * @returns Observable of ScrivenerCR1000Result
   */
  getWaterLevelData(bypassCache = false): Observable<ScrivenerCR1000Result> {
    const apiUrl = this.configService.getApiUrl('waterLevel');

    const options = bypassCache
      ? { headers: { 'Cache-Control': 'no-cache' } }
      : {};

    return this.http.get<ScrivenerCR1000Result>(apiUrl, options).pipe(
      catchError((error) => {
        this.logger.error('Error fetching water level data:', error);
        return throwError(
          () => new Error('Failed to fetch water level data: ' + (error.message || 'Unknown error'))
        );
      })
    );
  }
}
