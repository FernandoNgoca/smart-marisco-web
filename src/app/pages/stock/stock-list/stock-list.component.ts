import { ActivatedRoute } from '@angular/router';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorIntl } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { SnackbarService } from '@app/services/snackbar.service';
import { StockService } from '@app/services/stock.service';
import { ConfirmDialogComponent } from '@app/shared/dialog/confirm-dialog.component';
import { AddStockComponent } from '@app/shared/dialog/stock/add-stock/add-stock.component';
import { StockDialogComponent } from '@app/shared/dialog/stock/stock-dialog/stock-dialog.component';
import { Stock } from '@app/shared/models/stock';

function stockPaginator(): MatPaginatorIntl {
  const labels = new MatPaginatorIntl();
  labels.itemsPerPageLabel = 'Linhas por página:';
  labels.nextPageLabel = 'Página seguinte'; labels.previousPageLabel = 'Página anterior';
  labels.firstPageLabel = 'Primeira página'; labels.lastPageLabel = 'Última página';
  labels.getRangeLabel = (page, size, total) => total === 0 || size === 0 ? `0 de ${total}` : `${page * size + 1}–${Math.min((page + 1) * size, total)} de ${total}`;
  return labels;
}

@Component({
  providers: [{ provide: MatPaginatorIntl, useFactory: stockPaginator }],
  selector: 'app-stock-list',
  templateUrl: './stock-list.component.html',
  styleUrls: ['./stock-list.component.scss']
})
export class StockListComponent implements OnInit, AfterViewInit {

  displayedColumns: string[] = [
    'product',
    'quantity',
    'unit',
    'state',
    'action'
  ];

  dataSource: Stock[] = [];
  totalElements = 0;
  pageSize = 5;
  pageIndex = 0;
  formatQuantity(value: number): string { return new Intl.NumberFormat('pt-PT', {maximumFractionDigits: 3}).format(value); }
  filterValue = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private stockService: StockService,
    private dialog: MatDialog,
    private snackbar: SnackbarService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.filterValue = this.route.snapshot.queryParamMap.get('search') || '';
    this.loadStocks();
  }

  ngAfterViewInit(): void {

    this.paginator.page.subscribe(() => {
      this.pageIndex = this.paginator.pageIndex;
      this.pageSize = this.paginator.pageSize;
      this.loadStocks();
    });

    this.sort.sortChange.subscribe(() => {
      this.pageIndex = 0;
      this.loadStocks();
    });
  }

  loadStocks(): void {
    const direction = this.sort?.direction || 'asc';
    const sortField = this.sort?.active || '';

    this.stockService.findAll(
      this.pageIndex,
      this.pageSize,
      sortField,
      direction,
      this.filterValue
    )
      .subscribe({
        next: (response) => {

          this.dataSource = response._embedded?.stock ?? [];
          this.totalElements = response.page?.totalElements ?? 0;
        },
        error: (err) => {
          console.error('Erro ao carregar stocks:', err);
          this.snackbar.error('Erro ao carregar stocks. Tente novamente.');

          this.dataSource = [];
          this.totalElements = 0;
        }
      });
  }

  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;

    this.filterValue = value.trim().toLowerCase();
    this.pageIndex = 0;

    this.loadStocks();
  }

  //Método para CRIAR
  abrirDialog(): void {
    const dialogRef = this.dialog.open(AddStockComponent, {
      width: '600px',
      data: null  //
    });

    dialogRef.afterClosed().subscribe((result: Stock | undefined) => {
      if (result) {
        this.loadStocks();
      }
    });
  }

  editarStock(stock: Stock): void {
    const dialogRef = this.dialog.open(AddStockComponent, {
      width: '600px',
      data: { stock }
    });

    dialogRef.afterClosed().subscribe((result: Stock | undefined) => {
      if (result) {
        this.loadStocks();
      }
    });
  }

  desativarStock(stock: Stock): void {
    // Confirmar ação com o usuário
    const confirmDialog = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Desativar Produto',
        message: `Tem certeza que deseja desativar o Estoque "${stock.product?.name} "?`,
        confirmText: 'Desativar',
        cancelText: 'Cancelar',
        color: 'warn',
        icon: 'fa-trash-can',
        iconColor: '#DC2626'
      }
    });

    confirmDialog.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed && stock.id) {
        this.stockService.disableStock(stock.id).subscribe({
          next: () => {
            this.loadStocks(); // Recarregar tabela
            this.snackbar.success('Produto desativado com sucesso!');
          },
          error: (error) => {
            this.snackbar.error('Erro ao desativar Produto. '+error)
          }
        });
      }
    });
  }

  abrirContadoresDialog(stock: Stock): void {
    this.dialog.open(StockDialogComponent, {
      width: '90%',
      maxWidth: '1200px',
      panelClass: 'stock-counters-dialog',
      data: { stock }
    });
  }
}