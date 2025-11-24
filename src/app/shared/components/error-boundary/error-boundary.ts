import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { LoggerService } from '../../../core/services/logger.service';

/**
 * Error Boundary Component
 *
 * Provides graceful error handling with user-friendly UI.
 * Displays error information and recovery options.
 * Logs errors for debugging.
 *
 * Usage:
 * Wrap components that might throw errors:
 * <app-error-boundary>
 *   <your-component></your-component>
 * </app-error-boundary>
 */
@Component({
  selector: 'app-error-boundary',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule],
  template: `
    <ng-container *ngIf="!hasError">
      <ng-content></ng-content>
    </ng-container>

    <div *ngIf="hasError" class="error-boundary-container">
      <p-card>
        <div class="error-content">
          <i class="pi pi-exclamation-triangle" style="font-size: 4rem; color: var(--orange-500);"></i>
          <h2>{{ errorTitle }}</h2>
          <p class="error-message">{{ errorMessage }}</p>

          <div *ngIf="showDetails && errorDetails" class="error-details">
            <details>
              <summary>Technical Details</summary>
              <pre>{{ errorDetails }}</pre>
            </details>
          </div>

          <div class="error-actions">
            <p-button
              label="Try Again"
              icon="pi pi-refresh"
              (onClick)="retry()"
              styleClass="p-button-raised">
            </p-button>
            <p-button
              label="Go to Dashboard"
              icon="pi pi-home"
              (onClick)="goHome()"
              styleClass="p-button-outlined"
              [style]="{'margin-left': '1rem'}">
            </p-button>
            <p-button
              *ngIf="canReload"
              label="Reload Page"
              icon="pi pi-sync"
              (onClick)="reloadPage()"
              styleClass="p-button-text"
              [style]="{'margin-left': '1rem'}">
            </p-button>
          </div>
        </div>
      </p-card>
    </div>
  `,
  styles: [`
    .error-boundary-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 400px;
      padding: 2rem;
    }

    :host ::ng-deep .p-card {
      max-width: 600px;
      width: 100%;
    }

    .error-content {
      text-align: center;
      padding: 2rem;
    }

    h2 {
      color: var(--orange-600);
      margin: 1.5rem 0 1rem 0;
      font-size: 1.75rem;
    }

    .error-message {
      color: var(--text-color-secondary);
      margin-bottom: 1.5rem;
      font-size: 1.1rem;
      line-height: 1.6;
    }

    .error-details {
      margin: 1.5rem 0;
      text-align: left;
    }

    .error-details details {
      background: var(--surface-ground);
      padding: 1rem;
      border-radius: 6px;
      cursor: pointer;
    }

    .error-details summary {
      font-weight: 600;
      color: var(--primary-color);
      user-select: none;
    }

    .error-details pre {
      margin-top: 1rem;
      padding: 1rem;
      background: var(--surface-card);
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--text-color);
      max-height: 300px;
      overflow-y: auto;
    }

    .error-actions {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 2rem;
    }

    @media (max-width: 576px) {
      .error-actions {
        flex-direction: column;
      }

      .error-actions p-button {
        width: 100%;
        margin-left: 0 !important;
        margin-top: 0.5rem;
      }
    }
  `]
})
export class ErrorBoundary implements OnInit {
  @Input() errorTitle: string = 'Something Went Wrong';
  @Input() errorMessage: string = 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  @Input() showDetails: boolean = false;
  @Input() canReload: boolean = true;
  @Input() retryCallback?: () => void;

  hasError: boolean = false;
  errorDetails: string | null = null;

  private logger = inject(LoggerService);
  private router = inject(Router);

  ngOnInit(): void {
    // Set up global error handler
    window.addEventListener('error', this.handleWindowError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
  }

  private handleWindowError(event: ErrorEvent): void {
    this.captureError(event.error || new Error(event.message), {
      type: 'window-error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    this.captureError(event.reason, {
      type: 'unhandled-rejection'
    });
  }

  captureError(error: any, context?: any): void {
    this.hasError = true;

    // Extract error details
    if (error instanceof Error) {
      this.errorDetails = `${error.name}: ${error.message}\n\nStack Trace:\n${error.stack || 'No stack trace available'}`;
    } else {
      this.errorDetails = JSON.stringify(error, null, 2);
    }

    // Log error with context
    const errorWithContext = context ? { ...error, context } : error;
    this.logger.error('Error boundary caught error', errorWithContext);
  }

  retry(): void {
    if (this.retryCallback) {
      this.hasError = false;
      this.errorDetails = null;
      this.retryCallback();
    } else {
      this.reloadPage();
    }
  }

  goHome(): void {
    this.hasError = false;
    this.errorDetails = null;
    this.router.navigate(['/dashboard']);
  }

  reloadPage(): void {
    window.location.reload();
  }
}
