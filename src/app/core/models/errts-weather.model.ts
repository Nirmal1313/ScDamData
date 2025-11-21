export interface ErrtsWaterLevelStatus {
  data: { [key: string]: string };
}

export interface ErrtsRainfallStatus {
  data: { [key: string]: string };
}

export interface ErrtsWeatherResult {
  datetime: string;
  waterLevelStatus: ErrtsWaterLevelStatus[];
  rainfallStatus: ErrtsRainfallStatus[];
}
