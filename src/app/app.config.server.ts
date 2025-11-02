import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // Ensure proper platform detection during SSR
    {
      provide: 'SERVER_CONTEXT',
      useValue: true
    }
  ]
};
export const config = mergeApplicationConfig(appConfig, serverConfig);
