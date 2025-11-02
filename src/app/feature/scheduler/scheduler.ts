import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  ChangeDetectorRef,
  OnInit,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DateAdapter,
  provideCalendar,
  CalendarPreviousViewDirective,
  CalendarTodayDirective,
  CalendarNextViewDirective,
  CalendarMonthViewComponent,
  CalendarWeekViewComponent,
  CalendarDayViewComponent,
  CalendarEvent,
  CalendarView,
  CalendarDatePipe,
  DAYS_OF_WEEK,
  CalendarEventAction,
} from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/moment';
import moment from 'moment';
import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { ColorPickerModule } from 'primeng/colorpicker';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { InputMaskModule } from 'primeng/inputmask';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TooltipModule } from 'primeng/tooltip';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputGroupModule } from 'primeng/inputgroup';

// Import interfaces and services
import {
  EventFormData,
  RecurrencePattern,
  ValidationResult,
  CustomDaySelection,
  WeekdaySelection,
  DateRangeWithTime,
  QuickEventData
} from './models';
import { SchedulerOrchestratorService, CalendarTaskApiService } from './services';

export function momentAdapterFactory() {
  return adapterFactory(moment);
}

@Component({
  selector: 'app-scheduler',
  imports: [
    CommonModule,
    FormsModule,
    PanelModule,
    ConfirmDialogModule,
    ToastModule,
    TableModule,
    CalendarMonthViewComponent,
    ButtonModule,
    CalendarWeekViewComponent,
    CalendarDayViewComponent,
    CalendarPreviousViewDirective,
    CalendarTodayDirective,
    CalendarNextViewDirective,
    CalendarDatePipe,
    ColorPickerModule,
    InputTextModule,
    DialogModule,
    CheckboxModule,
    DatePickerModule,
    TextareaModule,
    InputMaskModule,
    FloatLabelModule,
    InputGroupAddonModule,
    RadioButtonModule,
    TooltipModule,
    InputGroupModule
  ],
  templateUrl: './scheduler.html',
  styleUrl: './scheduler.scss',
  providers: [
    provideCalendar({
      provide: DateAdapter,
      useFactory: momentAdapterFactory,
    }),
    ConfirmationService,
    MessageService,
  ],
})
export class Scheduler implements OnInit, AfterViewInit {
  // ===================================
  // PROPERTIES & DEPENDENCIES
  // ===================================

  // ViewChild references
  @ViewChild('calendarContainer') calendarContainer!: ElementRef<HTMLElement>;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly orchestrator = inject(SchedulerOrchestratorService);
  private readonly calendarTaskApi = inject(CalendarTaskApiService);

  readonly CalendarView = CalendarView;
  readonly weekStartsOn = DAYS_OF_WEEK.MONDAY;

  view: CalendarView = CalendarView.Month;
  viewDate = moment().toDate();
  activeDayIsOpen = true;

  events: CalendarEvent[] = [];
  currentEvent: EventFormData = this.orchestrator.eventFactory.createEmptyEvent();

  showEventEditDialog = false;
  startDialogVisible = false;
  endDialogVisible = false;
  customDaysDialogVisible = false;
  quickEventDialogVisible = false;
  isEditMode = false;
  isAllDayEvent = false;
  isSaving = false; // Loading state for save operations
  isDeleting = false; // Loading state for delete operations

  // Quick booking properties
  lastQuickBookingAction: string | null = null;

  dateValidationErrors: string[] = [];
  dateValidationWarnings: string[] = [];
  minSelectableDate: Date = moment().startOf('day').toDate();
  maxSelectableDate: Date = moment().add(2, 'years').endOf('day').toDate();

  customDaySelection: CustomDaySelection = {
    startRange: moment().toDate(),
    endRange: moment().add(7, 'days').toDate(),
    selectedDays: [],
    pattern: 'specific',
  };

  // Enhanced weekday and date range selection
  weekdaySelection: WeekdaySelection = {
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  };

  dateRangeSelection: DateRangeWithTime = {
    startDate: moment().toDate(),
    endDate: moment().add(1, 'hour').toDate(),
  };

  // Recurring event mode properties
  isRecurringMode = false;
  recurrenceStartTime: string | null = null;
  recurrenceEndTime: string | null = null;
  recurrenceWeekdays: WeekdaySelection = {
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  };

  readonly customDayPatterns = [
    { label: 'Select Specific Days', value: 'specific' },
    { label: 'Every N Days', value: 'interval' },
    { label: 'Weekdays Only', value: 'weekdays' },
    { label: 'Weekends Only', value: 'weekends' },
  ];

  // Event actions - Initialize as readonly after construction
  readonly actions: CalendarEventAction[] = [
    {
      label: `<i class="pi pi-file-edit m-2"></i>`,
      a11yLabel: 'Edit',
      onClick: ({ event }: { event: CalendarEvent }): void => {
        this.showEventDialog(event);
      },
    },
    {
      label: `<i class="pi pi-trash m-2"></i>`,
      a11yLabel: 'Delete',
      onClick: ({ event }: { event: CalendarEvent }): void => {
        this.confirmDeleteEvent(event);
      },
    },
  ];

  ngOnInit(): void {
    this.orchestrator.initializeSchedulerFromAPI(this.actions).subscribe({
      next: (initialization) => {
        // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          this.events = initialization.events;
          this.events.forEach(event => {
            event.actions = this.actions;
          });

          const dateValidation = initialization.dateValidation;
          this.minSelectableDate = dateValidation.minSelectableDate;
          this.maxSelectableDate = dateValidation.maxSelectableDate;

          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        console.error('Error loading calendar tasks from API:', error);
        setTimeout(() => {
          const initialization = this.orchestrator.initializeScheduler();
          this.events = initialization.events;
          this.events.forEach(event => event.actions = this.actions);

          const dateValidation = initialization.dateValidation;
          this.minSelectableDate = dateValidation.minSelectableDate;
          this.maxSelectableDate = dateValidation.maxSelectableDate;

          this.showMessage('warn', 'Warning', 'Failed to load calendar tasks from server. Using sample data.');
        });
      }
    });
  }

  ngAfterViewInit(): void {
    this.cdr.detectChanges();

    // Auto-scroll to current time if starting in Day or Week view
    setTimeout(() => {
      if (this.view === CalendarView.Day || this.view === CalendarView.Week) {
        this.scrollToCurrentTime();
      }
    }, 200);
  }

  /**
   * Reload all events from the server
   * Used after updating recurring events to refresh all instances
   */
  reloadEventsFromServer(): void {
    this.orchestrator.initializeSchedulerFromAPI(this.actions).subscribe({
      next: (initialization) => {
        // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          this.events = initialization.events;
          this.events.forEach(event => {
            event.actions = this.actions;
          });
          // Trigger change detection to update the view
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        console.error('Failed to reload events from server:', error);
        this.showMessage('warn', 'Warning', 'Failed to refresh calendar events. Please reload the page.');
      }
    });
  }

  get formattedStartDate(): string {
    if (!this.currentEvent.start) return '';
    return this.orchestrator.dateTime.formatMomentDateTime(this.currentEvent.start);
  }

  get formattedEndDate(): string {
    if (!this.currentEvent.end) return '';
    return this.orchestrator.dateTime.formatMomentDateTime(this.currentEvent.end);
  }

  get hasCustomDaysSelected(): boolean {
    return this.customDaySelection.selectedDays.length > 0;
  }

  get customDaysCount(): number {
    return this.customDaySelection.selectedDays.length;
  }

  // Enhanced weekday and date range getters
  hasSelectedWeekdays(): boolean {
    return Object.values(this.weekdaySelection).some((day) => day === true);
  }

  getSelectedWeekdaysCount(): number {
    return Object.values(this.weekdaySelection).filter((day) => day === true).length;
  }

  getSelectedWeekdayNames(): string[] {
    const selectedDays: string[] = [];
    if (this.weekdaySelection.monday) selectedDays.push('Monday');
    if (this.weekdaySelection.tuesday) selectedDays.push('Tuesday');
    if (this.weekdaySelection.wednesday) selectedDays.push('Wednesday');
    if (this.weekdaySelection.thursday) selectedDays.push('Thursday');
    if (this.weekdaySelection.friday) selectedDays.push('Friday');
    if (this.weekdaySelection.saturday) selectedDays.push('Saturday');
    if (this.weekdaySelection.sunday) selectedDays.push('Sunday');
    return selectedDays;
  }

