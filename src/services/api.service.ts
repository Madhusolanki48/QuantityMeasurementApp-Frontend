import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface BackendUser {
  id: number;
  name: string;
  email: string;
  provider: string;
}

export interface BackendQuantityDto {
  value: number;
  unit: string;
  measurementType: string;
}

export interface BackendQuantityRequest {
  first: BackendQuantityDto;
  second?: BackendQuantityDto | null;
  userId: number;
}

export interface BackendQuantityResponse {
  operation: string;
  result: number;
  message: string;
  error: boolean;
}

export interface BackendHistoryEntry {
  id: number;
  userId?: number;
  operation: string;
  measurementType: string;
  first?: BackendQuantityDto | null;
  second?: BackendQuantityDto | null;
  firstValue?: number;
  firstUnit?: string;
  secondValue?: number | null;
  secondUnit?: string | null;
  result?: number | null;
  error?: boolean;
  errorMessage?: string;
  timestamp?: string;
}

export interface BackendHistoryRequest {
  operation: string;
  measurementType: string;
  firstValue: number;
  firstUnit: string;
  secondValue?: number | null;
  secondUnit?: string | null;
  result: number | null;
  error: boolean;
  errorMessage: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1`;
  private readonly measurementUrl = `${this.baseUrl}/measurements`;
  private readonly userUrl = `${this.baseUrl}/users`;

  constructor(private readonly http: HttpClient) {}

  createUser(data: { name: string; email: string; provider: string }): Observable<BackendUser> {
    return this.http.post<BackendUser>(this.userUrl, data);
  }

  getUser(userId: number): Observable<BackendUser> {
    return this.http.get<BackendUser>(`${this.userUrl}/${userId}`);
  }

  postUserHistory(userId: number, payload: BackendHistoryRequest): Observable<BackendHistoryEntry> {
    return this.http.post<BackendHistoryEntry>(`${this.userUrl}/${userId}/history`, payload);
  }

  getUserHistory(userId: number): Observable<BackendHistoryEntry[]> {
    return this.http.get<BackendHistoryEntry[]>(`${this.userUrl}/${userId}/history`);
  }

  getUserHistoryByOperation(userId: number, operation: string): Observable<BackendHistoryEntry[]> {
    return this.http.get<BackendHistoryEntry[]>(`${this.userUrl}/${userId}/history/operation/${encodeURIComponent(operation)}`);
  }

  deleteUserHistory(userId: number, historyId: number): Observable<void> {
    return this.http.delete<void>(`${this.userUrl}/${userId}/history/${historyId}`);
  }

  clearUserHistory(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.userUrl}/${userId}/history`);
  }

  getMeasurementHistory(): Observable<BackendHistoryEntry[]> {
    return this.http.get<BackendHistoryEntry[]>(`${this.measurementUrl}/history`);
  }

  getMeasurementHistoryByOperation(operation: string): Observable<BackendHistoryEntry[]> {
    return this.http.get<BackendHistoryEntry[]>(
      `${this.measurementUrl}/history/operation/${encodeURIComponent(operation)}`
    );
  }

  convert(data: BackendQuantityRequest): Observable<BackendQuantityResponse> {
    return this.http.post<BackendQuantityResponse>(`${this.measurementUrl}/convert`, data);
  }

  add(data: BackendQuantityRequest): Observable<BackendQuantityResponse> {
    return this.http.post<BackendQuantityResponse>(`${this.measurementUrl}/add`, data);
  }

  subtract(data: BackendQuantityRequest): Observable<BackendQuantityResponse> {
    return this.http.post<BackendQuantityResponse>(`${this.measurementUrl}/subtract`, data);
  }

  compare(data: BackendQuantityRequest): Observable<BackendQuantityResponse> {
    return this.http.post<BackendQuantityResponse>(`${this.measurementUrl}/compare`, data);
  }

  divide(data: BackendQuantityRequest): Observable<number> {
    return this.http.post<number>(`${this.measurementUrl}/divide`, data);
  }
}
