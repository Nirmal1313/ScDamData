import {
  Component,
  ViewChild,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { AvatarModule } from 'primeng/avatar';
import { StyleClassModule } from 'primeng/styleclass';
import { Drawer } from 'primeng/drawer';
import { TableModule } from 'primeng/table';
import { BomWeatherService } from '../../core/services/bom-weather.service';
import { LocationData, DailyForecast, HourlyForecast } from '../../core/models/weatherBOM.module';

import { BomWeatherConsumerBase } from '../../core/base/bom-weather-consumer.base';

// Interfaces for table data
interface WeatherRow {
  key: string;
  value: string;
}

interface ForecastRow {
  time: string;
  possibleRainfall: string;
  chanceOfRain: string;
}

interface WeekdayRow {
  date: string;
  conditions: string;
  possibleRainfall: string;
  minTemp: string;
  maxTemp: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    DrawerModule,
    ButtonModule,
    RippleModule,
    AvatarModule,
    StyleClassModule,
    TableModule,
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit, OnDestroy {
  @ViewChild('drawerRef') drawerRef!: Drawer;
  @Input() sidebarVisible: boolean = false;
  @Output() sidebarToggleChange = new EventEmitter<boolean>();
  rowsWeather: WeatherRow[] = [];
  forecastWeather: ForecastRow[] = [];
  weekdaysWeather: WeekdayRow[] = [];
  weatherSummary: LocationData | null = null;
  lastUpdated: string = 'N/A';

  private weatherSubscription?: any; // Today's forecast data for the first table
  todayForecastIcon: string = '';
  todayForecastIconAlt: string = '';

  // Responsive breakpoints
  private readonly BREAKPOINT_MOBILE = 576;
  private readonly BREAKPOINT_TABLET = 768;
  private readonly BREAKPOINT_DESKTOP = 1024;

  // Window width tracking
  private windowWidth: number = typeof window !== 'undefined' ? window.innerWidth : 1024;

  /**
   * Listen to window resize events for responsive behavior
   */
  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.windowWidth = event.target.innerWidth;
  }

  /**
   * Get responsive drawer width based on screen size
   */
  get drawerWidth(): { width: string } {
    if (this.windowWidth < this.BREAKPOINT_MOBILE) {
      // Mobile: Full width
      return { width: '100vw' };
    } else if (this.windowWidth < this.BREAKPOINT_TABLET) {
      // Small tablets: 85% width
      return { width: '85vw' };
    } else if (this.windowWidth < this.BREAKPOINT_DESKTOP) {
      // Tablets: 60% width
      return { width: '60vw' };
    } else {
      // Desktop: Fixed 26rem
      return { width: '28rem' };
    }
  }

  /**
   * Check if current view is mobile
   */
  get isMobileView(): boolean {
    return this.windowWidth < this.BREAKPOINT_TABLET;
  }

  constructor(private bomWeatherService: BomWeatherService) {}

  closeCallback(e: any): void {
    this.drawerRef.close(e);
  }

  onVisibleChange(visible: boolean): void {
    this.sidebarVisible = visible;
    this.sidebarToggleChange.emit(visible);
  }

  ngOnInit(): void {
    // Subscribe to BOM weather state
    this.weatherSubscription = this.bomWeatherService.weatherState$.subscribe((state) => {
      if (state.data && state.data.locations) {
        // Get Canberra weather data - the API returns a single 'canberra' key with all data
        const canberra = state.data.locations['canberra'];

        // Store for template access
        this.weatherSummary = canberra;
        this.lastUpdated = this.formatTime(state.data.timestamp || 'N/A');

        // Map data to tables - all data comes from the single canberra location
        this.mapWeatherReportTable(canberra);
        this.mapWeekdaysTable(canberra);
        this.mapForecastTable(canberra);
      }
    });

    // Note: No need to trigger fetch here - header component already does it
    // We'll receive data via weatherState$ subscription
  }

  /**
   * Map current weather data to Weather Report table (rowsWeather)
   */
  private mapWeatherReportTable(todayData: LocationData | undefined): void {
    if (!todayData || !todayData.current) {
      this.rowsWeather = [{ key: 'Status', value: 'No current weather data available' }];
      return;
    }

    const current = todayData.current;
    const sunInfo = todayData.sunInfo;
    const todayForecast =
      todayData.forecast && todayData.forecast.length > 0 ? todayData.forecast[0] : null;

    this.rowsWeather = [
      { key: 'Condition', value: todayForecast?.conditions || current.conditions || 'N/A' },
      { key: 'Feels Like', value: current.feelsLike || 'N/A' },
      { key: 'Min Temp', value: current.minTemp || 'N/A' },
      { key: 'Max Temp', value: current.maxTemp || 'N/A' },
      { key: 'Wind', value: current.wind || 'N/A' },
      { key: 'Gust', value: current.gust || 'N/A' },
      { key: 'Humidity', value: current.humidity || 'N/A' },
      { key: 'Dew Point', value: current.dewPoint || 'N/A' },
      { key: 'Rain Since Midnight', value: current.rainSinceMidnight || 'N/A' },
      { key: 'Rain Chance', value: current.rainChance || 'N/A' },
    ];
  }

  /**
   * Map 7-day forecast data to Week Days Report table (weekdaysWeather)
   */
  private mapWeekdaysTable(weekData: LocationData | undefined): void {
    if (!weekData || !weekData.forecast || weekData.forecast.length === 0) {
      this.weekdaysWeather = [];
      return;
    }

    this.weekdaysWeather = weekData.forecast.map((day: DailyForecast) => ({
      date: day.day,
      conditions: day.conditions,
      possibleRainfall: this.extractRainfall(day.rainfall),
      minTemp: day.minTemp,
      maxTemp: day.maxTemp,
    }));
    // Keep only the next 6 days
    this.weekdaysWeather = this.weekdaysWeather.splice(0, 7);
  }

  /**
   * Map hourly forecast data to Forecast Report table (forecastWeather)
   */
  private mapForecastTable(hourlyData: LocationData | undefined): void {
    if (!hourlyData || !hourlyData.hourlyForecast || hourlyData.hourlyForecast.length === 0) {
      this.forecastWeather = [];
      return;
    }

    this.forecastWeather = hourlyData.hourlyForecast.map((hour: HourlyForecast) => ({
      time: hour.time,
      chanceOfRain: hour.summary,
      temperature: hour.temperature,
      feelsLike: hour.feelsLike,
      possibleRainfall: this.extractRainfall(hour.rainChanceMedium),
    }));
  }

  /**
   * Get the most relevant rain chance from the available fields
   */
  private getRainChance(hour: HourlyForecast): string {
    // Return the first non-empty rain chance field
    if (hour.rainChanceMedium) return this.extractRainfall(hour.rainChanceMedium);
    if (hour.rainChanceLow) return this.extractRainfall(hour.rainChanceLow);
    if (hour.rainChanceVeryLow) return this.extractRainfall(hour.rainChanceVeryLow);
    return 'N/A';
  }

  /**
   * Extract numeric rainfall from mixed string format
   * e.g., "0 millimetres\n0 mm" -> "0 mm"
   * e.g., "0 to 4 millimetres" -> "0-4mm"
   * e.g., "North West\nNW \n10 knots" -> "10 knots" (wind data)
   */
  private extractRainfall(rainfallString: string): string {
    if (!rainfallString) return '';

    // Check if it contains "millimetres" or "mm"
    if (rainfallString.includes('millimetres') || rainfallString.includes('mm')) {
      // Extract the numeric value and unit

      // Check for range format: "0 to 4 millimetres" -> "0-4mm"
      const rangeMatch = rainfallString.match(
        /(\d+(?:\.\d+)?)\s*to\s*(\d+(?:\.\d+)?)\s*(?:millimetres|mm)/i
      );
      if (rangeMatch) {
        return `${rangeMatch[1]}-${rangeMatch[2]} mm`;
      }

      // Check for single value: "4 millimetres" -> "4mm"
      const singleMatch = rainfallString.match(/(\d+(?:\.\d+)?)\s*(?:millimetres|mm)/i);
      if (singleMatch) {
        return `${singleMatch[1]} mm`;
      }
    }

    // If it's wind data or other format, return the last meaningful line
    const lines = rainfallString.split('\n').filter((line) => line.trim() !== '');
    return lines[lines.length - 1] || rainfallString;
  }

  ngOnDestroy(): void {
    if (this.weatherSubscription) {
      this.weatherSubscription.unsubscribe();
    }
  }

  /**
   * Format weather values with icons and styling based on the key
   */
  formatWeatherValue(key: string, value: string): string {
    const keyLower = key.toLowerCase();
    const iconStyle = 'margin-right: 0.75rem; padding: 1rem;';

    // Map keys to icons and formatting
    if (keyLower.includes('condition') || keyLower.includes('weather')) {
      return `<i class="pi pi-cloud" style="${iconStyle}"></i>&nbsp;&nbsp;${value}`;
    } else if (keyLower.includes('feels') || keyLower.includes('temp')) {
      return `<i class="pi pi-sun" style="${iconStyle}"></i>&nbsp;&nbsp;${value}`;
    } else if (keyLower.includes('rainfall') || keyLower.includes('rain')) {
      return `<i class="pi pi-cloud" style="${iconStyle}"></i>&nbsp;&nbsp;${value}`;
    } else if (keyLower.includes('humidity') || keyLower.includes('dew point')) {
      return `<i class="pi pi-sparkles" style="${iconStyle}"></i>&nbsp;&nbsp;${value}`;
    } else if (keyLower.includes('wind')) {
      return `<i class="pi pi-flag" style="${iconStyle}"></i>&nbsp;&nbsp;${value}`;
    } else if (keyLower.includes('gust')) {
      return `<i class="pi pi-send" style="${iconStyle}"></i>&nbsp;&nbsp;${value}`;
    } else if (keyLower.includes('sunrise') || keyLower.includes('sunset')) {
      return `<i class="pi pi-sun" style="${iconStyle}"></i>&nbsp;&nbsp;${value}`;
    } else if (keyLower.includes('uv') || keyLower.includes('sun protection')) {
      return `<i class="pi pi-shield" style="${iconStyle}"></i>&nbsp;&nbsp;${value}`;
    } else if (keyLower.includes('fire danger')) {
      return `<i class="pi pi-exclamation-triangle" style="${iconStyle}"></i>&nbsp;&nbsp;${value}`;
    } else if (keyLower.includes('pressure')) {
      return `<i class="pi pi-compass" style="${iconStyle}"></i>&nbsp;&nbsp;${value}`;
    }

    // Default formatting for other keys
    return value;
  }

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
        hour12: false,
      });

      const parts = formatter.formatToParts(date);
      const year = parts.find((p) => p.type === 'year')?.value;
      const month = parts.find((p) => p.type === 'month')?.value;
      const day = parts.find((p) => p.type === 'day')?.value;
      const hour = parts.find((p) => p.type === 'hour')?.value;
      const minute = parts.find((p) => p.type === 'minute')?.value;

      return `${year}-${month}-${day} ${hour}:${minute}`;
    } catch {
      return timeString.trim();
    }
  }
}
