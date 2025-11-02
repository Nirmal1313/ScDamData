export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CustomDaySelection {
  startRange: Date;
  endRange: Date;
  selectedDays: Date[];
  pattern: 'specific' | 'interval' | 'weekdays' | 'weekends';
  intervalDays?: number;
}

export interface WeekdaySelection {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

export interface DateRangeWithTime {
  startDate: Date | null;
  endDate: Date | null;
}

export interface QuickEventData {
  title: string;
  startDate: Date;
  endDate: Date;
  selectedDate: Date;
}
