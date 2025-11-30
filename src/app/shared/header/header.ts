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
import { DrawerModule } from 'primeng/drawer';
import { AuthService } from '../../core/services/auth.service';
import { BomWeatherService } from '../../core/services/bom-weather.service';
import { NewBomWeatherModel, LocationData } from '../../core/models/weatherBOM.module';
import { Router } from '@angular/router';
import { BomWeatherConsumerBase } from '../../core/base/bom-weather-consumer.base';

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
    DrawerModule,
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header extends BomWeatherConsumerBase implements OnInit, OnDestroy {
  items: MenuItem[] = [];
  userName: string = '';
  mobileMenuVisible: boolean = false;

  // Cleaned weather display properties
  displayLatestTime: string = '';
  displayCurrentTemp: string = '';
  displayLowestTemp: string = '';
  displayLowestTime: string = '';
  displayRain: string = '';

  // Refresh state management
  isRefreshing: boolean = false;
  refreshCooldown: boolean = false;
  private readonly COOLDOWN_DURATION = 3000; // 3 seconds cooldown

  @Output() sidebarToggle = new EventEmitter<void>();

  // Responsive breakpoints
  private readonly BREAKPOINT_MOBILE = 576;
  private readonly BREAKPOINT_TABLET = 960;
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
    return this.windowWidth >= this.BREAKPOINT_TABLET && this.windowWidth < this.BREAKPOINT_LARGE;
  }

  /**
   * Check if current view is desktop
   */
  get isDesktopView(): boolean {
    return this.windowWidth >= this.BREAKPOINT_LARGE;
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
    bomWeatherService: BomWeatherService,
    private router: Router
  ) {
    super(bomWeatherService);
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
        label: 'BOM',
        url: 'https://reg.bom.gov.au/act/forecasts/canberra.shtml',
        target: '_blank',
        icon: 'pi pi-map-marker',
      },
      {
        label: 'Satellite',
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
    // Trigger initial weather data fetch for header display
    this.bomWeatherService.getWeatherData().subscribe();
  }

  /**
   * Implement abstract method from BomWeatherConsumerBase
   * Process weather data specific to Header component display
   */
  protected onBomWeatherDataReceived(
    weatherData: NewBomWeatherModel,
    primaryLocation: LocationData
  ): void {
    // Get current weather from the primary location
    const current = primaryLocation.current;
    // Display current temperature and conditions
    this.displayLatestTime = this.formatTime(weatherData.timestamp);
    this.displayCurrentTemp = current?.temperature ?? '';
    this.displayRain = this.extractRainAmount(current?.rainSinceMidnight ?? '');
  }

  override ngOnDestroy(): void {
    // Call parent's ngOnDestroy to handle cleanup
    super.ngOnDestroy();
  }

  onToggleSidebar(): void {
    this.sidebarToggle.emit();
  }

  toggleMobileMenu(): void {
    this.mobileMenuVisible = !this.mobileMenuVisible;
  }

  closeMobileMenu(): void {
    this.mobileMenuVisible = false;
  }

  onMenuItemClick(url: string, target?: string): void {
    if (url) {
      window.open(url, target || '_self');
    }
    this.closeMobileMenu();
  }

  onLogout(): void {
    this.authService.logout();
  }

  onRefreshWeather(): void {
    // Prevent rapid repeated clicks
    if (this.isRefreshing || this.refreshCooldown) {
      return;
    }

    this.isRefreshing = true;

    this.bomWeatherService.forceRefresh().subscribe({
      next: (data) => {
        this.isRefreshing = false;
        this.startCooldown();
      },
      error: (err) => {
        this.isRefreshing = false;
        this.startCooldown();
      },
      complete: () => {
      },
    });
  }

  private startCooldown(): void {
    this.refreshCooldown = true;
    setTimeout(() => {
      this.refreshCooldown = false;
    }, this.COOLDOWN_DURATION);
  }

  onRefreshWeatherMobile(): void {
    this.onRefreshWeather();
    this.closeMobileMenu();
  }
}
