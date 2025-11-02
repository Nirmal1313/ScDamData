import { Injectable } from '@angular/core';
import { TableColumn, TableConfiguration, ColumnDataType } from '../models/table-column.interface';
import {
  ProjectStatusLabels,
  TaskPriorityLabels,
  NoteStatusLabels,
  NoteTypeLabels,
} from '../models/enums';
import { TABLE_CONFIG } from '../constants/project-note.constants';

/**
 * Column Configuration Service
 *
 * Updated: Columns arranged in logical order for better UX
 *
 * Single Responsibility: Manages table column definitions and configuration
 * Open/Closed: Easy to extend with new columns without modifying existing code
 *
 * This service provides centralized column configuration for the project notes table.
 * Columns can be easily added, removed, or modified without touching table component code.
 */
@Injectable({
  providedIn: 'root',
})
export class ColumnConfigService {
  constructor() {}

  /**
   * Get all available column definitions
   * Defines every possible column that can be displayed
   *
   * @returns Array of all column configurations
   */
  getAllColumns(): TableColumn[] {
    return [
      // Hidden ID field
      {
        field: 'id',
        header: 'ID',
        dataType: ColumnDataType.Number,
        visible: false,
        sortable: true,
        filterable: true,
        width: 'auto',
      },

      // === 1. CORE INFORMATION (MOST IMPORTANT) ===
      {
        field: 'title',
        header: 'Title',
        dataType: ColumnDataType.Text,
        visible: true,
        sortable: true,
        filterable: true,
        width: 'auto',
        cssClass: 'font-semibold',
      },
      {
        field: 'client',
        header: 'Client',
        dataType: ColumnDataType.Text,
        visible: true,
        sortable: true,
        filterable: true,
        width: 'auto',
      },
      {
        field: 'author',
        header: 'Author',
        dataType: ColumnDataType.Text,
        visible: true,
        sortable: true,
        filterable: true,
        width: 'auto',
      },
      // === 3. STATUS & PRIORITY (WORKFLOW MANAGEMENT) ===
      {
        field: 'status',
        header: 'Status',
        dataType: ColumnDataType.Enum,
        visible: true,
        sortable: true,
        filterable: true,
        width: 'auto',
        enumLabels: ProjectStatusLabels,
      },
      {
        field: 'priority',
        header: 'Priority',
        dataType: ColumnDataType.Enum,
        visible: true,
        sortable: true,
        filterable: true,
        width: 'auto',
        enumLabels: TaskPriorityLabels,
      },
      {
        field: 'noteStatus',
        header: 'Note Status',
        dataType: ColumnDataType.Enum,
        visible: true,
        sortable: true,
        filterable: true,
        width: 'auto',
        enumLabels: NoteStatusLabels,
      },
      {
        field: 'noteType',
        header: 'Note Type',
        dataType: ColumnDataType.Enum,
        visible: true,
        sortable: true,
        filterable: true,
        width: 'auto',
        enumLabels: NoteTypeLabels,
      },

      // === 4. DETAILS & DESCRIPTIONS (ADDITIONAL INFORMATION) ===
      {
        field: 'name',
        header: 'Name',
        dataType: ColumnDataType.Text,
        visible: true,
        sortable: true,
        filterable: true,
        width: 'auto',
      },
      {
        field: 'description',
        header: 'Description',
        dataType: ColumnDataType.Text,
        visible: true,
        sortable: true,
        filterable: true,
        width: 'auto',
      },
      {
        field: 'taskDetail',
        header: 'Task Detail',
        dataType: ColumnDataType.Text,
        visible: true,
        sortable: true,
        filterable: true,
        width: 'auto',
      },
      {
        field: 'compilation',
        header: 'Compilation',
        dataType: ColumnDataType.Text,
        visible: true,
        sortable: true,
        filterable: true,
        width: 'auto',
      },
      {
        field: 'notes',
        header: 'Notes',
        dataType: ColumnDataType.Text,
        visible: true,
        sortable: true,
        filterable: true,
        width: 'auto',
      },
      // === 2. DATES (CHRONOLOGICAL FLOW) ===
      {
        field: 'startDate',
        header: 'Start Date',
        dataType: ColumnDataType.Date,
        visible: true,
        sortable: true,
        filterable: true,
        width: 'auto',
        format: 'MMM DD, YYYY',
      },
      {
        field: 'endDate',
        header: 'End Date',
        dataType: ColumnDataType.Date,
        visible: true,
        sortable: true,
        filterable: true,
        width: 'auto',
        format: 'MMM DD, YYYY',
      },
      {
        field: 'dueDate',
        header: 'Due Date',
        dataType: ColumnDataType.Date,
        visible: true,
        sortable: true,
        filterable: true,
        width: 'auto',
        format: 'MMM DD, YYYY',
      },
      {
        field: 'reportingDate',
        header: 'Reporting Date',
        dataType: ColumnDataType.Date,
        visible: true,
        sortable: true,
        filterable: true,
        width: 'auto',
        format: 'MMM DD, YYYY',
      },

      // === AUDIT FIELDS (HIDDEN BY DEFAULT) ===
      {
        field: 'createdDate',
        header: 'Created Date',
        dataType: ColumnDataType.Date,
        visible: false,
        sortable: true,
        filterable: true,
        width: 'auto',
        format: 'MMM DD, YYYY HH:mm',
      },
      {
        field: 'lastModifiedDate',
        header: 'Last Modified',
        dataType: ColumnDataType.Date,
        visible: false,
        sortable: true,
        filterable: true,
        width: 'auto',
        format: 'MMM DD, YYYY HH:mm',
      },
      {
        field: 'createdBy',
        header: 'Created By',
        dataType: ColumnDataType.Text,
        visible: false,
        sortable: true,
        filterable: true,
        width: 'auto',
      },
      {
        field: 'updatedBy',
        header: 'Updated By',
        dataType: ColumnDataType.Text,
        visible: false,
        sortable: true,
        filterable: true,
        width: 'auto',
      },
      {
        field: 'isActive',
        header: 'Active',
        dataType: ColumnDataType.Boolean,
        visible: false,
        sortable: true,
        filterable: true,
        width: 'auto',
      },
      {
        field: 'isPublic',
        header: 'Public',
        dataType: ColumnDataType.Boolean,
        visible: false,
        sortable: true,
        filterable: true,
        width: 'auto',
      },
      {
        field: 'color',
        header: 'Color',
        dataType: ColumnDataType.Color,
        visible: false,
        sortable: true,
        filterable: true,
        width: 'auto',
      },
    ];
  }

