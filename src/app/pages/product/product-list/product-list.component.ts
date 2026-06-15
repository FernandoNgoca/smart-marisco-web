import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { CategoryService } from '@app/services/category.service';
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
  previewImage: string | null = null;
  previewX = 0;
  previewY = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private productService: ProductService,
    private dialog: MatDialog,
    private snackbar: SnackbarService,
    private categoryService: CategoryService
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
          this.dataSource = resp._embedded?.products ?? [];
          this.totalElements = resp.page?.totalElements ?? 0;
        },
        error: (err) => {
          console.error('Erro ao carregar produtos:', err);
          this.dataSource = [];
          this.totalElements = 0;
          this.snackbar.error('Erro ao carregar produtos.');
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
        message: `Tem certeza que deseja desativar o Produto "${product.name}"?`,
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
            this.snackbar.error('Erro ao desativar Produto.');
          }
        });
      }
    });
  }

  getImage(image: string | undefined): string {
    if (!image) return 'assets/No_Image.svg.png';
    return image.startsWith('data:')
      ? image
      : 'data:image/jpeg;base64,' + image;
  }

  showPreview(event: MouseEvent, image: string | undefined) {
    if (!image) return;
    this.previewImage = image;
    this.previewX = event.clientX + 15;
    this.previewY = event.clientY + 15;
  }

  movePreview(event: MouseEvent): void {
    const previewWidth = 320;
    const previewHeight = 320;
    const offset = 15;

    let x = event.clientX + offset;
    let y = event.clientY + offset;

    if (x + previewWidth > window.innerWidth) {
      x = event.clientX - previewWidth - offset;
    }

    if (y + previewHeight > window.innerHeight) {
      y = event.clientY - previewHeight - offset;
    }

    this.previewX = x;
    this.previewY = y;
  }

  hidePreview() {
    this.previewImage = null;
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