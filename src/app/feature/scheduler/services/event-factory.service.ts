import { Injectable } from '@angular/core';
import { CalendarEvent } from 'angular-calendar';
import moment from 'moment';
import { EventFormData, CalendarTaskDTO, UpsertCalendarTaskCommand, TaskPriority, TaskStatus } from '../models';
import { IEventFactoryService } from '../interfaces/scheduler-service.interfaces';

@Injectable({
  providedIn: 'root'
})
export class EventFactoryService implements IEventFactoryService {

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

  initializeEvents(): CalendarEvent[] {
    // Returns basic events without actions - actions will be set by component
    return [
      {
        id: 1,
        start: moment().toDate(),
        title: 'Sample Event',
        color: { primary: '#ad2121', secondary: '#FAE3E3' },
        draggable: true,
        actions: [],
      },
      {
        id: 2,
        start: moment().add(1, 'day').toDate(),
        end: moment().add(1, 'day').add(2, 'hours').toDate(),
        title: 'Meeting with Team',
        color: { primary: '#1e90ff', secondary: '#D1E7DD' },
        draggable: true,
        actions: [],
      },
      {
        id: 3,
        start: moment().add(3, 'days').toDate(),
        title: 'Project Deadline',
        color: { primary: '#e3bc08', secondary: '#FDF5E6' },
        allDay: true,
        draggable: true,
        actions: [],
      },
    ];
  }

  generateEventId(): number {
    return Math.floor(Math.random() * 1000000) + Date.now();
  }

  /**
   * Convert CalendarTaskDTO from API to CalendarEvent for the scheduler
   * @param task - The calendar task DTO from the API
   * @param actions - Event actions (edit, delete, etc.)
   * @returns CalendarEvent object
   */
  convertCalendarTaskToEvent(task: CalendarTaskDTO, actions: any[]): CalendarEvent {

    // Try to parse the event start and end dates from cron expressions
    let startDate: moment.Moment;
    let endDate: moment.Moment | undefined;

    try {
      startDate = this.parseCronExpressionToDate(task.startCronExpression);
    } catch (error) {
      console.error('Error parsing start cron expression:', error);
      startDate = moment(task.createdDate);
    }

    try {
      endDate = this.parseCronExpressionToDate(task.endCronExpression);
    } catch (error) {
      console.error('Error parsing end cron expression:', error);
      endDate = undefined;
    }

    // Ensure the start date is valid
    if (!startDate.isValid()) {
      startDate = moment();
    }

    const calendarEvent: CalendarEvent = {
      id: task.id,
      title: task.title,
      start: startDate.toDate(),
      color: {
        primary: task.color || '#ad2121',
        secondary: this.lightenColor(task.color || '#ad2121', 0.8),
      },
      draggable: true,
      actions: actions,
      meta: {
        description: task.description,
        priority: task.priority,
        status: task.status,
        startCronExpression: task.startCronExpression,
        endCronExpression: task.endCronExpression,
        timeZone: task.timeZone,
        createdByUserName: task.createdByUserName,
        updatedByUserName: task.updatedByUserName,
        modifiedDate: task.modifiedDate,
        isActive: task.isActive,
        originalTaskId: task.id,
      },
    };

    // Add end date if valid and different from start
    if (endDate && endDate.isValid() && !endDate.isSame(startDate)) {
      calendarEvent.end = endDate.toDate();
    }

    return calendarEvent;
  }

  /**
   * Convert multiple CalendarTaskDTOs to CalendarEvents with recurring instances
   * Generates multiple event instances for recurring cron patterns
   * @param tasks - Array of calendar task DTOs
   * @param actions - Event actions to apply to all events
   * @param viewStart - Start of the visible calendar range (default: 1 month ago)
   * @param viewEnd - End of the visible calendar range (default: 3 months ahead)
   * @returns Array of CalendarEvent objects including recurring instances
   */
  convertCalendarTasksToEvents(
    tasks: CalendarTaskDTO[],
    actions: any[],
    viewStart: moment.Moment = moment().subtract(1, 'month'),
    viewEnd: moment.Moment = moment().add(3, 'months')
  ): CalendarEvent[] {
    const allEvents: CalendarEvent[] = [];

    tasks
      .filter(task => task.isActive) // Only show active tasks
      .forEach(task => {
        // Generate recurring instances for this task
        const instances = this.generateRecurringInstances(task, actions, viewStart, viewEnd);
        allEvents.push(...instances);
      });
    return allEvents;
  }

