import { Auditable } from "./audit";

export interface Client extends Auditable{
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
  email: string;
  type: ClientType;
}

export enum ClientType {
  INDIVIDUAL = 'INDIVIDUAL',
  COMPANY = 'COMPANY'
}

export const ClientTypeLabel: Record<ClientType, string> = {
  [ClientType.INDIVIDUAL]: 'Pessoa',
  [ClientType.COMPANY]: 'Empresa'
};

export interface PagedClients {
  _embedded?: {
    clients: Client[];
  };
  page?: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}