  // Helper method for minimum end date
  getMinEndDate(): Date {
    if (this.currentEvent.start) {
      const startDate = moment(this.currentEvent.start);
      return startDate.isValid() ? startDate.toDate() : this.minSelectableDate;
    }
    return this.minSelectableDate;
  }

  // Date range change handler
  onDateRangeChange(): void {
    this.validateDateTimeRange();
    this.syncDateRangeWithCurrentEvent();
  }

  // Start date change handler for inline calendar
  onStartDateChange(): void {
    // Only validate if both dates are set, don't auto-correct
    if (this.currentEvent.start && this.currentEvent.end) {
      const startMoment = moment(this.currentEvent.start);
      const endMoment = moment(this.currentEvent.end);

      if (endMoment.isSameOrBefore(startMoment)) {
        this.showMessage(
          'warning',
          'Invalid Date Range',
          'End date and time must be after start date and time. Please adjust your selection.'
        );
      }
    }

    this.validateCurrentEvent();
    this.syncDateRangeWithCurrentEvent();
  } // End date change handler for inline calendar
  onEndDateChange(): void {
    // Only validate if both dates are set, provide feedback but don't block
    if (this.currentEvent.start && this.currentEvent.end) {
      const startMoment = moment(this.currentEvent.start);
      const endMoment = moment(this.currentEvent.end);

      if (endMoment.isSameOrBefore(startMoment)) {
        this.showMessage(
          'warning',
          'Invalid Date Range',
          'End date and time must be after start date and time. Please adjust your selection.'
        );
      }
    }

    this.validateCurrentEvent();
    this.syncDateRangeWithCurrentEvent();
  }

  private setupDateValidation(): void {
    const dateValidation = this.orchestrator.dateTime.setupDateValidation();
    this.minSelectableDate = dateValidation.minSelectableDate;
    this.maxSelectableDate = dateValidation.maxSelectableDate;
  }

  validateDateRange(startDate: string | Date, endDate: string | Date): ValidationResult {
    return this.orchestrator.validation.validateDateRange(startDate, endDate);
  }

  // ===================================
  // STEPWISE DATE AND TIME SELECTION
  // ===================================

  // Step 1: Handle date selection
  onStartDateSelected(): void {
    if (this.currentEvent.startDate) {
      // Reset start time to allow user to select it explicitly
      this.currentEvent.startTime = null;
      this.combineStartDateTime();
      this.validateStepwiseSelection();
    }
  }

  onEndDateSelected(): void {
    if (this.currentEvent.endDate) {
      // Reset end time to allow user to select it explicitly
      this.currentEvent.endTime = null;
      this.combineEndDateTime();
      this.validateStepwiseSelection();
    }
  }

  // Step 2: Handle time selection
  onStartTimeChanged(): void {
    if (this.currentEvent.startDate && this.currentEvent.startTime) {
      this.combineStartDateTime();
      this.validateStepwiseSelection();
    }
  }

  onEndTimeChanged(): void {
    if (this.currentEvent.endDate && this.currentEvent.endTime) {
      this.combineEndDateTime();
      this.validateStepwiseSelection();
    }
  }

  // Combine date and time into datetime
  private combineStartDateTime(): void {
    if (this.currentEvent.startDate && this.currentEvent.startTime) {
      this.currentEvent.start = this.orchestrator.dateTime.combineDateTime(this.currentEvent.startDate, this.currentEvent.startTime);
    } else if (this.currentEvent.startDate) {
      // Date only, no time selected yet
      this.currentEvent.start = moment(this.currentEvent.startDate).format('YYYY-MM-DD');
    }
  }

  private combineEndDateTime(): void {
    if (this.currentEvent.endDate && this.currentEvent.endTime) {
      this.currentEvent.end = this.orchestrator.dateTime.combineDateTime(this.currentEvent.endDate, this.currentEvent.endTime);
    } else if (this.currentEvent.endDate) {
      // Date only, no time selected yet
      this.currentEvent.end = moment(this.currentEvent.endDate).format('YYYY-MM-DD');
    }
  }

  // Validation for stepwise selection
  private validateStepwiseSelection(): void {
    this.dateValidationErrors = [];
    this.dateValidationWarnings = [];

    // Skip validation if in recurring mode (uses different validation)
    if (this.isRecurringMode) {
      return;
    }

    // Check if we have both dates selected
    if (!this.currentEvent.startDate || !this.currentEvent.endDate) {
      if (!this.currentEvent.startDate && !this.currentEvent.endDate) {
        this.dateValidationErrors.push('Please select both start and end dates');
      } else if (!this.currentEvent.startDate) {
        this.dateValidationErrors.push('Please select a start date');
      } else {
        this.dateValidationErrors.push('Please select an end date');
      }
      return;
    }

    // Check if we have times for non-all-day events
    if (!this.isAllDayEvent) {
      if (!this.currentEvent.startTime || !this.currentEvent.endTime) {
        if (!this.currentEvent.startTime && !this.currentEvent.endTime) {
          this.dateValidationWarnings.push('Please select both start and end times');
        } else if (!this.currentEvent.startTime) {
          this.dateValidationWarnings.push('Please select a start time');
        } else {
          this.dateValidationWarnings.push('Please select an end time');
        }
        return;
      }
    }

    // Validate combined datetime if both parts are available
    if (this.hasCompleteDateTime()) {
      const validation = this.validateDateRange(this.currentEvent.start, this.currentEvent.end);
      this.dateValidationErrors = validation.errors;
      this.dateValidationWarnings.push(...validation.warnings);
    }
  }

  // Check if we have complete datetime information
  hasCompleteDateTime(): boolean {
    // In recurring mode, we don't need date/time from the normal fields
    if (this.isRecurringMode) {
      return true;
    }
    return this.orchestrator.validation.hasCompleteDateTime(this.currentEvent, this.isAllDayEvent);
  }

  // Get current selection step (for UI feedback)
  getCurrentSelectionStep(): number {
    return this.orchestrator.dateTime.getCurrentSelectionStep(this.currentEvent, this.isAllDayEvent);
  }

  getSelectionStepMessage(): string {
    return this.orchestrator.dateTime.getSelectionStepMessage(this.currentEvent, this.isAllDayEvent);
  }

  // Enhanced validation for date and time with more comprehensive checks
  validateDateTimeRange(): ValidationResult {
    return this.orchestrator.validation.validateDateTimeRange(this.currentEvent, this.isAllDayEvent);
  }

  private autoCorrectDates(): void {
    this.orchestrator.dateTime.autoCorrectDates(this.currentEvent);
    this.showMessage(
      'info',
      'Date Auto-corrected',
      'End date was automatically adjusted to be after start date.'
    );
  }

  isDateDisabled = (date: Date): boolean => {
    const momentDate = moment(date);
    return (
      momentDate.isBefore(moment().startOf('day')) ||
      momentDate.isAfter(moment(this.maxSelectableDate))
    );
  };

  onAllDayToggle(): void {
    if (this.isAllDayEvent) {
      // When switching to all-day, clear time selections and set full day
      this.currentEvent.startTime = null;
      this.currentEvent.endTime = null;

      if (this.currentEvent.startDate) {
        this.currentEvent.start = moment(this.currentEvent.startDate)
          .startOf('day')
          .format('YYYY-MM-DDTHH:mm:ss');
      }

      if (this.currentEvent.endDate) {
        this.currentEvent.end = moment(this.currentEvent.endDate)
          .endOf('day')
          .format('YYYY-MM-DDTHH:mm:ss');
      }

      // If same day, extend to next day
      if (
        this.currentEvent.startDate &&
        this.currentEvent.endDate &&
        moment(this.currentEvent.startDate).isSame(this.currentEvent.endDate, 'day')
      ) {
        this.currentEvent.endDate = moment(this.currentEvent.startDate).add(1, 'day').toDate();
        this.currentEvent.end = moment(this.currentEvent.endDate)
          .endOf('day')
          .format('YYYY-MM-DDTHH:mm:ss');
      }
    } else {
      // When switching from all-day, set default business hours if dates are selected
      if (this.currentEvent.startDate) {
        this.currentEvent.startTime = '09:00';
        this.combineStartDateTime();
      }

      if (this.currentEvent.endDate) {
        this.currentEvent.endTime = '10:00';
        this.combineEndDateTime();
      }
    }

    this.validateStepwiseSelection();
    this.syncDateRangeWithCurrentEvent();

    // Force change detection to update inline calendars
    this.cdr.detectChanges();

    this.showMessage(
      'info',
      'Event Type Changed',
      this.isAllDayEvent
        ? 'Changed to all-day event - times cleared'
        : 'Changed to timed event - please select times'
    );
  }

