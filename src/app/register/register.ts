import { RegistrationModel } from './../core/models/register.model';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoggerService } from '../core/services/logger.service';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
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
import { finalize } from 'rxjs/operators';
import { RippleModule } from 'primeng/ripple';
import { DividerModule } from 'primeng/divider';
import { RouterModule } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-register',
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
    RouterModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage: string | undefined;

  constructor(
    private router: Router,
    private authService: AuthService,
    private fb: FormBuilder,
    private messageService: MessageService
  ) {
    this.registerForm = this.fb.group(
      {
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        username: ['', [Validators.required, Validators.minLength(4)]],
        password: [
          '',
          [Validators.required, Validators.minLength(8), this.createPasswordStrengthValidator()],
        ],
        confirmPassword: ['', [Validators.required]],
        acceptTerms: [false, [Validators.requiredTrue]],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );
  }

  // Custom validator to check if password and confirmPassword match
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  // Custom validator for password strength
  createPasswordStrengthValidator(): (control: AbstractControl) => ValidationErrors | null {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      if (!value) {
        return null;
      }

      const hasUpperCase = /[A-Z]+/.test(value);
      const hasLowerCase = /[a-z]+/.test(value);
      const hasNumeric = /[0-9]+/.test(value);
      const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(value);

      const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecial;

      return !passwordValid ? { passwordStrength: true } : null;
    };
  }

  onSubmit() {
    // Clear previous error message to allow retry
    this.errorMessage = undefined;

    if (this.registerForm.invalid) {
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    this.isLoading = true;

    const registrationData: RegistrationModel = {
      firstName: this.registerForm.value.firstName,
      lastName: this.registerForm.value.lastName,
      email: this.registerForm.value.email,
      username: this.registerForm.value.username,
      password: this.registerForm.value.password,
      confirmPassword: this.registerForm.value.confirmPassword,
      acceptTerms: this.registerForm.value.acceptTerms,
    };

    this.authService
      .register(registrationData)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Registration Successful',
            detail: 'Your account has been created successfully. Redirecting to login...',
            life: 3000,
          });
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (err) => {
          this.isLoading = false; // Ensure loading stops immediately on error
          this.errorMessage = this.extractErrorMessage(err);
          const logger = inject(LoggerService);
          logger.error('Registration failed:', this.errorMessage);
          this.messageService.add({
            severity: 'error',
            summary: 'Registration Failed',
            detail: this.errorMessage || 'Registration failed. Please try again.',
            life: 5000,
          });
        },
      });
  }

  // Helper method to mark all controls in a form group as touched
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
        return 'Invalid registration data. Please check your input.';
      case 401:
        return 'Unauthorized access.';
      case 403:
        return 'Access denied.';
      case 404:
        return 'Service not found. Please contact support.';
      case 409:
        return 'An account with this username or email already exists.';
      case 500:
        return 'Server error. Please try again later.';
      case 0:
        return 'Network error. Please check your internet connection.';
      default:
        return 'Registration failed. Please try again.';
    }
  }
}
