import { Pipe, PipeTransform } from '@angular/core';
import moment from 'moment';
import { DATE_FORMATS } from '../constants/project-note.constants';

/**
 * Date Format Pipe
 *
 * Uses Moment.js for ALL date formatting operations
 * Ensures consistent date handling across the application
 *
 * Usage:
 * {{ date | dateFormat }}
 * {{ date | dateFormat:'MMM DD, YYYY' }}
 * {{ date | dateFormat:'full' }}
 */
@Pipe({
  name: 'dateFormat',
  standalone: true
})
export class DateFormatPipe implements PipeTransform {

  /**
   * Transform date to formatted string using Moment.js
   *
   * @param value Date value (string, Date, or moment object)
   * @param format Format string or preset name
   * @returns Formatted date string or empty string if invalid
   */
  transform(value: string | Date | moment.Moment | null | undefined, format?: string): string {
    // Handle null/undefined values
    if (!value) {
      return '';
    }

    try {
      // Create moment object from value and use local timezone
      const momentDate = moment(value).local();

      // Check if date is valid
      if (!momentDate.isValid()) {
        console.warn(`Invalid date provided to dateFormat pipe: ${value}`);
        return '';
      }

      // Use provided format or default
      const formatString = this.getFormatString(format);

      return momentDate.format(formatString);
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  }

  /**
   * Get format string from preset or custom format
   *
   * @param format Format preset name or custom format string
   * @returns Moment.js format string
   */
  private getFormatString(format?: string): string {
    if (!format) {
      return DATE_FORMATS.DISPLAY;
    }

    // Check if format is a preset
    switch (format.toLowerCase()) {
      case 'display':
        return DATE_FORMATS.DISPLAY;
      case 'displaywithtime':
      case 'display-with-time':
        return DATE_FORMATS.DISPLAY_WITH_TIME;
      case 'iso':
        return DATE_FORMATS.ISO;
      case 'full':
        return DATE_FORMATS.FULL;
      case 'short':
        return DATE_FORMATS.SHORT;
      default:
        // Assume it's a custom format string
        return format;
    }
  }
}
