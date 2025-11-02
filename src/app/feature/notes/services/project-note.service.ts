import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { finalize, tap, map } from 'rxjs/operators';
import { ProjectNote, UpsertProjectNoteCommand } from '../models/project-note.interface';
import { UI_MESSAGES } from '../constants/project-note.constants';
import { ApiService } from '../../../core/services/api.service';

/**
 * Project Note Service
 *
 * Single Responsibility: Handles ALL HTTP operations for project notes
 * Dependency Inversion: Uses ApiService interface, easy to mock for testing
 *
 * This service provides a clean API layer for CRUD operations on project notes.
 * All HTTP calls are centralized through ApiService.
 */
@Injectable({
  providedIn: 'root'
})
export class ProjectNoteService {
  private readonly apiEndpoint = 'ProjectNote';

  // Loading state management
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private apiService: ApiService) {}

  /**
   * Get all project notes
   *
   * @returns Observable of project note array
   */
  getAllProjectNotes(): Observable<ProjectNote[]> {
    this.setLoading(true);

    return this.apiService.directGet<ProjectNote[]>(`${this.apiEndpoint}/all`, undefined, undefined, 'main')
      .pipe(
        tap(() => this.logSuccess('Loaded project notes successfully')),
        finalize(() => this.setLoading(false))
      );
  }

  /**
   * Get a single project note by ID
   *
   * @param id The project note ID
   * @returns Observable of single project note
   */
  getProjectNoteById(id: number): Observable<ProjectNote> {
    this.setLoading(true);

    return this.apiService.directGet<ProjectNote>(`${this.apiEndpoint}/${id}`, undefined, undefined, 'main')
      .pipe(
        tap(() => this.logSuccess(`Loaded project note ${id}`)),
        finalize(() => this.setLoading(false))
      );
  }

  /**
   * Create a new project note
   *
   * @param command The project note data to create
   * @returns Observable of created project note
   */
  createProjectNote(command: UpsertProjectNoteCommand): Observable<ProjectNote> {
    this.setLoading(true);

    return this.apiService.directPost<ProjectNote>(`${this.apiEndpoint}/create`, command, undefined, 'main')
      .pipe(
        tap(() => this.logSuccess('Project note created successfully')),
        finalize(() => this.setLoading(false))
      );
  }

  /**
   * Update an existing project note
   *
   * @param id The project note ID to update
   * @param command The updated project note data
   * @returns Observable of updated project note
   */
  updateProjectNote(id: number, command: UpsertProjectNoteCommand): Observable<ProjectNote> {
    this.setLoading(true);

    // Ensure ID matches
    command.id = id;

    return this.apiService.directPut<ProjectNote>(`${this.apiEndpoint}/update/${id}`, command, undefined, 'main')
      .pipe(
        tap(() => this.logSuccess(`Project note ${id} updated successfully`)),
        finalize(() => this.setLoading(false))
      );
  }

  /**
   * Delete a project note
   *
   * @param id The project note ID to delete
   * @returns Observable of void
   */
  deleteProjectNote(id: number): Observable<void> {
    return this.deleteProjectNotes([id]);
  }

  /**
   * Delete multiple project notes (batch delete)
   *
   * @param ids Array of project note IDs to delete
   * @returns Observable of void
   */
  deleteProjectNotes(ids: number[]): Observable<void> {
    this.setLoading(true);

    // Build query parameters: ?id=1&id=2&id=3
    const queryParams = ids.map(id => `id=${id}`).join('&');

    return this.apiService.directDelete<void>(`${this.apiEndpoint}/delete?${queryParams}`, undefined, 'main')
      .pipe(
        tap(() => this.logSuccess(`Project note(s) ${ids.join(', ')} deleted successfully`)),
        finalize(() => this.setLoading(false))
      );
  }

  /**
   * Set loading state
   *
   * @param isLoading Loading state boolean
   */
  private setLoading(isLoading: boolean): void {
    this.loadingSubject.next(isLoading);
  }

  /**
   * Log success messages (in development)
   *
   * @param message Success message to log
   */
  private logSuccess(message: string): void {
    // Success logging removed for production
  }

  /**
   * Get current loading state (synchronous)
   *
   * @returns Current loading state
   */
  isLoading(): boolean {
    return this.loadingSubject.value;
  }
}
