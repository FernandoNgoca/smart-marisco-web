import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StockRoutingModule } from './stock-routing.module';
import { StockComponent } from './stock.component';
import { StockListComponent } from './stock-list/stock-list.component';
import { SharedModule } from '@app/shared/shared.module';
import { StockMaterialModule } from '@app/shared/materials/stock-mat.module';
import { StockStatusPipe } from '@app/shared/pipes/stock-status.pipe';


@NgModule({
  declarations: [
    StockComponent,
    StockListComponent,
    StockStatusPipe
  ],
  imports: [
    CommonModule,
    StockRoutingModule,
    SharedModule,
    StockMaterialModule
  ]
})
export class StockModule { }
