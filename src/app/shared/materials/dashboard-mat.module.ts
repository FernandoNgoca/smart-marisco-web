import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';


@NgModule({
  exports: [
    MatIconModule,
    MatButtonModule,
    MatTooltipModule

  ],
  declarations: [],
  providers: []
})
export class DashboardMaterialModule { }
