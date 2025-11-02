import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { ConfigService } from '../../../core/services/config.service';
import { CalendarTaskDTO } from '../models/calendar-task.interface';
import { ApiResponse } from '../../../core/models/api.model';

@Injectable({
  providedIn: 'root'
})
export class CalendarTaskApiService {

  constructor(
    private apiService: ApiService,
    private configService: ConfigService
  ) { }

  /**
   * Fetch all calendar tasks for the authenticated user
   * @returns Observable of CalendarTaskDTO array
   */
  getAllCalendarTasks(): Observable<CalendarTaskDTO[]> {
    const endpoint = this.configService.getApiUrl('calendarEvent');

    return this.apiService.get<CalendarTaskDTO[]>(`${endpoint}/all`, {}, 'main').pipe(
      map((response: ApiResponse<CalendarTaskDTO[]>) => {

        // Handle the response - if data is directly in response, return it
        // Otherwise return empty array
        if (response && Array.isArray(response)) {
          return response;
        }
        // If response has a data property
        if (response && (response as any).data) {
          return (response as any).data;
        }

        return [];
      })
    );
  }

  /**
   * Fetch a single calendar task by ID
   * @param id - The task ID
   * @returns Observable of CalendarTaskDTO
   */
  getCalendarTaskById(id: number): Observable<CalendarTaskDTO> {
    return this.apiService.get<CalendarTaskDTO>(`calendarTask/${id}`, {}, 'main').pipe(
      map((response: ApiResponse<CalendarTaskDTO>) => {
        if (response && (response as any).data) {
          return (response as any).data;
        }
        return response as any;
      })
    );
  }

  /**
   * Create a new calendar task
   * @param task - The task data to create
   * @returns Observable of created CalendarTaskDTO
   */
  createCalendarTask(task: Partial<CalendarTaskDTO>): Observable<CalendarTaskDTO> {
    return this.apiService.post<CalendarTaskDTO>('calendarTask/create', task, 'main').pipe(
      map((response: ApiResponse<CalendarTaskDTO>) => {
        if (response && (response as any).data) {
          return (response as any).data;
        }
        return response as any;
      })
    );
  }

  /**
   * Update an existing calendar task
   * @param id - The task ID
   * @param task - The task data to update
   * @returns Observable of updated CalendarTaskDTO
   */
  updateCalendarTask(id: number, task: Partial<CalendarTaskDTO>): Observable<CalendarTaskDTO> {
    return this.apiService.put<CalendarTaskDTO>(`calendarTask/update/${id}`, task, 'main').pipe(
      map((response: ApiResponse<CalendarTaskDTO>) => {
        if (response && (response as any).data) {
          return (response as any).data;
        }
        return response as any;
      })
    );
  }

  /**
   * Delete a calendar task
   * @param id - The task ID to delete
   * @returns Observable of boolean indicating success
   */
  deleteCalendarTask(id: number): Observable<boolean> {
    return this.apiService.delete<any>(`calendarTask/delete/${id}`, 'main').pipe(
      map((response: ApiResponse<any>) => {
        if (response && (response as any).isSuccess !== undefined) {
          return (response as any).isSuccess;
        }
        return true;
      })
    );
  }
}
