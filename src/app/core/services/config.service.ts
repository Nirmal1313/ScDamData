import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config = {
    // API endpoints
    apis: {
      main: 'https://scrivenerdam-api.braveocean-4ca6a2d4.eastus2.azurecontainerapps.io/api/v1',
      weather: 'WeatherForecast/bomWeather',
      weatherBOM: 'WeatherForecast/latestBomWeather',
      errts: 'WeatherForecast/ERRTSData',
      waterLevel: 'WeatherForecast/ScrivenerCR1000',
      login: 'account/login',
      register: 'account/register',
      calendarEvent: 'calendarTask',
      projectNote: 'projectNote',
      // Add more external APIs as needed
    },
    production: true
  };
  /*apis: {
      main: 'https://scrivenerdam-api.braveocean-4ca6a2d4.eastus2.azurecontainerapps.io/api/v1',
      weather: 'WeatherForecast/bomWeather',
      weatherBOM: 'WeatherForecast/latestBomWeather',
      errts: 'WeatherForecast/ERRTSData',
      waterLevel: 'WeatherForecast/ScrivenerCR1000',
      login: 'account/login',
      register: 'account/register',
      calendarEvent: 'calendarTask',
      projectNote: 'projectNote',
      // Add more external APIs as needed
    },
    production: false
  };

  constructor() {
    // You could load configuration from different sources here if needed
    // For example, from a JSON file, from localStorage, or from an API call
  }

  get<T>(key: keyof typeof this.config): T {
    return this.config[key] as unknown as T;
  }

  /**
   * Get the URL for a specific API
   * @param name - The name of the API endpoint (e.g., 'main', 'weather', 'geo')
   * @returns The URL for the specified API
   */
  getApiUrl(name: keyof typeof this.config.apis = 'main'): string {
    return this.config.apis[name];
  }

  isProduction(): boolean {
    return this.config.production;
  }
}
