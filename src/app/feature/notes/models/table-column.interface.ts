/**
 * Column Data Type
 * Defines how the column data should be rendered and sorted
 */
export enum ColumnDataType {
  Text = 'text',
  Number = 'number',
  Date = 'date',
  Enum = 'enum',
  Boolean = 'boolean',
  Color = 'color'
}

/**
 * Table Column Configuration Interface
 * Defines structure for dynamic table columns
 */
export interface TableColumn {
  // Column identification
  field: string;
  header: string;

  // Display options
  dataType: ColumnDataType;
  visible: boolean;
  sortable: boolean;
  filterable?: boolean;

  // Column behavior
  width?: string;
  cssClass?: string;

  // Custom rendering
  format?: string; // Date format string for moment.js
  enumLabels?: Record<number, string>; // For enum types

  // Sorting
  sortOrder?: number;
}

/**
 * Table Configuration
 * Overall table settings and behavior
 */
export interface TableConfiguration {
  columns: TableColumn[];
  paginator: boolean;
  rows: number;
  rowsPerPageOptions: number[];
  sortField?: string;
  sortOrder?: number; // 1 for ascending, -1 for descending
  globalFilterFields?: string[];
  responsiveLayout?: 'scroll' | 'stack';
  showGridlines?: boolean;
  stripedRows?: boolean;
}
