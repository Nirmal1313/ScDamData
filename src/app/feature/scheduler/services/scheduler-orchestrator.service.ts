import { Injectable } from '@angular/core';
import { CalendarEvent } from 'angular-calendar';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EventFormData, ValidationResult } from '../models';
import { ISchedulerOrchestrator } from '../interfaces/scheduler-service.interfaces';
import { ValidationService } from './validation.service';
import { DateTimeService } from './datetime.service';
import { EventFactoryService } from './event-factory.service';
import { CustomDayService } from './custom-day.service';
import { ColorService } from './color.service';
import { CalendarTaskApiService } from './calendar-task-api.service';

@Injectable({
  providedIn: 'root'
})
export class SchedulerOrchestratorService implements ISchedulerOrchestrator {

  constructor(
    private validationService: ValidationService,
    private dateTimeService: DateTimeService,
    private eventFactoryService: EventFactoryService,
    private customDayService: CustomDayService,
    private colorService: ColorService,
    private calendarTaskApiService: CalendarTaskApiService
  ) {}  validateEvent(currentEvent: EventFormData, isAllDayEvent: boolean, dateValidationErrors: string[]): ValidationResult {
    return this.validationService.validateForm(currentEvent, isAllDayEvent, dateValidationErrors);
  }

  processEventSave(currentEvent: EventFormData, isAllDayEvent: boolean): CalendarEvent {
    // Auto-correct dates if needed
    this.dateTimeService.autoCorrectDates(currentEvent);

    // Create calendar event
    return this.eventFactoryService.createCalendarEventFromFormData(currentEvent, []);
  }

  initializeScheduler(): { events: CalendarEvent[]; dateValidation: any } {
    const events = this.eventFactoryService.initializeEvents();
    const dateValidation = this.dateTimeService.setupDateValidation();

    return { events, dateValidation };
  }

  /**
   * Initialize scheduler with data from API
   * @param actions - Event actions (edit, delete) to apply to events
   * @returns Observable with events loaded from API and date validation config
   */
  initializeSchedulerFromAPI(actions: any[]): Observable<{ events: CalendarEvent[]; dateValidation: any }> {
    const dateValidation = this.dateTimeService.setupDateValidation();

    return this.calendarTaskApiService.getAllCalendarTasks().pipe(
      map(tasks => {

        const events = this.eventFactoryService.convertCalendarTasksToEvents(tasks, actions);

        return { events, dateValidation };
      })
    );
  }

  // Convenience methods that delegate to specific services
  get validation() {
    return this.validationService;
  }

  get dateTime() {
    return this.dateTimeService;
  }

  get eventFactory() {
    return this.eventFactoryService;
  }

  get customDay() {
    return this.customDayService;
  }

  get color() {
    return this.colorService;
  }
}
