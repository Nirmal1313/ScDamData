import { InjectionToken } from '@angular/core';

/**
 * Injection token for the API base URL.
 * Use this token to inject the configured API base URL into services.
 *
 * @example
 * ```typescript
 * constructor(@Inject(API_BASE_URL) private baseUrl: string) {}
 * ```
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => 'https://localhost:5010/api'
});
