import { Auditable } from "./audit";


export interface TokenDTO {
  username: string;
  authenticated: boolean;
  accessToken: string;
  refreshToken: string;
  user: User;
}


export interface User extends Auditable {
  userName: string;
  fullName: string;
  image?: string;
  roles: string[];
}

export interface ChangePasswordDTO {
  username: string;
  oldPassword: string;
  newPassword: string;
}

// Interface para atualização de usuário
export interface UpdateUserDTO {
  userName: string;
  fullName: string;
  image?: string;
  roles: string[];
  enabled?: boolean;
  accountNonExpired?: boolean;
  accountNonLocked?: boolean;
  credentialsNonExpired?: boolean;
}

// Tipo para os possíveis roles do sistema
export type UserRole = 'ROLE_ADMIN' | 'ROLE_MANAGER' | 'ROLE_USER';

export interface PagedUsers {
  _embedded?: {
    users: User[];
  };
  page?: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}
