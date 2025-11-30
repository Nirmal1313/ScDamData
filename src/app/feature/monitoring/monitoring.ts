import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { LoggerService } from '../../core/services/logger.service';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { DatePickerModule } from 'primeng/datepicker';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-monitoring',
  imports: [PanelModule, DividerModule, TableModule, CommonModule, FormsModule, SplitterModule, DialogModule, ProgressSpinnerModule, ButtonModule, TooltipModule, DatePickerModule],
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

  // Mock test data toggle
  private useMockData: boolean = false; // Set to false to use real data
  private mockCounter: number = 0;

  // Previous values for change detection
  private previousLakeLevel: number | null = null;
  private previousLakeStorage: number | null = null;
  private previousOutflow: number | null = null;
  private previousTotalDischarge: number | null = null;

  // Image popup
  showImageDialog: boolean = false;
  selectedImageUrl: string = '';
  selectedCommsId: string = '';

  // Resource dialog for lake level data
  showLakeLevelDialog: boolean = false;
  selectedRowData: any = null;
  loadingResourceData: boolean = false;

  // Date range filter properties
  filterDateFrom: Date | null = null;
  filterDateTo: Date | null = null;
  filterDateFromString: string = '';
  filterDateToString: string = '';
  private unfilteredRowData: any = null;
  dateRangeError: string = '';

  loading: boolean = false;
  error: string = '';

  // Auto-refresh subscription
  private refreshSubscription?: Subscription;
  private authSubscription?: Subscription;
  private readonly REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

  private logger = inject(LoggerService);

  constructor(
    private waterLevelService: WaterLevelService,
    private authService: AuthService,
    private configService: ConfigService,
    private http: HttpClient
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
        this.loadWaterLevelData(true); // Bypass cache on auto-refresh
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
    this.loadWaterLevelData(true); // Force bypass cache on manual refresh
  }

  private loadWaterLevelData(bypassCache = false) {
    this.loading = true;
    this.error = '';

    this.waterLevelService.getWaterLevelData(bypassCache).subscribe({
      next: (data: ScrivenerCR1000Result) => {
        if (!data) {
          this.error = 'No data received from server';
          this.loading = false;
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
      },
      error: (err) => {
        this.logger.error('Error fetching water level data:', err);
        this.error = err.message || 'Failed to load water level data';
        this.loading = false;
      },
    });
  }

  private processWaterLevelData(waterLevel: string[]) {
    if (waterLevel && waterLevel.length > 0) {
      // Store current values as previous BEFORE updating with new data
      this.storePreviousValues();

      // Use mock data if enabled, otherwise use real data
     // if (this.useMockData) {
        //this.generateMockWaterLevelData();
      //} else {
        // Now update with new water level data
        this.waterLevelData = waterLevel;
     // }
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
    const lakeLevelMatch = this.waterLevelData[0].match(/Lake Level is (\d+\.\d+)m\s+AHD/);
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

      // Use mock data if enabled, otherwise use real data
      //if (this.useMockData) {
        //this.generateMockFlowData();
      //} else {
        // Extract the last column value from each row
        this.outflowData = dischargeCumecsRow ? (dischargeCumecsRow[lastColumnKey] || '0.0') : '0.0';
        this.totalDischargeData = dischargeMLDayRow ? (dischargeMLDayRow[lastColumnKey] || '0.0') : '0.0';
      //}
    }
  }

  /**
   * Generate random mock water level data for testing trend indicators
   */
  private generateMockWaterLevelData() {
    let lakeLevel: number;
    let lakeStorage: number;

    const pattern = this.mockCounter % 4;

    switch (pattern) {
      case 0: // Rising pattern
        lakeLevel = 555.5 + (this.mockCounter * 0.05);
        lakeStorage = 30800 + (this.mockCounter * 100);
        break;
      case 1: // Falling pattern
        lakeLevel = 555.8 - (this.mockCounter * 0.03);
        lakeStorage = 31200 - (this.mockCounter * 80);
        break;
      case 2: // Steady pattern
        lakeLevel = 555.633 + (Math.random() * 0.005); // Very small change
        lakeStorage = 30980 + (Math.random() * 5);
        break;
      case 3: // Random pattern
        lakeLevel = 555.4 + (Math.random() * 0.4);
        lakeStorage = 30500 + (Math.random() * 800);
        break;
      default:
        lakeLevel = 555.633;
        lakeStorage = 30980;
    }

    // Ensure values stay within realistic bounds
    lakeLevel = Math.max(554.0, Math.min(557.0, lakeLevel));
    lakeStorage = Math.max(29000, Math.min(32000, lakeStorage));

    // Format as the expected string format
    this.waterLevelData = [
      `Lake Level : ${lakeLevel.toFixed(3)}m AHD. Lake Storage : ${Math.round(lakeStorage)} ML`
    ];
  }

  /**
   * Generate random mock data for testing trend indicators
   */
  private generateMockFlowData() {
    this.mockCounter++;

    // Generate random outflow data (between 0 and 50 cumecs)
    // Create different patterns to test all trend states
    let outflow: number;
    let totalDischarge: number;

    const pattern = this.mockCounter % 4;

    switch (pattern) {
      case 0: // Rising pattern
        outflow = 10 + (this.mockCounter * 2.5);
        totalDischarge = 500 + (this.mockCounter * 50);
        break;
      case 1: // Falling pattern
        outflow = 40 - (this.mockCounter * 2);
        totalDischarge = 2000 - (this.mockCounter * 80);
        break;
      case 2: // Steady pattern
        outflow = 25 + (Math.random() * 0.005); // Very small change
        totalDischarge = 1200 + (Math.random() * 0.5);
        break;
      case 3: // Random pattern
        outflow = 15 + (Math.random() * 20);
        totalDischarge = 800 + (Math.random() * 800);
        break;
      default:
        outflow = 20;
        totalDischarge = 1000;
    }

    // Ensure values stay within realistic bounds
    outflow = Math.max(0, Math.min(50, outflow));
    totalDischarge = Math.max(0, Math.min(3000, totalDischarge));

    this.outflowData = outflow.toFixed(1);
    this.totalDischargeData = totalDischarge.toFixed(1);

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
   * Get formatted lake level display string
   */
  get formattedLakeLevel(): string {
    if (this.waterLevelData.length > 0) {
      const match = this.waterLevelData[0].match(/Lake Level is (\d+\.\d+)m\s+AHD/);
      if (match) {
        return `Lake Level : ${match[1]}m AHD`;
      }
    }
    return '';
  }

  /**
   * Get formatted lake storage display string
   */
  get formattedLakeStorage(): string {
    if (this.waterLevelData.length > 0) {
      const match = this.waterLevelData[0].match(/Lake Storage is (\d+)\s+ML/);
      if (match) {
        return `Lake Storage : ${match[1]} ML`;
      }
    }
    return '';
  }

  /**
   * Get lake level with current value
   */
  get lakeLevelValue(): number | null {
    if (this.waterLevelData.length > 0) {
      const match = this.waterLevelData[0].match(/Lake Level is (\d+\.\d+)m\s+AHD/);
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

  /**
   * Open lake level data popup - shows table data from GetProxiedResource API
   */
  openLakeLevelData(): void {
    // Reset date filters when opening popup
    this.filterDateFrom = null;
    this.filterDateTo = null;
    this.filterDateFromString = '';
    this.filterDateToString = '';
    this.unfilteredRowData = null;
    this.dateRangeError = '';

    this.selectedRowData = null;
    this.loadingResourceData = true;
    this.showLakeLevelDialog = true;

    const baseUrl = this.configService.getApiUrl('main');
    const resourceUrl = 'QDataH'; // CommsId for Scrivener Dam
    const apiUrl = `${baseUrl}/WeatherForecast/getProxiedResource?resourceUrl=${resourceUrl}&resourceType=logger`;

    this.http.get(apiUrl).subscribe({
      next: (response: any) => {
        // If response is an array, sort by timestamp descending
        if (Array.isArray(response)) {
          this.selectedRowData = [...response].sort((a, b) => {
            // Get timestamp with case-insensitive field name check
            const timestampA = a.timestamp || a.Timestamp || a.TimeStamp || a.TIMESTAMP;
            const timestampB = b.timestamp || b.Timestamp || b.TimeStamp || b.TIMESTAMP;

            const dateA = new Date(timestampA || 0).getTime();
            const dateB = new Date(timestampB || 0).getTime();
            return dateB - dateA; // Descending order (newest first)
          });
        } else {
          this.selectedRowData = response;
        }

        this.loadingResourceData = false;
      },
      error: (err) => {
        this.logger.error('Error fetching lake level data:', err);
        this.selectedRowData = { error: 'Failed to load data from API' };
        this.loadingResourceData = false;
      }
    });
  }

  /**
   * Get keys from selected row data for table display
   */
  getRowDataKeys(): string[] {
    if (!this.selectedRowData) return [];

    // If it's an array, get keys from first item
    if (Array.isArray(this.selectedRowData) && this.selectedRowData.length > 0) {
      return Object.keys(this.selectedRowData[0]);
    }

    return Object.keys(this.selectedRowData);
  }

  /**
   * Check if selected data is an array (multiple records)
   */
  isArrayData(): boolean {
    return Array.isArray(this.selectedRowData);
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: string): string {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-AU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch {
      return timestamp;
    }
  }

  /**
   * Format column headers - convert to proper case with spaces
   */
  formatColumnHeader(column: string): string {
    if (!column) return '';

    // If already contains spaces, return as is
    if (column.includes(' ')) return column;

    // Convert camelCase or PascalCase to spaced words
    return column
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
      .trim();
  }

  /**
   * Handle mobile date input changes
   */
  onMobileDateChange(type: 'from' | 'to', value: string): void {
    if (type === 'from') {
      this.filterDateFrom = value ? new Date(value) : null;
    } else {
      this.filterDateTo = value ? new Date(value) : null;
    }
    this.applyDateRangeFilter();
  }

  /**
   * Apply date range filter to the table data
   */
  applyDateRangeFilter(): void {
    // Clear previous error
    this.dateRangeError = '';

    // Validate date range: From date must be less than To date
    if (this.filterDateFrom && this.filterDateTo) {
      if (this.filterDateFrom > this.filterDateTo) {
        this.dateRangeError = 'From date must be less than or equal to To date';
        // Restore unfiltered data on error
        if (this.unfilteredRowData) {
          this.selectedRowData = Array.isArray(this.unfilteredRowData)
            ? [...this.unfilteredRowData]
            : { ...this.unfilteredRowData };
        }
        return;
      }
    }

    // Store unfiltered data on first filter
    if (!this.unfilteredRowData && this.selectedRowData) {
      this.unfilteredRowData = Array.isArray(this.selectedRowData)
        ? [...this.selectedRowData]
        : { ...this.selectedRowData };
    }

    // If no filters, restore original data
    if (!this.filterDateFrom && !this.filterDateTo) {
      if (this.unfilteredRowData) {
        this.selectedRowData = Array.isArray(this.unfilteredRowData)
          ? [...this.unfilteredRowData]
          : { ...this.unfilteredRowData };
      }
      return;
    }

    // Filter the data based on date range
    if (Array.isArray(this.unfilteredRowData)) {
      this.selectedRowData = this.unfilteredRowData.filter((row: any) => {
        const timestamp = row.timestamp || row.Timestamp;
        if (!timestamp) return true;

        const rowDate = new Date(timestamp);

        // Check from date (start of day)
        if (this.filterDateFrom) {
          const fromDate = new Date(this.filterDateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (rowDate < fromDate) {
            return false;
          }
        }

        // Check to date (end of day - 23:59:59.999)
        if (this.filterDateTo) {
          const toDate = new Date(this.filterDateTo);
          toDate.setHours(23, 59, 59, 999);
          if (rowDate > toDate) {
            return false;
          }
        }

        return true;
      });
    }
  }
}
