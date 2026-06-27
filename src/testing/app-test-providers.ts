import { importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { SwUpdate } from '@angular/service-worker';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { EMPTY, Observable, of } from 'rxjs';

import { environment } from '../environments/environment';
import { APP_CONFIG } from '../injections/tokens.injection';

class TestResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= TestResizeObserver;

class TestTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({});
  }
}

class TestSwUpdate {
  readonly isEnabled = false;
  readonly versionUpdates = EMPTY;

  checkForUpdate(): Promise<boolean> {
    return Promise.resolve(false);
  }
}

export const appTestProviders = [
  { provide: APP_CONFIG, useValue: environment },
  { provide: SwUpdate, useClass: TestSwUpdate },
  provideHttpClient(),
  provideNoopAnimations(),
  importProvidersFrom(
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useClass: TestTranslateLoader,
      },
    }),
  ),
];
