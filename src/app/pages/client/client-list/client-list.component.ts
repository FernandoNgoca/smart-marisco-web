import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { AuthService } from '@app/services/auth.service';
import { ClientService } from '@app/services/client.service';
import { SnackbarService } from '@app/services/snackbar.service';
import { AddClientComponent } from '@app/shared/dialog/client/add-client/add-client.component';
import { ConfirmDialogComponent } from '@app/shared/dialog/confirm-dialog.component';
import { Client, ClientType, ClientTypeLabel } from '@app/shared/models/client';

@Component({
  selector: 'app-client-list',
  templateUrl: './client-list.component.html',
  styleUrls: ['./client-list.component.scss']
})
export class ClientListComponent implements OnInit, AfterViewInit {

  displayedColumns: string[] = [
    'firstName',
    'lastName',
    'email',
    'phoneNumber',
    'address',
    'type',
    'action'
  ];
  dataSource: Client[] = [];
  totalElements = 0;
  pageSize = 5;
  pageIndex = 0;
  filterValue = '';
  clientTypeLabel = ClientTypeLabel;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;


  constructor(
    private clientService: ClientService,
    private dialog: MatDialog,
    private snackbar: SnackbarService,
    private auth: AuthService
  ) { }

  ngOnInit(): void {
    this.loadClients();
  }

  ngAfterViewInit(): void {
    this.paginator.page.subscribe(() => {
      this.pageIndex = this.paginator.pageIndex;
      this.pageSize = this.paginator.pageSize;
      this.loadClients();
    });

    this.sort.sortChange.subscribe(() => {
      this.pageIndex = 0;
      this.loadClients();
    });
  }

  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;

    this.filterValue = value.trim().toLowerCase();
    this.pageIndex = 0;

    this.loadClients();
  }

  loadClients(): void {
    const direction = this.sort?.direction || 'asc';
    const sortField = this.sort?.active || '';

    this.clientService.findAll(
      this.pageIndex,
      this.pageSize,
      sortField,
      direction,
      this.filterValue
    )
      .subscribe({
        next: (response) => {
          this.dataSource = response._embedded?.clients ?? [];
          this.totalElements = response.page?.totalElements ?? 0;
        },
        error: (err) => {
          console.error('Erro ao carregar clientes:', err);

          this.dataSource = [];
          this.totalElements = 0;

          // Mostra mensagem ao utilizador
          this.snackbar.error('Erro ao carregar clientes!');
        }
      });
  }
  getClientTypeLabel(type: ClientType): string {
    switch (type) {
      case ClientType.INDIVIDUAL:
        return 'Pessoa';

      case ClientType.COMPANY:
        return 'Empresa';

      default:
        return type;
    }
  }

  //Método para CRIAR
  abrirDialog(): void {
    const dialogRef = this.dialog.open(AddClientComponent, {
      width: '600px',
      data: null  //
    });

    dialogRef.afterClosed().subscribe((result: Client | undefined) => {
      if (result) {
        this.loadClients();
      }
    });
  }

  editarCliente(client: Client): void {
    const dialogRef = this.dialog.open(AddClientComponent, {
      width: '600px',
      data: { client }
    });

    dialogRef.afterClosed().subscribe((result: Client | undefined) => {
      if (result) {
        this.loadClients();
      }
    });
  }

  desativarCliente(client: Client): void {
    // Confirmar ação com o usuário
    const confirmDialog = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Desativar Cliente',
        message: `Tem certeza que deseja desativar o cliente "${client.firstName} ${client.lastName}"?`,
        confirmText: 'Desativar',
        cancelText: 'Cancelar',
        color: 'warn',
        icon: 'fa-trash-can',
        iconColor: '#DC2626'
      }
    });

    confirmDialog.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed && client.id) {
        this.clientService.disableClient(client.id).subscribe({
          next: () => {
            this.loadClients(); // Recarregar tabela
            this.snackbar.success('Cliente desativado com sucesso!');
          },
          error: (error) => {
            this.snackbar.error('Erro ao desativar cliente.')
          }
        });
      }
    });
  }

  formatPhoneNumber(phone: string): string {
    if (!phone) {
      return '';
    }

    // Remove tudo o que não for dígito
    const digits = phone.replace(/\D/g, '');

    // 258841234567 -> +258 84 123 4567
    if (digits.length === 12 && digits.startsWith('258')) {
      return `+258 ${digits.substring(3, 5)} ${digits.substring(5, 8)} ${digits.substring(8)}`;
    }

    // 841234567 -> 84 123 4567
    if (digits.length === 9) {
      return `${digits.substring(0, 2)} ${digits.substring(2, 5)} ${digits.substring(5)}`;
    }

    return phone;
  }
}