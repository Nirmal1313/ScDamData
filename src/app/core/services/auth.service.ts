import { Login } from './../../login/login';
// src/app/core/services/auth.service.ts
import { Injectable, PLATFORM_ID, Inject, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of, timer, Subject } from 'rxjs';
import { tap, catchError, switchMap, map, takeUntil, filter } from 'rxjs/operators';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { User, AuthState } from '../models/user.model';
import { StorageService } from './storage.service';
import { ApiService } from './api.service';
import { RegistrationModel } from '../models/register.model';
import { ConfigService } from './config.service';
import { LoggerService } from './logger.service';
import { ApiResponse, AuthResponse, LoginRequest } from '../models/api.model';
import { jwtDecode } from 'jwt-decode';

/**
 * JWT Token Payload Interface
 * Represents the decoded JWT token structure
 */
interface JwtPayload {
  sub?: string;          // Subject (user ID)
  exp?: number;          // Expiration time (seconds since epoch)
  iat?: number;          // Issued at (seconds since epoch)
  email?: string;        // User email
  username?: string;     // Username
  role?: string;         // User role
  [key: string]: any;    // Additional claims
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Namespaced storage keys to prevent collisions
  private readonly APP_PREFIX = 'scrivenerdam_';
  private readonly TOKEN_KEY = `${this.APP_PREFIX}token`;
  private readonly USER_KEY = `${this.APP_PREFIX}user`;
  private readonly REFRESH_TOKEN_KEY = `${this.APP_PREFIX}refresh_token`;
  private readonly TOKEN_EXPIRY_KEY = `${this.APP_PREFIX}token_expiry`;

  private isBrowser: boolean;
  private refreshTokenInProgress = false;
  private tokenRefreshTimer?: any;
  private destroy$ = new Subject<void>();

  // Token refresh buffer: refresh 5 minutes before expiry
  private readonly TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

