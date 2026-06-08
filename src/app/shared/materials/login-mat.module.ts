import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@NgModule({
  exports: [
    MatIconModule,
    MatButtonModule,
    ReactiveFormsModule
  ],
  declarations: [],
  providers: []
})
export class LoginMaterialModule { }
