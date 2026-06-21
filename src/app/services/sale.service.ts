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
    filter: string = ''
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sortField', sortField)
      .set('direction', direction);

    if (filter) {
      params = params.set('search', filter);
    }

    return this.http.get<any>(this.baseURL, { params });
  }

  create(payload: SaleRequest): Observable<any> {
    return this.http.post<Sale>(this.baseURL, payload);
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

  countSalesCurrentMonth(): Observable<number> {
    return this.http.get<number>(`${this.baseURL}/countSalesCurrentMonth`);
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
    filter: string = ''
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sortField', sortField)
      .set('direction', direction);

    if (filter) {
      params = params.set('searchOrders', filter);
    }

    return this.http.get<any>(`${this.baseURL}/findAllOrders`, { params });
  }

  countByStatusAndSaleStatus(): Observable<number> {
    return this.http.get<number>(`${this.baseURL}/countByStatusAndSaleStatus`);
  }
}
