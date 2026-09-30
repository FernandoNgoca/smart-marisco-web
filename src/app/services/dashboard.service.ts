import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

export interface DashboardSummary {
  revenueToday: number;
  revenueMonth: number;
  salesToday: number;
  salesYesterday: number;
  salesMonth: number;
  salesPreviousPeriod: number;
  lowStockProducts: number;
  lowStockThreshold: number;
  updatedAt: string;
  previousPeriodEnd: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private http: HttpClient) {}
  summary() {
    return this.http.get<DashboardSummary>(`${environment.apiURL}api/dashboard/v1/summary`);
  }
}
