import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { tap, EMPTY, Observable, catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { jwtDecode } from 'jwt-decode';
import { BehaviorSubject } from 'rxjs';
import { ChangePasswordDTO, TokenDTO, User } from '@app/shared/models/user';


interface ApiResponse<T> {
  body: T;
  headers: any;
  statusCode: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  baseURL = `${environment.apiURL}auth`;

  private authStatus = new BehaviorSubject<boolean>(false);
  private userSubject = new BehaviorSubject<User | null>(null);

  authStatus$ = this.authStatus.asObservable();
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    // Verificar autenticação inicial
    const isValid = this.hasValidToken();
    this.authStatus.next(isValid);

    if (isValid) {
      const user = this.getUserFromStorage();
      this.userSubject.next(user);
    }

    // Listen para mudanças no localStorage (múltiplas abas)
    window.addEventListener('storage', (event) => {
      if (event.key === 'token' || event.key === 'user') {
        const isValidNow = this.hasValidToken();
        this.authStatus.next(isValidNow);

        if (isValidNow) {
          const user = this.getUserFromStorage();
          this.userSubject.next(user);
        } else {
          this.userSubject.next(null);
        }
      }
    });
  }

  private hasValidToken(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired();
  }

  // LOGIN
  login(credentials: any): Observable<ApiResponse<TokenDTO>> {
    return this.http.post<ApiResponse<TokenDTO>>(`${this.baseURL}/signin`, credentials)
      .pipe(
        tap(res => this.saveTokens(res.body)),
        catchError(error => {
          console.error('Erro no login:', error);
          return throwError(() => error);
        })
      );
  }

  // REFRESH TOKEN
  refreshToken(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    const username = this.getUsername();

    if (!refreshToken || !username) {
      return EMPTY;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${refreshToken}`
    });

    return this.http.put<any>(
      `${this.baseURL}/refresh/${username}`,
      {},
      { headers }
    ).pipe(
      tap(res => {
        const data = res.body;
        if (data) {
          this.saveTokens(data);
        }
      }),
      catchError(error => {
        console.error('Erro ao renovar token:', error);
        this.logout();
        return throwError(() => error);
      })
    );
  }

  // SALVAR TOKENS
  private saveTokens(data: TokenDTO): void {
    if (data.accessToken) {
      localStorage.setItem('token', data.accessToken);

      // Decodificar token para pegar expiration
      try {
        const decoded: any = jwtDecode(data.accessToken);
        if (decoded.exp) {
          localStorage.setItem('expiration', String(decoded.exp * 1000));
        }
      } catch (error) {
        console.error('Erro ao decodificar token:', error);
      }
    }

    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }

    if (data.username) {
      localStorage.setItem('username', data.username);
    }

    if (data.user) {
      this.saveUser(data.user);
    }

    this.authStatus.next(true);
  }

  // Salvar usuário no localStorage e BehaviorSubject
  private saveUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
    this.userSubject.next(user);
  }

  // Atualizar usuário (usado após update de imagem ou dados)
  setUser(user: User | null): void {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      this.userSubject.next(user);
    } else {
      localStorage.removeItem('user');
      this.userSubject.next(null);
    }
  }

  // Getters para tokens
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  getUsername(): string | null {
    return localStorage.getItem('username');
  }

  getUser(): User | null {
    return this.userSubject.value;
  }

  private getUserFromStorage(): User | null {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        return JSON.parse(user);
      } catch {
        return null;
      }
    }
    return null;
  }

  // VERIFICAÇÃO DE EXPIRAÇÃO
  isTokenExpired(): boolean {
    const exp = localStorage.getItem('expiration');
    if (!exp) return true;

    try {
      const expirationTime = parseInt(exp, 10);
      // Adicionar margem de segurança de 5 segundos
      return new Date().getTime() + 5000 > expirationTime;
    } catch {
      return true;
    }
  }

  // ROLES
  getRoles(): string[] {
    const token = this.getToken();
    if (!token) return [];

    try {
      const decoded: any = jwtDecode(token);
      return decoded.roles || [];
    } catch {
      return [];
    }
  }

  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    const userRoles = this.getRoles();
    return roles.some(role => userRoles.includes(role));
  }

  hasAllRoles(roles: string[]): boolean {
    const userRoles = this.getRoles();
    return roles.every(role => userRoles.includes(role));
  }

  // LOGOUT
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    localStorage.removeItem('expiration');
    localStorage.removeItem('user');
    this.authStatus.next(false);
    this.userSubject.next(null);
  }

  // VERIFICAÇÃO DE AUTENTICAÇÃO
  isAuthenticated(): boolean {
    const hasToken = !!this.getToken();
    const isValid = !this.isTokenExpired();
    return hasToken && isValid;
  }

  // ALTERAR SENHA
  changePassword(dto: ChangePasswordDTO): Observable<any> {
  return this.http.put(`${this.baseURL}/change-password`, dto);
}

  // ATUALIZAR IMAGEM
  updateImage(user: User): Observable<User> {
    return this.http.put<User>(`${this.baseURL}/update-user`, user).pipe(
      tap((updatedUser) => {
        // Atualizar o usuário local após sucesso
        const currentUser = this.getUser();
        if (currentUser) {
          const mergedUser = { ...currentUser, ...updatedUser };
          this.setUser(mergedUser);
        } else {
          this.setUser(updatedUser);
        }
      }),
      catchError(error => {
        console.error('Erro ao atualizar imagem:', error);
        return throwError(() => error);
      })
    );
  }

  // ATUALIZAR DADOS COMPLETOS DO USUÁRIO
  updateUser(user: User): Observable<User> {
    return this.http.put<User>(`${this.baseURL}/update-user`, user).pipe(
      tap((updatedUser) => {
        const currentUser = this.getUser();
        if (currentUser) {
          const mergedUser = { ...currentUser, ...updatedUser };
          this.setUser(mergedUser);
        } else {
          this.setUser(updatedUser);
        }
      }),
      catchError(error => {
        console.error('Erro ao atualizar usuário:', error);
        return throwError(() => error);
      })
    );
  }
}
