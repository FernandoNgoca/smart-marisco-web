import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SettingsComponent } from './settings.component';
import { CategoryComponent } from './category/category.component';
import { SpeciesComponent } from './species/species.component';
import { UnitComponent } from './unit/unit.component';

const routes: Routes = [
  {
    path: '',
    component: SettingsComponent,
    pathMatch: 'prefix',
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'category'
      },
      {
        path: 'category',
        component: CategoryComponent
      },
      {
        path: 'species',
        component: SpeciesComponent
      },
      {
      path: 'unit',
      component: UnitComponent,
    },

    ]
  }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SettingsRoutingModule { }
