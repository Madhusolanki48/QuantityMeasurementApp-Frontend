import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly toastSubject = new Subject<string>();

  readonly message$ = this.toastSubject.asObservable();

  show(message: string): void {
    this.toastSubject.next(message);
  }
}
