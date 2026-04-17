import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AppUser } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly currentUserKey = 'miq_current_user';
  private readonly usersKey = 'miq_users';

  getCurrentUser(): AppUser | null {
    const raw = localStorage.getItem(this.currentUserKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AppUser;
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    return !!this.getCurrentUser();
  }

  signup(displayName: string, email: string, password: string): Observable<{ ok: boolean; message: string }> {
    const cleanName = displayName.trim();
    const cleanEmail = email.trim().toLowerCase();

    // save users in local storage for now
    if (!cleanName || !cleanEmail || !password) {
      return of({ ok: false, message: 'Please fill in all fields.' });
    }

    const users = this.getUsers();
    if (users.some((user) => user.email === cleanEmail)) {
      return of({ ok: false, message: 'This email is already registered.' });
    }

    const user: AppUser = {
      displayName: cleanName,
      email: cleanEmail,
      password
    };

    users.push(user);
    localStorage.setItem(this.usersKey, JSON.stringify(users));
    localStorage.setItem(this.currentUserKey, JSON.stringify(user));

    return of({ ok: true, message: 'Account created successfully.' });
  }

  login(email: string, password: string): Observable<{ ok: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    // check the saved users list
    const user = this.getUsers().find((item) => item.email === cleanEmail && item.password === password);

    if (!user) {
      return of({ ok: false, message: 'Invalid email or password.' });
    }

    localStorage.setItem(this.currentUserKey, JSON.stringify(user));
    return of({ ok: true, message: 'Login successful.' });
  }

  logout(): void {
    localStorage.removeItem(this.currentUserKey);
  }

  getUsers(): AppUser[] {
    const raw = localStorage.getItem(this.usersKey);
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as AppUser[];
    } catch {
      return [];
    }
  }

  getDisplayName(): string {
    return this.getCurrentUser()?.displayName ?? 'there';
  }

  getEmail(): string {
    return this.getCurrentUser()?.email ?? '';
  }
}
