import { Component, ViewChild, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
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
  imports: [DrawerModule, ButtonModule, RippleModule, AvatarModule, StyleClassModule, TableModule],
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
      }
    });
  }

  /**
   * Implement abstract method from WeatherConsumerBase
   * Process weather data specific to Sidebar component display
   */
  protected onWeatherDataReceived(weather: WeatherSummary): void {
    // Use inherited utility method from base class for table data
    this.rowsWeather = this.processWeatherTable(weather.table);
  }

  override ngOnDestroy(): void {
    // Call parent's ngOnDestroy to handle cleanup
    super.ngOnDestroy();
  }
}
