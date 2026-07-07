import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

@NgModule({
  exports: [
    MatIconModule,
    MatTabsModule,
    MatButtonModule,
    MatTooltipModule
  ],
  declarations: [],
  providers: []
})
export class UsersMaterialModule { }
