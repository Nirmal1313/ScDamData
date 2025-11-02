import { Directive, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { WeatherService } from '../services/weather.service';
import { WeatherSummary, TableRow } from '../models/weather.model';

/**
 * Base class for components that consume weather data
 * Following SOLID principles:
 * - Single Responsibility: Handles only weather data subscription and processing
 * - Open/Closed: Open for extension, closed for modification
 * - Liskov Substitution: Can be extended by any component needing weather data
 */
@Directive()
export abstract class WeatherConsumerBase implements OnInit, OnDestroy {
  weatherSummaries: WeatherSummary[] = [];
  weatherSummary: WeatherSummary | null = null;
  protected weatherSubscription?: Subscription;

  constructor(protected weatherService: WeatherService) {}

  ngOnInit(): void {
    this.subscribeToWeather();
  }

  ngOnDestroy(): void {
    this.unsubscribeFromWeather();
  }

  /**
   * Subscribe to weather state changes
   * Automatically processes the first weather summary when data is available
   */
  private subscribeToWeather(): void {
    this.weatherSubscription = this.weatherService.weatherState$.subscribe((state) => {
      if (state.data && state.data.weatherSummaries) {
        this.weatherSummaries = state.data.weatherSummaries;
        // Get the first weather summary (index 0) for display
        this.weatherSummary = this.weatherSummaries.length > 0 ? this.weatherSummaries[0] : null;

        // Call the abstract method for child-specific processing
        if (this.weatherSummary) {
          this.onWeatherDataReceived(this.weatherSummary);
        }
      }
    });
  }

  /**
   * Clean up subscription to prevent memory leaks
   */
  private unsubscribeFromWeather(): void {
    if (this.weatherSubscription) {
      this.weatherSubscription.unsubscribe();
    }
  }

  /**
   * Abstract method for child components to implement their specific weather data processing
   * @param weather The weather summary to process
   */
  protected abstract onWeatherDataReceived(weather: WeatherSummary): void;

  /**
   * Extract time from "Latest weather at 12:00am" format
   */
  protected extractLatestTime(latestWeatherTime: string | undefined): string {
    if (!latestWeatherTime) return '';
    const match = latestWeatherTime.match(/(\d{1,2}:\d{2}\s?[ap]m)/i);
    return match ? match[1] : '';
  }

  /**
   * Extract temperature only (remove extra spaces and time)
   */
  protected extractTemperature(tempString: string | undefined): string {
    if (!tempString) return '';
    return tempString.split(/\s{2,}/)[0]?.trim() || '';
  }

  /**
   * Extract rain amount only (e.g., "1.5 mm")
   */
  protected extractRainAmount(rainString: string | undefined): string {
    if (!rainString) return '';
    const match = rainString.match(/([\d.]+\s?mm)/i);
    return match ? match[1] : '';
  }

  /**
   * Split temperature value and unit for styling purposes
   */
  protected getTemperatureParts(temp: string | undefined): { value: string; unit: string } {
    if (!temp) return { value: '', unit: '' };
    const match = temp.match(/([\d.]+)\s*(°C)/);
    if (match) {
      return { value: match[1], unit: match[2] };
    }
    return { value: temp, unit: '' };
  }

  /**
   * Convert weather summary table to clean key-value pairs
   */
  protected processWeatherTable(table: TableRow[] | undefined): Array<{ key: string; value: string }> {
    if (!table) return [];
    return table.map((item) => ({
      key: item.key,
      value: item.value
    }));
  }
}