  // ===================================
  // CUSTOM DAY SELECTION METHODS
  // ===================================

  showCustomDaysDialog(): void {
    // Initialize custom day selection based on current event dates
    this.customDaySelection.startRange = moment(this.currentEvent.start).toDate();
    this.customDaySelection.endRange = moment(this.currentEvent.end).toDate();
    this.customDaySelection.selectedDays = [];
    this.customDaySelection.pattern = 'specific';

    this.customDaysDialogVisible = true;
  }

  generateCustomDays(): void {
    const start = moment(this.customDaySelection.startRange);
    const end = moment(this.customDaySelection.endRange);
    const selectedDays: Date[] = [];

    if (start.isAfter(end)) {
      this.showMessage('error', 'Invalid Range', 'Start date must be before end date.');
      return;
    }

    switch (this.customDaySelection.pattern) {
      case 'specific':
        // User will manually select days - initialize with empty array
        break;

      case 'interval':
        const intervalDays = this.customDaySelection.intervalDays || 1;
        let current = start.clone();
        while (current.isSameOrBefore(end)) {
          selectedDays.push(current.toDate());
          current.add(intervalDays, 'days');
        }
        break;

      case 'weekdays':
        let weekdayCurrent = start.clone();
        while (weekdayCurrent.isSameOrBefore(end)) {
          if (weekdayCurrent.day() >= 1 && weekdayCurrent.day() <= 5) {
            // Monday to Friday
            selectedDays.push(weekdayCurrent.toDate());
          }
          weekdayCurrent.add(1, 'day');
        }
        break;

      case 'weekends':
        let weekendCurrent = start.clone();
        while (weekendCurrent.isSameOrBefore(end)) {
          if (weekendCurrent.day() === 0 || weekendCurrent.day() === 6) {
            // Sunday or Saturday
            selectedDays.push(weekendCurrent.toDate());
          }
          weekendCurrent.add(1, 'day');
        }
        break;
    }

    this.customDaySelection.selectedDays = selectedDays;

    if (selectedDays.length > 0) {
      this.showMessage(
        'success',
        'Days Generated',
        `${selectedDays.length} days selected based on your pattern.`
      );
    }
  }

  toggleCustomDay(date: Date): void {
    const dateStr = moment(date).format('YYYY-MM-DD');
    const index = this.customDaySelection.selectedDays.findIndex(
      (d) => moment(d).format('YYYY-MM-DD') === dateStr
    );

    if (index > -1) {
      this.customDaySelection.selectedDays.splice(index, 1);
    } else {
      this.customDaySelection.selectedDays.push(date);
    }

    // Sort selected days
    this.customDaySelection.selectedDays.sort((a, b) => moment(a).diff(moment(b)));
  }

  isCustomDaySelected(date: Date): boolean {
    const dateStr = moment(date).format('YYYY-MM-DD');
    return this.customDaySelection.selectedDays.some(
      (d) => moment(d).format('YYYY-MM-DD') === dateStr
    );
  }

  confirmCustomDays(): void {
    if (this.customDaySelection.selectedDays.length === 0) {
      this.showMessage('warning', 'No Days Selected', 'Please select at least one day.');
      return;
    }

    // Apply custom days to current event
    this.currentEvent.customDays = [...this.customDaySelection.selectedDays];

    // Update start and end dates to encompass the range
    const sortedDays = this.customDaySelection.selectedDays.sort((a, b) =>
      moment(a).diff(moment(b))
    );
    this.currentEvent.start = moment(sortedDays[0]).startOf('day').toDate();
    this.currentEvent.end = moment(sortedDays[sortedDays.length - 1])
      .endOf('day')
      .toDate();

    this.customDaysDialogVisible = false;
    this.showMessage(
      'success',
      'Custom Days Applied',
      `Event will occur on ${this.customDaySelection.selectedDays.length} selected days.`
    );
  }

  clearCustomDays(): void {
    this.customDaySelection.selectedDays = [];
    this.currentEvent.customDays = [];
  }

  // Enhanced weekday and date range methods
  applyWeekdayAndDateRange(): void {
    // Check if user has made any selections
    if (!this.hasSelectedWeekdays() && (!this.currentEvent.start || !this.currentEvent.end)) {
      this.showMessage(
        'warning',
        'No Selection',
        'Please select dates/times using the calendars above or select weekdays.'
      );
      return;
    }

    try {
      // Use dates from the main calendars as primary source
      if (this.currentEvent.start && this.currentEvent.end) {
        const startMoment = moment(this.currentEvent.start);
        const endMoment = moment(this.currentEvent.end);

        if (!startMoment.isValid() || !endMoment.isValid()) {
          this.showMessage(
            'error',
            'Invalid Dates',
            'Please ensure both start and end dates are properly selected.'
          );
          return;
        }

        if (endMoment.isSameOrBefore(startMoment)) {
          this.showMessage(
            'error',
            'Invalid Range',
            'End date and time must be after start date and time.'
          );
          return;
        }

        // If weekdays are selected, generate recurring dates for those weekdays
        if (this.hasSelectedWeekdays()) {
          const selectedDays: Date[] = [];
          const weekdayNumbers = this.getSelectedWeekdayNumbers();
          const current = startMoment.clone().startOf('day');
          const endDay = endMoment.clone().startOf('day');

          // Generate dates for selected weekdays within the date range
          while (current.isSameOrBefore(endDay)) {
            if (weekdayNumbers.includes(current.day())) {
              // Create date with same time as start date
              const dayWithTime = current
                .clone()
                .hour(startMoment.hour())
                .minute(startMoment.minute())
                .second(startMoment.second());
              selectedDays.push(dayWithTime.toDate());
            }
            current.add(1, 'day');
          }

          this.currentEvent.customDays = selectedDays;

          this.showMessage(
            'success',
            'Weekday Selection Applied',
            `Event will occur on ${this.getSelectedWeekdayNames().join(
              ', '
            )} within the selected date range (${selectedDays.length} occurrences).`
          );
        } else {
          // Clear any existing custom days if no weekdays selected
          this.currentEvent.customDays = [];

          this.showMessage(
            'success',
            'Date Range Applied',
            'Event date and time have been set from the calendars above.'
          );
        }

        // Sync the dateRangeSelection with current event
        this.dateRangeSelection.startDate = startMoment.toDate();
        this.dateRangeSelection.endDate = endMoment.toDate();
      }

      this.validateCurrentEvent();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error applying weekday and date range:', error);
      this.showMessage(
        'error',
        'Apply Failed',
        'Failed to apply selections. Please check your date and time inputs.'
      );
    }
  }
  clearWeekdayAndDateRange(): void {
    try {
      // Reset weekday selection
      this.weekdaySelection = {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
      };

      // Reset date range selection to null (no defaults)
      this.dateRangeSelection = {
        startDate: null,
        endDate: null,
      };

      // Clear main event dates
      this.currentEvent.start = '';
      this.currentEvent.end = '';

      // Clear custom days
      this.clearCustomDays();

      // Clear validation messages
      this.dateValidationErrors = [];
      this.dateValidationWarnings = [];

      // Reset All Day Event to unchecked
      this.isAllDayEvent = false;

      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error clearing selections:', error);
      this.showMessage(
        'error',
        'Clear Failed',
        'Failed to clear all selections. Please refresh the page if issues persist.'
      );
    }
  }

