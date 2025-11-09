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
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-monitoring',
  imports: [PanelModule, DividerModule, TableModule, CommonModule, SplitterModule, DialogModule, ProgressSpinnerModule, ButtonModule, TooltipModule],
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
  outflowData: string = '';
  totalDischargeData: string = '';

  // Previous values for change detection
  private previousLakeLevel: number | null = null;
  private previousLakeStorage: number | null = null;
  private previousOutflow: number | null = null;
  private previousTotalDischarge: number | null = null;

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

  /**
   * Manual refresh triggered by user
   */
  refreshData(): void {
    this.loadWaterLevelData();
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
      // Store current values as previous BEFORE updating with new data
      this.storePreviousValues();

      // Now update with new water level data
      this.waterLevelData = waterLevel;
    }
  }

  /**
   * Store current values as previous for next comparison
   */
  private storePreviousValues() {
    // Only store values if we have existing data (not the first load)
    if (this.waterLevelData.length === 0) {
      return;
    }

    // Extract lake level from waterLevelData[0] (e.g., "Lake Level is 555.633m AHD")
    const lakeLevelMatch = this.waterLevelData[0].match(/(\d+\.\d+)m\s+AHD/);
    if (lakeLevelMatch) {
      const currentLakeLevel = parseFloat(lakeLevelMatch[1]);
      if (!isNaN(currentLakeLevel)) {
        this.previousLakeLevel = currentLakeLevel;
      }
    }

    // Extract lake storage from waterLevelData[0] (e.g., "Lake Storage is 30980 ML")
    const lakeStorageMatch = this.waterLevelData[0].match(/Lake Storage is (\d+)\s+ML/);
    if (lakeStorageMatch) {
      const currentLakeStorage = parseFloat(lakeStorageMatch[1]);
      if (!isNaN(currentLakeStorage)) {
        this.previousLakeStorage = currentLakeStorage;
      }
    }

    // Track outflow
    const outflowValue = parseFloat(this.outflowData);
    if (!isNaN(outflowValue) && outflowValue > 0) {
      this.previousOutflow = outflowValue;
    }

    // Track total discharge
    const totalDischargeValue = parseFloat(this.totalDischargeData);
    if (!isNaN(totalDischargeValue) && totalDischargeValue > 0) {
      this.previousTotalDischarge = totalDischargeValue;
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

      // Get the first column key (the row label column)
      const firstColumnKey = this.sluiceStatusColumns[0];

      // Find the row where the first column contains "Discharge (cumecs)"
      const dischargeCumecsRow = this.sluiceStatusData.find(row =>
        row[firstColumnKey] === 'Discharge (cumecs)'
      );

      // Find the row where the first column contains "Volume since 0h (ML)"
      const dischargeMLDayRow = this.sluiceStatusData.find(row =>
        row[firstColumnKey] === 'Volume since 0h (ML)'
      );

      // Get the last column (excluding the first label column)
      const lastColumnKey = this.sluiceStatusColumns[this.sluiceStatusColumns.length - 1];

      // Extract the last column value from each row
      this.outflowData = dischargeCumecsRow ? (dischargeCumecsRow[lastColumnKey] || '0.0') : '0.0';
      this.totalDischargeData = dischargeMLDayRow ? (dischargeMLDayRow[lastColumnKey] || '0.0') : '0.0';
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

  /**
   * Get change status for a metric value
   */
  getChangeStatus(currentValue: number, previousValue: number | null, isHigherBetter: boolean = false): 'rising' | 'falling' | 'steady' | 'none' {
    if (isNaN(currentValue)) {
      return 'none';
    }

    // If no previous value exists, show as steady (baseline)
    if (previousValue === null) {
      return 'steady';
    }

    const threshold = 0.01; // Minimum change to consider
    const difference = currentValue - previousValue;

    if (Math.abs(difference) < threshold) {
      return 'steady';
    } else if (difference > 0) {
      return 'rising';
    } else {
      return 'falling';
    }
  }

  /**
   * Get lake level with current value
   */
  get lakeLevelValue(): number | null {
    if (this.waterLevelData.length > 0) {
      const match = this.waterLevelData[0].match(/(\d+\.\d+)m\s+AHD/);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    return null;
  }

  /**
   * Get lake storage with current value
   */
  get lakeStorageValue(): number | null {
    if (this.waterLevelData.length > 0) {
      const match = this.waterLevelData[0].match(/Lake Storage is (\d+)\s+ML/);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    return null;
  }

  /**
   * Get change status for lake level
   */
  get lakeLevelChangeStatus(): 'rising' | 'falling' | 'steady' | 'none' {
    if (this.lakeLevelValue === null) return 'none';
    return this.getChangeStatus(this.lakeLevelValue, this.previousLakeLevel);
  }

  /**
   * Get change status for lake storage
   */
  get lakeStorageChangeStatus(): 'rising' | 'falling' | 'steady' | 'none' {
    if (this.lakeStorageValue === null) return 'none';
    return this.getChangeStatus(this.lakeStorageValue, this.previousLakeStorage);
  }

  /**
   * Get change status for outflow
   */
  get outflowChangeStatus(): 'rising' | 'falling' | 'steady' | 'none' {
    const outflowValue = parseFloat(this.outflowData);
    if (isNaN(outflowValue)) return 'none';
    return this.getChangeStatus(outflowValue, this.previousOutflow);
  }

  /**
   * Get change status for total discharge
   */
  get totalDischargeChangeStatus(): 'rising' | 'falling' | 'steady' | 'none' {
    const totalDischargeValue = parseFloat(this.totalDischargeData);
    if (isNaN(totalDischargeValue)) return 'none';
    return this.getChangeStatus(totalDischargeValue, this.previousTotalDischarge);
  }

  /**
   * Get trend icon based on change status
   */
  getTrendIcon(status: 'rising' | 'falling' | 'steady' | 'none'): string {
    switch (status) {
      case 'rising':
        return 'pi pi-arrow-up';
      case 'falling':
        return 'pi pi-arrow-down';
      case 'steady':
        return 'pi pi-minus';
      default:
        return '';
    }
  }

  /**
   * Get trend color class
   */
  getTrendColorClass(status: 'rising' | 'falling' | 'steady' | 'none'): string {
    switch (status) {
      case 'rising':
        return 'trend-rising';
      case 'falling':
        return 'trend-falling';
      case 'steady':
        return 'trend-steady';
      default:
        return '';
    }
  }
}
