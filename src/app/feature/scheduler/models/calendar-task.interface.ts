// Interface matching the backend CalendarTaskQuery DTO
export interface CalendarTaskDTO {
  id: number;
  title: string;
  description: string;
  startCronExpression: string; // Cron expression for event start time
  endCronExpression: string;   // Cron expression for event end time
  timeZone: string;
  priority: TaskPriority;
  status: TaskStatus;
  color: string;
  createdByUserName: "string";
  updatedByUserName: "string";
  createdDate: string; // ISO date string
  modifiedDate?: string; // ISO date string
  isActive: boolean;
}

// Enums matching backend
export enum TaskPriority {
  Low = 0,
  Medium = 1,
  High = 2,
  Critical = 3
}

export enum TaskStatus {
  Pending = 0,
  InProgress = 1,
  Completed = 2,
  Cancelled = 3,
  OnHold = 4
}
