import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { LoggerService } from '../../core/services/logger.service';
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ErrtsWeatherService } from '../../core/services/errts-weather.service';
import { ErrtsWeatherResult } from '../../core/models/errts-weather.model';
import { interval, Subscription } from 'rxjs';
import { SplitterModule } from 'primeng/splitter';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfigService } from '../../core/services/config.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-errtsdata',
  templateUrl: './errtsdata.html',
  styleUrl: './errtsdata.scss',
  imports: [
    PanelModule,
    TableModule,
    CommonModule,
    FormsModule,
    SplitterModule,
    ProgressSpinnerModule,
    DialogModule,
    TooltipModule,
    ButtonModule,
    DatePickerModule,
  ],
})
export class ERRTSData implements OnInit, OnDestroy {
  // ERRTS Weather Data
  dateTime: string = '';
  waterLevelData: any[] = [];
  rainfallData: any[] = [];

  // Dynamic columns
  waterLevelColumns: string[] = [];
  rainfallColumns: string[] = [];

  // Loading and error states
  loading: boolean = false;
  error: string = '';

  // Resource dialog (image or table)
  showImageDialog: boolean = false;
  selectedCommsId: string = '';
  imageUrl: string = '';
  resourceType: 'image' | 'table' = 'image';
  selectedRowData: any = null;
  loadingResourceData: boolean = false;

  // Auto-refresh
  private refreshInterval: Subscription | null = null;
  private readonly REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  // Highlighted CommsIds for discharge sum calculation
  private readonly highlightedCommsIds = ['3349', '3351', '3419'];

  // Store previous discharge values for change detection
  private previousDischargeValues: Map<string, number> = new Map();
  private previousTotalDischarge: number | null = null;

  // Date range filter properties
  filterDateFrom: Date | null = null;
  filterDateTo: Date | null = null;
  filterDateFromString: string = '';
  filterDateToString: string = '';
  private unfilteredRowData: any = null;
  dateRangeError: string = '';

  private logger = inject(LoggerService);

