import { AfterViewInit, Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subject, finalize, takeUntil } from 'rxjs';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { SaleService } from '@app/services/sale.service';
import { SnackbarService } from '@app/services/snackbar.service';
import { Sale } from '@app/shared/models/sale';

@Component({
  selector: 'app-sales-history',
  templateUrl: './sales-history.component.html',
  styleUrls: ['./sales-history.component.scss']
})
export class SalesHistoryComponent implements OnInit, AfterViewInit, OnDestroy {

  displayedColumns: string[] = ['id', 'client', 'totalValue', 'saleStatus', 'createdDate'];
  dataSource: Sale[] = [];
  isLoading = false;
  loadError = false;
  private destroyed = new Subject<void>();
  private reload = new Subject<void>();
  totalElements = 0;
  pageSize = 5;
  pageIndex = 0;
  filterValue = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private saleService: SaleService,
    private snackbar: SnackbarService,
  ) { }

  ngOnInit(): void {
    this.loadSales();
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
      this.filterValue
    ).pipe(takeUntil(this.reload), takeUntil(this.destroyed), finalize(() => { this.isLoading = false; })).subscribe({
      next: (response) => {
        this.dataSource = response._embedded?.sales ?? [];
        this.totalElements = response.page?.totalElements ?? 0; // Ajuste para total de elementos
      },
      error: () => {
        this.loadError = true;
        this.dataSource = [];
        this.totalElements = 0;
        this.snackbar.error('Erro ao carregar as vendas.');
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
    this.reload.complete();
  }

  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;

    this.filterValue = value.trim().toLowerCase();
    this.pageIndex = 0;

    this.loadSales();
  }
}
