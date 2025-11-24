import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from '../tokens/api-base-url.token';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private baseUrl = inject(API_BASE_URL);

  private config = {
    // API endpoints - now relative paths that will be combined with baseUrl
    apis: {
      main: this.baseUrl,
      weather: 'WeatherForecast/bomWeather',
      weatherBOM: 'WeatherForecast/latestBomWeather',
      errts: 'WeatherForecast/ERRTSData',
      waterLevel: 'WeatherForecast/ScrivenerCR1000',
      login: 'account/login',
      register: 'account/register',
      calendarEvent: 'calendarTask',
      projectNote: 'projectNote',
    },
    production: environment.production
  };

  constructor() {
    // Configuration is now managed through environment files
  }

  get<T>(key: keyof typeof this.config): T {
    return this.config[key] as unknown as T;
  }

  /**
   * Get the URL for a specific API endpoint
   * @param name - The name of the API endpoint (e.g., 'main', 'weather')
   * @returns The full URL for the specified API
   */
  getApiUrl(name: keyof typeof this.config.apis = 'main'): string {
    const endpoint = this.config.apis[name];

    // If it's already the baseUrl, return as-is
    if (endpoint === this.baseUrl) {
      return endpoint;
    }

    // Otherwise, combine with baseUrl
    return `${this.baseUrl}/${endpoint}`;
  }

  /**
   * Get the base API URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  isProduction(): boolean {
    return this.config.production;
  }
}