  private getSelectedWeekdayNumbers(): number[] {
    const weekdayNumbers: number[] = [];
    if (this.weekdaySelection.sunday) weekdayNumbers.push(0); // Sunday
    if (this.weekdaySelection.monday) weekdayNumbers.push(1); // Monday
    if (this.weekdaySelection.tuesday) weekdayNumbers.push(2); // Tuesday
    if (this.weekdaySelection.wednesday) weekdayNumbers.push(3); // Wednesday
    if (this.weekdaySelection.thursday) weekdayNumbers.push(4); // Thursday
    if (this.weekdaySelection.friday) weekdayNumbers.push(5); // Friday
    if (this.weekdaySelection.saturday) weekdayNumbers.push(6); // Saturday
    return weekdayNumbers;
  }

  // Sync date range selection with current event changes
  syncDateRangeWithCurrentEvent(): void {
    if (this.currentEvent.start && this.currentEvent.start !== '') {
      const startMoment = moment(this.currentEvent.start);
      this.dateRangeSelection.startDate = startMoment.isValid() ? startMoment.toDate() : null;
    } else {
      this.dateRangeSelection.startDate = null;
    }

    if (this.currentEvent.end && this.currentEvent.end !== '') {
      const endMoment = moment(this.currentEvent.end);
      this.dateRangeSelection.endDate = endMoment.isValid() ? endMoment.toDate() : null;
    } else {
      this.dateRangeSelection.endDate = null;
    }
  }

  // ===================================
  // QUICK EVENT CREATION METHODS
  // ===================================

  showEventDialog(event?: CalendarEvent, selectedDate?: Date): void {
    this.isEditMode = !!event;

    if (event) {
      // Edit mode - populate with existing event data
      const eventStart = moment(event.start);
      const eventEnd = moment((event as any).end || event.start);

      // Determine the actual event ID to use for updates
      // For recurring event instances, use the originalTaskId from metadata
      let eventId: number | undefined;
      const meta = (event as any).meta;

      if (meta && meta.originalTaskId) {
        // This is a recurring event instance - use the original task ID
        eventId = meta.originalTaskId;
      } else if (typeof event.id === 'number') {
        // Regular event with numeric ID
        eventId = event.id;
      } else if (typeof event.id === 'string') {
        // Try to parse string ID - if it contains dashes, it's likely a composite ID
        if (event.id.includes('-')) {
          // Composite ID like "123-2025-10-22-14-00" - extract the first part
          const firstPart = event.id.split('-')[0];
          const parsed = Number(firstPart);
          eventId = isNaN(parsed) ? undefined : parsed;
        } else {
          // Simple string ID - convert to number
          const parsed = Number(event.id);
          eventId = isNaN(parsed) ? undefined : parsed;
        }
      }

      this.currentEvent = {
        id: eventId,
        title: event.title || '',
        start: eventStart.format('YYYY-MM-DDTHH:mm:ss'),
        end: eventEnd.format('YYYY-MM-DDTHH:mm:ss'),
        // Populate separate date and time fields from existing event
        startDate: eventStart.toDate(),
        startTime: eventStart.format('HH:mm'),
        endDate: eventEnd.toDate(),
        endTime: eventEnd.format('HH:mm'),
        color: {
          primary: event.color?.primary || '#1e90ff',
          secondary:
            event.color?.secondary || this.lightenColor(event.color?.primary || '#1e90ff', 0.8),
        },
        meta: (event as any).meta || { description: '' },
        customDays: (event as any).customDays || [],
      };
      this.isAllDayEvent = !!event.allDay;

      // Populate weekday selections based on existing custom days
      this.populateWeekdaySelectionFromEvent();
    } else {
      // Create mode - start with empty form, only set date if clicked on specific date
      this.currentEvent = this.orchestrator.eventFactory.createEmptyEvent();

      // If user clicked on a specific date, set that as the start date only (no time defaults)
      if (selectedDate) {
        this.currentEvent.start = moment(selectedDate).format('YYYY-MM-DD');
        // Leave end date empty for user to select
        this.currentEvent.end = '';
      }

      // Always start with All Day Event unchecked
      this.isAllDayEvent = false;

      // Clear weekday selections for new events
      this.clearWeekdayAndDateRange();
    }

    // Initialize the enhanced date range selection
    this.dateRangeSelection.startDate = this.currentEvent.start
      ? moment(this.currentEvent.start).toDate()
      : null;
    this.dateRangeSelection.endDate = this.currentEvent.end
      ? moment(this.currentEvent.end).toDate()
      : null;

    // Clear validation messages and show dialog
    this.dateValidationErrors = [];
    this.dateValidationWarnings = [];
    this.showEventEditDialog = true;

    // Validate the populated data
    this.validateCurrentEvent();
  }

