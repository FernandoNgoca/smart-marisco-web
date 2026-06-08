import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {

    baseURL = `${environment.apiURL}auth`;

  constructor(private http: HttpClient) {}

  createUser(userData: any): Observable<any> {
    return this.http.post(`${this.baseURL}/createUser`, userData);
  }

  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(this.baseURL);
  }

  getUserById(id: string): Observable<any> {
    return this.http.get(`${this.baseURL}/${id}`);
  }

  updateUser(id: number, userData: any): Observable<any> {
    return this.http.put(`${this.baseURL}/${id}`, userData);
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.baseURL}/${id}`);
  }

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
}
