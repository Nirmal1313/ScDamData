import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { WaterLevelService } from '../../core/services/water-level.service';
import { ScrivenerCR1000Result } from '../../core/models/water-level.model';
import { ErtsWeatherService } from '../../core/services/erts-weather.service';
import { ErtsWeatherResult } from '../../core/models/erts-weather.model';
import { AuthService } from '../../core/services/auth.service';
import { ConfigService } from '../../core/services/config.service';
import { interval, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SplitterModule } from 'primeng/splitter';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-monitoring',
  imports: [PanelModule, DividerModule, TableModule, CommonModule, SplitterModule, DialogModule],
  templateUrl: './monitoring.html',
  styleUrl: './monitoring.scss',
})
export class Monitoring implements OnInit, OnDestroy {
  // Water level data
  dateTime: string = '';
  waterLevelData: any[] = [];
  waterLevelColumns: string[] = [];

  // Sluice status data
  sluiceStatusData: any[] = [];
  sluiceStatusColumns: string[] = [];

  // Gate status data
  gateStatusData: any[] = [];
  gateStatusColumns: string[] = [];

  // ERRTS Water Level data
  errtsDateTime: string = '';
  errtsWaterLevelData: any[] = [];
  errtsWaterLevelColumns: string[] = [];
  errtsRawData: any[] = []; // Store raw data with hreflink

  // Image popup
  showImageDialog: boolean = false;
  selectedImageUrl: string = '';
  selectedCommsId: string = '';

  loading: boolean = false;
  error: string = '';

  // Auto-refresh subscription
  private refreshSubscription?: Subscription;
  private authSubscription?: Subscription;
  private readonly REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(
    private waterLevelService: WaterLevelService,
    private errtsWeatherService: ErtsWeatherService,
    private authService: AuthService,
    private configService: ConfigService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Subscribe to auth state and load data only when authenticated
    this.authSubscription = this.authService.authState$
      .pipe(filter((state) => state.isAuthenticated))
      .subscribe(() => {
        // Use Promise.resolve to defer execution to next microtask
        Promise.resolve().then(() => {
          this.loadWaterLevelData();
          this.loadErrtsWaterLevelData();
          this.startAutoRefresh();
        });
      });
  }

