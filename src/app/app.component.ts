import { Component } from '@angular/core';
import { ThemeService } from '@app/services/theme.service';


export const SCROLL_CONTAINER = 'mat-sidenav-content';
export const TEXT_LIMIT = 50;
export const SHADOW_LIMIT = 100;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(theme: ThemeService) {
    theme.init();
  }
}
