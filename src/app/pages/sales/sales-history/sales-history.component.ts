import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
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
export class SalesHistoryComponent implements OnInit, AfterViewInit {

  displayedColumns: string[] = ['name', 'description', 'action'];
  dataSource: Sale[] = [];
  totalElements = 0;
  pageSize = 5;
  pageIndex = 0;
  filterValue = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private saleService: SaleService,
    private snackbar: SnackbarService,
    private dialog: MatDialog,
  ) { }

  ngOnInit(): void {
    this.loadSales();
  }

  ngAfterViewInit(): void {
    this.paginator.page.subscribe(() => {
      this.pageIndex = this.paginator.pageIndex;
      this.pageSize = this.paginator.pageSize;
      this.loadSales();
    });

    this.sort.sortChange.subscribe(() => {
      this.pageIndex = 0;
      this.loadSales();
    });
  }

  loadSales(): void {
    const direction = this.sort?.direction || 'asc';
    const sortField = this.sort?.active || 'name';
    this.saleService.findAll(
      this.pageIndex,
      this.pageSize,
      sortField,
      direction,
      this.filterValue
    ).subscribe({
      next: (response) => {
        this.dataSource = response._embedded?.sales ?? [];
        this.totalElements = response.page?.totalElements ?? 0; // Ajuste para total de elementos
      },
      error: (err) => {
        this.snackbar.error('Erro ao carregar as vendas.');
      }
    });
  }

  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;

    this.filterValue = value.trim().toLowerCase();
    this.pageIndex = 0;

    this.loadSales();
  }
}
