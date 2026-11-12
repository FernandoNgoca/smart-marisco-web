import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Sale, SaleRequest } from "@app/shared/models/sale";
import { map, Observable } from "rxjs";
import { environment } from "src/environments/environment";

interface HateoasResponse {
  _embedded: {
    sales?: Sale[];
    [key: string]: Sale[] | undefined;
  };
  page: {
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
  };
}

/** Filtros dos históricos; campos vazios são ignorados. Datas em yyyy-MM-dd, ambas inclusivas. */
export interface HistoryFilter {
  search?: string;
  saleStatus?: string;
  from?: string;
  to?: string;
}

export interface HistorySummary {
  count: number;
  completedTotal: number;
}

function historyParams(params: HttpParams, filter: HistoryFilter): HttpParams {
  for (const key of ['search', 'saleStatus', 'from', 'to'] as const) {
    const value = filter[key]?.trim();
    if (value) params = params.set(key, value);
  }
  return params;
}

@Injectable({
  providedIn: 'root'
})
export class SaleService {
  baseURL = `${environment.apiURL}api/sale/v1`;
  constructor(private http: HttpClient) { }

  findAll(
    page: number,
    size: number,
    sortField: string,
    direction: 'asc' | 'desc',
    filter: HistoryFilter = {}
  ): Observable<any> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sortField', sortField)
      .set('direction', direction);

    return this.http.get<any>(this.baseURL, { params: historyParams(params, filter) });
  }

  historySummary(orders: boolean, filter: HistoryFilter = {}): Observable<HistorySummary> {
    const params = historyParams(new HttpParams().set('orders', orders), filter);
    return this.http.get<HistorySummary>(`${this.baseURL}/history/summary`, { params });
  }

  create(payload: SaleRequest, operationKey: string): Observable<any> {
    return this.http.post<Sale>(this.baseURL, payload, { headers: { 'Idempotency-Key': operationKey } });
  }

  findOrder(id: number): Observable<SaleRequest> {
    return this.http.get<SaleRequest>(`${this.baseURL}/orders/${id}`);
  }

  updateOrder(id: number, request: SaleRequest): Observable<Sale> {
    return this.http.put<Sale>(`${this.baseURL}/orders/${id}`, request);
  }

  completeOrder(id: number, version: number): Observable<Sale> {
    return this.http.post<Sale>(`${this.baseURL}/orders/${id}/complete`, { version });
  }

  cancelOrder(id: number, version: number): Observable<Sale> {
    return this.http.post<Sale>(`${this.baseURL}/orders/${id}/cancel`, { version });
  }

  update(sale: Sale): Observable<Sale> {
    return this.http.put<Sale>(this.baseURL, sale);
  }

  findById(id: number): Observable<Sale> {
    return this.http.get<Sale>(`${this.baseURL}/${id}`);
  }

  disableSale(id: number): Observable<Sale> {
    return this.http.patch<Sale>(`${this.baseURL}/disableSale/${id}`, {});
  }

  countByCreatedDateBetweenAndSaleStatusAndStatus(): Observable<number> {
    return this.http.get<number>(`${this.baseURL}/countByCreatedDate`);
  }

  countYesterdaySales(): Observable<number> {
    return this.http.get<number>(`${this.baseURL}/countYesterdaySales`);
  }

  countSalesCurrentMonth(): Observable<number> {
    return this.http.get<number>(`${this.baseURL}/countSalesCurrentMonth`);
  }

  countSalesPreviousMonth(): Observable<number> {
    return this.http.get<number>(`${this.baseURL}/countSalesPreviousMonth`);
  }

  getSalesWeek(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseURL}/find-sales-by-week`);
  }

  countSalesCurrentDay(): Observable<number> {
    return this.http.get<number>(`${this.baseURL}/countSalesCurrentDay`);
  }

  countOrdersCurrentDay(): Observable<number> {
    return this.http.get<number>(`${this.baseURL}/countOrdersCurrentDay`);
  }

  findAllOrders(
    page: number,
    size: number,
    sortField: string,
    direction: 'asc' | 'desc',
    filter: HistoryFilter = {}
  ): Observable<any> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sortField', sortField)
      .set('direction', direction);

    return this.http.get<any>(`${this.baseURL}/findAllOrders`, { params: historyParams(params, filter) });
  }

  countByStatusAndSaleStatus(): Observable<number> {
    return this.http.get<number>(`${this.baseURL}/countByStatusAndSaleStatus`);
  }
}
