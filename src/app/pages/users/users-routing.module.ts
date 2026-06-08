import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UsersComponent } from './users.component';
import { MyProfileComponent } from './my-profile/my-profile.component';
import { AllUsersComponent } from './my-conquests/all-users';
import { AddUserComponent } from './add-user/add-user.component';

const routes: Routes = [
  {
    path: '',
    component: UsersComponent,
    pathMatch: 'prefix',
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'myProfile'
      },
      {
        path: 'myProfile',
        component: MyProfileComponent,
      },
      {
        path: 'allUser',
        component: AllUsersComponent,
      },
      {
        path: 'addUser',
        component: AddUserComponent,
        data: { roles: ['ROLE_ADMIN'] }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UsersRoutingModule { }
