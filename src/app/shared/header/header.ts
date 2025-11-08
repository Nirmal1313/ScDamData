import { Component, EventEmitter, Output, OnInit, OnDestroy, HostListener } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { AvatarModule } from 'primeng/avatar';
import { InputTextModule } from 'primeng/inputtext';
import { CommonModule } from '@angular/common';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
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
    RippleModule,
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
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

  // Responsive breakpoints
  private readonly BREAKPOINT_MOBILE = 576;
  private readonly BREAKPOINT_TABLET = 768;
  private readonly BREAKPOINT_DESKTOP = 1024;
  private readonly BREAKPOINT_LARGE = 1280;

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
   * Check if current view is mobile
   */
  get isMobileView(): boolean {
    return this.windowWidth < this.BREAKPOINT_TABLET;
  }

  /**
   * Check if current view is tablet
   */
  get isTabletView(): boolean {
    return this.windowWidth >= this.BREAKPOINT_TABLET && this.windowWidth < this.BREAKPOINT_DESKTOP;
  }

  /**
   * Check if current view is desktop
   */
  get isDesktopView(): boolean {
    return this.windowWidth >= this.BREAKPOINT_DESKTOP;
  }

  /**
   * Check if should show all weather info
   */
  get showFullWeatherInfo(): boolean {
    return this.windowWidth >= this.BREAKPOINT_LARGE;
  }

  /**
   * Check if should show compact weather info
   */
  get showCompactWeatherInfo(): boolean {
    return this.windowWidth >= this.BREAKPOINT_TABLET && this.windowWidth < this.BREAKPOINT_LARGE;
  }

  /**
   * Check if should show minimal weather info (mobile)
   */
  get showMinimalWeatherInfo(): boolean {
    return this.windowWidth < this.BREAKPOINT_TABLET;
  }

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
        label: 'Canberra Forecast',
        url: 'https://reg.bom.gov.au/act/forecasts/canberra.shtml',
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
      {
        label: 'Contrail',
        url: 'https://contrail.onerain.com.au/login/?status=300&message=Redirection:%20Multiple%20Choices&continue=ZA',
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