  // Populate weekday selections based on event's custom days
  private populateWeekdaySelectionFromEvent(): void {
    if (this.currentEvent.customDays && this.currentEvent.customDays.length > 0) {
      // Reset all weekdays first
      this.weekdaySelection = {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
      };

      // Analyze custom days to determine which weekdays are selected
      const weekdayCount: { [key: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

      this.currentEvent.customDays.forEach((date) => {
        const dayOfWeek = moment(date).day(); // 0=Sunday, 1=Monday, etc.
        weekdayCount[dayOfWeek]++;
      });

      // If a weekday appears in the custom days, mark it as selected
      this.weekdaySelection.sunday = weekdayCount[0] > 0;
      this.weekdaySelection.monday = weekdayCount[1] > 0;
      this.weekdaySelection.tuesday = weekdayCount[2] > 0;
      this.weekdaySelection.wednesday = weekdayCount[3] > 0;
      this.weekdaySelection.thursday = weekdayCount[4] > 0;
      this.weekdaySelection.friday = weekdayCount[5] > 0;
      this.weekdaySelection.saturday = weekdayCount[6] > 0;
    }
  }

  createNewQuickEvent(): void {
    const today = moment().toDate();
    this.showEventDialog(undefined, today);
  }

  getEventDuration(): string {
    const start = moment(this.currentEvent.start);
    const end = moment(this.currentEvent.end);
    const duration = moment.duration(end.diff(start));

    if (duration.asHours() >= 24) {
      return 'All day';
    } else if (duration.asHours() >= 1) {
      const hours = Math.floor(duration.asHours());
      const minutes = duration.minutes();
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else {
      return `${duration.minutes()}m`;
    }
  }

  setQuickDuration(minutes: number): void {
    if (!this.currentEvent.start) {
      this.showMessage(
        'warning',
        'Start Date Required',
        'Please select a start date and time first.'
      );
      return;
    }

    const startMoment = moment(this.currentEvent.start);
    if (!startMoment.isValid()) {
      this.showMessage(
        'warning',
        'Invalid Start Date',
        'Please select a valid start date and time first.'
      );
      return;
    }

    this.currentEvent.end = startMoment
      .clone()
      .add(minutes, 'minutes')
      .format('YYYY-MM-DDTHH:mm:ss');
    this.validateCurrentEvent();
    this.syncDateRangeWithCurrentEvent();

    // Force change detection to update inline calendars
    this.cdr.detectChanges();

    this.showMessage('success', 'Duration Set', `Event duration set to ${minutes} minutes.`);
  }
  setAllDayForCurrent(): void {
    this.isAllDayEvent = true;
    const selectedDay = moment(this.currentEvent.start);
    this.currentEvent.start = selectedDay.startOf('day').format('YYYY-MM-DDTHH:mm:ss');
    this.currentEvent.end = selectedDay.clone().endOf('day').format('YYYY-MM-DDTHH:mm:ss');
    this.validateCurrentEvent();
    this.syncDateRangeWithCurrentEvent();

    // Force change detection to update inline calendars
    this.cdr.detectChanges();

    this.showMessage('success', 'All Day Event', 'Event set as all-day event.');
  }

  // ===================================
  // QUICK BOOKING METHODS
  // ===================================

  /**
   * Sets up a quick booking with predefined duration starting from current date/time
   * @param minutes Duration in minutes (15, 30, 60)
   */
  setQuickBooking(minutes: number): void {
    // Exit recurring mode if active
    if (this.isRecurringMode) {
      this.isRecurringMode = false;
    }

    const now = moment();

    // Round to nearest 15-minute interval for cleaner times
    const roundedMinutes = Math.ceil(now.minute() / 15) * 15;
    const startTime = now.clone().minute(roundedMinutes).second(0).millisecond(0);

    // If rounding pushed us to next hour, adjust accordingly
    if (roundedMinutes >= 60) {
      startTime.add(1, 'hour').minute(0);
    }

    const endTime = startTime.clone().add(minutes, 'minutes');

    // Set the stepwise date/time fields
    this.currentEvent.startDate = startTime.toDate();
    this.currentEvent.startTime = startTime.format('HH:mm');
    this.currentEvent.endDate = endTime.toDate();
    this.currentEvent.endTime = endTime.format('HH:mm');

    // Combine into the main date fields
    this.combineStartDateTime();
    this.combineEndDateTime();

    // Clear all-day flag
    this.isAllDayEvent = false;

    // Set status message
    this.lastQuickBookingAction = `${minutes}-minute meeting from ${startTime.format('DD/MM/YYYY HH:mm')} to ${endTime.format('DD/MM/YYYY HH:mm')}`;

    // Auto-clear the message after 5 seconds
    setTimeout(() => {
      this.lastQuickBookingAction = null;
      this.cdr.detectChanges();
    }, 5000);

    // Validate the selection
    this.validateStepwiseSelection();

    // Sync with date range selection
    this.syncDateRangeWithCurrentEvent();

    // Update UI
    this.cdr.detectChanges();

    this.showMessage(
      'success',
      'Quick Booking Set',
      `${minutes}-minute meeting scheduled for ${startTime.format('DD/MM/YYYY HH:mm')}`
    );
  }

  /**
   * Sets up a quick all-day booking for today
   */
  setQuickBookingAllDay(): void {
    // Exit recurring mode if active
    if (this.isRecurringMode) {
      this.isRecurringMode = false;
    }

    const today = moment();

    // Set the stepwise date fields for all-day event
    this.currentEvent.startDate = today.toDate();
    this.currentEvent.endDate = today.toDate();

    // Clear time fields since it's all-day
    this.currentEvent.startTime = null;
    this.currentEvent.endTime = null;

    // Set all-day flag
    this.isAllDayEvent = true;

    // Set the main date fields for all-day
    this.currentEvent.start = today.startOf('day').format('YYYY-MM-DDTHH:mm:ss');
    this.currentEvent.end = today.endOf('day').format('YYYY-MM-DDTHH:mm:ss');

    // Set status message
    this.lastQuickBookingAction = `All-day event for ${today.format('DD/MM/YYYY')}`;

    // Auto-clear the message after 5 seconds
    setTimeout(() => {
      this.lastQuickBookingAction = null;
      this.cdr.detectChanges();
    }, 5000);

    // Validate the selection
    this.validateStepwiseSelection();

    // Sync with date range selection
    this.syncDateRangeWithCurrentEvent();

    // Update UI
    this.cdr.detectChanges();

    this.showMessage(
      'success',
      'Quick All-Day Booking Set',
      `All-day event scheduled for ${today.format('DD/MM/YYYY')}`
    );
  }

  /**
   * Clears the quick booking status message
   */
  clearQuickBookingMessage(): void {
    this.lastQuickBookingAction = null;
  }

  /**
   * Sets up recurring event mode with 10-year date range
   */
  setEventOccurs(): void {
    // Enable recurring mode
    this.isRecurringMode = true;

    // Set default 10-year date range internally
    const now = moment();
    const tenYearsLater = moment().add(10, 'years');

    // Set internal dates (not shown to user)
    this.currentEvent.startDate = now.toDate();
    this.currentEvent.endDate = tenYearsLater.toDate();

    // Set default times (9 AM to 10 AM)
    this.recurrenceStartTime = '09:00';
    this.recurrenceEndTime = '10:00';

    // Clear weekday selection
    this.recurrenceWeekdays = {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    };

    // Clear all-day flag
    this.isAllDayEvent = false;

    // Clear quick booking message
    this.lastQuickBookingAction = null;

    // Show message
    this.showMessage(
      'info',
      'Recurring Event Mode',
      'Configure recurring event by selecting times and weekdays'
    );

    this.cdr.detectChanges();
  }

  /**
   * Exits recurring event mode and returns to normal event creation
   */
  exitRecurringMode(): void {
    this.isRecurringMode = false;
    this.recurrenceStartTime = null;
    this.recurrenceEndTime = null;
    this.recurrenceWeekdays = {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    };

    // Reset to normal mode
    const now = moment();
    this.currentEvent.startDate = now.toDate();
    this.currentEvent.endDate = now.add(1, 'hour').toDate();
    this.currentEvent.startTime = null;
    this.currentEvent.endTime = null;

    this.showMessage(
      'info',
      'Normal Mode',
      'Switched back to normal event creation'
    );

    this.cdr.detectChanges();
  }

  /**
   * Gets a human-readable summary of the recurring event configuration
   */
  getRecurringSummary(): string | null {
    if (!this.isRecurringMode) {
      return null;
    }

    const selectedDays = this.getRecurringWeekdayNames();

    if (selectedDays.length === 0 || !this.recurrenceStartTime || !this.recurrenceEndTime) {
      return null;
    }

    // Convert 24-hour time to 12-hour format with AM/PM
    const startTime = this.formatTimeTo12Hour(this.recurrenceStartTime);
    const endTime = this.formatTimeTo12Hour(this.recurrenceEndTime);

    let daysText: string;
    if (selectedDays.length === 7) {
      daysText = 'every day';
    } else if (selectedDays.length === 5 &&
               this.recurrenceWeekdays.monday &&
               this.recurrenceWeekdays.tuesday &&
               this.recurrenceWeekdays.wednesday &&
               this.recurrenceWeekdays.thursday &&
               this.recurrenceWeekdays.friday) {
      daysText = 'every weekday';
    } else if (selectedDays.length === 2 &&
               this.recurrenceWeekdays.saturday &&
               this.recurrenceWeekdays.sunday) {
      daysText = 'every weekend';
    } else if (selectedDays.length === 1) {
      daysText = `every ${selectedDays[0]}`;
    } else {
      daysText = `every ${selectedDays.join(', ')}`;
    }

    return `Occurs ${daysText} from ${startTime} to ${endTime}`;
  }

  /**
   * Gets the names of selected recurring weekdays
   */
  getRecurringWeekdayNames(): string[] {
    const selectedDays: string[] = [];
    if (this.recurrenceWeekdays.monday) selectedDays.push('Monday');
    if (this.recurrenceWeekdays.tuesday) selectedDays.push('Tuesday');
    if (this.recurrenceWeekdays.wednesday) selectedDays.push('Wednesday');
    if (this.recurrenceWeekdays.thursday) selectedDays.push('Thursday');
    if (this.recurrenceWeekdays.friday) selectedDays.push('Friday');
    if (this.recurrenceWeekdays.saturday) selectedDays.push('Saturday');
    if (this.recurrenceWeekdays.sunday) selectedDays.push('Sunday');
    return selectedDays;
  }

  /**
   * Formats 24-hour time to 12-hour format with AM/PM
   */
  formatTimeTo12Hour(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  /**
   * Generates cron expression for recurring event start times
   */
  generateStartCronExpression(): string | null {
    if (!this.recurrenceStartTime) {
      return null;
    }

    const [hours, minutes] = this.recurrenceStartTime.split(':').map(Number);
    const selectedDays = this.getSelectedDaysOfWeek();

    if (selectedDays.length === 0) {
      return null;
    }

    // Cron format: minute hour day month weekday
    // For recurring weekly: minute hour * * weekdays
    return `${minutes} ${hours} * * ${selectedDays.join(',')}`;
  }

  /**
   * Generates cron expression for recurring event end times
   */
  generateEndCronExpression(): string | null {
    if (!this.recurrenceEndTime) {
      return null;
    }

    const [hours, minutes] = this.recurrenceEndTime.split(':').map(Number);
    const selectedDays = this.getSelectedDaysOfWeek();

    if (selectedDays.length === 0) {
      return null;
    }

    // Cron format: minute hour day month weekday
    return `${minutes} ${hours} * * ${selectedDays.join(',')}`;
  }

  /**
   * Gets selected days of week as cron day numbers (0=Sunday, 1=Monday, etc.)
   */
  getSelectedDaysOfWeek(): number[] {
    const days: number[] = [];
    if (this.recurrenceWeekdays.sunday) days.push(0);
    if (this.recurrenceWeekdays.monday) days.push(1);
    if (this.recurrenceWeekdays.tuesday) days.push(2);
    if (this.recurrenceWeekdays.wednesday) days.push(3);
    if (this.recurrenceWeekdays.thursday) days.push(4);
    if (this.recurrenceWeekdays.friday) days.push(5);
    if (this.recurrenceWeekdays.saturday) days.push(6);
    return days;
  }

  /**
   * Saves a recurring event with cron expressions
   */
  saveRecurringEvent(): void {
    // Validate recurring event configuration
    if (!this.recurrenceStartTime || !this.recurrenceEndTime) {
      this.showMessage('error', 'Validation Failed', 'Please select both start and end times.');
      return;
    }

    const selectedDays = this.getSelectedDaysOfWeek();
    if (selectedDays.length === 0) {
      this.showMessage('error', 'Validation Failed', 'Please select at least one weekday.');
      return;
    }

    if (!this.currentEvent.title || this.currentEvent.title.trim() === '') {
      this.showMessage('error', 'Validation Failed', 'Please enter an event title.');
      return;
    }

    // Validate that start time is before end time
    const [startHours, startMinutes] = this.recurrenceStartTime.split(':').map(Number);
    const [endHours, endMinutes] = this.recurrenceEndTime.split(':').map(Number);
    const startMinutesTotal = startHours * 60 + startMinutes;
    const endMinutesTotal = endHours * 60 + endMinutes;

    if (startMinutesTotal >= endMinutesTotal) {
      this.showMessage('error', 'Invalid Range', 'Start time must be before end time.');
      return;
    }

    try {
      // Generate cron expressions
      const startCron = this.generateStartCronExpression();
      const endCron = this.generateEndCronExpression();

      if (!startCron || !endCron) {
        this.showMessage('error', 'Configuration Error', 'Failed to generate recurrence schedule.');
        return;
      }

      // Set 10-year date range
      const now = moment();
      const tenYearsLater = moment().add(10, 'years');

      // Set the event dates for the recurring pattern
      this.currentEvent.start = now.format('YYYY-MM-DDTHH:mm:ss');
      this.currentEvent.end = tenYearsLater.format('YYYY-MM-DDTHH:mm:ss');

      // Configure recurrence pattern with cron expressions
      this.currentEvent.isRecurring = true;
      this.currentEvent.recurrencePattern = {
        type: 'weekly',
        interval: 1,
        daysOfWeek: selectedDays,
        endType: 'on',
        endOn: tenYearsLater.toDate(),
      };

      // Store cron expressions in metadata
      this.currentEvent.meta = {
        ...this.currentEvent.meta,
        description: this.currentEvent.meta?.description || '',
        startCron: startCron,
        endCron: endCron,
        recurrenceStartTime: this.recurrenceStartTime,
        recurrenceEndTime: this.recurrenceEndTime,
        recurrenceWeekdays: selectedDays,
        isRecurringCronEvent: true,
      };

      // Set appropriate secondary color based on primary color
      this.currentEvent.color.secondary = this.lightenColor(this.currentEvent.color.primary, 0.8);

      // Determine if this is an update or create operation
      const isUpdate = this.isEditMode && !!this.currentEvent.id;

      // Convert EventFormData to UpsertCalendarTaskCommand
      const command = this.orchestrator.eventFactory.convertEventFormDataToCommand(
        this.currentEvent,
        isUpdate
      );

      // Set loading state
      this.isSaving = true;

      // Call appropriate API endpoint
      const apiCall = isUpdate
        ? this.calendarTaskApi.updateCalendarTask(this.currentEvent.id as number, command)
        : this.calendarTaskApi.createCalendarTask(command);

      apiCall.subscribe({
        next: (response) => {
          this.isSaving = false;

          const summary = this.getRecurringSummary();
          this.showMessage(
            'success',
            'Recurring Event Saved',
            `Event "${response.title}" has been created. ${summary}`
          );

          this.hideEventDialog();

          // Reload events from server to get all recurring instances
          this.reloadEventsFromServer();

          this.cdr.detectChanges();
        },
        error: (error) => {
          this.isSaving = false;
          console.error('Error saving recurring event:', error);

          const errorMessage = error?.error?.message || error?.message || 'Unknown error occurred';
          this.showMessage(
            'error',
            'Save Failed',
            `Failed to ${isUpdate ? 'update' : 'create'} the recurring event: ${errorMessage}`
          );
        },
      });
    } catch (error) {
      console.error('Error saving recurring event:', error);
      this.isSaving = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.showMessage(
        'error',
        'Save Failed',
        `Failed to save the recurring event: ${errorMessage}`
      );
    }
  }

  // ===================================
  // CALENDAR VIEW METHODS
  // ===================================

  setView(view: CalendarView): void {
    this.view = view;
    setTimeout(() => {
      if (view === CalendarView.Day || view === CalendarView.Week) {
        this.viewChanged();
      }
    }, 0);
  }

  viewChanged(): void {
    setTimeout(() => {
      this.cdr.detectChanges();
      // Give the calendar more time to render before scrolling
      setTimeout(() => {
        this.scrollToCurrentView();
      }, 50);
    }, 0);
  }

  closeOpenMonthViewDay(): void {
    this.activeDayIsOpen = false;
    setTimeout(() => this.cdr.detectChanges(), 0);
  }

  // ===================================
  // CALENDAR EVENT HANDLERS
  // ===================================

  dayClicked({ date, events }: { date: Date; events: CalendarEvent[] }): void {
    if (moment(date).isSame(this.viewDate, 'month')) {
      const isSameDay = moment(date).isSame(this.viewDate, 'day');
      this.activeDayIsOpen = !(isSameDay && this.activeDayIsOpen) && events.length > 0;
      this.viewDate = date;

      setTimeout(() => this.cdr.detectChanges(), 0);
    }
  }

  timeSlotClicked(date: Date): void {
    this.viewDate = date;
    setTimeout(() => this.cdr.detectChanges(), 0);
  }
  eventClicked({ event }: { event: CalendarEvent }): void {
    this.showEventDialog(event);
  }

  eventTimesChanged({
    event,
    newStart,
    newEnd,
  }: {
    event: CalendarEvent;
    newStart: Date;
    newEnd?: Date;
  }): void {
    // Validate the new times before applying
    const validation = this.validateDateRange(newStart, newEnd || newStart);

    if (!validation.isValid) {
      this.showMessage('error', 'Invalid Move', validation.errors[0]);
      return;
    }

    const eventIndex = this.events.findIndex((e) => e === event);
    if (eventIndex !== -1) {
      this.events = this.events.map((e, index) =>
        index === eventIndex ? { ...event, start: newStart, end: newEnd } : e
      );
      setTimeout(() => this.cdr.detectChanges(), 0);
    }
  }

  // ===================================
  // EVENT DIALOG MANAGEMENT
  // ===================================

  hideEventDialog(): void {
    this.showEventEditDialog = false;
    this.resetForm();
  }

  onDialogHide(): void {
    this.resetForm();
  }

  // ===================================
  // DATE PICKER DIALOG METHODS
  // ===================================

  showStartDialog(): void {
    this.startDialogVisible = true;
  }

  closeStartDialog(): void {
    this.startDialogVisible = false;
  }

  confirmStartDate(): void {
    this.autoCorrectDates();
    this.validateCurrentEvent();
    this.startDialogVisible = false;
    this.cdr.detectChanges();
  }

  showEndDialog(): void {
    this.endDialogVisible = true;
  }

  closeEndDialog(): void {
    this.endDialogVisible = false;
  }

  confirmEndDate(): void {
    this.autoCorrectDates();
    this.validateCurrentEvent();
    this.endDialogVisible = false;
    this.cdr.detectChanges();
  }

  // ===================================
  // ENHANCED VALIDATION METHODS
  // ===================================

  validateCurrentEvent(): void {
    // Use stepwise validation instead of old method
    this.validateStepwiseSelection();
  }

  // ===================================
  // EVENT CRUD OPERATIONS
  // ===================================

  editEvent(event: CalendarEvent | EventFormData): void {
    const eventStart = moment(event.start);
    const eventEnd = moment((event as any).end || event.start);

    // Determine the actual event ID to use for updates
    // For recurring event instances, use the originalTaskId from metadata
    // For regular events, use the event.id directly
    let eventId: number | undefined;
    const meta = (event as any).meta;

    if (meta && meta.originalTaskId) {
      // This is a recurring event instance - use the original task ID
      eventId = meta.originalTaskId;
    } else if (typeof event.id === 'number') {
      // Regular event with numeric ID
      eventId = event.id;
    } else if (typeof event.id === 'string') {
      // Try to parse string ID - if it contains dashes, it's likely a composite ID
      if (event.id.includes('-')) {
        // Composite ID like "123-2025-10-22-14-00" - extract the first part
        const firstPart = event.id.split('-')[0];
        const parsed = Number(firstPart);
        eventId = isNaN(parsed) ? undefined : parsed;
      } else {
        // Simple string ID - convert to number
        const parsed = Number(event.id);
        eventId = isNaN(parsed) ? undefined : parsed;
      }
    }

    this.currentEvent = {
      id: eventId,
      title: event.title || '',
      start: eventStart.format('YYYY-MM-DDTHH:mm:ss'),
      end: eventEnd.format('YYYY-MM-DDTHH:mm:ss'),
      // Populate separate date and time fields from existing event
      startDate: eventStart.toDate(),
      startTime: eventStart.format('HH:mm'),
      endDate: eventEnd.toDate(),
      endTime: eventEnd.format('HH:mm'),
      color: {
        primary: event.color?.primary || '#ad2121',
        secondary: event.color?.secondary || '#FAE3E3',
      },
      meta: (event as any).meta || { description: '' },
      customDays: (event as any).customDays || [],
    };
  }

  saveEvent(): void {
    // Handle recurring mode separately
    if (this.isRecurringMode) {
      this.saveRecurringEvent();
      return;
    }

    // Validate the stepwise selection
    this.validateStepwiseSelection();

    if (!this.isFormValid()) {
      const errors = this.getFormValidationErrors();
      this.showMessage(
        'error',
        'Validation Failed',
        `Please complete the following steps: ${errors.join(', ')}`
      );
      return;
    }

    try {
      // Ensure we have complete date/time selection
      if (!this.hasCompleteDateTime()) {
        this.showMessage(
          'error',
          'Incomplete Selection',
          'Please complete both date and time selection steps before saving.'
        );
        return;
      }

      // Final combination and validation of dates/times
      if (this.isAllDayEvent) {
        this.combineStartDateTime();
        this.combineEndDateTime();
        // Set to full day
        this.currentEvent.start = moment(this.currentEvent.startDate)
          .startOf('day')
          .format('YYYY-MM-DDTHH:mm:ss');
        this.currentEvent.end = moment(this.currentEvent.endDate)
          .endOf('day')
          .format('YYYY-MM-DDTHH:mm:ss');
      } else {
        this.combineStartDateTime();
        this.combineEndDateTime();
      }

      // Final validation of combined datetime
      const startMoment = moment(this.currentEvent.start);
      const endMoment = moment(this.currentEvent.end);

      if (!startMoment.isValid() || !endMoment.isValid()) {
        this.showMessage(
          'error',
          'Invalid DateTime',
          'Selected dates and times are invalid. Please check your selections.'
        );
        return;
      }

      if (!startMoment.isBefore(endMoment)) {
        this.showMessage('error', 'Invalid Range', 'Start date/time must be before end date/time.');
        return;
      }

      // Apply weekday and date range selections if any
      if (this.hasSelectedWeekdays() || this.dateRangeSelection.startDate) {
        this.applyWeekdayAndDateRange();
      }

      // Set appropriate secondary color based on primary color
      this.currentEvent.color.secondary = this.lightenColor(this.currentEvent.color.primary, 0.8);

      // Determine if this is an update or create operation
      const isUpdate = this.isEditMode && !!this.currentEvent.id;

      // Convert EventFormData to UpsertCalendarTaskCommand
      const command = this.orchestrator.eventFactory.convertEventFormDataToCommand(
        this.currentEvent,
        isUpdate
      );

      // Set loading state
      this.isSaving = true;

      // Call appropriate API endpoint
      const apiCall = isUpdate
        ? this.calendarTaskApi.updateCalendarTask(this.currentEvent.id as number, command)
        : this.calendarTaskApi.createCalendarTask(command);

      apiCall.subscribe({
        next: (response) => {
          this.isSaving = false;

          // Convert the response to a CalendarEvent and update the UI
          const savedEvent = this.orchestrator.eventFactory.convertCalendarTaskToEvent(
            response,
            this.actions
          );

          if (isUpdate) {
            // Update existing event(s) in the array
            // For recurring events, we need to update all instances with the same originalTaskId
            // For single events, update by matching the ID directly

            const updatedEventId = this.currentEvent.id;

            // Remove all instances of this event (could be multiple for recurring events)
            this.events = this.events.filter((e) => {
              // Check if it's the same event
              const eventMeta = (e as any).meta;
              const isRecurringInstance = eventMeta && eventMeta.originalTaskId;

              if (isRecurringInstance) {
                // For recurring instances, match by originalTaskId
                return eventMeta.originalTaskId !== updatedEventId;
              } else {
                // For regular events, match by ID
                return e.id !== updatedEventId;
              }
            });

            // Add the updated event (note: for recurring events, the system will regenerate all instances on next reload)
            // For now, we'll just add the single updated instance
            this.events = [...this.events, savedEvent];

            this.showMessage(
              'success',
              'Event Updated',
              `Event "${response.title}" has been successfully updated.`
            );

            // Reload events from server to get fresh recurring instances
            this.reloadEventsFromServer();
          } else {
            // Add new event to the array
            this.events = [...this.events, savedEvent];
            this.showMessage(
              'success',
              'Event Created',
              `Event "${response.title}" has been successfully created.`
            );
          }

          this.hideEventDialog();

          // Update the viewDate to show the event if it's a new one
          if (!isUpdate && savedEvent.start) {
            this.viewDate = moment(savedEvent.start).toDate();
          }

          this.cdr.detectChanges();
        },
        error: (error) => {
          this.isSaving = false;
          console.error('Error saving event:', error);

          const errorMessage = error?.error?.message || error?.message || 'Unknown error occurred';
          this.showMessage(
            'error',
            'Save Failed',
            `Failed to ${isUpdate ? 'update' : 'create'} the event: ${errorMessage}`
          );
        },
      });
    } catch (error) {
      console.error('Error saving event:', error);
      this.isSaving = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.showMessage(
        'error',
        'Save Failed',
        `Failed to save the event: ${errorMessage}. Please check your date and time selections and try again.`
      );
    }
  }

  // Normalize dates to ensure consistent format using stepwise selection
  private normalizeDates(): void {
    if (this.isAllDayEvent) {
      if (this.currentEvent.startDate) {
        this.currentEvent.start = moment(this.currentEvent.startDate)
          .startOf('day')
          .format('YYYY-MM-DDTHH:mm:ss');
      }
      if (this.currentEvent.endDate) {
        this.currentEvent.end = moment(this.currentEvent.endDate)
          .endOf('day')
          .format('YYYY-MM-DDTHH:mm:ss');
      }
    } else {
      // Combine date and time information from stepwise selection
      this.combineStartDateTime();
      this.combineEndDateTime();
    }
  }

  // Helper to lighten a color for secondary color
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

  deleteEvent(): void {
    if (this.currentEvent.id) {
      this.confirmDeleteEvent(this.currentEvent as CalendarEvent);
      this.hideEventDialog();
    }
  }

  confirmDeleteEvent(event: CalendarEvent): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${event.title}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        // Determine the actual task ID to delete
        // For recurring event instances, use the originalTaskId from metadata
        let taskIdToDelete: number | undefined;
        const meta = (event as any).meta;

        if (meta && meta.originalTaskId) {
          // This is a recurring event instance - use the original task ID
          taskIdToDelete = meta.originalTaskId;
        } else if (typeof event.id === 'number') {
          // Regular event with numeric ID
          taskIdToDelete = event.id;
        } else if (typeof event.id === 'string') {
          // Try to parse string ID
          if (event.id.includes('-')) {
            // Composite ID like "123-2025-10-22-14-00" - extract the first part
            const firstPart = event.id.split('-')[0];
            const parsed = Number(firstPart);
            taskIdToDelete = isNaN(parsed) ? undefined : parsed;
          } else {
            // Simple string ID - convert to number
            const parsed = Number(event.id);
            taskIdToDelete = isNaN(parsed) ? undefined : parsed;
          }
        }

        // Check if we have a valid task ID to delete from the API
        if (taskIdToDelete) {
          this.isDeleting = true;

          this.calendarTaskApi.deleteCalendarTask(taskIdToDelete).subscribe({
            next: (success) => {
              this.isDeleting = false;

              if (success) {
                // Remove all instances of this event (for recurring events)
                this.removeEventById(taskIdToDelete);
                this.showMessage('success', 'Event Deleted', `"${event.title}" has been deleted.`);

                // Reload events to refresh recurring instances
                this.reloadEventsFromServer();
              } else {
                this.showMessage('error', 'Delete Failed', 'Failed to delete the event.');
              }
            },
            error: (error) => {
              this.isDeleting = false;
              console.error('Error deleting event:', error);

              const errorMessage = error?.error?.message || error?.message || 'Unknown error occurred';
              this.showMessage('error', 'Delete Failed', `Failed to delete the event: ${errorMessage}`);
            },
          });
        } else {
          // Local event (not from API), just remove from array
          this.removeEvent(event);
          this.showMessage('success', 'Event Deleted', `"${event.title}" has been deleted.`);
          setTimeout(() => this.cdr.detectChanges(), 0);
        }
      },
      reject: () => {
        this.showMessage('info', 'Delete Cancelled', 'Event deletion was cancelled.');
      },
    });
  }