  ngOnDestroy() {
    // Clean up subscriptions to prevent memory leaks
    this.stopAutoRefresh();
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  /**
   * Start auto-refresh timer to fetch data every 5 minutes
   */
  private startAutoRefresh() {
    this.stopAutoRefresh();

    this.refreshSubscription = interval(this.REFRESH_INTERVAL)
      .pipe(filter(() => this.authService.isLoggedIn()))
      .subscribe(() => {
        this.loadWaterLevelData();
        this.loadErrtsWaterLevelData();
      });
  }

  /**
   * Stop auto-refresh timer
   */
  private stopAutoRefresh() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
    }
  }

  private loadWaterLevelData() {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.waterLevelService.getWaterLevelData().subscribe({
      next: (data: ScrivenerCR1000Result) => {
        if (!data) {
          this.error = 'No data received from server';
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }

        this.dateTime = data.datetime || 'Unknown';

        if (data.waterLevel) {
          this.processWaterLevelData(data.waterLevel);
        }

        if (data.sluice_Status) {
          this.processSluiceStatusData(data.sluice_Status);
        }

        if (data.gate_Status) {
          this.processGateStatusData(data.gate_Status);
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching water level data:', err);
        this.error = err.message || 'Failed to load water level data';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private processWaterLevelData(waterLevel: string[]) {
    if (waterLevel && waterLevel.length > 0) {
      // Store the raw water level data for display at the top
      this.waterLevelData = waterLevel;
    }
  }

  private processSluiceStatusData(sluiceStatus: any[]) {
    if (sluiceStatus && sluiceStatus.length > 0) {
      // Extract all unique keys from all data objects
      const allKeys = new Set<string>();
      sluiceStatus.forEach((item) => {
        if (item.data) {
          Object.keys(item.data).forEach((key) => allKeys.add(key));
        }
      });

      this.sluiceStatusColumns = Array.from(allKeys);
      this.sluiceStatusData = sluiceStatus.map((item) => item.data || {});
    }
  }

  private processGateStatusData(gateStatus: any[]) {
    if (gateStatus && gateStatus.length > 0) {
      // Extract all unique keys from all data objects
      const allKeys = new Set<string>();
      gateStatus.forEach((item) => {
        if (item.data) {
          Object.keys(item.data).forEach((key) => allKeys.add(key));
        }
      });

      this.gateStatusColumns = Array.from(allKeys);
      this.gateStatusData = gateStatus.map((item) => item.data || {});
    }
  }

  /**
   * Load ERRTS water level data (every 5 minutes)
   */
  private loadErrtsWaterLevelData() {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.errtsWeatherService.getErrtsData().subscribe({
      next: (data: ErtsWeatherResult) => {
        if (!data) {
          this.error = 'No ERRTS data received from server';
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }

        this.errtsDateTime = data.datetime || 'Unknown';

        if (data.waterLevelStatus && data.waterLevelStatus.length > 0) {
          // Extract columns from additionalData keys
          const allKeys = new Set<string>();
          data.waterLevelStatus.forEach((item) => {
            if (item.additionalData) {
              Object.keys(item.additionalData).forEach((key) => allKeys.add(key));
            }
          });

          // Build columns: start with 'StationNo' (from additionalData), then 'Comms ID', then remaining fields
          const additionalDataKeys = Array.from(allKeys);
          const stationIndex = additionalDataKeys.indexOf('StationNo');

          if (stationIndex !== -1) {
            // Remove 'StationNo ' and place it first
            additionalDataKeys.splice(stationIndex, 1);
            this.errtsWaterLevelColumns = ['StationNo', 'Comms ID', ...additionalDataKeys];
          } else {
            this.errtsWaterLevelColumns = ['StationNo', 'Comms ID', ...additionalDataKeys];
          }

          // Store raw data for hreflink access
          this.errtsRawData = data.waterLevelStatus;

          // Map to flat objects for table display, ensuring StationNo comes first, then Comms ID
          this.errtsWaterLevelData = data.waterLevelStatus.map((item) => {
            const rowData: any = {};
            const additionalData = item.additionalData || {};

            // Add Station Number first if it exists (mapped to StationNo key)
            if (additionalData['Station Number']) {
              rowData['StationNo'] = additionalData['Station Number'];
            }

            // Add Comms ID second
            rowData['Comms ID'] = item.commsId;

            // Add remaining fields from additionalData (excluding Station Number)
            Object.keys(additionalData).forEach((key) => {
              if (key !== 'Station Number') {
                rowData[key] = additionalData[key];
              }
            });

            return rowData;
          });
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching ERRTS data:', err);
        this.error = err.message || 'Failed to load ERRTS water level data';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Open image popup for ERRTS water level station
   */
  openImagePopup(commsId: string) {
    const item = this.errtsRawData.find((x) => x.commsId === commsId);
    if (item && item.commsId) {
      this.selectedCommsId = commsId;
      this.showImageDialog = true;
      this.selectedImageUrl = ''; // Reset URL

      // Fetch image with authentication
      this.errtsWeatherService.getImageAsDataUrl(item.commsId).subscribe({
        next: (dataUrl: string) => {
          this.selectedImageUrl = dataUrl;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading image:', error);
          // Set fallback image
          this.selectedImageUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgTm90IEF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
          this.cdr.detectChanges();
        }
      });
    }
  }

  /**
   * Get CSS class for State column in ERRTS table
   */
  getStateClass(value: string): string {
    if (!value) return '';

    const trimmedValue = value.trim();

    // Blue for "Steady"
    if (trimmedValue === 'Steady') {
      return 'state-steady';
    }

    // Green for "Rising"
    if (trimmedValue === 'Rising') {
      return 'state-rising';
    }

    // Orange for "Falling"
    if (trimmedValue === 'Falling') {
      return 'state-falling';
    }

    return '';
  }

  /**
   * Get CSS class for cell based on status value
   */
  getStatusClass(value: string): string {
    if (!value) return '';

    const trimmedValue = value.trim();

    // Green for "In Service" or "Closed"
    if (trimmedValue === 'In Service' || trimmedValue === 'Closed') {
      return 'status-in-service';
    }

    // Orange for "Emergency Only"
    if (trimmedValue === 'Emergency Only') {
      return 'status-emergency';
    }

    // Red for "Out of Service"
    if (trimmedValue === 'Out of Service' || trimmedValue.toLowerCase().includes('out of')) {
      return 'status-out-of-service';
    }

    return '';
  }
}
