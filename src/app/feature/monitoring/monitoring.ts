import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { WaterLevelService } from '../../core/services/water-level.service';
import { ScrivenerCR1000Result } from '../../core/models/water-level.model';
import { AuthService } from '../../core/services/auth.service';
import { ConfigService } from '../../core/services/config.service';
import { interval, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SplitterModule } from 'primeng/splitter';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-monitoring',
  imports: [PanelModule, DividerModule, TableModule, CommonModule, SplitterModule, DialogModule, ProgressSpinnerModule],
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
