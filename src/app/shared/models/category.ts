import { Auditable } from "./audit";

export interface Category extends Auditable {
  name: string,
  description: string;
}

export interface PagedCategory {
  _embedded?: {
    categorys: Category[];
  };
  page?: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}
