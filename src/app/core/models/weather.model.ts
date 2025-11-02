/**
 * Weather data models
 * Represents the structure of weather data from BOM (Bureau of Meteorology)
 * Matches the C# BomWeatherModels structure
 */

export interface TableRow {
  key: string;
  value: string;
}

export interface Station {
  name: string;
  link: string;
  distance: string;
  id: string;
}

export interface WeatherSummary {
  id: string;
  airT: string;
  lowestTemp: string;
  lowestTime: string;
  highestTemp: string;
  highestTime: string;
  rain: string;
  latestWeatherTime: string;
  table: TableRow[];
  station: Station;
}

export interface RainForecastItem {
  time: string;
  possibleRainfall: string;
  chanceOfRain: string;
  chanceOfRainIcon: string;
}

export interface ForecastItem {
  date: string;
  dateLink: string;
  forecastIcon: string;
  forecastIconAlt: string;
  minTemp: string;
  maxTemp: string;
  precis: string;
  possibleRainfall: string;
  chanceOfRain: string;
  chanceOfRainIcon: string;
}

export interface BomWeatherResult {
  weatherSummaries: WeatherSummary[];
  rainForecast: RainForecastItem[];
  forecasts: ForecastItem[];
}

// Service state management interfaces
export interface WeatherState {
  data: BomWeatherResult | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  callCount: number; // Track number of API calls
}

export interface WeatherCacheConfig {
  maxCallCount: number; // Maximum calls before refresh (e.g., 5)
  cacheExpiryMinutes: number; // How long to keep cached data
}
