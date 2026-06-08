import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsersRoutingModule } from './users-routing.module';
import { UsersComponent } from './users.component';
import { MyProfileComponent } from './my-profile/my-profile.component';
import { AllUsersComponent } from './my-conquests/all-users';;
import { UsersMaterialModule } from '@app/shared/materials/users-mat.module';
import { SharedModule } from '@app/shared/shared.module';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { AddUserComponent } from './add-user/add-user.component';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';


@NgModule({
  declarations: [
    UsersComponent,
    MyProfileComponent,
    AllUsersComponent,
    AddUserComponent
  ],
  imports: [
    CommonModule,
    UsersMaterialModule,
    UsersRoutingModule,
    SharedModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDividerModule,
    MatSelectModule,
    MatChipsModule,
    MatPaginatorModule,
    MatSortModule,
    MatTableModule
  ]
})
export class UsersModule { }