  /**
   * Generate recurring event instances based on cron expression
   * @param task - The calendar task
   * @param actions - Event actions
   * @param viewStart - Start of visible range
   * @param viewEnd - End of visible range
   * @returns Array of CalendarEvent instances
   */
  private generateRecurringInstances(
    task: CalendarTaskDTO,
    actions: any[],
    viewStart: moment.Moment,
    viewEnd: moment.Moment
  ): CalendarEvent[] {
    const instances: CalendarEvent[] = [];
    const startCronExpression = task.startCronExpression;
    const endCronExpression = task.endCronExpression;


    try {
      // Parse the start cron expression
      const parts = startCronExpression.trim().split(/\s+/);

      let second = 0;
      let minute = 0;
      let hour = 0;
      let dayOfMonth: string = '*';
      let month: string = '*';
      let dayOfWeek: string = '*';

      if (parts.length === 6) {
        second = this.parseFirstCronValue(parts[0]);
        minute = this.parseFirstCronValue(parts[1]);
        hour = this.parseFirstCronValue(parts[2]);
        dayOfMonth = parts[3];
        month = parts[4];
        dayOfWeek = parts[5];
      } else if (parts.length === 5) {
        minute = this.parseFirstCronValue(parts[0]);
        hour = this.parseFirstCronValue(parts[1]);
        dayOfMonth = parts[2];
        month = parts[3];
        dayOfWeek = parts[4];
      }

      // Determine recurrence pattern and generate instances
      const pattern = this.analyzeCronPattern(dayOfMonth, month, dayOfWeek);

      switch (pattern.type) {
        case 'daily':
          this.generateDailyInstances(task, actions, hour, minute, second, viewStart, viewEnd, instances);
          break;
        case 'weekly':
          this.generateWeeklyInstances(task, actions, hour, minute, second, pattern.daysOfWeek!, viewStart, viewEnd, instances);
          break;
        case 'monthly':
          this.generateMonthlyInstances(task, actions, hour, minute, second, pattern.daysOfMonth!, viewStart, viewEnd, instances);
          break;
        case 'specific':
          this.generateSpecificInstances(task, actions, hour, minute, second, pattern.daysOfMonth!, pattern.months!, viewStart, viewEnd, instances);
          break;
      }

    } catch (error) {
      console.error('Error generating recurring instances:', error);
      // Fallback to single instance
      instances.push(this.convertCalendarTaskToEvent(task, actions));
    }

    return instances;
  }

  /**
   * Analyze cron pattern to determine recurrence type
   */
  private analyzeCronPattern(dayOfMonth: string, month: string, dayOfWeek: string): {
    type: 'daily' | 'weekly' | 'monthly' | 'specific';
    daysOfWeek?: number[];
    daysOfMonth?: number[];
    months?: number[];
  } {
    // Daily: day=*, month=*, dayOfWeek=*
    if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return { type: 'daily' };
    }

