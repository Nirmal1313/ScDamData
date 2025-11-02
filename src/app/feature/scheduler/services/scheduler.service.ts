import { Injectable } from '@angular/core';
import { CalendarEvent } from 'angular-calendar';
import moment from 'moment';
import { EventFormData, ValidationResult, CustomDaySelection, WeekdaySelection } from '../models';

@Injectable({
  providedIn: 'root'
})
export class SchedulerService {

  // ===================================
  // VALIDATION METHODS
  // ===================================

  validateDateRange(startDate: string | Date, endDate: string | Date): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Convert to moment for consistent comparison
    const start = moment(startDate);
    const end = moment(endDate);
    const now = moment();

    // Validate moment objects are valid
    if (!start.isValid()) {
      errors.push('Start date is invalid. Please select a valid date.');
    }
    if (!end.isValid()) {
      errors.push('End date is invalid. Please select a valid date.');
    }

    if (errors.length > 0) {
      return { isValid: false, errors, warnings };
    }

    // Rule 1: Start date cannot be greater than end date
    if (start.isSameOrAfter(end)) {
      errors.push('Start date must be before end date.');
    }

    // Rule 2: Start date cannot be in the past (with grace period for today)
    if (start.isBefore(now.startOf('day'))) {
      errors.push('Start date cannot be in the past.');
    }

    // Rule 3: Check for reasonable date ranges
    const daysDiff = end.diff(start, 'days');
    if (daysDiff > 365) {
      warnings.push('Event duration is more than 1 year. Please verify this is correct.');
    }

