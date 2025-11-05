import { Component, EventEmitter, Output, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { AvatarModule } from 'primeng/avatar';
import { InputTextModule } from 'primeng/inputtext';
import { CommonModule } from '@angular/common';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { WeatherService } from '../../core/services/weather.service';
import { WeatherSummary } from '../../core/models/weather.model';
import { Router } from '@angular/router';
import { WeatherConsumerBase } from '../../core/base/weather-consumer.base';

@Component({
  selector: 'app-header',
  imports: [
    MenubarModule,
    BadgeModule,
    AvatarModule,
    InputTextModule,
    CommonModule,
    ButtonModule,
    TooltipModule,
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  encapsulation: ViewEncapsulation.None,
})
export class Header extends WeatherConsumerBase implements OnInit, OnDestroy {
  items: MenuItem[] = [];
  userName: string = '';

  // Cleaned weather display properties
  displayLatestTime: string = '';
  displayHighestTemp: string = '';
  displayHighestTime: string = '';
  displayLowestTemp: string = '';
  displayLowestTime: string = '';
  displayRain: string = '';

  @Output() sidebarToggle = new EventEmitter<void>();

  constructor(
    private authService: AuthService,
    weatherService: WeatherService,
    private router: Router
  ) {
    super(weatherService);
    // Get username from auth service
    this.authService.authState$.subscribe((state) => {
      if (state.user) {
        this.userName = state.user.username || state.user.email || 'Guest';
      } else {
        this.userName = 'Guest';
      }
    });

    // Initialize menu items
    this.items = [
      {
        label: 'ACT - Canberra Weather',
        url: 'https://reg.bom.gov.au/places/act/canberra/',
        target: '_blank',
        icon: 'pi pi-map-marker',
      },
      {
        label: 'Satellite Viewer',
        url: 'http://satview.bom.gov.au/',
        target: '_blank',
        //icon: 'pi pi-cloud'
      },
      {
        label: 'Ventusky',
        url: 'https://www.ventusky.com/?p=-35.3;149.0;5&l=rain-1h',
        target: '_blank',
        // icon: 'pi pi-globe'
      },
    ];
  }

  override ngOnInit(): void {
    // Call parent's ngOnInit to handle weather subscription
    super.ngOnInit();
  }

  /**
   * Implement abstract method from WeatherConsumerBase
   * Process weather data specific to Header component display
   */
  protected onWeatherDataReceived(weather: WeatherSummary): void {
    // Use inherited utility methods from base class
    this.displayLatestTime = this.extractLatestTime(weather.latestWeatherTime);
    this.displayHighestTemp = this.extractTemperature(weather.highestTemp);
    this.displayLowestTemp = this.extractTemperature(weather.lowestTemp);

    // Times are already separate, just trim them
    this.displayHighestTime = weather.highestTime?.trim() || '';
    this.displayLowestTime = weather.lowestTime?.trim() || '';

    this.displayRain = this.extractRainAmount(weather.rain);
  }

  override ngOnDestroy(): void {
    // Call parent's ngOnDestroy to handle cleanup
    super.ngOnDestroy();
  }

  onToggleSidebar(): void {
    this.sidebarToggle.emit();
  }

  onMenuItemClick(url: string, target?: string): void {
    if (url) {
      window.open(url, target || '_self');
    }
  }

  onLogout(): void {
    this.authService.logout();
  }
}
