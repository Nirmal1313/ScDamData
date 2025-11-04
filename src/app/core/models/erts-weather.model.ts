export interface ErtsWaterLevelStatus {
  data: { [key: string]: string };
}

export interface ErtsRainfallStatus {
  data: { [key: string]: string };
}

export interface ErtsWeatherResult {
  datetime: string;
  waterLevelStatus: ErtsWaterLevelStatus[];
  rainfallStatus: ErtsRainfallStatus[];
}
