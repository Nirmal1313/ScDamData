import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { ErrtsWeatherResult } from '../models/errts-weather.model';

@Injectable({ providedIn: 'root' })
export class ErrtsWeatherService {
  constructor(private http: HttpClient, private configService: ConfigService) {}
  /**
   * Fetch ERRTS weather data from backend
   */
  getErrtsData(): Observable<ErrtsWeatherResult> {
    const apiUrl = this.configService.getApiUrl('errts');
    const apiEndpoint = this.configService.getApiUrl('main');
    return this.http.get<ErrtsWeatherResult>(`${apiEndpoint}/${apiUrl}`).pipe(
      catchError((error) => {
        console.error('Error fetching ERRTS data', error);
        return throwError(
          () => new Error('Failed to fetch ERRTS data: ' + (error.message || 'Unknown'))
        );
      })
    );
  }
}
