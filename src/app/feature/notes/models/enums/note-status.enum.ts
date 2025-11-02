/**
 * Note Status Enum
 * Represents the publication state of a note
 */
export enum NoteStatus {
  Draft = 1,
  InReview = 2,
  Published = 3,
  Archived = 4
}

/**
 * Map enum values to display labels
 */
export const NoteStatusLabels: Record<NoteStatus, string> = {
  [NoteStatus.Draft]: 'Draft',
  [NoteStatus.InReview]: 'In Review',
  [NoteStatus.Published]: 'Published',
  [NoteStatus.Archived]: 'Archived'
};
