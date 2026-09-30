import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Sale, SaleItem } from "@app/shared/models/sale";
import { Observable } from "rxjs";
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
export class SaleItemService {
  baseURL = `${environment.apiURL}api/saleItem/v1`;
  constructor(private http: HttpClient) { }

  getTopProducts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseURL}/get-top-products`);
  }

  findAllBySaleId(id: number): Observable<SaleItem[]> {
      return this.http.get<SaleItem[]>(`${this.baseURL}/findAllBySaleId/${id}`);
    }
}




