import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '../services/logger.service';
import { map, take } from 'rxjs/operators';

/**
 * Role-Based Access Control Guard
 *
 * Protects routes based on user roles.
 * Checks if user has required role(s) to access the route.
 * Redirects unauthorized users to access-denied or dashboard.
 *
 * Usage in routes:
 * {
 *   path: 'admin',
 *   component: AdminPanel,
 *   canActivate: [authGuard, roleGuard],
 *   data: { roles: ['admin', 'superadmin'] }
 * }
 *
 * Or for single role:
 * {
 *   path: 'manager',
 *   component: ManagerPanel,
 *   canActivate: [authGuard, roleGuard],
 *   data: { roles: 'manager' }
 * }
 */
export const roleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const logger = inject(LoggerService);

  // Get required roles from route data
  const requiredRoles = route.data['roles'] as string | string[] | undefined;

  if (!requiredRoles) {
    logger.warn('Role guard: No roles specified in route data, allowing access');
    return true;
  }

  return authService.authState$.pipe(
    take(1),
    map(authState => {
      // Check if user is authenticated first
      if (!authState.isAuthenticated || !authState.user) {
        logger.warn('Role guard: User not authenticated, redirecting to login', {
          attemptedUrl: state.url
        });
        router.navigate(['/login'], {
          queryParams: { returnUrl: state.url }
        });
        return false;
      }

      // Get user role (assuming role is stored in user object)
      // Adjust this based on your User model structure
      const userRole = (authState.user as any).role || (authState.user as any).roles;

      if (!userRole) {
        logger.warn('Role guard: User has no role assigned', {
          user: authState.user.username,
          attemptedUrl: state.url
        });
        router.navigate(['/access-denied']);
        return false;
      }

      // Normalize roles to array
      const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      const userRolesArray = Array.isArray(userRole) ? userRole : [userRole];

      // Check if user has at least one of the required roles
      const hasRequiredRole = rolesArray.some(role =>
        userRolesArray.some((ur: string) => ur.toLowerCase() === role.toLowerCase())
      );

      if (!hasRequiredRole) {
        logger.warn('Role guard: Insufficient permissions', {
          user: authState.user.username,
          userRoles: userRolesArray,
          requiredRoles: rolesArray,
          attemptedUrl: state.url
        });

        router.navigate(['/access-denied'], {
          queryParams: {
            returnUrl: state.url,
            reason: 'insufficient-permissions'
          }
        });

        return false;
      }

      logger.debug('Role guard: Access granted', {
        user: authState.user.username,
        userRoles: userRolesArray,
        url: state.url
      });

      return true;
    })
  );
};

/**
 * Permission-Based Access Control Guard
 *
 * More granular than role guard, checks specific permissions.
 * Useful for fine-grained access control.
 *
 * Usage in routes:
 * {
 *   path: 'users/delete',
 *   component: DeleteUser,
 *   canActivate: [authGuard, permissionGuard],
 *   data: { permissions: ['users.delete', 'users.manage'] }
 * }
 */
export const permissionGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const logger = inject(LoggerService);

  const requiredPermissions = route.data['permissions'] as string | string[] | undefined;

  if (!requiredPermissions) {
    logger.warn('Permission guard: No permissions specified in route data, allowing access');
    return true;
  }

  return authService.authState$.pipe(
    take(1),
    map(authState => {
      if (!authState.isAuthenticated || !authState.user) {
        logger.warn('Permission guard: User not authenticated, redirecting to login');
        router.navigate(['/login'], {
          queryParams: { returnUrl: state.url }
        });
        return false;
      }

      // Get user permissions (adjust based on your User model)
      const userPermissions = (authState.user as any).permissions || [];

      if (!userPermissions || userPermissions.length === 0) {
        logger.warn('Permission guard: User has no permissions', {
          user: authState.user.username
        });
        router.navigate(['/access-denied']);
        return false;
      }

      // Normalize permissions to array
      const permissionsArray = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

      // Check if user has at least one required permission
      const hasPermission = permissionsArray.some(permission =>
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        logger.warn('Permission guard: Insufficient permissions', {
          user: authState.user.username,
          userPermissions,
          requiredPermissions: permissionsArray,
          attemptedUrl: state.url
        });

        router.navigate(['/access-denied']);
        return false;
      }

      logger.debug('Permission guard: Access granted', {
        user: authState.user.username,
        url: state.url
      });

      return true;
    })
  );
};
