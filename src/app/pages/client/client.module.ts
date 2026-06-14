import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ClientRoutingModule } from './client-routing.module';
import { ClientComponent } from './client.component';
import { ClientListComponent } from './client-list/client-list.component';
import { SharedModule } from '@app/shared/shared.module';
import { ClientMaterialModule } from '@app/shared/materials/client-mat.module';


@NgModule({
  declarations: [
    ClientComponent,
    ClientListComponent
  ],
  imports: [
    CommonModule,
    ClientRoutingModule,
    SharedModule,
    ClientMaterialModule,
    
  ]
})
export class ClientModule { }
