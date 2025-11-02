import { CalendarEvent } from 'angular-calendar';
import { EventFormData, ValidationResult, CustomDaySelection, WeekdaySelection } from '../models';

export interface IValidationService {
  validateDateRange(startDate: string | Date, endDate: string | Date): ValidationResult;
  validateDateTimeRange(currentEvent: EventFormData, isAllDayEvent: boolean): ValidationResult;
  validateForm(currentEvent: EventFormData, isAllDayEvent: boolean, dateValidationErrors: string[]): ValidationResult;
  hasCompleteDateTime(currentEvent: EventFormData, isAllDayEvent: boolean): boolean;
}

export interface IDateTimeService {
  combineDateTime(date: Date, time: string): string;
  autoCorrectDates(currentEvent: EventFormData): void;
  setupDateValidation(): { minSelectableDate: Date; maxSelectableDate: Date };
  formatMomentDateTime(date: string | Date | any): string;
  getCurrentSelectionStep(currentEvent: EventFormData, isAllDayEvent: boolean): number;
  getSelectionStepMessage(currentEvent: EventFormData, isAllDayEvent: boolean): string;
}

export interface IEventFactoryService {
  createEmptyEvent(): EventFormData;
  createCalendarEventFromFormData(eventData: EventFormData, actions: any[]): CalendarEvent;
  initializeEvents(): CalendarEvent[];
  generateEventId(): number;
}

export interface ICustomDayService {
  generateCustomDaysForPattern(customDaySelection: CustomDaySelection): Date[];
  getSelectedWeekdayNumbers(weekdaySelection: WeekdaySelection): number[];
}

export interface IColorService {
  lightenColor(color: string, factor: number): string;
  getDefaultEventColors(): { primary: string; secondary: string };
}

export interface ISchedulerOrchestrator {
  // Main orchestrator interface that coordinates all services
  validateEvent(currentEvent: EventFormData, isAllDayEvent: boolean, dateValidationErrors: string[]): ValidationResult;
  processEventSave(currentEvent: EventFormData, isAllDayEvent: boolean): CalendarEvent;
  initializeScheduler(): { events: CalendarEvent[]; dateValidation: any };
}
