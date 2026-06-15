import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsComponent } from './settings.component';
import { CategoryComponent } from './category/category.component';
import { SpeciesComponent } from './species/species.component';
import { SharedModule } from '@app/shared/shared.module';
import { SettingsMaterialModule } from '@app/shared/materials/settings-mat.module';
import { UnitComponent } from './unit/unit.component';

@NgModule({
  declarations: [
    SettingsComponent,
    CategoryComponent,
    SpeciesComponent,
    UnitComponent
  ],
  imports: [
    CommonModule,
    SettingsMaterialModule,
    SettingsRoutingModule,
    SharedModule,
  ]
})
export class SettingsModule { }
