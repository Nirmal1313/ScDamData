import { ProjectStatus, TaskPriority, NoteStatus, NoteType } from './enums';

/**
 * Project Note Interface
 * Represents a comprehensive project note entity with all 22+ properties
 * Matches the backend ProjectNoteQuery DTO structure
 */
export interface ProjectNote {
  // Identifiers
  id: number;

  // Basic Information
  name: string;
  description: string;
  title: string;
  author: string;
  client: string;

  // Dates (DateOnly from backend)
  reportingDate: string; // ISO date string format
  dueDate: string; // ISO date string format

  // Task Details
  taskDetail: string;
  compilation: string;

  // Enum Status Fields
  status: ProjectStatus;
  priority: TaskPriority;
  noteStatus: NoteStatus;
  noteType: NoteType;

  // Additional Notes
  notes: string;

  // Timestamp Dates
  startDate: string | null;
  endDate: string | null;
  createdDate: string;
  lastModifiedDate: string | null;

  // User Tracking
  createdBy: string;
  updatedBy: string | null;

  // Settings/Flags
  isActive: boolean;
  isPublic: boolean;

  // Metadata
  color: string;
}

/**
 * Project Note Creation/Update Command
 * Used for POST and PUT operations
 */
export interface UpsertProjectNoteCommand {
  id?: number;
  name: string;
  description: string;
  title: string;
  author: string;
  client: string;
  reportingDate: string;
  dueDate: string;
  taskDetail: string;
  compilation: string;
  status: ProjectStatus;
  priority: TaskPriority;
  noteStatus: NoteStatus;
  noteType: NoteType;
  notes: string;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  isPublic: boolean;
  color: string;
}

/**
 * Default values for creating a new project note
 */
export const DEFAULT_PROJECT_NOTE: Partial<UpsertProjectNoteCommand> = {
  name: '',
  description: '',
  title: '',
  author: '',
  client: '',
  taskDetail: '',
  compilation: '',
  notes: '',
  status: ProjectStatus.Active,
  priority: TaskPriority.Medium,
  noteStatus: NoteStatus.Draft,
  noteType: NoteType.General,
  isActive: true,
  isPublic: false,
  color: '#3498db'
};
