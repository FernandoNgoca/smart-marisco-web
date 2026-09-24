import { Component, OnInit } from '@angular/core';
import { AuthService } from '@app/services/auth.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: [ './users.component.scss' ]
})
export class UsersComponent implements OnInit {

  constructor(public auth: AuthService) { }

  ngOnInit(): void {
  }

}
