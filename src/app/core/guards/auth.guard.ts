// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '../services/logger.service';
import { map, take } from 'rxjs/operators';

/**
 * Authentication Guard (Functional)
 *
 * Protects routes that require authentication.
 * Redirects unauthenticated users to login page.
 * Validates token expiration before allowing access.
 * Stores attempted URL for post-login redirect.
 *
 * Usage in routes:
 * {
 *   path: 'dashboard',
 *   component: Dashboard,
 *   canActivate: [authGuard]
 * }
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const logger = inject(LoggerService);

  return authService.authState$.pipe(
    take(1),
    map(authState => {
      // Check if user is authenticated
      if (!authState.isAuthenticated || !authState.token) {
        logger.warn('Auth guard: User not authenticated, redirecting to login', {
          attemptedUrl: state.url
        });

        // Store the attempted URL for redirecting after login
        router.navigate(['/login'], {
          queryParams: { returnUrl: state.url }
        });

        return false;
      }

      // Check if token is expired
      const timeUntilExpiry = authService.getTimeUntilExpiry();
      if (timeUntilExpiry !== null && timeUntilExpiry <= 0) {
        logger.warn('Auth guard: Token expired, redirecting to login', {
          attemptedUrl: state.url
        });

        authService.logout();
        router.navigate(['/login'], {
          queryParams: { returnUrl: state.url, reason: 'expired' }
        });

        return false;
      }

      // Check if token is expiring soon and trigger refresh
      if (authService.isTokenExpiringSoon()) {
        logger.info('Auth guard: Token expiring soon, access granted but refresh recommended');
      }

      logger.debug('Auth guard: Access granted', {
        url: state.url,
        user: authState.user?.username
      });

      return true;
    })
  );
};

/**
 * Guest Guard (Functional)
 *
 * Protects routes that should only be accessible to non-authenticated users
 * (e.g., login, register pages).
 * Redirects authenticated users to dashboard.
 *
 * Usage in routes:
 * {
 *   path: 'login',
 *   component: Login,
 *   canActivate: [guestGuard]
 * }
 */
export const guestGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const logger = inject(LoggerService);

  return authService.authState$.pipe(
    take(1),
    map(authState => {
      if (authState.isAuthenticated && authState.token) {
        logger.debug('Guest guard: User already authenticated, redirecting to dashboard');
        router.navigate(['/dashboard']);
        return false;
      }

      logger.debug('Guest guard: Access granted to guest route', { url: state.url });
      return true;
    })
  );
};