  private authStateSubject = new BehaviorSubject<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  });

  public authState$ = this.authStateSubject.asObservable();
  public currentUser$ = this.authStateSubject.asObservable().pipe(map((state) => state.user));

  constructor(
    private http: HttpClient,
    private apiService: ApiService,
    private storageService: StorageService,
    private router: Router,
    private configService: ConfigService,
    private logger: LoggerService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    // Only load from storage in browser environment
    if (this.isBrowser) {
      this.loadAuthStateFromStorage();
      this.scheduleTokenRefresh();
    }
  }

  /**
   * Decode JWT token and extract payload
   * @param token - JWT token string
   * @returns Decoded token payload or null if invalid
   */
  private decodeToken(token: string): JwtPayload | null {
    try {
      return jwtDecode<JwtPayload>(token);
    } catch (error) {
      this.logger.error('Failed to decode JWT token', error);
      return null;
    }
  }

  /**
   * Validate JWT token structure and expiration
   * @param token - JWT token string
   * @returns true if token is valid and not expired
   */
  private validateToken(token: string): boolean {
    if (!token) {
      this.logger.warn('Token validation failed: empty token');
      return false;
    }

    const payload = this.decodeToken(token);
    if (!payload) {
      this.logger.warn('Token validation failed: invalid token structure');
      return false;
    }

    // Check expiration
    if (payload.exp) {
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();

      if (now >= expiryTime) {
        this.logger.warn('Token validation failed: token expired', {
          expiryTime: new Date(expiryTime).toISOString(),
          now: new Date(now).toISOString()
        });
        return false;
      }

      this.logger.debug('Token validated successfully', {
        expiresIn: Math.round((expiryTime - now) / 1000) + 's'
      });
    }

    return true;
  }

  /**
   * Get token expiry time from JWT payload
   * @param token - JWT token string
   * @returns Expiry timestamp in milliseconds, or null if not available
   */
  private getTokenExpiry(token: string): number | null {
    const payload = this.decodeToken(token);
    return payload?.exp ? payload.exp * 1000 : null;
  }

  /**
   * Schedule automatic token refresh before expiration
   * Refreshes 5 minutes before token expires
   */
  private scheduleTokenRefresh(): void {
    // Clear existing timer
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    const token = this.getToken();
    if (!token) {
      return;
    }

    const expiryTime = this.getTokenExpiry(token);
    if (!expiryTime) {
      this.logger.warn('Cannot schedule token refresh: no expiry time in token');
      return;
    }

    const refreshTime = expiryTime - this.TOKEN_REFRESH_BUFFER_MS;
    const now = Date.now();
    const delay = refreshTime - now;

    if (delay <= 0) {
      this.logger.warn('Token expires soon, refreshing immediately');
      this.refreshToken().subscribe();
    } else {
      this.logger.info(`Scheduling token refresh in ${Math.round(delay / 1000)}s`);
      this.tokenRefreshTimer = setTimeout(() => {
        this.refreshToken().subscribe();
      }, delay);
    }
  }

  /**
   * Refresh authentication token using refresh token
   * @returns Observable of refreshed AuthResponse
   */
  private refreshToken(): Observable<AuthResponse> {
    if (this.refreshTokenInProgress) {
      this.logger.debug('Token refresh already in progress, skipping');
      return of(null as any);
    }

    const refreshToken = this.storageService.getItem(this.REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      this.logger.warn('No refresh token available, logging out');
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    this.refreshTokenInProgress = true;
    this.logger.info('Refreshing authentication token');

    return this.apiService
      .post<AuthResponse>('account/refresh-token', { refreshToken }, 'main')
      .pipe(
        map((response: ApiResponse<AuthResponse>) => this.extractAuthData(response)),
        tap((authData: AuthResponse) => {
          this.logger.info('Token refreshed successfully');

          // Update stored tokens
          this.storageService.setItem(this.TOKEN_KEY, authData.token);
          if (authData.refreshToken) {
            this.storageService.setItem(this.REFRESH_TOKEN_KEY, authData.refreshToken);
          }

          // Update auth state
          this.authStateSubject.next({
            ...this.authStateSubject.value,
            token: authData.token,
            refreshToken: authData.refreshToken
          });

          // Schedule next refresh
          this.scheduleTokenRefresh();
          this.refreshTokenInProgress = false;
        }),
        catchError((error) => {
          this.logger.error('Token refresh failed', error);
          this.refreshTokenInProgress = false;
          this.logout();
          return throwError(() => error);
        })
      );
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    // If we're on the server during SSR, we should skip actual login requests
    if (!this.isBrowser) {
      return throwError(() => new Error('Login is only available in browser environment'));
    }

    this.setLoading(true);

    // Use ApiService with proper type
    return this.apiService
      .post<AuthResponse>('account/login', credentials, 'main')
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

          // Validate token before storing
          if (!this.validateToken(authData.token)) {
            throw new Error('Received invalid token from server');
          }

          // Store authentication data with namespaced keys
          this.storageService.setStorageType(storageType);
          this.storageService.setItem(this.TOKEN_KEY, authData.token);
          this.storageService.setItem(this.USER_KEY, JSON.stringify(authData.user));

          // Store token expiry for faster validation
          const expiry = this.getTokenExpiry(authData.token);
          if (expiry) {
            this.storageService.setItem(this.TOKEN_EXPIRY_KEY, expiry.toString());
          }

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

          // Schedule automatic token refresh
          this.scheduleTokenRefresh();

          this.logger.info('User logged in successfully', {
            username: authData.user.username,
            storageType
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
    this.logger.info('User logging out');

    // Clear refresh timer
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = undefined;
    }

    // Only interact with storage in browser environment
    if (this.isBrowser) {
      this.storageService.removeItem(this.TOKEN_KEY);
      this.storageService.removeItem(this.USER_KEY);
      this.storageService.removeItem(this.REFRESH_TOKEN_KEY);
      this.storageService.removeItem(this.TOKEN_EXPIRY_KEY);
    }

    this.authStateSubject.next({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,
    });

    // Emit destroy signal to stop any ongoing subscriptions
    this.destroy$.next();

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

    return this.apiService.post<any>('account/register', registrationData, 'main').pipe(
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
        // Validate token before restoring auth state
        if (!this.validateToken(token)) {
          this.logger.warn('Stored token is invalid or expired, clearing auth state');
          this.clearStoredAuth();
          return;
        }

        const user = JSON.parse(userJson) as User;

        this.authStateSubject.next({
          user: user,
          token: token,
          refreshToken: refreshToken || undefined,
          isAuthenticated: true,
          loading: false,
          error: null,
        });

        this.logger.info('Auth state restored from storage', {
          username: user.username
        });

        // Schedule token refresh if needed
        this.scheduleTokenRefresh();

      } catch (error) {
        this.logger.error('Failed to parse user from storage', error);
        this.clearStoredAuth();
      }
    }
  }

  /**
   * Clear all stored authentication data
   * Helper method to ensure all auth data is removed consistently
   */
  private clearStoredAuth(): void {
    this.storageService.removeItem(this.TOKEN_KEY);
    this.storageService.removeItem(this.USER_KEY);
    this.storageService.removeItem(this.REFRESH_TOKEN_KEY);
    this.storageService.removeItem(this.TOKEN_EXPIRY_KEY);
  }

  /**
   * Check if token will expire soon (within refresh buffer)
   * @returns true if token expires within TOKEN_REFRESH_BUFFER_MS
   */
  isTokenExpiringSoon(): boolean {
    const token = this.getToken();
    if (!token) return false;

    const expiry = this.getTokenExpiry(token);
    if (!expiry) return false;

    return (expiry - Date.now()) <= this.TOKEN_REFRESH_BUFFER_MS;
  }

  /**
   * Get time until token expiration
   * @returns milliseconds until expiration, or null if no valid token
   */
  getTimeUntilExpiry(): number | null {
    const token = this.getToken();
    if (!token) return null;

    const expiry = this.getTokenExpiry(token);
    if (!expiry) return null;

    return Math.max(0, expiry - Date.now());
  }
}
