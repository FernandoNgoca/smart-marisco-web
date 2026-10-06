import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { ProductService } from '@app/services/product.service';
import { SnackbarService } from '@app/services/snackbar.service';
import { ConfirmDialogComponent } from '@app/shared/dialog/confirm-dialog.component';
import { AddProductComponent } from '@app/shared/dialog/product/add-product/add-product.component';
import { Product } from '@app/shared/models/product';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss']
})
export class ProductListComponent implements OnInit, AfterViewInit {

  displayedColumns: string[] = ['image', 'code', 'name', 'price', 'salePrice', 'species', 'action'];
  dataSource: Product[] = [];
  totalElements = 0;
  pageSize = 5;
  pageIndex = 0;
  filterValue = '';
  loadError = false;
  isLoading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private productService: ProductService,
    private dialog: MatDialog,
    private snackbar: SnackbarService,
  ) { }

  ngOnInit(): void {
    this.loadProducts();
  }

  ngAfterViewInit(): void {
    this.paginator.page.subscribe(() => {
      this.pageIndex = this.paginator.pageIndex;
      this.pageSize = this.paginator.pageSize;
      this.loadProducts();
    });

    this.sort.sortChange.subscribe(() => {
      this.pageIndex = 0;
      this.loadProducts();
    });
  }

  loadProducts(): void {
    this.loadError = false;
    this.isLoading = true;
    const direction = this.sort?.direction || 'asc';
    const sortField = this.sort?.active || 'code';

    this.productService
      .findAll(
        this.pageIndex,
        this.pageSize,
        sortField,
        direction,
        this.filterValue
      )
      .subscribe({
        next: (resp) => {
          this.isLoading = false;
          this.dataSource = resp._embedded?.products ?? [];
          this.totalElements = resp.page?.totalElements ?? 0;
        },
        error: (err) => {
          this.isLoading = false;
          this.loadError = true;
          this.dataSource = [];
          this.totalElements = 0;
          this.snackbar.error('Erro ao carregar os produtos.', err);
        }
      });
  }

  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;

    this.filterValue = value.trim().toLowerCase();
    this.pageIndex = 0;

    this.loadProducts();
  }

  abrirDialog(): void {
    const dialogRef = this.dialog.open(AddProductComponent, { width: '600px', data: null });
    dialogRef.afterClosed().subscribe((result: Product | undefined) => {
      if (result) this.loadProducts();
    });
  }

  editarProduto(product: Product): void {
    const dialogRef = this.dialog.open(AddProductComponent, { width: '600px', data: { product } });
    dialogRef.afterClosed().subscribe((result: Product | undefined) => {
      if (result) this.loadProducts();
    });
  }

  desativarProduto(product: Product): void {
    const confirmDialog = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Desativar Produto',
        message: `Tem certeza de que deseja desativar o produto "${product.name}"?`,
        confirmText: 'Desativar',
        cancelText: 'Cancelar',
        color: 'warn',
        icon: 'fa-trash-can',
        iconColor: '#DC2626'
      }
    });

    confirmDialog.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed && product.id) {
        this.productService.disableProduct(product.id).subscribe({
          next: () => {
            this.loadProducts();
            this.snackbar.success('Produto desativado com sucesso!');
          },
          error: () => {
            this.snackbar.error('Erro ao desativar o produto.');
          }
        });
      }
    });
  }

  visualizarProduto(product: Product): void {
    this.dialog.open(AddProductComponent, {
      width: '600px',
      data: {
        product,
        viewOnly: true
      }
    });
  }
}
