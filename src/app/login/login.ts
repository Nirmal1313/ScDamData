import { Component, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { LoggerService } from '../core/services/logger.service';
import { finalize } from 'rxjs/operators';
import { RippleModule } from 'primeng/ripple';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PasswordModule,
    ButtonModule,
    CheckboxModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    MessageModule,
    CardModule,
    RippleModule,
    DividerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;

  // Image loading properties
  imageLoaded = false;
  imageLoadError = false;

  // Image paths - Using public folder (Angular 19+ structure)
  // The placeholder should be a tiny (< 5KB) blurred version of your image
  placeholderImage = 'images/login-bg-placeholder.jpg'; // Tiny blurred version
  backgroundImage = 'images/login-bg.webp'; // Optimized WebP version

  // Platform check for SSR compatibility
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  constructor(
    private router: Router,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
      rememberMe: [false],
    });

    // Log image paths for debugging
    // Preload the main image for faster loading (only in browser)
    this.preloadImage();
  }

  /**
   * Preload the background image to cache it
   * Only runs in browser context to avoid SSR errors
   */
  private preloadImage(): void {
    // Check if running in browser before using Image constructor
    if (this.isBrowser) {
      const img = new Image();
      img.src = this.backgroundImage;
      // Image will be cached by browser once loaded
    }
  }

  /**
   * Called when the main background image loads successfully
   */
  onImageLoad(): void {
    this.imageLoaded = true;
  }

  /**
   * Called if the main background image fails to load
   * Falls back to showing just the placeholder
   */
  onImageError(): void {
    this.imageLoadError = true;
    const logger = inject(LoggerService);
    logger.error('Failed to load background image, using placeholder', { path: this.backgroundImage });
  }

  onSubmit() {
    // Clear previous error message to allow retry
    this.errorMessage = null;

    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isLoading = true;

    this.authService.login(this.loginForm.value)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isLoading = false; // Ensure loading stops immediately on error
          this.errorMessage = this.extractErrorMessage(err);
          const logger = inject(LoggerService);
          logger.error('Login failed:', this.errorMessage);
        }
      });
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Extract user-friendly error message from error response
   * Prevents displaying API URLs or technical error details to users
   */
  private extractErrorMessage(error: any): string {
    // Check for specific error message from API
    if (error.error && typeof error.error === 'object') {
      if (error.error.message) {
        return error.error.message;
      }

      // Handle validation errors
      if (error.error.errors) {
        const errors = Object.values(error.error.errors).flat();
        return (errors as string[]).join(', ');
      }

      // Handle simple error string
      if (error.error.error && typeof error.error.error === 'string') {
        return error.error.error;
      }
    }

    // Check for error message string directly
    if (typeof error.error === 'string' && !error.error.includes('http')) {
      return error.error;
    }

    // Check for timeout error
    if (error.name === 'TimeoutError' || error.error === 'timeout') {
      return 'Request timed out. The server is taking too long to respond. Please try again.';
    }

    // Handle HTTP status codes with user-friendly messages
    switch (error.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Invalid username or password.';
      case 403:
        return 'Access denied.';
      case 404:
        return 'Service not found. Please contact support.';
      case 500:
        return 'Server error. Please try again later.';
      case 0:
        return 'Network error. Please check your internet connection.';
      default:
        return 'Login failed. Please check your credentials and try again.';
    }
  }
}
