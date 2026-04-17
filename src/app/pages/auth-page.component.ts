import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth-page.component.html',
  styleUrls: ['./auth-page.component.css']
})
export class AuthPageComponent {
  private readonly fb = inject(FormBuilder);

  isLogin = true;
  showLoginPassword = false;
  showSignupPassword = false;
  showConfirmPassword = false;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  signupForm = this.fb.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  constructor(
    private readonly authService: AuthService,
    private readonly toastService: ToastService,
    private readonly router: Router
  ) {}

  toggleMode(): void {
    // switch between login and signup
    this.isLogin = !this.isLogin;
  }

  submitLogin(): void {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) {
      this.toastService.show('Please enter a valid email and password.');
      return;
    }

    const value = this.loginForm.getRawValue();
    this.authService.login(value.email ?? '', value.password ?? '').subscribe({
      next: (result) => {
        this.toastService.show(result.message);
        if (result.ok) {
          this.router.navigateByUrl('/dashboard');
        }
      }
    });
  }

  submitSignup(): void {
    this.signupForm.markAllAsTouched();
    if (this.signupForm.invalid) {
      this.toastService.show('Please complete all signup fields.');
      return;
    }

    const value = this.signupForm.getRawValue();
    // password should match before creating account
    if ((value.password ?? '') !== (value.confirmPassword ?? '')) {
      this.toastService.show('Passwords do not match.');
      return;
    }

    this.authService.signup(value.displayName ?? '', value.email ?? '', value.password ?? '').subscribe({
      next: (result) => {
        this.toastService.show(result.message);
        if (result.ok) {
          this.router.navigateByUrl('/dashboard');
        }
      }
    });
  }

  controlError(formName: 'login' | 'signup', controlName: 'email' | 'password' | 'displayName' | 'confirmPassword'): string {
    const form = formName === 'login' ? this.loginForm : this.signupForm;
    const control = (form as any).get(controlName);

    if (!control || (!control.touched && !control.dirty)) {
      return '';
    }

    if (control.hasError('required')) {
      return 'This field is required.';
    }

    if (control.hasError('email')) {
      return 'Enter a valid email address.';
    }

    if (control.hasError('minlength')) {
      return 'Minimum 6 characters.';
    }

    if (formName === 'signup' && controlName === 'confirmPassword') {
      const password = this.signupForm.get('password')?.value ?? '';
      const confirm = this.signupForm.get('confirmPassword')?.value ?? '';
      if (password && confirm && password !== confirm) {
        return 'Passwords do not match.';
      }
    }

    return '';
  }
}
