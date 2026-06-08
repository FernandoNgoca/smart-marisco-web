import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@app/services/auth.service';
import { SnackbarService } from '@app/services/snackbar.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {

  hidePassword = true;
  form: FormGroup;
  error: string | null = null;
  hideOld = true;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snackbar: SnackbarService
  ) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  login(): void {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(key => {
        const control = this.form.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.error = null;

    const payload = {
      username: this.form.value.username.trim(),
      password: this.form.value.password
    };

    this.auth.login(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;

        const backendMessage = err?.error?.message;

        if (err.status === 0) {
          this.error = 'Não foi possível ligar ao servidor.';
          this.snackbar.error('Servidor indisponível. Verifique a sua ligação.');
        }
        else if (err.status === 401) {
          this.error = 'Credenciais inválidas. Verifique o seu utilizador e palavra-passe.';
          this.snackbar.error('Utilizador ou palavra-passe incorretos.');
        }
        else if (err.status === 403) {
          this.error = 'A sua conta não tem permissão para aceder ao sistema.';
          this.snackbar.error('Acesso negado.');
        }
        else if (err.status === 404) {
          this.error = 'Serviço de autenticação não encontrado.';
          this.snackbar.error('Serviço indisponível.');
        }
        else if (err.status >= 500) {
          this.error = backendMessage || 'Erro interno do sistema.';
          this.snackbar.error(this.error || '');
        }
        else {
          this.error = 'Não foi possível efetuar o login. Tente novamente.';
          this.snackbar.error('Erro inesperado.');
        }

        // Limpar o erro após 5 segundos
        setTimeout(() => {
          if (this.error) {
            this.error = null;
          }
        }, 5000);
      }
    });
  }

}
