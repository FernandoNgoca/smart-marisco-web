import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route?: ActivatedRouteSnapshot, state?: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> {
    const allowed = () => !route || route.pathFromRoot.every(node => {
      const roles = node.data['roles'] as string[] | undefined;
      return !roles || this.auth.hasAnyRole(roles);
    });
    const destination = () => allowed() ? true : this.router.createUrlTree(['/users/myProfile']);
    if (this.auth.isAuthenticated()) return destination();
    const login = this.router.createUrlTree(['/auth/login'], { queryParams: state ? { returnUrl: state.url } : {} });
    if (!this.auth.getRefreshToken()) return login;
    return this.auth.refreshToken().pipe(
      map(() => this.auth.isAuthenticated() ? destination() : login),
      catchError(() => of(login))
    );
  }

  canActivateChild(route?: ActivatedRouteSnapshot, state?: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> {
    return this.canActivate(route, state);
  }
}
