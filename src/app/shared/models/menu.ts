import { MenuItem } from "./menuItem";

export const menuItems: MenuItem[] = [
  {
    link: '/dashboard',
    icon: 'fa-chart-line',
    label: 'Dashboard',
    roles: ['ROLE_USER', 'ROLE_MANAGER']
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
    roles: ['ROLE_MANAGER']
  },
  {
    link: '/sales',
    icon: 'fa-shopping-cart',
    label: 'Vendas',
    roles: ['ROLE_MANAGER', 'ROLE_USER']
  },
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
    roles: ['ROLE_ADMIN', 'ROLE_MANAGER']
  }
]
