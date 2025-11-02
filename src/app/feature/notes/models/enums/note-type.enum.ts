/**
 * Note Type Enum
 * Categorizes the type of note content
 */
export enum NoteType {
  General = 1,
  Meeting = 2,
  Research = 3,
  Todo = 4,
  Specification = 5,
  Documentation = 6,
  Idea = 7
}

/**
 * Map enum values to display labels
 */
export const NoteTypeLabels: Record<NoteType, string> = {
  [NoteType.General]: 'General',
  [NoteType.Meeting]: 'Meeting',
  [NoteType.Research]: 'Research',
  [NoteType.Todo]: 'To-Do',
  [NoteType.Specification]: 'Specification',
  [NoteType.Documentation]: 'Documentation',
  [NoteType.Idea]: 'Idea'
};