  constructor(
    private errtsWeatherService: ErrtsWeatherService,
    private configService: ConfigService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Initial load
    this.loadErrtsWeatherData();

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
   * Load ERRTS weather data from the service
   */
  loadErrtsWeatherData(bypassCache = false): void {
    this.loading = true;
    this.error = '';

    this.errtsWeatherService.getErrtsData(bypassCache).subscribe({
      next: (data: ErrtsWeatherResult) => {
        this.processErrtsWeatherData(data);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load ERRTS weather data. Please try again.';
        this.loading = false;
        this.logger.error('Error loading ERRTS data:', err);
      },
    });
  }

  /**
   * Manual refresh triggered by user
   */
  refreshData(): void {
    this.loadErrtsWeatherData(true); // Force bypass cache on manual refresh
  }

  /**
   * Process and transform ERRTS weather data
   */
  private processErrtsWeatherData(data: ErrtsWeatherResult): void {
    // Set datetime
    this.dateTime = data.datetime || 'N/A';

    // Process Water Level Status
    if (data.waterLevelStatus && data.waterLevelStatus.length > 0) {
      this.waterLevelColumns = this.extractDynamicColumns(data.waterLevelStatus);
      this.waterLevelData = data.waterLevelStatus.map((item) => {
        const rowData = { ...item.data };

        // Fix typo for CommsId 3346: "Molonoglo" -> "Molonglo"
        const commsId =
          rowData['CommsId'] || rowData['commsid'] || rowData['Comms Id'] || rowData['comms id'];
        if (commsId && String(commsId).trim() === '3346') {
          // Check various possible field names for the location name
          const nameFields = ['Name', 'name', 'Location', 'location', 'Station', 'station'];
          for (const field of nameFields) {
            if (rowData[field] && typeof rowData[field] === 'string') {
              rowData[field] = rowData[field].replace(/Molonoglo/gi, 'Molonglo');
            }
          }
        }

        return rowData;
      });

      // Store current values as previous for next comparison
      this.storePreviousDischargeValues();
    } else {
      this.waterLevelColumns = [];
      this.waterLevelData = [];
    }

    // Process Rainfall Status
    if (data.rainfallStatus && data.rainfallStatus.length > 0) {
      this.rainfallColumns = this.extractDynamicColumns(data.rainfallStatus);
      this.rainfallData = data.rainfallStatus.map((item) => item.data);
    } else {
      this.rainfallColumns = [];
      this.rainfallData = [];
    }
  }

  /**
   * Store current discharge values as previous for next comparison
   */
  private storePreviousDischargeValues(): void {
    const currentDischargeValues = new Map<string, number>();

    for (const row of this.waterLevelData) {
      const commsId = row['CommsId'] || row['commsid'] || row['Comms Id'] || row['comms id'];
      const discharge = row['Discharge'] || row['discharge'];

      if (commsId && discharge && this.highlightedCommsIds.includes(String(commsId))) {
        const dischargeValue = parseFloat(discharge);
        if (!isNaN(dischargeValue)) {
          currentDischargeValues.set(String(commsId), dischargeValue);
        }
      }
    }

    // Store current values as previous for next comparison
    this.previousDischargeValues = currentDischargeValues;

    // Track total discharge
    const currentTotal = this.totalDischargeForHighlighted;
    if (!isNaN(currentTotal)) {
      this.previousTotalDischarge = currentTotal;
    }
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
      this.loadErrtsWeatherData(true); // Bypass cache on auto-refresh
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

    // Special case: Replace "Last Value" with "Water Discharge"
    if (column === 'Last Value' || column === 'LastValue' || column.toLowerCase() === 'last value') {
      return 'Water Level';
    }

    // If already contains spaces, return as is
    if (column.includes(' ')) return column;

    // Convert camelCase or PascalCase to spaced words
    return column
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
      .trim();
  }

  /**
   * Open resource popup - shows image for CommsId clicks, table for Name clicks
   */
  openResourcePopup(commsId: string, source: 'commsid' | 'name'): void {
    if (!commsId) return;

    this.selectedCommsId = commsId;

    // Reset date filters when opening popup
    this.filterDateFrom = null;
    this.filterDateTo = null;
    this.filterDateFromString = '';
    this.filterDateToString = '';
    this.unfilteredRowData = null;
    this.dateRangeError = '';

    const baseUrl = this.configService.getApiUrl('main');

    if (source === 'commsid') {
      // Show image when CommsId is clicked
      this.resourceType = 'image';
      this.imageUrl = `${baseUrl}/WeatherForecast/getProxiedResource?resourceUrl=${commsId}&resourceType=${this.resourceType}`;
      this.selectedRowData = null;
      this.showImageDialog = true;
    } else if (source === 'name') {
      // Show table data when Name is clicked - fetch from API
      this.resourceType = 'table';
      this.selectedRowData = null;
      this.loadingResourceData = true;
      this.showImageDialog = true;

      const apiUrl = `${baseUrl}/WeatherForecast/getProxiedResource?resourceUrl=${commsId}&resourceType=table`;

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
          this.logger.error('Error fetching resource data:', err);
          this.selectedRowData = { error: 'Failed to load data from API' };
          this.loadingResourceData = false;
        }
      });
    }
  }

  /**
   * Handle image load error
   */
  onImageError(event: any): void {
    // Set a placeholder image on error
    event.target.src =
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgTm90IEF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
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

    // If no previous value exists, show as steady (baseline)
    if (previousValue === undefined || isNaN(currentValue)) {
      return 'steady'; // Changed from 'none' to 'steady' to show baseline state
    }

    const threshold = 0.001; // Reduced threshold for more sensitive detection
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
        return 'errts-discharge-rising';
      case 'falling':
        return 'errts-discharge-falling';
      case 'steady':
        return 'errts-discharge-steady';
      default:
        return '';
    }
  }

  /**
   * Get change status for total discharge
   */
  get totalDischargeChangeStatus(): 'rising' | 'falling' | 'steady' | 'none' {
    const currentTotal = this.totalDischargeForHighlighted;
    if (isNaN(currentTotal)) {
      return 'none';
    }

    // If no previous value exists, show as steady (baseline)
    if (this.previousTotalDischarge === null) {
      return 'steady'; // Changed from 'none' to 'steady' to show baseline state
    }

    const threshold = 0.001; // Reduced threshold for more sensitive detection
    const difference = currentTotal - this.previousTotalDischarge;

    if (Math.abs(difference) < threshold) {
      return 'steady';
    } else if (difference > 0) {
      return 'rising';
    } else {
      return 'falling';
    }
  }

  /**
   * Get trend icon based on change status
   */
  getTrendIconForStatus(status: 'rising' | 'falling' | 'steady' | 'none'): string {
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
   * Get trend color class for status
   */
  getTrendColorClassForStatus(status: 'rising' | 'falling' | 'steady' | 'none'): string {
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
   * Format cell value - replace null/empty with user-friendly placeholder
   */
  formatCellValue(value: any): string {
    if (value === null || value === undefined || value === '' || String(value).trim() === '') {
      return '|'; // Em dash symbol for empty values
    }
    return String(value);
  }

  /**
   * Custom filter callback for timestamp column
   * Filters against the formatted timestamp string instead of raw ISO string
   */
  filterTimestamp(value: any, filter: any): boolean {
    if (!filter) {
      return true; // No filter, show all
    }

    if (!value) {
      return false; // No value, don't show
    }

    // Format the timestamp value same way as displayed
    const formattedValue = this.formatTimestamp(value);
    const filterValue = filter.toString().toLowerCase();

    // Check if formatted timestamp contains the filter text
    return formattedValue.toLowerCase().includes(filterValue);
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
