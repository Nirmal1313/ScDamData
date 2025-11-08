import { Component, ViewChild, EventEmitter, Input, Output, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { AvatarModule } from 'primeng/avatar';
import { StyleClassModule } from 'primeng/styleclass';
import { Drawer } from 'primeng/drawer';
import { TableModule } from 'primeng/table';
import { WeatherService } from '../../core/services/weather.service';
import { WeatherSummary, RainForecastItem, ForecastItem } from '../../core/models/weather.model';
import { WeatherConsumerBase } from '../../core/base/weather-consumer.base';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, DrawerModule, ButtonModule, RippleModule, AvatarModule, StyleClassModule, TableModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar extends WeatherConsumerBase implements OnInit, OnDestroy {
  @ViewChild('drawerRef') drawerRef!: Drawer;
  @Input() sidebarVisible: boolean = false;
  @Output() sidebarToggleChange = new EventEmitter<boolean>();
  rowsWeather = [{ key: ' ', value: '' }];
  forecastWeather: RainForecastItem[] = [];
  weekdaysWeather: ForecastItem[] = [];

  // Today's forecast data for the first table
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
      return { width: '26rem' };
    }
  }

  /**
   * Check if current view is mobile
   */
  get isMobileView(): boolean {
    return this.windowWidth < this.BREAKPOINT_TABLET;
  }


  constructor(weatherService: WeatherService) {
    super(weatherService);
  }

  closeCallback(e: any): void {
    this.drawerRef.close(e);
  }

  onVisibleChange(visible: boolean): void {
    this.sidebarVisible = visible;
    this.sidebarToggleChange.emit(visible);
  }

  override ngOnInit(): void {
    // Call parent's ngOnInit to handle weather subscription
    super.ngOnInit();

    // Subscribe to weather state to get rainForecast and forecasts
    this.weatherSubscription = this.weatherService.weatherState$.subscribe((state) => {
      if (state.data) {
        // rainForecast and forecasts are at the BomWeatherResult level
        this.forecastWeather = state.data.rainForecast || [];
        this.weekdaysWeather = state.data.forecasts || [];

        // Get today's forecast data (first item in arrays)
        if (this.weekdaysWeather.length > 0) {
          this.todayForecastIcon = this.weekdaysWeather[0].forecastIcon;
          this.todayForecastIconAlt = this.weekdaysWeather[0].forecastIconAlt;

          // Update the table with forecast data
          this.updateWeatherTable();
        }
      }
    });
  }

  /**
   * Implement abstract method from WeatherConsumerBase
   * Process weather data specific to Sidebar component display
   */
  protected onWeatherDataReceived(weather: WeatherSummary): void {
    // Store the base weather data and update the table
    this.baseWeatherData = this.processWeatherTable(weather.table);
    this.updateWeatherTable();
  }

  /**
   * Update the weather table with forecast data prepended
   */
  private baseWeatherData: { key: string; value: string }[] = [];

  private updateWeatherTable(): void {
    // Prepend forecast data to the table
    this.rowsWeather = [];

    // Add Condition first
    if (this.todayForecastIconAlt && this.todayForecastIconAlt.trim() !== '') {
      this.rowsWeather.push({
        key: 'Condition',
        value: this.todayForecastIconAlt
      });
    }

    // Add rest of weather data
    this.rowsWeather.push(...this.baseWeatherData);
  }  override ngOnDestroy(): void {
    // Call parent's ngOnDestroy to handle cleanup
    super.ngOnDestroy();
  }

  /**
   * Format weather values with icons and styling based on the key
   */
  formatWeatherValue(key: string, value: string): string {
    const keyLower = key.toLowerCase();

    // Map keys to icons and formatting with increased spacing
    if (keyLower.includes('rainfall') || keyLower.includes('rain')) {
      return `<i class="pi pi-cloud" style="margin-right: 0.75rem; padding: 1rem;"></i>&nbsp;&nbsp;${value}`;
    } else if (keyLower.includes('condition') || keyLower.includes('weather')) {
      return `<i class="pi pi-sun" style="margin-right: 0.75rem; padding: 1rem;"></i>&nbsp;&nbsp;${value}`;
    } else if (keyLower.includes('temperature') || keyLower === 'temp') {
      return `<i class="pi pi-thermometer" style="margin-right: 0.75rem; padding: 1rem;"></i>&nbsp;&nbsp;${value}`;
    } else if (keyLower.includes('humidity')) {
      return `<i class="pi pi-sparkles" style="margin-right: 0.75rem; padding: 1rem;"></i>&nbsp;&nbsp;${value}`;
    } else if (keyLower.includes('wind')) {
      return `<i class="pi pi-flag" style="margin-right: 0.75rem; padding: 1rem;"></i>&nbsp;&nbsp;${value}`;
    } else if (keyLower.includes('pressure')) {
      return `<i class="pi pi-compass" style="margin-right: 0.75rem; padding: 1rem;"></i>&nbsp;&nbsp;${value}`;
    } else if (keyLower.includes('gust')) {
      return `<i class="pi pi-send" style="margin-right: 0.75rem; padding: 1rem;"></i>&nbsp;&nbsp;${value}`;
    }

    // Default formatting for other keys
    return value;
  }
}
