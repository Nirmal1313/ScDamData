/**
 * Application-wide constants for Project Notes
 * Central location for all magic numbers and strings
 * Note: API endpoints are managed by ConfigService
 */

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'dddd DD/MM/YYYY', // Monday 27/10/2025
  DISPLAY_WITH_TIME: 'dddd DD/MM/YYYY HH:mm',
  ISO: 'YYYY-MM-DD',
  API: 'YYYY-MM-DD',
  FULL: 'dddd, MMMM DD, YYYY', // Monday, October 27, 2025
  SHORT: 'DD/MM/YYYY'
} as const;

// Table Configuration
export const TABLE_CONFIG = {
  DEFAULT_ROWS: 10,
  ROWS_PER_PAGE_OPTIONS: [5, 10, 20, 50],
  LOADING_DELAY: 300, // milliseconds
  DEBOUNCE_TIME: 500 // milliseconds for search
} as const;

// Form Validation
export const VALIDATION_RULES = {
  TITLE_MIN_LENGTH: 3,
  TITLE_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 2000,
  NAME_MAX_LENGTH: 100,
  CLIENT_MAX_LENGTH: 100,
  AUTHOR_MAX_LENGTH: 100
} as const;

// UI Messages
export const UI_MESSAGES = {
  SUCCESS: {
    CREATE: 'Project note created successfully',
    UPDATE: 'Project note updated successfully',
    DELETE: 'Project note deleted successfully'
  },
  ERROR: {
    LOAD_FAILED: 'Failed to load project notes',
    CREATE_FAILED: 'Failed to create project note',
    UPDATE_FAILED: 'Failed to update project note',
    DELETE_FAILED: 'Failed to delete project note',
    GENERIC: 'An unexpected error occurred'
  },
  CONFIRM: {
    DELETE: 'Are you sure you want to delete this project note?'
  }
} as const;

// Color Palette for Notes
export const NOTE_COLORS = [
  '#3498db', // Blue
  '#2ecc71', // Green
  '#f39c12', // Orange
  '#e74c3c', // Red
  '#9b59b6', // Purple
  '#1abc9c', // Turquoise
  '#34495e', // Dark Blue
  '#e67e22'  // Carrot
] as const;

// Priority Colors (for visual indicators)
export const PRIORITY_COLORS = {
  1: '#95a5a6', // Low - Gray
  2: '#3498db', // Medium - Blue
  3: '#f39c12', // High - Orange
  4: '#e74c3c'  // Critical - Red
} as const;

// Status Colors
export const STATUS_COLORS = {
  1: '#95a5a6', // Planning - Gray
  2: '#2ecc71', // Active - Green
  3: '#f39c12', // OnHold - Orange
  4: '#3498db', // Completed - Blue
  5: '#e74c3c'  // Cancelled - Red
} as const;
