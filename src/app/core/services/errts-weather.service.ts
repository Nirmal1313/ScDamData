import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { LoggerService } from './logger.service';
import { ErrtsWeatherResult } from '../models/errts-weather.model';

@Injectable({ providedIn: 'root' })
export class ErrtsWeatherService {
  private logger = inject(LoggerService);

  constructor(private http: HttpClient, private configService: ConfigService) {}
  /**
   * Fetch ERRTS weather data from backend
   */
  getErrtsData(bypassCache = false): Observable<ErrtsWeatherResult> {
    const apiUrl = this.configService.getApiUrl('errts');
    const options = bypassCache
      ? { headers: { 'Cache-Control': 'no-cache' } }
      : {};
    return this.http.get<ErrtsWeatherResult>(apiUrl, options).pipe(
      catchError((error) => {
        this.logger.error('Error fetching ERRTS data', error);
        return throwError(
          () => new Error('Failed to fetch ERRTS data: ' + (error.message || 'Unknown'))
        );
      })
    );
  }
}
