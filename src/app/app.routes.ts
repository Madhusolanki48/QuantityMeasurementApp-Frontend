import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { AuthPageComponent } from './pages/auth-page.component';
import { DashboardPageComponent } from './pages/dashboard-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: AuthPageComponent },
  { path: 'dashboard', component: DashboardPageComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' }
];
