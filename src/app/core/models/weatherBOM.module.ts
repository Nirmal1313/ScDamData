// Root container for all weather data
export interface NewBomWeatherModel {
  timestamp: string;
  locations: { [key: string]: LocationData };
}

// Main location weather data container
export interface LocationData {
  // Basic Info
  location: string;
  state: string;
  forecastType: string;

  // Weather Data Collections
  forecast: DailyForecast[];
  hourlyForecast: HourlyForecast[];

  // Current Weather
  current?: CurrentWeather;

  // Additional Information
  sunInfo?: SunAndSafety;
}

// Daily forecast information
export interface DailyForecast {
  day: string;
  conditions: string;
  minTemp: string;
  maxTemp: string;
  rainfall: string;
}

// Hourly forecast information
export interface HourlyForecast {
  time: string;
  summary: string;
  temperature: string;
  feelsLike: string;
  rainChanceMedium: string;
  rainChanceLow: string;
  rainChanceVeryLow: string;
  wind: string;
  gust: string;
  humidity: string;
  dewPoint: string;
  uvIndex: string;
}

// Current weather conditions - combines temperature and detailed conditions
export interface CurrentWeather {
  // Temperature Information
  temperature: string;
  feelsLike: string;
  minTemp: string;
  maxTemp: string;
  conditions: string;

  // Atmospheric Conditions
  wind: string;
  gust: string;
  humidity: string;
  dewPoint: string;

  // Precipitation
  rainSinceMidnight: string;
  rainChance: string;
}

// Sun and safety information
export interface SunAndSafety {
  sunrise: string;
  sunset: string;
  maxUvIndex: string;
  sunProtectionTimes: string;
  fireDangerRating: string;
}
