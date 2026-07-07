import { NgModule } from '@angular/core';
import { ToolbarTitleComponent } from './components/toolbar-title/toolbar-title.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MainLayoutComponent } from '../pages/main-layout/main-layout.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ToolbarMenuComponent } from './components/toolbar-menu/toolbar-menu.component';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AddCategoryComponent } from './dialog/settings/add-category/add-category.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule } from '@angular/forms';
import { AddSpeciesComponent } from './dialog/settings/add-species/add-species.component';
import { MatSelectModule } from '@angular/material/select';
import { AddClientComponent } from './dialog/client/add-client/add-client.component';
import { ConfirmDialogComponent } from './dialog/confirm-dialog.component';
import { AddProductComponent } from './dialog/product/add-product/add-product.component';
import { AddUnitComponent } from './dialog/settings/add-unit/add-unit.component';
import { StockStatusPipe } from './pipes/stock-status.pipe';
import { AddStockComponent } from './dialog/stock/add-stock/add-stock.component';
import { StockDialogComponent } from './dialog/stock/stock-dialog/stock-dialog.component';
import { AddStockMovementComponent } from './dialog/stock/add-stock-movement/add-stock-movement.component';
import { MatTableModule } from '@angular/material/table';
import { MovementTypePipe } from './pipes/movement-type.pipe';
import { MatPaginatorModule } from '@angular/material/paginator';
import { ViewOrderComponent } from './dialog/sales/view-order/view-order.component';
import { MtzCurrencyPipe } from './components/mask/mtz-currency.pipe';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatIconModule,
    FlexLayoutModule,
    MatSidenavModule,
    MatDividerModule,
    MatListModule,
    MatTooltipModule,
    MatMenuModule,
    MatSnackBarModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MtzCurrencyPipe
  ],
  declarations: [
    ToolbarTitleComponent,
    MainLayoutComponent,
    ToolbarMenuComponent,
    AddCategoryComponent,
    AddSpeciesComponent,
    AddClientComponent,
    ConfirmDialogComponent,
    AddProductComponent,
    AddUnitComponent,
    AddStockComponent,
    StockDialogComponent,
    AddStockMovementComponent,
    MovementTypePipe,
    ViewOrderComponent,
  ],
  exports: [
    CommonModule,
    RouterModule,
    ToolbarTitleComponent,
    MainLayoutComponent,
    ToolbarMenuComponent
  ]
})
export class SharedModule { }
