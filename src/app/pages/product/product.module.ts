import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProductRoutingModule } from './product-routing.module';
import { ProductComponent } from './product.component';
import { ProductListComponent } from './product-list/product-list.component';
import { ProductMaterialModule } from '@app/shared/materials/product-mat.module';
import { SharedModule } from '@app/shared/shared.module';
import { MtzCurrencyPipe } from '@app/shared/components/mask/mtz-currency.pipe';


@NgModule({
  declarations: [
    ProductComponent,
    ProductListComponent
  ],
  imports: [
    CommonModule,
    ProductRoutingModule,
    SharedModule,
    ProductMaterialModule,
    MtzCurrencyPipe
  ]
})
export class ProductModule { }
