import { AfterViewInit, Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subject, finalize, takeUntil } from 'rxjs';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { HistoryFilter, HistorySummary, SaleService } from '@app/services/sale.service';
import { SnackbarService } from '@app/services/snackbar.service';
import { Sale } from '@app/shared/models/sale';
import { StatusOption } from '../history-filters/history-filters.component';

@Component({
  selector: 'app-sales-history',
  templateUrl: './sales-history.component.html',
  styleUrls: ['./sales-history.component.scss']
})
export class SalesHistoryComponent implements OnInit, AfterViewInit, OnDestroy {

  displayedColumns: string[] = ['id', 'createdDate', 'client', 'saleStatus', 'totalValue', 'action'];
  readonly statusOptions: StatusOption[] = [
    { value: 'COMPLETED', label: 'Concluídas' },
    { value: 'ORDERS', label: 'Pedidos' },
    { value: 'CANCELED', label: 'Canceladas' }
  ];
  summary: HistorySummary | null = null;
  dataSource: Sale[] = [];
  isLoading = false;
  loadError = false;
  private destroyed = new Subject<void>();
  private reload = new Subject<void>();
  private summaryRequest = new Subject<void>();
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;
  filter: HistoryFilter = {};

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private saleService: SaleService,
    private snackbar: SnackbarService,
  ) { }

  ngOnInit(): void {
    this.loadSales();
    this.loadSummary();
  }

  ngAfterViewInit(): void {
    this.paginator.page.pipe(takeUntil(this.destroyed)).subscribe(() => {
      this.pageIndex = this.paginator.pageIndex;
      this.pageSize = this.paginator.pageSize;
      this.loadSales();
    });

    this.sort.sortChange.pipe(takeUntil(this.destroyed)).subscribe(() => {
      this.pageIndex = 0;
      this.loadSales();
    });
  }

  loadSales(): void {
    this.reload.next();
    this.isLoading = true;
    this.loadError = false;
    const direction = this.sort?.direction || 'desc';
    const sortField = this.sort?.active || 'createdDate';
    this.saleService.findAll(
      this.pageIndex,
      this.pageSize,
      sortField,
      direction,
      this.filter
    ).pipe(takeUntil(this.reload), takeUntil(this.destroyed), finalize(() => { this.isLoading = false; })).subscribe({
      next: (response) => {
        this.dataSource = response._embedded?.sales ?? [];
        this.totalElements = response.page?.totalElements ?? 0;
      },
      error: () => {
        this.loadError = true;
        this.dataSource = [];
        this.totalElements = 0;
        this.snackbar.error('Erro ao carregar as vendas.');
      }
    });
  }

  // O resumo só depende dos filtros, não da página nem da ordenação.
  private loadSummary(): void {
    this.summaryRequest.next();
    this.saleService.historySummary(false, this.filter).pipe(takeUntil(this.summaryRequest), takeUntil(this.destroyed)).subscribe({
      next: summary => this.summary = summary,
      error: () => this.summary = null
    });
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
    this.reload.complete();
    this.summaryRequest.complete();
  }

  onFilterChange(filter: HistoryFilter): void {
    this.filter = filter;
    this.pageIndex = 0;
    if (this.paginator) this.paginator.pageIndex = 0;
    this.loadSales();
    this.loadSummary();
  }

  statusLabel(status: string): string {
    return status === 'COMPLETED' ? 'Concluída' : status === 'ORDERS' ? 'Pedido' : status === 'CANCELED' ? 'Cancelada' : status;
  }
}
