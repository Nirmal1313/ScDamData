import { Login } from './../../login/login';
// src/app/core/services/auth.service.ts
import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, catchError, switchMap, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { User, AuthState } from '../models/user.model';
import { StorageService } from './storage.service';
import { ApiService } from './api.service';
import { RegistrationModel } from '../models/register.model';
import { ConfigService } from './config.service';
import { ApiResponse, AuthResponse, LoginRequest } from '../models/api.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'token';
  private readonly USER_KEY = 'user';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private isBrowser: boolean;

  private authStateSubject = new BehaviorSubject<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  });

  public authState$ = this.authStateSubject.asObservable();
  public currentUser$ = this.authStateSubject.asObservable().pipe(tap((state) => state.user));

  constructor(
    private http: HttpClient,
    private apiService: ApiService,
    private storageService: StorageService,
    private router: Router,
    private configService: ConfigService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    // Only load from storage in browser environment
    if (this.isBrowser) {
      this.loadAuthStateFromStorage();
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    // If we're on the server during SSR, we should skip actual login requests
    if (!this.isBrowser) {
      return throwError(() => new Error('Login is only available in browser environment'));
    }

    this.setLoading(true);

    // Use ApiService with proper type
    return this.apiService
      .post<AuthResponse>(this.configService.getApiUrl('login'), credentials, 'main')
      .pipe(
        map((response: ApiResponse<AuthResponse>) => {
          // Extract data from ApiResponse wrapper and return AuthResponse
          return this.extractAuthData(response);
        }),
        tap((authData: AuthResponse) => {
          if (!authData.token) {
            throw new Error('No token received from server');
          }

          // Determine storage type based on rememberMe
          const storageType = credentials.rememberMe ? 'localStorage' : 'sessionStorage';

          // Store authentication data
          this.storageService.setStorageType(storageType);
          this.storageService.setItem(this.TOKEN_KEY, authData.token);
          this.storageService.setItem(this.USER_KEY, JSON.stringify(authData.user));

          if (authData.refreshToken) {
            this.storageService.setItem(this.REFRESH_TOKEN_KEY, authData.refreshToken);
          }

          // Update auth state
          this.authStateSubject.next({
            user: authData.user,
            token: authData.token,
            refreshToken: authData.refreshToken,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
        }),
        catchError((error) => {
          const errorMessage = this.extractErrorMessage(error);
          this.authStateSubject.next({
            ...this.authStateSubject.value,
            loading: false,
            error: errorMessage,
          });
          return throwError(() => error);
        })
      );
  }  /**
   * Extract authentication data from API response
   * Handles different response structures for backward compatibility
   */
  private extractAuthData(response: any): AuthResponse {
    // Check if response is wrapped in ApiResponse structure
    let data = response.data || response;

    // Handle nested result structure (legacy support)
    if (!data.token && data.result) {
      data = data.result;
    }

    // Construct standardized AuthResponse
    return {
      token: data.token,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      user: {
        id: data.user?.id || data.userId || data.id || '',
        username: data.user?.username || data.userName || data.username || '',
        email: data.user?.email || data.email || '',
        firstName: data.user?.firstName || data.firstName || '',
        lastName: data.user?.lastName || data.lastName || '',
      },
    };
  }

  /**
   * Extract user-friendly error message from error response
   */
  private extractErrorMessage(error: any): string {
    if (error.error?.message) {
      return error.error.message;
    }

    if (error.error?.errors) {
      // Handle validation errors
      const errors = Object.values(error.error.errors).flat();
      return errors.join(', ');
    }

    // Handle HTTP status codes
    switch (error.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Invalid username or password.';
      case 403:
        return 'Access denied.';
      case 404:
        return 'Service not found.';
      case 500:
        return 'Server error. Please try again later.';
      case 0:
        return 'Network error. Please check your connection.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  logout(): void {
    // Only interact with storage in browser environment
    if (this.isBrowser) {
      this.storageService.removeItem(this.TOKEN_KEY);
      this.storageService.removeItem(this.USER_KEY);
      this.storageService.removeItem(this.REFRESH_TOKEN_KEY);
    }

    this.authStateSubject.next({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,
    });

    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  getToken(): string | null {
    return this.authStateSubject.value.token;
  }

  getCurrentUser(): User | null {
    return this.authStateSubject.value.user;
  }

  register(registrationData: RegistrationModel): Observable<any> {
    this.setLoading(true);

    return this.apiService.post<any>(this.configService.getApiUrl('register'), registrationData, 'main').pipe(
      tap((response) => {
        this.setLoading(false);
        // Optional: you could automatically log the user in here
        // or just let them be redirected to the login page
      }),
      catchError((error) => {
        this.setLoading(false);
        this.authStateSubject.next({
          ...this.authStateSubject.value,
          error: error?.error || 'Registration failed. Please try again.',
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Set loading state
   * @param loading Loading state
   */
  private setLoading(loading: boolean): void {
    this.authStateSubject.next({
      ...this.authStateSubject.value,
      loading,
      error: loading ? null : this.authStateSubject.value.error,
    });
  }

  private loadAuthStateFromStorage(): void {
    // Don't attempt to load from storage when in server-side rendering
    if (!this.isBrowser) {
      return;
    }

    // Try localStorage first
    this.storageService.setStorageType('localStorage');
    let token = this.storageService.getItem(this.TOKEN_KEY);
    let userJson = this.storageService.getItem(this.USER_KEY);
    let refreshToken = this.storageService.getItem(this.REFRESH_TOKEN_KEY);


    // If not found in localStorage, try sessionStorage
    if (!token) {
      this.storageService.setStorageType('sessionStorage');
      token = this.storageService.getItem(this.TOKEN_KEY);
      userJson = this.storageService.getItem(this.USER_KEY);
      refreshToken = this.storageService.getItem(this.REFRESH_TOKEN_KEY);
    }

    if (token && userJson && userJson !== 'undefined' && userJson !== 'null') {
      try {
        const user = JSON.parse(userJson) as User;

        this.authStateSubject.next({
          user: user,
          token: token,
          isAuthenticated: true,
          loading: false,
          error: null,
        });

      } catch (error) {
        console.error('Failed to parse user from storage', error);
        // Clear invalid data from storage
        this.storageService.removeItem(this.TOKEN_KEY);
        this.storageService.removeItem(this.USER_KEY);
        this.storageService.removeItem(this.REFRESH_TOKEN_KEY);
      }
    }
  }
}
