import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AuthService } from '@app/services/auth.service';
import { ThemeService } from '@app/services/theme.service';
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
  @Input() menuOpened = false;
  @Output() toggleMenu = new EventEmitter<void>();

  userName: string = '';



  constructor(private authService: AuthService, public themeService: ThemeService) {
  }

  ngOnInit(): void {
    const user = this.authService.getUser();
    this.userName = user?.userName || 'Usuário';
  }

  logout() {
    this.authService.logout();
  }
}
