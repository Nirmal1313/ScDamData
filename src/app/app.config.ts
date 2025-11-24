import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';

import { providePrimeNG } from 'primeng/config';
import material from '@primeuix/themes/material';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { authInterceptor } from './core/interceptors/auth.interceptor.functional';
import { retryInterceptor } from './core/interceptors/retry.interceptor';
import { cachingInterceptor } from './core/interceptors/caching.interceptor';
import { GlobalErrorHandler } from './core/handlers/global-error.handler';
import { API_BASE_URL } from './core/tokens/api-base-url.token';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: API_BASE_URL, useValue: environment.apiUrl },
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideAnimationsAsync(),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        retryInterceptor,    // Retry transient errors with exponential backoff
        cachingInterceptor,  // Cache GET requests with 5-minute TTL
        authInterceptor      // Add auth token to requests
      ])
    ),
    providePrimeNG({
      theme: {
        preset: material,
        options: {
          darkModeSelector: false,
        },
      },
    })
  ]
};
