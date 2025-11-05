import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { ErtsWeatherService } from '../../core/services/erts-weather.service';
import { ErtsWeatherResult } from '../../core/models/erts-weather.model';
import { interval, Subscription } from 'rxjs';
import { SplitterModule } from 'primeng/splitter';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ConfigService } from '../../core/services/config.service';

@Component({
  selector: 'app-errtsdata',
  imports: [
    PanelModule,
    TableModule,
    CommonModule,
    SplitterModule,
    ProgressSpinnerModule,
    DialogModule,
    TooltipModule
  ],
  templateUrl: './errtsdata.html',
  styleUrl: './errtsdata.scss'
})
export class ERRTSData implements OnInit, OnDestroy {
  // ERTS Weather Data
  dateTime: string = '';
  waterLevelData: any[] = [];
  rainfallData: any[] = [];

  // Dynamic columns
  waterLevelColumns: string[] = [];
  rainfallColumns: string[] = [];

  // Loading and error states
  loading: boolean = false;
  error: string = '';

  // Image dialog
  showImageDialog: boolean = false;
  selectedCommsId: string = '';
  imageUrl: string = '';

  // Auto-refresh
  private refreshInterval: Subscription | null = null;
  private readonly REFRESH_INTERVAL_MS = 7 * 60 * 1000; // 5 minutes

  // Highlighted CommsIds for discharge sum calculation
  private readonly highlightedCommsIds = ['3349', '3351', '3419'];

  // Store previous discharge values for change detection
  private previousDischargeValues: Map<string, number> = new Map();

