import { Component, OnInit, inject } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { filter, fromEvent, map } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { MenuItem } from '@app/shared/models/menuItem';
import { menuItems } from '@app/shared/models/menu';
import { AuthService } from '@app/services/auth.service';

export const SCROLL_CONTAINER = 'mat-sidenav-content';
export const TEXT_LIMIT = 50;
export const SHADOW_LIMIT = 100;

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit {

  public isSmallScreen = false;
  public popText = false;
  public applyShadow = false;
  public items_menu: MenuItem[] = menuItems;
  private breakpointObserver: BreakpointObserver;
  private route: Router;
  public menuName = '';
  public userName: string = 'Usuário';
  userRole: string = 'Permissao';
  defaultAvatar = '';
  image: string ='';

  constructor(private authService: AuthService) {
    this.breakpointObserver = inject(BreakpointObserver);
    this.route = inject(Router);
  }

  ngOnInit(): void {

    const user = this.authService.getUser();
    this.userName = user?.fullName || 'Usuário';
    this.image = user?.image || 'assets/perfil.png';

    if (user?.roles[0] == 'ROLE_ADMIN') {
      this.userRole = 'Administrador'
    } else if (user?.roles[0] == 'ROLE_USER') {
      this.userRole = 'Usuário'
    } else {
      this.userRole = 'Gerente'
    }
    const content = document.getElementsByClassName(SCROLL_CONTAINER)[0];

    if (content) {

      fromEvent(content, 'scroll')
        .pipe(map(() => content.scrollTop))
        .subscribe((value: number) => this.determineHeader(value));

    }

    this.route.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(event => event as NavigationEnd)
    ).subscribe((event: NavigationEnd) => {

      let moduleName = event.url.split('/')[1];

      const menu = this.items_menu.find(
        (item: MenuItem) => item.link == `/${moduleName}`
      );

      if (menu) {
        this.menuName = menu.label;
      }

    });

  }

  determineHeader(scrollTop: number) {
    this.popText = scrollTop >= TEXT_LIMIT;
    this.applyShadow = scrollTop >= SHADOW_LIMIT;
  }

  ngAfterContentInit(): void {
    this.breakpointObserver
      .observe(['(max-width: 800px)'])
      .subscribe((res) => this.isSmallScreen = res.matches);
  }

  get sidenavMode() {
    return this.isSmallScreen ? 'over' : 'side';
  }

  getImage(userImage: string | null | undefined): string {
    // Se userImage existir e não for vazio, retorna, senão retorna imagem padrão
    return userImage && userImage.trim() !== '' ? userImage : this.defaultAvatar;
  }

}
