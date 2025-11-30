// src/app/core/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, PaginatedResponse } from '../models/api.model';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  /**
   * Make a GET request to an API endpoint
   * @param endpoint - The endpoint path
   * @param params - Optional query parameters
   * @param apiName - The name of the API to use (defaults to 'main')
   * @param headers - Optional HTTP headers
   * @returns Observable of the API response
   */
  get<T>(endpoint: string, params?: any, apiName: string = 'main', headers?: any): Observable<ApiResponse<T>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }

    const apiUrl = this.configService.getApiUrl(apiName as any);
    return this.http.get<ApiResponse<T>>(`${apiUrl}/${endpoint}`, { params: httpParams, headers });
  }

  /**
   * Make a GET request to get paginated data from an API endpoint
   * @param endpoint - The endpoint path
   * @param page - Page number (defaults to 1)
   * @param pageSize - Items per page (defaults to 10)
   * @param params - Optional query parameters
   * @param apiName - The name of the API to use (defaults to 'main')
   * @returns Observable of the paginated response
   */
  getPaginated<T>(
    endpoint: string,
    page = 1,
    pageSize = 10,
    params?: any,
    apiName: string = 'main'
  ): Observable<PaginatedResponse<T>> {
    let httpParams = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }

    const apiUrl = this.configService.getApiUrl(apiName as any);
    return this.http.get<PaginatedResponse<T>>(`${apiUrl}/${endpoint}`, { params: httpParams });
  }

  /**
   * Make a POST request to an API endpoint
   * @param endpoint - The endpoint path
   * @param data - The data to send
   * @param apiName - The name of the API to use (defaults to 'main')
   * @returns Observable of the API response
   */
  post<T>(endpoint: string, data: any, apiName: string = 'main'): Observable<ApiResponse<T>> {
    const apiUrl = this.configService.getApiUrl(apiName as any);
    return this.http.post<ApiResponse<T>>(`${apiUrl}/${endpoint}`, data);
  }

  /**
   * Make a PUT request to an API endpoint
   * @param endpoint - The endpoint path
   * @param data - The data to send
   * @param apiName - The name of the API to use (defaults to 'main')
   * @returns Observable of the API response
   */
  put<T>(endpoint: string, data: any, apiName: string = 'main'): Observable<ApiResponse<T>> {
    const apiUrl = this.configService.getApiUrl(apiName as any);
    return this.http.put<ApiResponse<T>>(`${apiUrl}/${endpoint}`, data);
  }

  /**
   * Make a PATCH request to an API endpoint
   * @param endpoint - The endpoint path
   * @param data - The data to send
   * @param apiName - The name of the API to use (defaults to 'main')
   * @returns Observable of the API response
   */
  patch<T>(endpoint: string, data: any, apiName: string = 'main'): Observable<ApiResponse<T>> {
    const apiUrl = this.configService.getApiUrl(apiName as any);
    return this.http.patch<ApiResponse<T>>(`${apiUrl}/${endpoint}`, data);
  }

  /**
   * Make a DELETE request to an API endpoint
   * @param endpoint - The endpoint path
   * @param apiName - The name of the API to use (defaults to 'main')
   * @returns Observable of the API response
   */
  delete<T>(endpoint: string, apiName: string = 'main'): Observable<ApiResponse<T>> {
    const apiUrl = this.configService.getApiUrl(apiName as any);
    return this.http.delete<ApiResponse<T>>(`${apiUrl}/${endpoint}`);
  }

  /**
   * Make a direct GET request to an external API
   * @param url - Complete URL or API endpoint
   * @param params - Query parameters
   * @param headers - HTTP headers
   * @param useApiName - Optional API name to use from config
   * @returns Observable of the response
   */
  directGet<T>(
    url: string,
    params?: any,
    headers?: HttpHeaders,
    useApiName?: string
  ): Observable<T> {
    const fullUrl = useApiName ? `${this.configService.getApiUrl(useApiName as any)}/${url}` : url;

    return this.http.get<T>(fullUrl, {
      params: params instanceof HttpParams ? params : new HttpParams({ fromObject: params || {} }),
      headers
    });
  }

  /**
   * Make a direct POST request to an external API
   * @param url - Complete URL or API endpoint
   * @param data - Data to send
   * @param headers - HTTP headers
   * @param useApiName - Optional API name to use from config
   * @returns Observable of the response
   */
  directPost<T>(
    url: string,
    data: any,
    headers?: HttpHeaders,
    useApiName?: string
  ): Observable<T> {
    const fullUrl = useApiName ? `${this.configService.getApiUrl(useApiName as any)}/${url}` : url;

    return this.http.post<T>(fullUrl, data, { headers });
  }

  /**
   * Make a direct PUT request to an external API
   * @param url - Complete URL or API endpoint
   * @param data - Data to send
   * @param headers - HTTP headers
   * @param useApiName - Optional API name to use from config
   * @returns Observable of the response
   */
  directPut<T>(
    url: string,
    data: any,
    headers?: HttpHeaders,
    useApiName?: string
  ): Observable<T> {
    const fullUrl = useApiName ? `${this.configService.getApiUrl(useApiName as any)}/${url}` : url;

    return this.http.put<T>(fullUrl, data, { headers });
  }

  /**
   * Make a direct DELETE request to an external API
   * @param url - Complete URL or API endpoint
   * @param headers - HTTP headers
   * @param useApiName - Optional API name to use from config
   * @returns Observable of the response
   */
  directDelete<T>(
    url: string,
    headers?: HttpHeaders,
    useApiName?: string
  ): Observable<T> {
    const fullUrl = useApiName ? `${this.configService.getApiUrl(useApiName as any)}/${url}` : url;

    return this.http.delete<T>(fullUrl, { headers });
  }

  /**
   * Get the full URL for a specific API and endpoint
   * @param apiName - The name of the API to use
   * @param endpoint - The endpoint path (optional)
   * @returns The full URL
   */
  getFullUrl(apiName: string = 'main', endpoint?: string): string {
    const apiUrl = this.configService.getApiUrl(apiName as any);
    return endpoint ? `${apiUrl}/${endpoint}` : apiUrl;
  }
}
