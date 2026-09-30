import { MenuItem } from "./menuItem";

export const menuItems: MenuItem[] = [
  {
    link: '/users/allUser',
    icon: 'fa-users',
    label: 'Utilizadores',
    roles: ['ROLE_ADMIN']
  },
  {
    link: '/dashboard',
    icon: 'fa-chart-line',
    label: 'Dashboard',
    roles: ['ROLE_MANAGER']
  },
  {
    link: '/client',
    icon: 'fa-user',
    label: 'Clientes',
    roles: ['ROLE_MANAGER', 'ROLE_USER']
  },
  {
    link: '/product',
    icon: 'fa-box',
    label: 'Produtos',
    roles: ['ROLE_MANAGER']
  },
  {
    link: '/stock',
    icon: 'fa-warehouse',
    label: 'Estoque',
    roles: ['ROLE_MANAGER', 'ROLE_USER']
  },
  {
    link: '/sales',
    icon: 'fa-shopping-cart',
    label: 'Vendas',
    roles: ['ROLE_MANAGER', 'ROLE_USER']
  },
  { link: '/reports', icon: 'fa-file-lines', label: 'Relatórios', roles: ['ROLE_MANAGER'] },
  {
    link: '/settings',
    icon: 'fa-cog',
    label: 'Configurações',
    roles: ['ROLE_MANAGER']
  },
  {
    link: '/support',
    icon: 'fa-headset',
    label: 'Suporte',
    roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_USER']
  }
]

// Administrative accounts only see user management and support even when they have additional roles.
export function menuForRoles(roles: string[]): MenuItem[] {
  if (roles.includes('ROLE_ADMIN')) return menuItems.filter(item => item.link === '/users/allUser' || item.link === '/support');
  return menuItems.filter(item => !item.roles || item.roles.some(role => roles.includes(role)));
}