  cancelEdit(): void {
    this.hideEventDialog();
  }

  // ===================================
  // VALIDATION METHODS
  // ===================================

  isFormValid(): boolean {
    // Special validation for recurring mode
    if (this.isRecurringMode) {
      // Check title
      if (!this.currentEvent.title || this.currentEvent.title.trim() === '') {
        return false;
      }
      // Check times
      if (!this.recurrenceStartTime || !this.recurrenceEndTime) {
        return false;
      }
      // Check at least one weekday selected
      const selectedDays = this.getSelectedDaysOfWeek();
      if (selectedDays.length === 0) {
        return false;
      }
      return true;
    }

    // Normal validation for non-recurring events
    const validation = this.orchestrator.validateEvent(this.currentEvent, this.isAllDayEvent, this.dateValidationErrors);
    return validation.isValid;
  }

  getFormValidationErrors(): string[] {
    // Special validation errors for recurring mode
    if (this.isRecurringMode) {
      const errors: string[] = [];
      if (!this.currentEvent.title || this.currentEvent.title.trim() === '') {
        errors.push('Event title required');
      }
      if (!this.recurrenceStartTime || !this.recurrenceEndTime) {
        errors.push('Start and end times required');
      }
      const selectedDays = this.getSelectedDaysOfWeek();
      if (selectedDays.length === 0) {
        errors.push('At least one weekday required');
      }
      return errors;
    }

    // Normal validation errors
    const validation = this.orchestrator.validateEvent(this.currentEvent, this.isAllDayEvent, this.dateValidationErrors);
    return validation.errors;
  }

