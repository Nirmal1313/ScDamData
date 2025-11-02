/**
 * Project Status Enum
 * Represents the current state of a project note
 */
export enum ProjectStatus {
  Planning = 1,
  Active = 2,
  OnHold = 3,
  Completed = 4,
  Cancelled = 5
}

/**
 * Map enum values to display labels
 */
export const ProjectStatusLabels: Record<ProjectStatus, string> = {
  [ProjectStatus.Planning]: 'Planning',
  [ProjectStatus.Active]: 'Active',
  [ProjectStatus.OnHold]: 'On Hold',
  [ProjectStatus.Completed]: 'Completed',
  [ProjectStatus.Cancelled]: 'Cancelled'
};
