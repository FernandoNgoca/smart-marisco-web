import { Auditable } from "./audit";
import { Category } from "./category";

export interface Species extends Auditable {
  name: string,
  description: string,
  categoryId: number,
  category?: Category
}

export interface PagedSpecies {
  _embedded?: {
    species: Species[];
  };
  page?: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}
