import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { QuantityCalculatorComponent } from '../shared/quantity-calculator.component';
import { AuthService } from '../core/auth.service';
import { MeasurementService } from '../core/measurement.service';
import { ToastService } from '../core/toast.service';
import { AppUser, DashboardTab, HistoryEntry, MeasurementMeta, MeasurementType, Operation } from '../models';
import { ApiService, BackendHistoryEntry } from '../../services/api.service';

type HistoryFilter = 'all' | 'add' | 'subtract' | 'convert' | 'compare' | 'divide';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, QuantityCalculatorComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.css'],
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
  historyFilter: HistoryFilter = 'all';
  historyLoading = false;

  constructor(
    private readonly authService: AuthService,
    private readonly measurementService: MeasurementService,
    private readonly toastService: ToastService,
    private readonly router: Router,
    private readonly api: ApiService,
  ) {}

  ngOnInit(): void {
    this.isMobile = window.innerWidth <= 700;
    this.sidebarCollapsed = false;
    this.mobileSidebarOpen = false;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.user = currentUser;
    this.authService.resolveBackendUserId().subscribe({
      next: (syncedUser) => {
        if (this.user && this.user.backendId !== syncedUser) {
          this.user = {
            ...this.user,
            backendId: syncedUser,
          };
        }

        this.cards = this.measurementService.metaList();
        this.applyTheme(this.getStoredTheme());
        this.loadHistory();
        this.showTab('dashboard');
      },
      error: () => {
        this.cards = this.measurementService.metaList();
        this.applyTheme(this.getStoredTheme());
        this.loadHistory();
        this.showTab('dashboard');
      },
    });
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
      history: 'History',
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
    if (!this.user?.backendId) {
      this.toastService.show('No backend user is linked yet.');
      return;
    }

    this.api.clearUserHistory(this.user.backendId).subscribe({
      next: () => {
        this.toastService.show('History cleared.');
        this.loadHistory();
      },
      error: () => this.toastService.show('Failed to clear history.'),
    });
  }

  deleteHistory(_id: number): void {
    if (!this.user?.backendId) {
      this.toastService.show('No backend user is linked yet.');
      return;
    }

    this.api.deleteUserHistory(this.user.backendId, _id).subscribe({
      next: () => {
        this.toastService.show('History entry deleted.');
        this.loadHistory();
      },
      error: () => this.toastService.show('Failed to delete history entry.'),
    });
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
    const currentUser = this.user;
    if (!currentUser) {
      this.history = [];
      return;
    }

    this.historyLoading = true;

    this.authService.resolveBackendUserId().subscribe({
      next: (userId) => {
        const request$ =
          this.historyFilter === 'all'
            ? this.api.getUserHistory(userId)
            : this.api.getUserHistoryByOperation(userId, this.historyFilter);

        request$.subscribe({
          next: (res) => {
            this.history = res.map((item) => this.mapHistoryEntry(item));
            this.historyLoading = false;
          },
          error: () => {
            this.history = [];
            this.historyLoading = false;
            this.toastService.show('Failed to load history.');
          },
        });
      },
      error: () => {
        this.historyLoading = false;
        this.toastService.show('Failed to resolve your backend user.');
      },
    });
  }

  private mapHistoryEntry(item: BackendHistoryEntry): HistoryEntry {
    const op = this.toOperation(item.operation);
    const type = this.toMeasurementType(item.measurementType || item.first?.measurementType || '');
    return {
      id: item.id,
      op,
      type,
      icon: 'bi-clipboard-data',
      expr: this.formatExpression(item, op),
      result: this.formatResult(item, op),
      time: this.formatTimestamp(item.timestamp ?? ''),
    };
  }

  private formatExpression(item: BackendHistoryEntry, op: Operation): string {
    const firstUnit = this.unitLabel(item.firstUnit ?? item.first?.unit ?? '');
    const secondUnit = this.unitLabel(item.secondUnit ?? item.second?.unit ?? '');
    const firstValue = item.firstValue ?? item.first?.value ?? 0;
    const secondValue = item.secondValue ?? item.second?.value ?? null;
    const resultUnit = op === 'Convert' ? secondUnit : op === 'Divide' ? '' : firstUnit;
    const resultText = this.formatNumeric(item.result ?? null);

    switch (op) {
      case 'Convert':
        return `${this.formatNumeric(firstValue)} ${firstUnit} -> ${resultText} ${resultUnit}`.trim();
      case 'Add':
        return `${this.formatNumeric(firstValue)} ${firstUnit} + ${this.formatNumeric(secondValue)} ${secondUnit} = ${resultText} ${resultUnit}`.trim();
      case 'Subtract':
        return `${this.formatNumeric(firstValue)} ${firstUnit} - ${this.formatNumeric(secondValue)} ${secondUnit} = ${resultText} ${resultUnit}`.trim();
      case 'Compare':
        return `${this.formatNumeric(firstValue)} ${firstUnit} ? ${this.formatNumeric(secondValue)} ${secondUnit}`;
      case 'Divide':
        return `${this.formatNumeric(firstValue)} ${firstUnit} / ${this.formatNumeric(secondValue)} ${secondUnit} = ${resultText}`;
      default:
        return `${this.formatNumeric(firstValue)} ${firstUnit}`;
    }
  }

  private formatResult(item: BackendHistoryEntry, op: Operation): string {
    const value = this.formatNumeric(item.result ?? null);
    if (op === 'Divide') {
      return value;
    }

    if (op === 'Compare') {
      return (item.result ?? 0) === 1 ? 'Equal' : 'Not Equal';
    }

    const unit =
      op === 'Convert'
        ? this.unitLabel(item.secondUnit ?? item.second?.unit ?? '')
        : this.unitLabel(item.firstUnit ?? item.first?.unit ?? '');
    return unit ? `${value} ${unit}` : value;
  }

  private formatTimestamp(timestamp: string): string {
    const value = new Date(timestamp);
    return Number.isNaN(value.getTime()) ? timestamp : value.toLocaleString();
  }

  private formatNumeric(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '-';
    }

    return Number.isInteger(value) ? `${value}` : `${Number(value.toFixed(6))}`;
  }

  private unitLabel(unit: string): string {
    const labels: Record<string, string> = {
      INCH: 'Inch',
      FEET: 'Feet',
      YARDS: 'Yards',
      CENTIMETERS: 'Centimeters',
      MILLILITRE: 'Millilitre',
      LITRE: 'Litre',
      GALLON: 'Gallon',
      GRAM: 'Gram',
      KILOGRAM: 'Kilogram',
      POUND: 'Pound',
      CELSIUS: 'Celsius',
      FAHRENHEIT: 'Fahrenheit',
      KELVIN: 'Kelvin',
    };

    return labels[unit] ?? unit;
  }

  private toMeasurementType(type: string): MeasurementType {
    switch ((type ?? '').toLowerCase()) {
      case 'lengthunit':
        return 'length';
      case 'volumeunit':
        return 'volume';
      case 'weightunit':
        return 'weight';
      case 'temperatureunit':
        return 'temperature';
      default:
        return 'length';
    }
  }

  private toOperation(operation: string): Operation {
    switch (operation?.toUpperCase()) {
      case 'ADD':
        return 'Add';
      case 'SUBTRACT':
        return 'Subtract';
      case 'COMPARE':
        return 'Compare';
      case 'DIVIDE':
        return 'Divide';
      case 'CONVERT':
      default:
        return 'Convert';
    }
  }

  onHistoryFilterChange(filter: string): void {
    this.historyFilter = (filter as HistoryFilter) ?? 'all';
    this.loadHistory();
  }
}