  /**
   * Get only visible columns for display
   *
   * @returns Array of columns marked as visible
   */
  getVisibleColumns(): TableColumn[] {
    return this.getAllColumns().filter((col) => col.visible);
  }

  /**
   * Get filterable field names for global search
   * Includes text and enum fields that are filterable
   *
   * @returns Array of field names suitable for global filtering
   */
  getGlobalFilterFields(): string[] {
    const allColumns = this.getAllColumns();

    const filterableFields = allColumns
      .filter(
        (col) =>
          col.filterable &&
          (col.dataType === ColumnDataType.Text || col.dataType === ColumnDataType.Enum)
      )
      .map((col) => col.field);
    return filterableFields;
  }

  /**
   * Get default table configuration
   *
   * @returns Complete table configuration object
   */
  getDefaultTableConfiguration(): TableConfiguration {
    const visibleColumns = this.getVisibleColumns();

    const config: TableConfiguration = {
      columns: visibleColumns,
      paginator: true,
      rows: TABLE_CONFIG.DEFAULT_ROWS,
      rowsPerPageOptions: [...TABLE_CONFIG.ROWS_PER_PAGE_OPTIONS],
      sortField: 'dueDate',
      sortOrder: 1, // Ascending
      globalFilterFields: this.getGlobalFilterFields(),
      responsiveLayout: 'scroll',
      showGridlines: true,
      stripedRows: true,
    };

    return config;
  }

  /**
   * Get columns by field names
   * Useful for creating custom column sets
   *
   * @param fieldNames Array of field names to retrieve
   * @returns Array of matching columns
   */
  getColumnsByFields(fieldNames: string[]): TableColumn[] {
    const allColumns = this.getAllColumns();
    return fieldNames
      .map((field) => allColumns.find((col) => col.field === field))
      .filter((col): col is TableColumn => col !== undefined);
  }

  /**
   * Toggle column visibility
   *
   * @param fieldName Field name of the column to toggle
   * @param columns Current columns array
   * @returns Updated columns array
   */
  toggleColumnVisibility(fieldName: string, columns: TableColumn[]): TableColumn[] {
    return columns.map((col) =>
      col.field === fieldName ? { ...col, visible: !col.visible } : col
    );
  }

  /**
   * Reset columns to default visible set
   *
   * @returns Default visible columns
   */
  resetToDefaultColumns(): TableColumn[] {
    return this.getVisibleColumns();
  }
}
