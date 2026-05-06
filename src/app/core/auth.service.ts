import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { AppUser } from '../models';
import { ApiService } from '../../services/api.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly currentUserKey = 'miq_current_user';
  private readonly usersKey = 'miq_users';

  constructor(private readonly api: ApiService) {}

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
      password,
    };

    this.persistUser(user, [...users, user]);

    return this.syncBackendUser(user).pipe(
      tap((syncedUser) => this.persistUser(syncedUser)),
      map(() => ({ ok: true, message: 'Account created successfully.' })),
      catchError(() => of({ ok: true, message: 'Account created successfully.' })),
    );
  }

  login(email: string, password: string): Observable<{ ok: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const user = this.getUsers().find((item) => item.email === cleanEmail && item.password === password);

    if (!user) {
      return of({ ok: false, message: 'Invalid email or password.' });
    }

    this.persistUser(user);

    return this.syncBackendUser(user).pipe(
      tap((syncedUser) => this.persistUser(syncedUser)),
      map(() => ({ ok: true, message: 'Login successful.' })),
      catchError(() => of({ ok: true, message: 'Login successful.' })),
    );
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

  ensureBackendUser(): Observable<AppUser | null> {
    const user = this.getCurrentUser();
    if (!user) {
      return of(null);
    }

    if (user.backendId) {
      return of(user);
    }

    return this.syncBackendUser(user).pipe(
      tap((syncedUser) => this.persistUser(syncedUser)),
      catchError(() => of(user)),
    );
  }

  resolveBackendUserId(): Observable<number> {
    const user = this.getCurrentUser();
    if (!user) {
      return of(1);
    }

    if (user.backendId) {
      return of(user.backendId);
    }

    return this.syncBackendUser(user).pipe(
      tap((syncedUser) => this.persistUser(syncedUser)),
      map((syncedUser) => syncedUser.backendId ?? 1),
      catchError(() => of(1)),
    );
  }

  private syncBackendUser(user: AppUser): Observable<AppUser> {
    if (user.backendId) {
      return of(user);
    }

    return this.api.createUser({
      name: user.displayName,
      email: user.email,
      provider: 'local',
    }).pipe(
      map((backendUser) => ({
        ...user,
        backendId: backendUser.id,
      })),
      catchError(() => of(user)),
    );
  }

  private persistUser(user: AppUser, users = this.getUsers()): void {
    const nextUsers = users.some((item) => item.email === user.email)
      ? users.map((item) => (item.email === user.email ? user : item))
      : [...users, user];

    localStorage.setItem(this.usersKey, JSON.stringify(nextUsers));
    localStorage.setItem(this.currentUserKey, JSON.stringify(user));
  }
}