  private updateExistingEvent(): void {
    const eventIndex = this.events.findIndex((e) => e.id === this.currentEvent.id);
    if (eventIndex === -1) {
      throw new Error('Event not found for update');
    }

    const updatedEvent: CalendarEvent = this.orchestrator.eventFactory.createCalendarEventFromFormData(this.currentEvent, this.actions);

    this.events = [
      ...this.events.slice(0, eventIndex),
      updatedEvent,
      ...this.events.slice(eventIndex + 1),
    ];
  }

  private createNewEvent(): void {
    const newEvent: CalendarEvent = this.orchestrator.eventFactory.createCalendarEventFromFormData({
      ...this.currentEvent,
      id: this.orchestrator.eventFactory.generateEventId(),
    }, this.actions);

    this.events = [...this.events, newEvent];
  }

  private removeEvent(eventToRemove: CalendarEvent): void {
    this.events = this.events.filter((event) => event.id !== eventToRemove.id);
  }

  /**
   * Remove all events (including recurring instances) that match the given task ID
   * @param taskId - The original task ID to remove
   */
  private removeEventById(taskId: number): void {
    this.events = this.events.filter((event) => {
      const eventMeta = (event as any).meta;
      const isRecurringInstance = eventMeta && eventMeta.originalTaskId;

      if (isRecurringInstance) {
        // For recurring instances, match by originalTaskId
        return eventMeta.originalTaskId !== taskId;
      } else {
        // For regular events, match by ID
        return event.id !== taskId;
      }
    });
  }

