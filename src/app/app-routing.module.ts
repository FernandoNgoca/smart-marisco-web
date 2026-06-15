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
    children: [
      {
        path: 'users',
        loadChildren: () =>
          import('./pages/users/users.module').then(m => m.UsersModule)
      },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./pages/dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'support',
        loadChildren: () =>
          import('./pages/support/support.module').then(m => m.SupportModule)
      },
      {
        path: 'settings',
        loadChildren: () => import('./pages/settings/settings.module')
          .then(m => m.SettingsModule),
        canActivate: [AuthGuard]
      },
      {
        path: 'product',
        loadChildren: () => import('./pages/product/product.module')
          .then(m => m.ProductModule),
        canActivate: [AuthGuard]
      },
      {
        path: 'client',
        loadChildren: () => import('./pages/client/client.module')
          .then(m => m.ClientModule),
        canActivate: [AuthGuard]
      },
      {
        path: 'stock',
        loadChildren: () => import('./pages/stock/stock.module')
          .then(m => m.StockModule),
        canActivate: [AuthGuard]
      },
      {
        path: 'sales',
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

  { path: 'pages/settings', loadChildren: () => import('./pages/settings/settings.module').then(m => m.SettingsModule) },

  { path: 'pages/product', loadChildren: () => import('./pages/product/product.module').then(m => m.ProductModule) },

  { path: 'pages/client', loadChildren: () => import('./pages/client/client.module').then(m => m.ClientModule) },

  { path: 'pages/stock', loadChildren: () => import('./pages/stock/stock.module').then(m => m.StockModule) },

  { path: 'pages/sales', loadChildren: () => import('./pages/sales/sales.module').then(m => m.SalesModule) },

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
