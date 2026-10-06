import { MatDialog } from '@angular/material/dialog';
import { OnDestroy } from '@angular/core';
import { Subject, takeUntil, finalize } from 'rxjs';
import { UserDetailsComponent } from '../user-details/user-details.component';
import { ConfirmDialogComponent } from '@app/shared/dialog/confirm-dialog.component';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { Router } from '@angular/router';
import { AuthService } from '@app/services/auth.service';
import { SnackbarService } from '@app/services/snackbar.service';
import { UserService } from '@app/services/user.service';
import { User } from '@app/shared/models/user';

@Component({
  selector: 'app-my-conquests',
  templateUrl: './all-users.html',
  styleUrls: ['./all-users.scss']
})
export class AllUsersComponent implements OnInit, AfterViewInit, OnDestroy {

  displayedColumns: string[] = ['userName', 'fullName', 'enabled', 'action'];
  dataSource: User[] = [];

  loading = false;
  loadError = false;
  actionBusy = false;
  private destroyed = new Subject<void>();
  private reload = new Subject<void>();
  ngOnDestroy(): void {this.destroyed.next();this.destroyed.complete();this.reload.next();this.reload.complete();}
  isSelf(user: User): boolean {return user.userName === this.auth.getUser()?.userName;}
  details(user: User, view: boolean): void {
    if(this.actionBusy || !user.id)return;
    this.actionBusy=true;
    this.dialog.open(UserDetailsComponent,{width:'540px',data:{id:user.id,view}}).afterClosed().pipe(takeUntil(this.destroyed)).subscribe(saved=>{this.actionBusy=false;if(saved){this.snackbar.success('Utilizador atualizado.');this.loadUsers();}});
  }
  toggleEnabled(user: User): void {
    if(this.actionBusy || !user.id || this.isSelf(user))return;
    const enabled=user.enabled===false;
    this.actionBusy=true;
    this.dialog.open(ConfirmDialogComponent,{data:{title:enabled?'Reativar utilizador':'Desativar utilizador',message:`${enabled?'Permitir novamente o acesso de':'Terminar as sessões e impedir o acesso de'} ${user.userName}?`,confirmText:enabled?'Reativar':'Desativar',cancelText:'Cancelar',color:enabled?'primary':'warn'}}).afterClosed().pipe(takeUntil(this.destroyed)).subscribe(confirmed=>{
      if(!confirmed){this.actionBusy=false;return;}
      this.userService.setEnabled(user.id!,enabled).pipe(takeUntil(this.destroyed),finalize(()=>this.actionBusy=false)).subscribe({next:()=>{this.snackbar.success(enabled?'Utilizador reativado.':'Utilizador desativado.');this.loadUsers();},error:err=>this.snackbar.error(err.error?.detail||err.error?.message||'Não foi possível alterar o estado.')});
    });
  }
  totalElements = 0;
  pageSize = 5;
  pageIndex = 0;
  filterValue = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private snackbar: SnackbarService,
    private userService: UserService,
    private auth: AuthService,
    private router: Router,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    if (!this.hasAdminPermission()) {
      this.snackbar.error('Você não tem permissão para criar usuários');
      void this.router.navigate(['/users/myProfile']);
      return;
    }
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    this.paginator.page.pipe(takeUntil(this.destroyed)).subscribe(() => {
      this.pageIndex = this.paginator.pageIndex;
      this.pageSize = this.paginator.pageSize;
      this.loadUsers();
    });

    this.sort.sortChange.pipe(takeUntil(this.destroyed)).subscribe(() => {
      this.pageIndex = 0;
      this.loadUsers();
    });
  }

  loadUsers(): void {
    if(!this.hasAdminPermission())return;
    this.reload.next();this.loading=true;this.loadError=false;
    const direction = this.sort?.direction || 'asc';
    const sortField = this.sort?.active || 'userName';

    this.userService
      .findAll(
        this.pageIndex,
        this.pageSize,
        sortField,
        direction,
        this.filterValue
      )
      .pipe(takeUntil(this.reload),takeUntil(this.destroyed),finalize(()=>this.loading=false)).subscribe({
        next: (resp) => {
          this.dataSource = resp._embedded?.user ?? [];
          this.totalElements = resp.page?.totalElements ?? 0;
        },
        error: (err) => {
          this.loadError=true;
          this.dataSource = [];
          this.totalElements = 0;
          this.snackbar.error('Erro ao carregar Usuário .');
        }
      });
  }

  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;

    this.filterValue = value.trim().toLowerCase();
    this.pageIndex = 0;

    this.loadUsers();
  }

  // Verificar permissão de admin
  private hasAdminPermission(): boolean {
    const user = this.auth.getUser();
    return user?.roles?.includes('ROLE_ADMIN') || false;
  }

}
