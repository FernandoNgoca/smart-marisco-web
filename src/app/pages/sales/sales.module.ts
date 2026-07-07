import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SalesRoutingModule } from './sales-routing.module';
import { SalesComponent } from './sales.component';
import { SaleComponent } from './sale/sale.component';
import { SalesOrderComponent } from './sales-order/sales-order.component';
import { SalesMaterialModule } from '@app/shared/materials/sales-mat.module';
import { SharedModule } from '@app/shared/shared.module';
import { SalesHistoryComponent } from './sales-history/sales-history.component';
import { OrderHistoryComponent } from './order-history/order-history.component';


@NgModule({
  declarations: [
    SalesComponent,
    SaleComponent,
    SalesOrderComponent,
    SalesHistoryComponent,
    OrderHistoryComponent
  ],
  imports: [
    CommonModule,
    SalesRoutingModule,
    SalesMaterialModule,
    SharedModule,
  ]
})
export class SalesModule { }
