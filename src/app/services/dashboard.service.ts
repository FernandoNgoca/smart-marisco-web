import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
  overview(from: string, to: string) {
    return this.http.get<DashboardOverview>(`${environment.apiURL}api/dashboard/v1/overview`, {params: new HttpParams().set('from',from).set('to',to)});
  }
  summary() {
    return this.http.get<DashboardSummary>(`${environment.apiURL}api/dashboard/v1/summary`);
  }
}

export interface DashboardOverview {
  from: string; to: string; previousFrom: string; previousTo: string; updatedAt: string;
  totals: { sales: number; revenue: number }; previous: { sales: number; revenue: number }; averageSale: number;
  pending: { count: number; value: number; oldestDays: number | null };
  restockCount: number;
  restock: { id: number; name: string; unit: string; quantity: number }[];
  dailySales: { name: string; value: number }[];
  topProducts: { name: string; unit: string; quantity: number }[];
}
