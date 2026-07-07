import { Component, OnInit, ViewChild } from '@angular/core';
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
export class OrderHistoryComponent implements OnInit {


  displayedColumns: string[] = ['firstName', 'lastName', 'phoneNumber', 'totalValue','date', 'action'];
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
    this.loadOrders();
  }

  ngAfterViewInit(): void {
    this.paginator.page.subscribe(() => {
      this.pageIndex = this.paginator.pageIndex;
      this.pageSize = this.paginator.pageSize;
      this.loadOrders();
    });

    this.sort.sortChange.subscribe(() => {
      this.pageIndex = 0;
      this.loadOrders();
    });
  }

  loadOrders(): void {
    const direction = this.sort?.direction || 'asc';
    const sortField = this.sort?.active || 'id';
    this.saleService.findAllOrders(
      this.pageIndex,
      this.pageSize,
      sortField,
      direction,
      this.filterValue
    ).subscribe({
      next: (response) => {
        this.dataSource = response._embedded?.sales ?? [];
        this.totalElements = response.page?.totalElements ?? 0;
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
}