    // Weekly: day=*, month=*, dayOfWeek=specific
    if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
      const daysOfWeek = this.parseCronList(dayOfWeek);
      return { type: 'weekly', daysOfWeek };
    }

    // Monthly: day=specific, month=*
    if (dayOfMonth !== '*' && month === '*') {
      const daysOfMonth = this.parseCronList(dayOfMonth);
      return { type: 'monthly', daysOfMonth };
    }

    // Specific dates: day=specific, month=specific
    const daysOfMonth = this.parseCronList(dayOfMonth);
    const months = month !== '*' ? this.parseCronList(month) : Array.from({length: 12}, (_, i) => i + 1);
    return { type: 'specific', daysOfMonth, months };
  }

  /**
   * Generate daily recurring instances
   */
  private generateDailyInstances(
    task: CalendarTaskDTO,
    actions: any[],
    hour: number,
    minute: number,
    second: number,
    viewStart: moment.Moment,
    viewEnd: moment.Moment,
    instances: CalendarEvent[]
  ): void {
    let current = viewStart.clone().hour(hour).minute(minute).second(second);

    while (current.isSameOrBefore(viewEnd)) {
      instances.push(this.createEventInstance(task, actions, current));
      current.add(1, 'day');
    }
  }

  /**
   * Generate weekly recurring instances
   */
  private generateWeeklyInstances(
    task: CalendarTaskDTO,
    actions: any[],
    hour: number,
    minute: number,
    second: number,
    daysOfWeek: number[],
    viewStart: moment.Moment,
    viewEnd: moment.Moment,
    instances: CalendarEvent[]
  ): void {
    let current = viewStart.clone().startOf('week');

    while (current.isSameOrBefore(viewEnd)) {
      daysOfWeek.forEach(dayOfWeek => {
        const eventDate = current.clone().day(dayOfWeek).hour(hour).minute(minute).second(second);
        if (eventDate.isSameOrAfter(viewStart) && eventDate.isSameOrBefore(viewEnd)) {
          instances.push(this.createEventInstance(task, actions, eventDate));
        }
      });
      current.add(1, 'week');
    }
  }

  /**
   * Generate monthly recurring instances
   */
  private generateMonthlyInstances(
    task: CalendarTaskDTO,
    actions: any[],
    hour: number,
    minute: number,
    second: number,
    daysOfMonth: number[],
    viewStart: moment.Moment,
    viewEnd: moment.Moment,
    instances: CalendarEvent[]
  ): void {
    let current = viewStart.clone().startOf('month');

    while (current.isSameOrBefore(viewEnd)) {
      daysOfMonth.forEach(day => {
        const eventDate = current.clone().date(day).hour(hour).minute(minute).second(second);
        if (eventDate.isSameOrAfter(viewStart) && eventDate.isSameOrBefore(viewEnd)) {
          instances.push(this.createEventInstance(task, actions, eventDate));
        }
      });
      current.add(1, 'month');
    }
  }

  /**
   * Generate specific date instances
   */
  private generateSpecificInstances(
    task: CalendarTaskDTO,
    actions: any[],
    hour: number,
    minute: number,
    second: number,
    daysOfMonth: number[],
    months: number[],
    viewStart: moment.Moment,
    viewEnd: moment.Moment,
    instances: CalendarEvent[]
  ): void {
    const startYear = viewStart.year();
    const endYear = viewEnd.year();

    for (let year = startYear; year <= endYear; year++) {
      months.forEach(monthNum => {
        daysOfMonth.forEach(day => {
          const eventDate = moment().year(year).month(monthNum - 1).date(day).hour(hour).minute(minute).second(second);
          if (eventDate.isSameOrAfter(viewStart) && eventDate.isSameOrBefore(viewEnd)) {
            instances.push(this.createEventInstance(task, actions, eventDate));
          }
        });
      });
    }
  }

  /**
   * Create a single event instance
   */
  private createEventInstance(task: CalendarTaskDTO, actions: any[], startDate: moment.Moment): CalendarEvent {
    // Calculate end date from end cron expression
    let endDate: moment.Moment | undefined;
    try {
      const endCronDate = this.parseCronExpressionToDate(task.endCronExpression);
      // Calculate the time difference between start and end from the cron expressions
      const startCronDate = this.parseCronExpressionToDate(task.startCronExpression);
      const duration = endCronDate.diff(startCronDate);

      if (duration > 0) {
        endDate = startDate.clone().add(duration, 'milliseconds');
      }
    } catch (error) {
      console.error('Error parsing cron expression for event duration:', error);
      endDate = undefined;
    }

    const calendarEvent: CalendarEvent = {
      id: `${task.id}-${startDate.format('YYYY-MM-DD-HH-mm')}`,
      title: task.title,
      start: startDate.toDate(),
      color: {
        primary: task.color || '#ad2121',
        secondary: this.lightenColor(task.color || '#ad2121', 0.8),
      },
      draggable: true,
      actions: actions,
      meta: {
        description: task.description,
        priority: task.priority,
        status: task.status,
        startCronExpression: task.startCronExpression,
        endCronExpression: task.endCronExpression,
        timeZone: task.timeZone,
        createdByUserName: task.createdByUserName,
        updatedByUserName: task.updatedByUserName,
        modifiedDate: task.modifiedDate,
        isActive: task.isActive,
        originalTaskId: task.id,
        instanceDate: startDate.format('YYYY-MM-DD HH:mm:ss'),
      },
    };

    // Add end date if valid
    if (endDate) {
      calendarEvent.end = endDate.toDate();
    }

    return calendarEvent;
  }

  /**
   * Helper method to lighten a color for secondary color
   * @param color - Hex color string
   * @param factor - Lightening factor (0-1)
   * @returns Lightened hex color string
   */
  private lightenColor(color: string, factor: number): string {
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

  /**
   * Convert EventFormData to UpsertCalendarTaskCommand for API submission
   * Detects patterns from customDays and weekday selections to generate appropriate cron expressions
   * @param eventData - The event form data from the scheduler
   * @param isUpdate - Whether this is an update (true) or create (false) operation
   * @returns UpsertCalendarTaskCommand ready for API submission
   */
  convertEventFormDataToCommand(eventData: EventFormData, isUpdate: boolean = false): UpsertCalendarTaskCommand {
    // Check if this is a recurring cron event (from the Event Occurs feature)
    let startCronExpression: string;
    let endCronExpression: string;

    if (eventData.meta?.isRecurringCronEvent && eventData.meta?.startCron && eventData.meta?.endCron) {
      // Use the pre-generated cron expressions for recurring events
      startCronExpression = eventData.meta.startCron;
      endCronExpression = eventData.meta.endCron;
    } else {
      // Generate cron expressions from dates for regular events
      startCronExpression = this.generateCronExpressionWithPattern(eventData);
      endCronExpression = this.generateEndCronExpression(eventData);
    }

    const command: UpsertCalendarTaskCommand = {
      title: eventData.title,
      description: eventData.meta?.description || '',
      startCronExpression: startCronExpression,
      endCronExpression: endCronExpression,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      priority: (eventData.meta?.priority as TaskPriority) || TaskPriority.Medium,
      status: (eventData.meta?.status as TaskStatus) || TaskStatus.Pending,
      color: eventData.color.primary,
      createdByUserName: "string",
      updatedByUserName: "string",
    };

    if (isUpdate && eventData.id) {
      command.id = eventData.id as number;
    }

    return command;
  }

  /**
   * Convert CalendarEvent to UpsertCalendarTaskCommand for API submission
   * @param event - The calendar event
   * @param isUpdate - Whether this is an update (true) or create (false) operation
   * @returns UpsertCalendarTaskCommand ready for API submission
   */
  convertCalendarEventToCommand(event: CalendarEvent, isUpdate: boolean = false): UpsertCalendarTaskCommand {
    const startMoment = moment(event.start);
    const endMoment = event.end ? moment(event.end) : startMoment.clone();

    const startCronExpression = this.generateCronExpressionFromDate(startMoment);
    const endCronExpression = this.generateCronExpressionFromDate(endMoment);

    const command: UpsertCalendarTaskCommand = {
      title: event.title || '',
      description: event.meta?.description || '',
      startCronExpression: event.meta?.startCronExpression || startCronExpression,
      endCronExpression: event.meta?.endCronExpression || endCronExpression,
      timeZone: event.meta?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      priority: event.meta?.priority || TaskPriority.Medium,
      status: event.meta?.status || TaskStatus.Pending,
      color: event.color?.primary || '#ad2121',
      createdByUserName: "string",
      updatedByUserName: "string",
    };

    // Add ID for updates
    if (isUpdate && event.id) {
      command.id = event.id as number;
    }

    return command;
  }

  /**
   * Generate a cron expression from EventFormData
   * Creates a one-time cron expression based on start date
   * @param eventData - The event form data
   * @returns Cron expression string (6-part format)
   */

  /**
   * Generate an end cron expression from EventFormData
   * Creates a cron expression based on end date, or defaults to start if no end
   * @param eventData - The event form data
   * @returns Cron expression string (6-part format)
   */
  private generateEndCronExpression(eventData: EventFormData): string {
    if (eventData.customDays && eventData.customDays.length > 0) {
      const sortedDays = eventData.customDays.map(d => moment(d)).sort((a, b) => a.valueOf() - b.valueOf());
      const lastMoment = sortedDays[sortedDays.length - 1];
      const endTimeMoment = eventData.end ? moment(eventData.end) : lastMoment;

      const finalEndMoment = lastMoment.clone()
        .hour(endTimeMoment.hour())
        .minute(endTimeMoment.minute())
        .second(endTimeMoment.second());

      return this.generateCronExpressionFromDate(finalEndMoment);
    }

    if (eventData.end) {
      const endMoment = moment(eventData.end);
      return this.generateCronExpressionFromDate(endMoment);
    }

    if (eventData.start) {
      const startMoment = moment(eventData.start);
      return this.generateCronExpressionFromDate(startMoment);
    }

    return '0 0 0 * * *';
  }

  /**
   * Generate a cron expression with pattern detection from EventFormData
   * Detects recurring patterns from customDays array
   * @param eventData - The event form data
   * @returns Cron expression string with detected patterns
   */
  private generateCronExpressionWithPattern(eventData: EventFormData): string {
    if (!eventData.start) {
      return '0 0 0 * * *';
    }

    const startMoment = moment(eventData.start);

    if (eventData.customDays && eventData.customDays.length > 0) {
      return this.extractPatternFromCustomDays(eventData.customDays, startMoment);
    }

    return this.generateCronExpressionFromDate(startMoment);
  }

  /**
   * Extract recurring pattern from customDays array
   * Detects patterns like: specific days, weekly, monthly, etc.
   * @param customDays - Array of dates representing custom days
   * @param referenceTime - Reference time for hour/minute
   * @returns Cron expression representing the pattern
   */
  private extractPatternFromCustomDays(customDays: Date[], referenceTime: moment.Moment): string {
    if (customDays.length === 0) {
      return this.generateCronExpressionFromDate(referenceTime);
    }

    const second = referenceTime.second();
    const minute = referenceTime.minute();
    const hour = referenceTime.hour();

    // Convert dates to moments for analysis
    const moments = customDays.map(d => moment(d)).sort((a, b) => a.valueOf() - b.valueOf());

    // Detect pattern type
    const pattern = this.detectPattern(moments);

    switch (pattern.type) {
      case 'daily':
        // Every day at specific time
        return `${second} ${minute} ${hour} * * *`;

      case 'weekly':
        // Specific days of week
        const daysOfWeek = pattern.daysOfWeek!.join(',');
        return `${second} ${minute} ${hour} * * ${daysOfWeek}`;

      case 'monthly':
        // Specific days of month
        const daysOfMonth = pattern.daysOfMonth!.join(',');
        return `${second} ${minute} ${hour} ${daysOfMonth} * *`;

      case 'specific-dates':
        // Multiple specific dates (days and months)
        const days = pattern.daysOfMonth!.join(',');
        const months = pattern.months!.join(',');
        return `${second} ${minute} ${hour} ${days} ${months} *`;

      default:
        // Fallback to first date
        return this.generateCronExpressionFromDate(moments[0]);
    }
  }

  /**
   * Detect pattern from array of moment dates
   * Analyzes dates to find recurring patterns
   * @param moments - Sorted array of moment dates
   * @returns Pattern object with type and details
   */
  private detectPattern(moments: moment.Moment[]): {
    type: 'daily' | 'weekly' | 'monthly' | 'specific-dates';
    daysOfWeek?: number[];
    daysOfMonth?: number[];
    months?: number[];
  } {
    if (moments.length === 0) {
      return { type: 'specific-dates' };
    }

    if (moments.length === 1) {
      return {
        type: 'specific-dates',
        daysOfMonth: [moments[0].date()],
        months: [moments[0].month() + 1]
      };
    }

    // Check if all dates are in the same month (monthly pattern)
    const allSameMonth = moments.every(m => m.month() === moments[0].month());
    if (allSameMonth) {
      const daysOfMonth = [...new Set(moments.map(m => m.date()))].sort((a, b) => a - b);
      return {
        type: 'monthly',
        daysOfMonth: daysOfMonth
      };
    }

    // Check for weekly pattern (same day of week)
    const daysOfWeek = [...new Set(moments.map(m => m.day()))].sort((a, b) => a - b);
    const allDifferentWeeks = moments.every((m, i) => {
      if (i === 0) return true;
      return m.week() !== moments[i - 1].week();
    });

    if (allDifferentWeeks && daysOfWeek.length <= 7) {
      return {
        type: 'weekly',
        daysOfWeek: daysOfWeek
      };
    }

    // Check for daily pattern (consecutive days or regular intervals)
    const intervals: number[] = [];
    for (let i = 1; i < moments.length; i++) {
      const diff = moments[i].diff(moments[i - 1], 'days');
      intervals.push(diff);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (avgInterval <= 1.5) {
      return { type: 'daily' };
    }

    // Specific dates pattern (multiple months/days)
    const daysOfMonth = [...new Set(moments.map(m => m.date()))].sort((a, b) => a - b);
    const months = [...new Set(moments.map(m => m.month() + 1))].sort((a, b) => a - b);

    return {
      type: 'specific-dates',
      daysOfMonth: daysOfMonth,
      months: months
    };
  }

  /**
   * Generate a 6-part cron expression from a moment date
   * Format: second minute hour day month dayOfWeek
   * @param date - Moment date object
   * @returns Cron expression string
   */
  private generateCronExpressionFromDate(date: moment.Moment): string {
    const second = date.second();
    const minute = date.minute();
    const hour = date.hour();
    const dayOfMonth = date.date();
    const month = date.month() + 1; // Moment months are 0-indexed

    // Create a 6-part specific date cron expression
    return `${second} ${minute} ${hour} ${dayOfMonth} ${month} *`;
  }

  /**
   * Parse a cron expression to extract date/time
   * Supports formats:
   * - 5-part: "minute hour day month dayOfWeek"
   * - 6-part: "second minute hour day month dayOfWeek"
   * Handles: wildcards (*), ranges (1-5), lists (1,3,5), day names (MON-FRI)
   * @param cronExpression - Cron expression string
   * @returns Moment date object
   */
  private parseCronExpressionToDate(cronExpression: string): moment.Moment {
    if (!cronExpression || cronExpression.trim() === '') {
      console.warn('Empty cron expression, using current time');
      return moment();
    }

    try {
      // Split cron expression
      const parts = cronExpression.trim().split(/\s+/);

      // Determine if it's 5-part or 6-part cron
      let second = 0;
      let minute = 0;
      let hour = 0;
      let dayOfMonth: string = '*';
      let month: string = '*';
      let dayOfWeek: string = '*';

      if (parts.length === 6) {
        // 6-part cron: second minute hour day month dayOfWeek
        second = this.parseFirstCronValue(parts[0]);
        minute = this.parseFirstCronValue(parts[1]);
        hour = this.parseFirstCronValue(parts[2]);
        dayOfMonth = parts[3];
        month = parts[4];
        dayOfWeek = parts[5];
      } else if (parts.length === 5) {
        // 5-part cron: minute hour day month dayOfWeek
        minute = this.parseFirstCronValue(parts[0]);
        hour = this.parseFirstCronValue(parts[1]);
        dayOfMonth = parts[2];
        month = parts[3];
        dayOfWeek = parts[4];
      } else {
        console.warn('Invalid cron expression format (expected 5 or 6 parts):', cronExpression);
        return moment();
      }

      // Create a date from the cron expression
      const now = moment();
      let date = moment();

      // Handle month (can be comma-separated like "10" or "1,3,6")
      if (month !== '*' && month !== '?') {
        const monthNum = this.parseFirstCronValue(month);
        if (monthNum >= 1 && monthNum <= 12) {
          date.month(monthNum - 1); // Moment months are 0-indexed
        }
      }

      // Handle day of month (can be comma-separated like "20,30")
      if (dayOfMonth !== '*' && dayOfMonth !== '?') {
        const dayNum = this.parseFirstCronValue(dayOfMonth);
        if (dayNum >= 1 && dayNum <= 31) {
          date.date(dayNum);
        }
      } else {
        // If day is wildcard, use current day
        date.date(now.date());
      }

      // Set time
      date.hour(hour).minute(minute).second(second).millisecond(0);

      // If the constructed date is in the past, adjust it to next occurrence
      if (date.isBefore(now)) {

        // Check if there are multiple days specified (comma-separated)
        if (dayOfMonth.includes(',')) {
          // Try the next day in the list
          const days = this.parseCronList(dayOfMonth);
          const nextDay = this.findNextValue(days, date.date());

          if (nextDay !== null) {
            date.date(nextDay);
          } else {
            // All days in current month have passed, move to next month
            if (month.includes(',')) {
              const months = this.parseCronList(month);
              const nextMonth = this.findNextValue(months, date.month() + 1);
              if (nextMonth !== null) {
                date.month(nextMonth - 1).date(days[0]);
              } else {
                // Move to next year
                date.add(1, 'year').month(months[0] - 1).date(days[0]);
              }
            } else {
              date.add(1, 'month').date(days[0]);
            }
          }
        } else if (dayOfMonth === '*' && month === '*') {
          // Recurring event (like daily/weekly), move to tomorrow same time
          date.add(1, 'day');
        } else if (dayOfMonth !== '*' && month === '*') {
          // Monthly recurring, move to next month
          date.add(1, 'month');
        } else if (month !== '*') {
          // Specific month, move to next year
          date.add(1, 'year');
        }
      }

      return date;
    } catch (error) {
      console.error('Error parsing cron expression:', error);
      return moment();
    }
  }

  /**
   * Parse the first value from a cron field (handles comma-separated lists)
   * @param value - Cron field value (e.g., "5", "1,3,5", "*")
   * @returns First numeric value or 0 for wildcards
   */
  private parseFirstCronValue(value: string): number {
    if (value === '*' || value === '?' || !value) {
      return 0;
    }

    // Handle comma-separated lists - take the first value
    if (value.includes(',')) {
      const firstValue = value.split(',')[0].trim();
      const parsed = parseInt(firstValue);
      return isNaN(parsed) ? 0 : parsed;
    }

    // Handle ranges - take the start value
    if (value.includes('-')) {
      const rangeStart = value.split('-')[0].trim();
      const parsed = parseInt(rangeStart);
      return isNaN(parsed) ? 0 : parsed;
    }

    const parsed = parseInt(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Parse a comma-separated cron list into an array of numbers
   * @param value - Cron field value (e.g., "1,3,5,7")
   * @returns Array of numeric values
   */
  private parseCronList(value: string): number[] {
    if (value === '*' || value === '?' || !value) {
      return [];
    }

    return value.split(',')
      .map(v => parseInt(v.trim()))
      .filter(v => !isNaN(v))
      .sort((a, b) => a - b);
  }

  /**
   * Find the next value in a list that is greater than the current value
   * @param values - Sorted array of values
   * @param current - Current value
   * @returns Next value or null if none found
   */
  private findNextValue(values: number[], current: number): number | null {
    const next = values.find(v => v > current);
    return next !== undefined ? next : null;
  }

  /**
   * Parse a cron value, handling wildcards (legacy method for compatibility)
   * @param value - Cron value (number or wildcard)
   * @returns Parsed number or 0 for wildcards
   */
  private parseCronValue(value: string): number {
    return this.parseFirstCronValue(value);
  }
}
