import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { LoadingService } from '@app/services/loading.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {

  // URLs que NÃO devem mostrar o spinner (opcional)
  // private excludeUrls: string[] = [
  //   '/auth/signin',
  //   '/auth/refresh'
  // ];

  constructor(private loadingService: LoadingService) { }

  intercept(
  req: HttpRequest<any>,
  next: HttpHandler
): Observable<HttpEvent<any>> {

  this.loadingService.show();

  return next.handle(req).pipe(
    finalize(() => {
      this.loadingService.hide();
    })
  );
}
}
