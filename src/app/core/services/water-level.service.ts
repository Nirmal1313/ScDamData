// src/app/core/services/water-level.service.ts
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from './config.service';
import { ScrivenerCR1000Result } from '../models/water-level.model';

@Injectable({
  providedIn: 'root',
})
export class WaterLevelService {
  constructor(private http: HttpClient, private configService: ConfigService) {}

  /**
   * Get water level data from the Scrivener CR1000 API
   * @returns Observable of ScrivenerCR1000Result
   */
  getWaterLevelData(): Observable<ScrivenerCR1000Result> {
    const apiUrl = this.configService.getApiUrl('waterLevel');
    const apiEndpoint = this.configService.getApiUrl('main');

    return this.http.get<ScrivenerCR1000Result>(`${apiEndpoint}/${apiUrl}`).pipe(
      tap((response) => {}),
      catchError((error) => {
        console.error('Error fetching water level data:', error);
        return throwError(
          () => new Error('Failed to fetch water level data: ' + (error.message || 'Unknown error'))
        );
      })
    );
  }
}
