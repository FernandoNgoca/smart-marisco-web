import { Injectable, Injector } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '@app/services/auth.service';
import { environment } from 'src/environments/environment';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(private injector: Injector) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Apenas os pedidos da API recebem o token; login e refresh tratam as próprias credenciais.
    if (!req.url.startsWith(environment.apiURL) ||
        req.url.includes('/auth/signin') || req.url.includes('/auth/refresh/')) {
      return next.handle(req);
    }

    const auth = this.injector.get(AuthService);
    const token = auth.getToken();
    const authorized = (value: string | null) => value
      ? req.clone({ setHeaders: { Authorization: `Bearer ${value}` } }) : req;
    const renew = () => auth.refreshToken().pipe(
      catchError(error => {
        if (!auth.isAuthenticated()) {
          auth.logout();
          void this.injector.get(Router).navigateByUrl('/auth/login');
        }
        return throwError(() => error);
      }),
      switchMap(() => next.handle(authorized(auth.getToken())))
    );

    if (auth.isTokenExpired() && auth.getRefreshToken()) return renew();

    return next.handle(authorized(token)).pipe(
      catchError(error => {
        if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
          return throwError(() => error);
        }
        // Outro pedido pode ter renovado o token enquanto este estava em curso.
        if (auth.getToken() && auth.getToken() !== token) {
          return next.handle(authorized(auth.getToken()));
        }
        if (auth.getRefreshToken()) return renew();
        auth.logout();
        void this.injector.get(Router).navigateByUrl('/auth/login');
        return throwError(() => error);
      })
    );
  }
}
