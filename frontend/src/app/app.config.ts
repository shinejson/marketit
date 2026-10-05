import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';
import { apiInterceptor } from './core/api.interceptor';
import { CurrencyService } from './core/currency.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiInterceptor])),
    // Pull the exchange-rate table in before the first screen paints so money
    // never renders with the wrong symbol and then flips.
    provideAppInitializer(() => firstValueFrom(inject(CurrencyService).load()).catch(() => undefined)),
  ],
};
