import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@NgModule({
  exports: [
    MatIconModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatTooltipModule
  ],
  declarations: [],
  providers: []
})
export class LoginMaterialModule { }