    // Rule 4: Check for same day events with identical times
    if (start.isSame(end, 'day')) {
      if (start.format('HH:mm') === end.format('HH:mm')) {
        warnings.push('Start and end times are identical. Event duration will be zero.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateDateTimeRange(currentEvent: EventFormData, isAllDayEvent: boolean): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get basic validation from existing method
    const basicValidation = this.validateDateRange(currentEvent.start, currentEvent.end);
    errors.push(...basicValidation.errors);
    warnings.push(...basicValidation.warnings);

    // Additional time-specific validations for non-all-day events
    if (!isAllDayEvent && currentEvent.start && currentEvent.end) {
      const start = moment(currentEvent.start);
      const end = moment(currentEvent.end);

      // Check for very short events (less than 15 minutes)
      const duration = moment.duration(end.diff(start));
      if (duration.asMinutes() < 15 && duration.asMinutes() > 0) {
        warnings.push('Event duration is less than 15 minutes. Consider if this is intentional.');
      }

      // Check for very long single-day events
      if (start.isSame(end, 'day') && duration.asHours() > 12) {
        warnings.push('Event duration exceeds 12 hours in a single day. Consider making it an all-day event.');
      }

      // Check for late-night events
      if (start.hour() < 6) {
        warnings.push('Event starts very early (before 6 AM). Please confirm this is correct.');
      }
      if (end.hour() > 22) {
        warnings.push('Event ends very late (after 10 PM). Please confirm this is correct.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ===================================
  // PRIVATE HELPER METHODS
  // ===================================

  initializeEvents(): CalendarEvent[] {
    const actions = this.getDefaultActions();

    return [
      {
        id: 1,
        start: moment().toDate(),
        title: 'Sample Event',
        color: { primary: '#ad2121', secondary: '#FAE3E3' },
        draggable: true,
        actions: actions,
      },
      {
        id: 2,
        start: moment().add(1, 'day').toDate(),
        end: moment().add(1, 'day').add(2, 'hours').toDate(),
        title: 'Meeting with Team',
        color: { primary: '#1e90ff', secondary: '#D1E7DD' },
        draggable: true,
        actions: actions,
      },
      {
        id: 3,
        start: moment().add(3, 'days').toDate(),
        title: 'Project Deadline',
        color: { primary: '#e3bc08', secondary: '#FDF5E6' },
        allDay: true,
        draggable: true,
        actions: actions,
      },
    ];
  }

  private getDefaultActions(): any[] {
    // This will be set by the component when it initializes the service
    return [];
  }

  createEmptyEvent(): EventFormData {
    return {
      id: undefined,
      title: '',
      start: '',
      end: '',
      startDate: null,
      startTime: null,
      endDate: null,
      endTime: null,
      color: { primary: '#ad2121', secondary: '#FAE3E3' },
      meta: { description: '' },
      customDays: [],
    };
  }

  createCalendarEventFromFormData(eventData: EventFormData, actions: any[]): CalendarEvent {
    const calendarEvent: CalendarEvent = {
      id: eventData.id || this.generateEventId(),
      title: eventData.title,
      start: moment(eventData.start).toDate(),
      color: {
        primary: eventData.color.primary,
        secondary: eventData.color.secondary,
      },
      draggable: true,
      actions: actions,
      meta: eventData.meta,
    };

    // Add end date if not all-day or if explicitly provided
    if (eventData.end && eventData.end !== eventData.start) {
      calendarEvent.end = moment(eventData.end).toDate();
    }

    return calendarEvent;
  }

  generateEventId(): number {
    return Math.floor(Math.random() * 1000000) + Date.now();
  }

  // Helper to lighten a color for secondary color
  lightenColor(color: string, factor: number): string {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Lighten the color
    const newR = Math.round(r + (255 - r) * factor);
    const newG = Math.round(g + (255 - g) * factor);
    const newB = Math.round(b + (255 - b) * factor);

    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB
      .toString(16)
      .padStart(2, '0')}`;
  }

  // Moment.js formatting helper for consistent datetime display
  formatMomentDateTime(date: string | Date | moment.Moment): string {
    return moment(date).format('DD/MM/YYYY HH:mm');
  }

  // ===================================
  // CUSTOM DAY SELECTION LOGIC
  // ===================================

  generateCustomDaysForPattern(customDaySelection: CustomDaySelection): Date[] {
    const start = moment(customDaySelection.startRange);
    const end = moment(customDaySelection.endRange);
    const selectedDays: Date[] = [];

    if (start.isAfter(end)) {
      return selectedDays;
    }

    switch (customDaySelection.pattern) {
      case 'weekdays':
        let weekdayIterator = start.clone();
        while (weekdayIterator.isSameOrBefore(end)) {
          if (weekdayIterator.day() >= 1 && weekdayIterator.day() <= 5) {
            selectedDays.push(weekdayIterator.toDate());
          }
          weekdayIterator.add(1, 'day');
        }
        break;

      case 'weekends':
        let weekendIterator = start.clone();
        while (weekendIterator.isSameOrBefore(end)) {
          if (weekendIterator.day() === 0 || weekendIterator.day() === 6) {
            selectedDays.push(weekendIterator.toDate());
          }
          weekendIterator.add(1, 'day');
        }
        break;

      case 'interval':
        const intervalDays = customDaySelection.intervalDays || 1;
        let intervalIterator = start.clone();
        while (intervalIterator.isSameOrBefore(end)) {
          selectedDays.push(intervalIterator.toDate());
          intervalIterator.add(intervalDays, 'days');
        }
        break;

      case 'specific':
      default:
        // For specific days, user will manually select
        break;
    }

    return selectedDays;
  }

  getSelectedWeekdayNumbers(weekdaySelection: WeekdaySelection): number[] {
    const weekdayNumbers: number[] = [];
    if (weekdaySelection.sunday) weekdayNumbers.push(0); // Sunday
    if (weekdaySelection.monday) weekdayNumbers.push(1); // Monday
    if (weekdaySelection.tuesday) weekdayNumbers.push(2); // Tuesday
    if (weekdaySelection.wednesday) weekdayNumbers.push(3); // Wednesday
    if (weekdaySelection.thursday) weekdayNumbers.push(4); // Thursday
    if (weekdaySelection.friday) weekdayNumbers.push(5); // Friday
    if (weekdaySelection.saturday) weekdayNumbers.push(6); // Saturday
    return weekdayNumbers;
  }

  // ===================================
  // DATE/TIME MANIPULATION HELPERS
  // ===================================

  combineDateTime(date: Date, time: string): string {
    return moment(date).format('YYYY-MM-DD') + 'T' + time + ':00';
  }

  autoCorrectDates(currentEvent: EventFormData): void {
    const start = moment(currentEvent.start);
    const end = moment(currentEvent.end);

    if (start.isSameOrAfter(end)) {
      // Auto-correct end date to be 1 hour after start
      const correctedEnd = start.clone().add(1, 'hour');
      currentEvent.end = correctedEnd.format('YYYY-MM-DDTHH:mm:ss');

      // Also update the stepwise fields
      currentEvent.endDate = correctedEnd.toDate();
      currentEvent.endTime = correctedEnd.format('HH:mm');
    }
  }

  setupDateValidation(): { minSelectableDate: Date; maxSelectableDate: Date } {
    const minSelectableDate = moment().startOf('day').toDate();
    const maxSelectableDate = moment().add(2, 'years').startOf('day').toDate();

    return { minSelectableDate, maxSelectableDate };
  }

  // ===================================
  // FORM VALIDATION HELPERS
  // ===================================

  getFormValidationErrors(currentEvent: EventFormData, isAllDayEvent: boolean, dateValidationErrors: string[]): string[] {
    const errors: string[] = [];

    if (!currentEvent.title?.trim()) {
      errors.push('Event title is required.');
    }

    // Check stepwise completion
    if (!currentEvent.startDate) {
      errors.push('Start date is required.');
    }

    if (!currentEvent.endDate) {
      errors.push('End date is required.');
    }

    if (!isAllDayEvent) {
      if (!currentEvent.startTime?.trim()) {
        errors.push('Start time is required for timed events.');
      }
      if (!currentEvent.endTime?.trim()) {
        errors.push('End time is required for timed events.');
      }
    }

    // Validate combined datetime if complete
    if (this.hasCompleteDateTime(currentEvent, isAllDayEvent)) {
      const startMoment = moment(currentEvent.start);
      const endMoment = moment(currentEvent.end);

      if (!startMoment.isValid()) {
        errors.push('Start date/time combination is invalid.');
      }
      if (!endMoment.isValid()) {
        errors.push('End date/time combination is invalid.');
      }
      if (startMoment.isValid() && endMoment.isValid() && startMoment.isSameOrAfter(endMoment)) {
        errors.push('Start date/time must be before end date/time.');
      }
    }

    // Include any existing validation errors
    errors.push(...dateValidationErrors);

    return errors;
  }

  hasCompleteDateTime(currentEvent: EventFormData, isAllDayEvent: boolean): boolean {
    if (isAllDayEvent) {
      return !!currentEvent.startDate && !!currentEvent.endDate;
    }
    return (
      !!currentEvent.startDate &&
      !!currentEvent.startTime &&
      !!currentEvent.endDate &&
      !!currentEvent.endTime
    );
  }

  isFormValid(currentEvent: EventFormData, isAllDayEvent: boolean, dateValidationErrors: string[]): boolean {
    // Check required fields
    if (!currentEvent.title?.trim()) return false;

    // Check if we have complete date/time selection
    if (!this.hasCompleteDateTime(currentEvent, isAllDayEvent)) return false;

    // Ensure no validation errors exist
    if (dateValidationErrors.length > 0) return false;

    // Parse combined dates using Moment.js
    const startMoment = moment(currentEvent.start);
    const endMoment = moment(currentEvent.end);

    // Validate parsed dates
    if (!startMoment.isValid() || !endMoment.isValid()) {
      return false;
    }

    // Check that start date is before end date
    return startMoment.isBefore(endMoment);
  }

  getCurrentSelectionStep(currentEvent: EventFormData, isAllDayEvent: boolean): number {
    if (!currentEvent.startDate || !currentEvent.endDate) {
      return 1; // Need dates
    }
    if (!isAllDayEvent && (!currentEvent.startTime || !currentEvent.endTime)) {
      return 2; // Need times
    }
    return 3; // Complete
  }

  getSelectionStepMessage(currentEvent: EventFormData, isAllDayEvent: boolean): string {
    const step = this.getCurrentSelectionStep(currentEvent, isAllDayEvent);
    switch (step) {
      case 1:
        return 'Select start and end dates for your event.';
      case 2:
        return 'Select start and end times for your event.';
      case 3:
        return 'Your event is ready to save!';
      default:
        return 'Complete the form to create your event.';
    }
  }
}
