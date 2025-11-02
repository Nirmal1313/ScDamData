import { TaskPriority, TaskStatus } from './calendar-task.interface';

// Interface matching the backend UpsertCalendarTaskCommand
export interface UpsertCalendarTaskCommand {
  id?: number; // Optional for create, required for update
  title: string;
  description: string;
  startCronExpression: string; // Cron expression for event start time
  endCronExpression: string;   // Cron expression for event end time
  timeZone: string;
  priority: TaskPriority;
  status: TaskStatus;
  color: string;
  createdByUserName: "string"; // Set by backend
  updatedByUserName: "string"; // Set by backend
}
