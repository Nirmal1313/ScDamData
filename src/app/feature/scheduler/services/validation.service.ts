import { Injectable } from '@angular/core';
import moment from 'moment';
import { EventFormData, ValidationResult } from '../models';
import { IValidationService } from '../interfaces/scheduler-service.interfaces';

// Strategy Pattern for different validation types
export interface IValidationStrategy {
  validate(data: any): ValidationResult;
}

export class DateRangeValidationStrategy implements IValidationStrategy {
  validate(data: { startDate: string | Date; endDate: string | Date }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const start = moment(data.startDate);
    const end = moment(data.endDate);
    const now = moment();

    if (!start.isValid()) {
      errors.push('Start date is invalid. Please select a valid date.');
    }
    if (!end.isValid()) {
      errors.push('End date is invalid. Please select a valid date.');
    }

    if (errors.length > 0) {
      return { isValid: false, errors, warnings };
    }

    if (start.isSameOrAfter(end)) {
      errors.push('Start date must be before end date.');
    }

    if (start.isBefore(now.startOf('day'))) {
      errors.push('Start date cannot be in the past.');
    }

    const daysDiff = end.diff(start, 'days');
    if (daysDiff > 365) {
      warnings.push('Event duration is more than 1 year. Please verify this is correct.');
    }

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
}

export class DateTimeValidationStrategy implements IValidationStrategy {
  constructor(private dateRangeStrategy: DateRangeValidationStrategy) {}

  validate(data: { currentEvent: EventFormData; isAllDayEvent: boolean }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Use composition with date range validation
    const basicValidation = this.dateRangeStrategy.validate({
      startDate: data.currentEvent.start,
      endDate: data.currentEvent.end
    });
    errors.push(...basicValidation.errors);
    warnings.push(...basicValidation.warnings);

    if (!data.isAllDayEvent && data.currentEvent.start && data.currentEvent.end) {
      const start = moment(data.currentEvent.start);
      const end = moment(data.currentEvent.end);

      const duration = moment.duration(end.diff(start));
      if (duration.asMinutes() < 15 && duration.asMinutes() > 0) {
        warnings.push('Event duration is less than 15 minutes. Consider if this is intentional.');
      }

      if (start.isSame(end, 'day') && duration.asHours() > 12) {
        warnings.push('Event duration exceeds 12 hours in a single day. Consider making it an all-day event.');
      }

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
}

export class FormValidationStrategy implements IValidationStrategy {
  constructor(
    private validationService: IValidationService
  ) {}

  validate(data: { currentEvent: EventFormData; isAllDayEvent: boolean; dateValidationErrors: string[] }): ValidationResult {
    const errors: string[] = [];

    if (!data.currentEvent.title?.trim()) {
      errors.push('Event title is required.');
    }

    if (!data.currentEvent.startDate) {
      errors.push('Start date is required.');
    }

    if (!data.currentEvent.endDate) {
      errors.push('End date is required.');
    }

    if (!data.isAllDayEvent) {
      if (!data.currentEvent.startTime?.trim()) {
        errors.push('Start time is required for timed events.');
      }
      if (!data.currentEvent.endTime?.trim()) {
        errors.push('End time is required for timed events.');
      }
    }

    if (this.validationService.hasCompleteDateTime(data.currentEvent, data.isAllDayEvent)) {
      const startMoment = moment(data.currentEvent.start);
      const endMoment = moment(data.currentEvent.end);

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

    errors.push(...data.dateValidationErrors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class ValidationService implements IValidationService {
  private dateRangeStrategy = new DateRangeValidationStrategy();
  private dateTimeStrategy = new DateTimeValidationStrategy(this.dateRangeStrategy);
  private formStrategy = new FormValidationStrategy(this);

  validateDateRange(startDate: string | Date, endDate: string | Date): ValidationResult {
    return this.dateRangeStrategy.validate({ startDate, endDate });
  }

  validateDateTimeRange(currentEvent: EventFormData, isAllDayEvent: boolean): ValidationResult {
    return this.dateTimeStrategy.validate({ currentEvent, isAllDayEvent });
  }

  validateForm(currentEvent: EventFormData, isAllDayEvent: boolean, dateValidationErrors: string[]): ValidationResult {
    return this.formStrategy.validate({ currentEvent, isAllDayEvent, dateValidationErrors });
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
}
