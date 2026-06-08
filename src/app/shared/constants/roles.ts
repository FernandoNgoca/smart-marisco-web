
export const ROLES = {
  Administrador: 'ROLE_ADMIN',
  Gerente: 'ROLE_MANAGER',
  Usuário: 'ROLE_USER'
} as const;

export type RoleType = typeof ROLES[keyof typeof ROLES];

