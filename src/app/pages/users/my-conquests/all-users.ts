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
export class AllUsersComponent implements OnInit, AfterViewInit {

  displayedColumns: string[] = ['userName', 'fullName', 'action'];
  dataSource: User[] = [];

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
    private router: Router
  ) { }

  ngOnInit(): void {
    if (!this.hasAdminPermission()) {
      this.snackbar.error('Você não tem permissão para criar usuários');
      this.router.navigate(['/dashboard']);
    }
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    this.paginator.page.subscribe(() => {
      this.pageIndex = this.paginator.pageIndex;
      this.pageSize = this.paginator.pageSize;
      this.loadUsers();
    });

    this.sort.sortChange.subscribe(() => {
      this.pageIndex = 0;
      this.loadUsers();
    });
  }

  loadUsers(): void {
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
      .subscribe({
        next: (resp) => {
          this.dataSource = resp._embedded?.user ?? [];
          this.totalElements = resp.page?.totalElements ?? 0;
        },
        error: (err) => {
          console.error('Erro ao carregar Usuário :', err);
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
