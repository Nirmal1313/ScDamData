import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { catchError, tap, map, switchMap } from 'rxjs/operators';
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

  /**
   * Fetch an image with authentication and convert to data URL
   */
  getImageAsDataUrl(imageUrl: string): Observable<string> {
    const baseUrl = this.configService.getApiUrl('errts').replace('/WeatherForecast/ERRTSData', '');
    const fullUrl = `${baseUrl}/WeatherForecast/getProxiedImage?imageUrl=${imageUrl}`;
    
    return this.http.get(fullUrl, { responseType: 'blob' }).pipe(
      switchMap((blob: Blob) => {
        return from(new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }));
      }),
      catchError((error) => {
        console.error('Error fetching image', error);
        return throwError(
          () => new Error('Failed to fetch image: ' + (error.message || 'Unknown'))
        );
      })
    );
  }
}
