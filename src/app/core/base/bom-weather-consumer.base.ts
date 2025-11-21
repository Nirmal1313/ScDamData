import { Directive, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { BomWeatherService } from '../services/bom-weather.service';
import { NewBomWeatherModel, LocationData, CurrentWeather } from '../models/weatherBOM.module';

/**
 * Base class for components that consume new BOM weather data
 * Following SOLID principles:
 * - Single Responsibility: Handles only BOM weather data subscription and processing
 * - Open/Closed: Open for extension, closed for modification
 * - Liskov Substitution: Can be extended by any component needing BOM weather data
 */
@Directive()
export abstract class BomWeatherConsumerBase implements OnInit, OnDestroy {
  bomWeatherData: NewBomWeatherModel | null = null;
  primaryLocation: LocationData | null = null;
  protected weatherSubscription?: Subscription;

  constructor(protected bomWeatherService: BomWeatherService) {}

  ngOnInit(): void {
    this.subscribeToWeather();
    // Trigger initial data fetch
    this.bomWeatherService.getWeatherData().subscribe({
      error: (err) => console.error('Error fetching BOM weather data:', err)
    });
  }

  ngOnDestroy(): void {
    this.unsubscribeFromWeather();
  }

  /**
   * Subscribe to BOM weather state changes
   * Automatically processes the first location when data is available
   */
  private subscribeToWeather(): void {
    this.weatherSubscription = this.bomWeatherService.weatherState$.subscribe((state) => {
     if (state.data && state.data.locations) {
        this.bomWeatherData = state.data;

        // Get the location keys
        const locationKeys = Object.keys(state.data.locations);

        if (locationKeys.length > 0) {
          // Find location with current weather data, prefer 'today' location
          let primaryKey = locationKeys.find(key => key.includes('today')) ||
                          locationKeys.find(key => state.data!.locations[key].current) ||
                          locationKeys[0];

          this.primaryLocation = state.data.locations[primaryKey];

          // Call the abstract method for child-specific processing
          this.onBomWeatherDataReceived(state.data, this.primaryLocation);
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
   * @param weatherData The complete BOM weather data
   * @param primaryLocation The primary location data (first location by default)
   */
  protected abstract onBomWeatherDataReceived(
    weatherData: NewBomWeatherModel,
    primaryLocation: LocationData
  ): void;

  /**
   * Extract rain amount only (e.g., "1.5 mm")
   */
  protected extractRainAmount(rainString: string | undefined): string {
    if (!rainString) return '';
    return rainString.trim();
  }

  /**
   * Split temperature value and unit for styling purposes
   */
  protected getTemperatureParts(temp: string | undefined): { value: string; unit: string } {
    if (!temp) return { value: '', unit: '' };
    const match = temp.match(/([\d.]+)\s*(°C?)/);
    if (match) {
      return { value: match[1], unit: match[2] || '°C' };
    }
    return { value: temp, unit: '' };
  }

  /**
   * Format time string (e.g., "12:00 PM") and convert to Australia/Sydney timezone
   */
  protected formatTime(timeString: string | undefined): string {
    if (!timeString) return '';
    try {
      const date = new Date(timeString);
      // Format as YYYY-MM-DD HH:mm:ss in Australia/Sydney timezone
      const formatter = new Intl.DateTimeFormat('en-AU', {
        timeZone: 'Australia/Sydney',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      const parts = formatter.formatToParts(date);
      const year = parts.find(p => p.type === 'year')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      const hour = parts.find(p => p.type === 'hour')?.value;
      const minute = parts.find(p => p.type === 'minute')?.value;

      return `${year}-${month}-${day} ${hour}:${minute}`;
    } catch {
      return timeString.trim();
    }
  }

  /**
   * Get location data by key
   */
  protected getLocationByKey(key: string): LocationData | null {
    if (!this.bomWeatherData || !this.bomWeatherData.locations) {
      return null;
    }
    return this.bomWeatherData.locations[key] || null;
  }

  /**
   * Get all available location keys
   */
  protected getLocationKeys(): string[] {
    if (!this.bomWeatherData || !this.bomWeatherData.locations) {
      return [];
    }
    return Object.keys(this.bomWeatherData.locations);
  }

  /**
   * Get current weather for a specific location
   */
  protected getCurrentWeather(locationKey?: string): CurrentWeather | null {
    const location = locationKey
      ? this.getLocationByKey(locationKey)
      : this.primaryLocation;

    return location?.current || null;
  }
}
