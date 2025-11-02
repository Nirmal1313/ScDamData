export interface EventFormData {
  id?: number;
  title: string;
  start: string | Date;
  end: string | Date;
  // Separate date and time fields for stepwise selection
  startDate: Date | null;
  startTime: string | null;
  endDate: Date | null;
  endTime: string | null;
  color: { primary: string; secondary: string };
  meta: any;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  customDays?: Date[];
}

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number;
  daysOfWeek?: number[];
  endType: 'never' | 'after' | 'on';
  endAfter?: number;
  endOn?: Date;
  customDates?: Date[];
}
