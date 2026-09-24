import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import { AuthService } from '@app/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnDestroy {
  hidePassword = true;
  form: FormGroup;
  error: string | null = null;
  isLoading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.pattern(/.*\S.*/)]],
      password: ['', Validators.required]
    });
    this.form.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.error = null;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private returnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl') || '';
    // Apenas páginas internas conhecidas; as permissões continuam a ser verificadas pelo guard.
    return /^\/(dashboard|users|support|settings|product|client|stock|sales)(?:\/|[?#]|$)/.test(url)
      && !/[\\\u0000-\u001f]/.test(url) ? url : '/dashboard';
  }

  login(): void {
    if (this.isLoading) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.error = null;
    const payload = {
      username: this.form.value.username.trim(),
      password: this.form.value.password
    };
    this.auth.login(payload).pipe(
      takeUntil(this.destroy$),
      finalize(() => { this.isLoading = false; })
    ).subscribe({
      next: () => {
        void this.router.navigateByUrl(this.returnUrl(), { replaceUrl: true });
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 0) {
          this.error = 'Não foi possível ligar ao servidor. Verifique a sua ligação e tente novamente.';
        } else if (err.status === 401) {
          this.error = 'Utilizador ou palavra-passe incorretos. Verifique os dados e tente novamente.';
        } else if (err.status === 403) {
          this.error = 'Não foi possível aceder à sua conta. Contacte o administrador.';
        } else if (err.status === 429) {
          this.error = 'Demasiadas tentativas. Aguarde um minuto antes de tentar novamente.';
        } else if (err.status === 404 || err.status >= 500) {
          this.error = 'O serviço está temporariamente indisponível. Tente novamente mais tarde.';
        } else {
          this.error = 'Não foi possível iniciar sessão. Tente novamente.';
        }
      }
    });
  }
}
