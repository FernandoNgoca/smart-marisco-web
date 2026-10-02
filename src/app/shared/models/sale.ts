import { Auditable } from "./audit";
import { Client } from "./client";
import { Product, Unit } from "./product";

export enum SaleStatus {
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  ORDERS = 'ORDERS'
}

export interface Sale extends Auditable {
  version?: number;
  orderRecord?: boolean;
  stockDeducted?: boolean;
  completedDate?: string;
  clientId?: number;
  client?: Client
  totalValue: number;
  saleStatus: SaleStatus;
}

export interface SaleItem extends Auditable {
  saleId?: number;
  sale?: Sale;
  productId: number;
  product: Product;
  quantity: number;
  subTotal?: number;
  unitPrice?: number | null;
}

export interface PagedSales {
  _embedded?: {
    sales: Sale[];
  };
  page?: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

export interface PagedSaleItems {
  _embedded?: {
    saleItems: SaleItem[];
  };
  page?: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

export interface SaleRequest {
  sale: Sale;
  items: SaleItem[];
}
