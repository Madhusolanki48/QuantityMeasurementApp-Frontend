import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// start the root app here
bootstrapApplication(AppComponent, appConfig).catch((error: unknown) =>
  console.error(error)
);