  constructor(
    private ertsWeatherService: ErtsWeatherService,
    private configService: ConfigService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Initial load
    this.loadErtsWeatherData();

    // Setup auto-refresh every 5 minutes
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.refreshInterval) {
      this.refreshInterval.unsubscribe();
    }
  }

  /**
   * Load ERTS weather data from the service
   */
  loadErtsWeatherData(): void {
    this.loading = true;
    this.error = '';

    this.ertsWeatherService.getErrtsData().subscribe({
      next: (data: ErtsWeatherResult) => {
        this.processErtsWeatherData(data);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to load ERTS weather data. Please try again.';
        this.loading = false;
        console.error('Error loading ERTS data:', err);
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Process and transform ERTS weather data
   */
  private processErtsWeatherData(data: ErtsWeatherResult): void {
    // Set datetime
    this.dateTime = data.datetime || 'N/A';

    // Process Water Level Status
    if (data.waterLevelStatus && data.waterLevelStatus.length > 0) {
      this.waterLevelColumns = this.extractDynamicColumns(data.waterLevelStatus);
      this.waterLevelData = data.waterLevelStatus.map(item => item.data);

      // Update discharge change tracking
      this.updateDischargeTracking();
    } else {
      this.waterLevelColumns = [];
      this.waterLevelData = [];
    }

    // Process Rainfall Status
    if (data.rainfallStatus && data.rainfallStatus.length > 0) {
      this.rainfallColumns = this.extractDynamicColumns(data.rainfallStatus);
      this.rainfallData = data.rainfallStatus.map(item => item.data);
    } else {
      this.rainfallColumns = [];
      this.rainfallData = [];
    }
  }

  /**
   * Update discharge tracking for change detection
   */
  private updateDischargeTracking(): void {
    const newDischargeValues = new Map<string, number>();

    for (const row of this.waterLevelData) {
      const commsId = row['CommsId'] || row['commsid'] || row['Comms Id'] || row['comms id'];
      const discharge = row['Discharge'] || row['discharge'];

      if (commsId && discharge && this.highlightedCommsIds.includes(String(commsId))) {
        const dischargeValue = parseFloat(discharge);
        if (!isNaN(dischargeValue)) {
          newDischargeValues.set(String(commsId), dischargeValue);
        }
      }
    }

    // Store for next comparison
    this.previousDischargeValues = newDischargeValues;
  }

  /**
   * Extract dynamic column names from the data
   */
  private extractDynamicColumns(dataArray: any[]): string[] {
    if (!dataArray || dataArray.length === 0) return [];

    const firstItem = dataArray[0].data;
    if (!firstItem) return [];

    return Object.keys(firstItem);
  }

  /**
   * Setup auto-refresh interval
   */
  private setupAutoRefresh(): void {
    // Refresh data every 5 minutes
    this.refreshInterval = interval(this.REFRESH_INTERVAL_MS).subscribe(() => {
      this.loadErtsWeatherData();
    });
  }

  /**
   * Get CSS class based on cell value for highlighting
   */
  getStatusClass(value: any): string {
    if (!value) return '';

    const valueStr = String(value).toLowerCase();

    // Status highlighting for State column (Steady, Falling, Rising)
    if (valueStr === 'rising') {
      return 'status-critical';
    }
    if (valueStr === 'falling') {
      return 'status-warning';
    }
    if (valueStr === 'steady') {
      return 'status-normal';
    }

    // Other status values
    if (valueStr.includes('critical') || valueStr.includes('high alert')) {
      return 'status-critical';
    }
    if (valueStr.includes('warning') || valueStr.includes('alert')) {
      return 'status-warning';
    }
    if (valueStr.includes('normal') || valueStr.includes('ok')) {
      return 'status-normal';
    }
    if (valueStr.includes('offline') || valueStr.includes('error')) {
      return 'status-offline';
    }

    return '';
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
   * Open image popup for a CommsId
   */
  openImagePopup(commsId: string): void {
    if (!commsId) return;

    this.selectedCommsId = commsId;
    // Construct the image URL - this is an open API endpoint, just pass the commsId value
    const baseUrl = this.configService.getApiUrl('errts').replace('/WeatherForecast/ERRTSData', '');
    this.imageUrl = `${baseUrl}/WeatherForecast/getProxiedImage?imageUrl=${commsId}`;
    this.showImageDialog = true;
  }

  /**
   * Handle image load error
   */
  onImageError(event: any): void {
    // Set a placeholder image on error
    event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgTm90IEF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
  }

  /**
   * Calculate the sum of discharge values for highlighted CommsIds
   */
  get totalDischargeForHighlighted(): number {
    let sum = 0;

    // Iterate through water level data to find highlighted CommsIds
    for (const row of this.waterLevelData) {
      const commsId = row['CommsId'] || row['commsid'] || row['Comms Id'] || row['comms id'];
      const discharge = row['Discharge'] || row['discharge'];

      if (commsId && discharge && this.highlightedCommsIds.includes(String(commsId))) {
        const dischargeValue = parseFloat(discharge);
        if (!isNaN(dischargeValue)) {
          sum += dischargeValue;
        }
      }
    }

    return Math.round(sum * 1000) / 1000; // Round to 3 decimal places
  }

  /**
   * Check if a row should be highlighted based on CommsId
   */
  isRowHighlighted(row: any): boolean {
    if (!row) return false;

    const commsId = row['CommsId'] || row['commsid'] || row['Comms Id'] || row['comms id'];
    return commsId && this.highlightedCommsIds.includes(String(commsId));
  }

  /**
   * Get discharge change status (rising, falling, steady)
   */
  getDischargeChange(row: any): 'rising' | 'falling' | 'steady' | 'none' {
    if (!row) return 'none';

    const commsId = row['CommsId'] || row['commsid'] || row['Comms Id'] || row['comms id'];
    const discharge = row['Discharge'] || row['discharge'];

    if (!commsId || !discharge || !this.highlightedCommsIds.includes(String(commsId))) {
      return 'none';
    }

    const currentValue = parseFloat(discharge);
    const previousValue = this.previousDischargeValues.get(String(commsId));

    if (previousValue === undefined || isNaN(currentValue)) {
      return 'none';
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
   * Get trend icon for discharge change
   */
  getTrendIcon(row: any): string {
    const change = this.getDischargeChange(row);
    switch (change) {
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
   * Get trend color class for discharge change
   */
  getTrendColorClass(row: any): string {
    const change = this.getDischargeChange(row);
    switch (change) {
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
