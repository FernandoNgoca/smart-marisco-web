import { Component, Input, OnInit } from '@angular/core';
import { AuthService } from '@app/services/auth.service';
import { MenuItem } from '@app/shared/models/menuItem';

@Component({
  selector: 'app-toolbar-menu',
  templateUrl: './toolbar-menu.component.html',
  styleUrls: ['./toolbar-menu.component.scss']
})
export class ToolbarMenuComponent implements OnInit {
  @Input() shadow = false;
  @Input() popText = false;
  @Input() menuTitle = '';
  @Input() items_menu: MenuItem[] = []

  userName: string = '';



  constructor(private authService: AuthService) { // Ajuste para seu serviço
  }

  ngOnInit(): void {
    const user = this.authService.getUser();
    this.userName = user?.userName || 'Usuário';
  }

  logout() {
    this.authService.logout();
  }
}
