import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { loaderInterceptor } from '../interceptors/loader.interceptor';
import { APP_CONFIG } from '../injections/tokens.injection';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    { provide: APP_CONFIG, useValue: environment },
    provideAnimationsAsync(), 
    provideHttpClient(
      withInterceptors([loaderInterceptor])
    ),
  ]
};
