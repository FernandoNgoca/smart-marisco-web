import { SalesHistoryComponent } from './sales-history/sales-history.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SalesComponent } from './sales.component';
import { SaleComponent } from './sale/sale.component';
import { SalesOrderComponent } from './sales-order/sales-order.component';
import { OrderHistoryComponent } from './order-history/order-history.component';

const routes: Routes =
  [
    {
      path: '',
      component: SalesComponent,
      pathMatch: 'prefix',
      children: [
        {
          path: '',
          pathMatch: 'full',
          redirectTo: 'sale'
        },
        {
          path: 'sale',
          component: SaleComponent
        },
        {
          path: 'orders',
          component: SalesOrderComponent
        },
        {
          path: 'orderHistory',
          component: OrderHistoryComponent
        },
        {
          path: 'salesHistory',
          component: SalesHistoryComponent
        }
      ]
    }
  ];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SalesRoutingModule { }
