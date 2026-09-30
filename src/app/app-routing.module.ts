import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainLayoutComponent } from './pages/main-layout/main-layout.component';
import { AuthGuard } from './services/auth.guard';

const routes: Routes = [

  {
    path: 'auth',
    loadChildren: () =>
      import('./pages/auth/auth.module').then(m => m.AuthModule)
  },

  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      {
        path: 'users',
        loadChildren: () =>
          import('./pages/users/users.module').then(m => m.UsersModule)
      },
      {
        path: 'dashboard',
        data: { roles: ['ROLE_MANAGER'] },
        loadChildren: () =>
          import('./pages/dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      { path: 'reports', data: { roles: ['ROLE_MANAGER'] }, loadChildren: () => import('./pages/reports/reports.module').then(m => m.ReportsModule) },
      {
        path: 'support',
        data: { roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_USER'] },
        loadChildren: () =>
          import('./pages/support/support.module').then(m => m.SupportModule)
      },
      {
        path: 'settings',
        data: { roles: ['ROLE_MANAGER'] },
        loadChildren: () => import('./pages/settings/settings.module')
          .then(m => m.SettingsModule),
        canActivate: [AuthGuard]
      },
      {
        path: 'product',
        data: { roles: ['ROLE_MANAGER'] },
        loadChildren: () => import('./pages/product/product.module')
          .then(m => m.ProductModule),
        canActivate: [AuthGuard]
      },
      {
        path: 'client',
        data: { roles: ['ROLE_MANAGER', 'ROLE_USER'] },
        loadChildren: () => import('./pages/client/client.module')
          .then(m => m.ClientModule),
        canActivate: [AuthGuard]
      },
      {
        path: 'stock',
        data: { roles: ['ROLE_MANAGER','ROLE_USER'] },
        loadChildren: () => import('./pages/stock/stock.module')
          .then(m => m.StockModule),
        canActivate: [AuthGuard]
      },
      {
        path: 'sales',
        data: { roles: ['ROLE_MANAGER', 'ROLE_USER'] },
        loadChildren: () => import('./pages/sales/sales.module')
          .then(m => m.SalesModule),
        canActivate: [AuthGuard]
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },

  { path: 'pages/settings', redirectTo: 'settings', pathMatch: 'prefix' },

  { path: 'pages/product', redirectTo: 'product', pathMatch: 'prefix' },

  { path: 'pages/client', redirectTo: 'client', pathMatch: 'prefix' },

  { path: 'pages/stock', redirectTo: 'stock', pathMatch: 'prefix' },

  { path: 'pages/sales', redirectTo: 'sales', pathMatch: 'prefix' },

  {
    path: '**',
    redirectTo: '/auth/login'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
