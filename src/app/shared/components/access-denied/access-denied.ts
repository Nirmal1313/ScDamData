import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule],
  template: `
    <div class="access-denied-container">
      <p-card>
        <div class="content">
          <i class="pi pi-ban" style="font-size: 4rem; color: var(--red-500);"></i>
          <h1>Access Denied</h1>
          <p class="message">{{ message }}</p>
          <div class="actions">
            <p-button
              label="Go to Dashboard"
              icon="pi pi-home"
              (onClick)="goToDashboard()"
              styleClass="p-button-raised">
            </p-button>
            <p-button
              label="Go Back"
              icon="pi pi-arrow-left"
              (onClick)="goBack()"
              styleClass="p-button-outlined"
              [style]="{'margin-left': '1rem'}">
            </p-button>
          </div>
        </div>
      </p-card>
    </div>
  `,
  styles: [`
    .access-denied-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    :host ::ng-deep .p-card {
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .content {
      text-align: center;
      padding: 2rem;
    }

    h1 {
      color: var(--red-600);
      margin: 1.5rem 0 1rem 0;
      font-size: 2rem;
    }

    .message {
      color: var(--text-color-secondary);
      margin-bottom: 2rem;
      font-size: 1.1rem;
      line-height: 1.6;
    }

    .actions {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    @media (max-width: 576px) {
      .actions {
        flex-direction: column;
      }

      .actions p-button {
        width: 100%;
      }
    }
  `]
})
export class AccessDenied {
  message: string = 'You do not have permission to access this page.';
  returnUrl: string | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Check for specific reason in query params
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'];
      const reason = params['reason'];

      if (reason === 'insufficient-permissions') {
        this.message = 'You do not have the required permissions to access this resource. Please contact your administrator if you believe this is an error.';
      } else if (reason === 'expired') {
        this.message = 'Your session has expired. Please log in again to continue.';
      }
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goBack(): void {
    window.history.back();
  }
}
