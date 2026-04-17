import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { QuantityCalculatorComponent } from '../shared/quantity-calculator.component';
import { AuthService } from '../core/auth.service';
import { MeasurementService } from '../core/measurement.service';
import { ToastService } from '../core/toast.service';
import { AppUser, DashboardTab, HistoryEntry, MeasurementMeta, MeasurementType } from '../models';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, QuantityCalculatorComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.css']
})
export class DashboardPageComponent implements OnInit {
  user: AppUser | null = null;
  activeTab: DashboardTab = 'dashboard';
  sidebarCollapsed = false;
  mobileSidebarOpen = false;
  profileOpen = false;
  isMobile = false;
  theme: 'light' | 'dark' = 'light';
  history: HistoryEntry[] = [];
  cards: MeasurementMeta[] = [];

  constructor(
    private readonly authService: AuthService,
    private readonly measurementService: MeasurementService,
    private readonly toastService: ToastService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.isMobile = window.innerWidth <= 700;
    this.sidebarCollapsed = false;
    this.mobileSidebarOpen = false;

    this.user = this.authService.getCurrentUser();
    if (!this.user) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.cards = this.measurementService.metaList();
    // load the saved theme and history before showing the page
    this.applyTheme(this.getStoredTheme());
    this.loadHistory();
    this.showTab('dashboard');
  }

  @HostListener('window:resize')
  onResize(): void {
    const mobileNow = window.innerWidth <= 700;
    if (mobileNow !== this.isMobile) {
      this.isMobile = mobileNow;
      this.mobileSidebarOpen = false;
    }
  }

  get firstName(): string {
    return this.user?.displayName?.split(' ')[0] ?? 'there';
  }

  get initials(): string {
    if (!this.user) {
      return 'ME';
    }

    return this.user.displayName
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  get breadcrumb(): string {
    const labels: Record<DashboardTab, string> = {
      dashboard: 'Dashboard',
      length: 'Converters > Length',
      volume: 'Converters > Volume',
      weight: 'Converters > Weight',
      temperature: 'Converters > Temperature',
      history: 'History'
    };

    return labels[this.activeTab];
  }

  get activeHistory(): HistoryEntry[] {
    return this.history.slice(0, 3);
  }

  get activeIcon(): string {
    if (this.activeTab === 'history' || this.activeTab === 'dashboard') {
      return 'bi-speedometer2';
    }

    return this.measurementService.iconFor(this.activeTab);
  }

  get measurementTab(): MeasurementType | null {
    return this.isCalculatorTab(this.activeTab) ? this.activeTab : null;
  }

  isCalculatorTab(tab: DashboardTab): tab is MeasurementType {
    return tab === 'length' || tab === 'volume' || tab === 'weight' || tab === 'temperature';
  }

  showTab(tab: DashboardTab): void {
    this.activeTab = tab;
    this.profileOpen = false;
  }

  toggleSidebar(): void {
    if (this.isMobile) {
      this.mobileSidebarOpen = !this.mobileSidebarOpen;
      return;
    }

    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleDropdown(): void {
    this.profileOpen = !this.profileOpen;
  }

  toggleTheme(): void {
    // save theme choice for next time
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
    this.toastService.show(this.theme === 'dark' ? 'Dark mode enabled.' : 'Light mode enabled.');
  }

  logout(): void {
    this.authService.logout();
    this.toastService.show('Logged out successfully.');
    this.router.navigateByUrl('/login');
  }

  onSaved(): void {
    this.loadHistory();
  }

  clearAllHistory(): void {
    if (!this.user) {
      return;
    }

    // remove all saved history for this user
    this.measurementService.clearHistory(this.user.email);
    this.history = [];
    this.toastService.show('History cleared.');
  }

  deleteHistory(id: number): void {
    if (!this.user) {
      return;
    }

    this.measurementService.deleteHistory(this.user.email, id);
    this.loadHistory();
    this.toastService.show('History item removed.');
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
  }

  private setTheme(theme: 'light' | 'dark'): void {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('miq_theme', theme);
  }

  private getStoredTheme(): 'light' | 'dark' {
    const value = localStorage.getItem('miq_theme');
    return value === 'dark' ? 'dark' : 'light';
  }

  private loadHistory(): void {
    if (!this.user) {
      this.history = [];
      return;
    }

    this.history = this.measurementService.getHistory(this.user.email);
  }
}
