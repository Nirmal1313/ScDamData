import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { ErtsWeatherResult } from '../models/erts-weather.model';

@Injectable({ providedIn: 'root' })
export class ErtsWeatherService {
  constructor(private http: HttpClient, private configService: ConfigService) {}

  /**
   * Fetch ERRTS weather data from backend
   */
  getErrtsData(): Observable<ErtsWeatherResult> {
    const apiUrl = this.configService.getApiUrl('errts');
    return this.http.get<ErtsWeatherResult>(apiUrl).pipe(
      tap((response) => {}),
      catchError((error) => {
        console.error('Error fetching ERRTS data', error);
        return throwError(
          () => new Error('Failed to fetch ERRTS data: ' + (error.message || 'Unknown'))
        );
      })
    );
  }
}
