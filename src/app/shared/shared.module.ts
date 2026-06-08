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
  ],
  declarations: [
    ToolbarTitleComponent,
    MainLayoutComponent,
    ToolbarMenuComponent
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
