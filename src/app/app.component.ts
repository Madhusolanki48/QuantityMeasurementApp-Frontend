import { Component, DestroyRef, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastService } from './core/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html'
})
export class AppComponent {
  toastMessage = '';
  toastVisible = false;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly destroyRef = inject(DestroyRef);

  constructor(private readonly toastService: ToastService) {
    const storedTheme = localStorage.getItem('miq_theme');
    document.documentElement.setAttribute('data-theme', storedTheme === 'dark' ? 'dark' : 'light');

    this.toastService.message$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => {
        this.toastMessage = message;
        this.toastVisible = true;
        if (this.hideTimer) {
          clearTimeout(this.hideTimer);
        }
        this.hideTimer = setTimeout(() => {
          this.toastVisible = false;
        }, 2800);
      });
  }
}
