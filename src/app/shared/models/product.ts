import { Auditable } from "./audit";
import { Species } from "./species";

export interface Product extends Auditable {
  name: string,
  description: string,
  price: number,
  salePrice: number,
  speciesId: number;
  unit?: Unit,
  unitId: number;
  species?: Species,
  code?: string,
  image?:string
}

export interface PagedProducts {
  _embedded?: {
    products: Product[];
  };
  page?: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

export interface Unit extends Auditable {
  name: string,
  symbol: string,
  description: string
}

export interface PagedUnits {
  _embedded?: {
    units: Unit[];
  };
  page?: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}