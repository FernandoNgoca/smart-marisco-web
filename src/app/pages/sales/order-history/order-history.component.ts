import { Subject, takeUntil, finalize } from 'rxjs';
import { ConfirmDialogComponent } from '@app/shared/dialog/confirm-dialog.component';
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { SaleService } from '@app/services/sale.service';
import { SnackbarService } from '@app/services/snackbar.service';
import { ViewOrderComponent } from '@app/shared/dialog/sales/view-order/view-order.component';
import { Sale } from '@app/shared/models/sale';

@Component({
  selector: 'app-order-history',
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.scss']
})
export class OrderHistoryComponent implements OnInit, OnDestroy {


  displayedColumns: string[] = ['firstName', 'lastName', 'phoneNumber', 'totalValue','date', 'state', 'action'];
  dataSource: Sale[] = [];
  busyId: number | null = null;
  private destroyed = new Subject<void>();
  private reload = new Subject<void>();
  totalElements = 0;
  pageSize = 5;
  pageIndex = 0;
  filterValue = '';
  loadError = false;
  isLoading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private saleService: SaleService,
    private snackbar: SnackbarService,
    private dialog: MatDialog,
  ) { }

  ngOnInit(): void {
    this.loadOrders();
  }

  ngAfterViewInit(): void {
    this.paginator.page.pipe(takeUntil(this.destroyed)).subscribe(() => {
      this.pageIndex = this.paginator.pageIndex;
      this.pageSize = this.paginator.pageSize;
      this.loadOrders();
    });

    this.sort.sortChange.pipe(takeUntil(this.destroyed)).subscribe(() => {
      this.pageIndex = 0;
      this.loadOrders();
    });
  }

  loadOrders(): void {
    this.reload.next();
    this.loadError = false;
    this.isLoading = true;
    const direction = this.sort?.direction || 'asc';
    const sortField = this.sort?.active || 'id';
    this.saleService.findAllOrders(
      this.pageIndex,
      this.pageSize,
      sortField,
      direction,
      this.filterValue
    ).pipe(takeUntil(this.reload), takeUntil(this.destroyed), finalize(() => { this.isLoading = false; })).subscribe({
      next: (response) => {
          this.isLoading = false;
        this.dataSource = response._embedded?.sales ?? [];
        this.totalElements = response.page?.totalElements ?? 0;
      },
      error: (err) => {
          this.isLoading = false;
          this.loadError = true;
        this.dataSource = [];
        this.totalElements = 0;
        this.snackbar.error('Erro ao carregar os pedidos.');
      }
    });
  }

  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;

    this.filterValue = value.trim().toLowerCase();
    this.pageIndex = 0;

    this.loadOrders();
  }

  visualizarProduto(sale: Sale): void {
      this.dialog.open(ViewOrderComponent, {
        width: '1000px',
        data: {
          sale
        }
      });
    }
  changeState(sale: Sale, complete: boolean): void {
    if (this.busyId !== null || !sale.id || sale.version == null) return;
    this.busyId = sale.id;
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px', data: {
        title: complete ? 'Concluir pedido' : 'Cancelar pedido',
        message: complete ? 'Concluir este pedido? O stock será verificado e descontado agora.' : 'Cancelar este pedido? Esta ação não pode ser desfeita.',
        confirmText: complete ? 'Concluir' : 'Cancelar pedido', cancelText: 'Voltar', color: complete ? 'primary' : 'warn'
      }
    }).afterClosed().pipe(takeUntil(this.destroyed)).subscribe(confirmed => {
      if (!confirmed) { this.busyId = null; return; }
      const request = complete ? this.saleService.completeOrder(sale.id!, sale.version!) : this.saleService.cancelOrder(sale.id!, sale.version!);
      request.pipe(takeUntil(this.destroyed), finalize(() => { this.busyId = null; })).subscribe({
        next: () => { this.snackbar.success(complete ? 'Pedido concluído.' : 'Pedido cancelado.'); this.loadOrders(); },
        error: error => { this.snackbar.error(error.error?.detail || error.error?.message || 'Não foi possível atualizar o pedido.'); this.loadOrders(); }
      });
    });
  }

  ngOnDestroy(): void { this.destroyed.next(); this.destroyed.complete(); this.reload.complete(); }
}
