import { Pipe, PipeTransform, inject } from '@angular/core';
import { LoggerService } from '../../../core/services/logger.service';
import {
  ProjectStatus,
  TaskPriority,
  NoteStatus,
  NoteType,
  ProjectStatusLabels,
  TaskPriorityLabels,
  NoteStatusLabels,
  NoteTypeLabels
} from '../models/enums';

/**
 * Enum to Label Pipe
 *
 * Converts enum numeric values to human-readable labels
 * Supports all project note enum types
 *
 * Usage:
 * {{ status | enumToLabel:'status' }}
 * {{ priority | enumToLabel:'priority' }}
 */
@Pipe({
  name: 'enumToLabel',
  standalone: true
})
export class EnumToLabelPipe implements PipeTransform {
  private logger = inject(LoggerService);

  /**
   * Transform enum value to readable label
   *
   * @param value Enum numeric value
   * @param enumType Type of enum (status, priority, noteStatus, noteType)
   * @returns Human-readable label or original value if not found
   */
  transform(
    value: number | null | undefined,
    enumType: 'status' | 'priority' | 'noteStatus' | 'noteType'
  ): string {
    // Handle null/undefined values
    if (value === null || value === undefined) {
      return '';
    }

    try {
      // Get appropriate label map based on enum type
      const labelMap = this.getLabelMap(enumType);

      // Return label or original value if not found
      return labelMap[value] || value.toString();
    } catch (error) {
      this.logger.error('Error converting enum to label:', error);
      return value.toString();
    }
  }

  /**
   * Get the appropriate label map for the enum type
   *
   * @param enumType Type of enum
   * @returns Record mapping enum values to labels
   */
  private getLabelMap(
    enumType: 'status' | 'priority' | 'noteStatus' | 'noteType'
  ): Record<number, string> {
    switch (enumType) {
      case 'status':
        return ProjectStatusLabels;
      case 'priority':
        return TaskPriorityLabels;
      case 'noteStatus':
        return NoteStatusLabels;
      case 'noteType':
        return NoteTypeLabels;
      default:
        this.logger.warn(`Unknown enum type: ${enumType}`);
        return {};
    }
  }
}
