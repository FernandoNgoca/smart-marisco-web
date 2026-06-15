import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Species } from "@app/shared/models/species";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: 'root'
})
export class SpeciesService {
  baseURL = `${environment.apiURL}api/species/v1`;
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

  create(species: Species): Observable<Species> {
    return this.http.post<Species>(this.baseURL, species);
  }

  update(species: Species): Observable<Species> {
    return this.http.put<Species>(this.baseURL, species);
  }

  findById(id: number): Observable<Species> {
    return this.http.get<Species>(`${this.baseURL}/${id}`);
  }

  findByCategoryId(id: number): Observable<Species[]> {
    return this.http.get<Species[]>(`${this.baseURL}/findByCategoryId/${id}`);
  }

  disableSpecies(id: number): Observable<Species> {
    return this.http.patch<Species>(`${this.baseURL}/disableSpecies/${id}`, {});
  }
}