  private resetForm(): void {
    this.currentEvent = this.orchestrator.eventFactory.createEmptyEvent();
    this.dateValidationErrors = [];
    this.dateValidationWarnings = [];
    this.isAllDayEvent = false; // Always reset to unchecked
    this.lastQuickBookingAction = null; // Clear quick booking message
    this.clearCustomDays();
    this.clearWeekdayAndDateRange();

    // Reset recurring mode
    this.isRecurringMode = false;
    this.recurrenceStartTime = null;
    this.recurrenceEndTime = null;
    this.recurrenceWeekdays = {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    };
  }

  private scrollToCurrentView(): void {
    if (this.view === CalendarView.Week || this.view === CalendarView.Day) {
      // Wait a bit more to ensure DOM is fully rendered
      setTimeout(() => {
        this.scrollToCurrentTime();
      }, 100);
    }
  }

  /**
   * Scrolls to the current time position in the day/week view
   * Calculates the scroll position based on current time and hour segment configuration
   */
  private scrollToCurrentTime(): void {
    if (!this.calendarContainer?.nativeElement) {
      return;
    }

    const container = this.calendarContainer.nativeElement;
    const now = moment();
    const currentHour = now.hour();
    const currentMinute = now.minute();

    // Calculate total minutes from start of day
    const totalMinutesFromStart = currentHour * 60 + currentMinute;

    // Calendar configuration: hourSegments=2, hourSegmentHeight=24px
    const hourSegments = 2; // 30-minute segments (60/2)
    const hourSegmentHeight = 24; // pixels per segment
    const minutesPerSegment = 60 / hourSegments; // 30 minutes per segment

    // Calculate the scroll position
    const segmentsSinceStart = totalMinutesFromStart / minutesPerSegment;
    const scrollPosition = segmentsSinceStart * hourSegmentHeight;

    // Offset to show some context before current time (show 1-2 hours before)
    const contextOffset = hourSegmentHeight * hourSegments * 1.5; // 1.5 hours before
    const finalScrollPosition = Math.max(0, scrollPosition - contextOffset);

    // Smooth scroll to the calculated position
    container.scrollTo({
      top: finalScrollPosition,
      behavior: 'smooth'
    });
  }

  /**
   * Manually trigger scroll to current time (can be called from UI if needed)
   */
  scrollToCurrentTimeManual(): void {
    if (this.view === CalendarView.Day || this.view === CalendarView.Week) {
      this.scrollToCurrentTime();
    } else {
      this.showMessage(
        'info',
        'Scroll to Current Time',
        'This feature is only available in Day or Week view.'
      );
    }
  }

  private showMessage(severity: string, summary: string, detail: string): void {
    this.messageService.add({ severity, summary, detail, life: 3000 });
  }
}

