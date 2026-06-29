import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { SaleItemService } from '@app/services/saleItem.service';
import { SnackbarService } from '@app/services/snackbar.service';
import { Sale, SaleItem } from '@app/shared/models/sale';

export interface DialogData {
  sale?: Sale;
}

export interface DialogData {
  sale?: Sale;
}

@Component({
  selector: 'app-view-order',
  templateUrl: './view-order.component.html',
  styleUrls: ['./view-order.component.scss']
})
export class ViewOrderComponent implements OnInit {

  displayedColumns: string[] = ['image', 'productName', 'quantity', 'unit', 'productPrice', 'priceTotal'];
  dataSource: SaleItem[] = [];
  totalElements = 0;
  pageSize = 5;
  pageIndex = 0;
  previewImage: string | null = null;
  previewX = 0;
  previewY = 0;
  sale: Sale = {} as Sale;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  tituloDialog: string = 'Contadores do estoque';

  constructor(
    private dialog: MatDialog,
    private snackbar: SnackbarService,
    private saleItemService: SaleItemService,
    public dialogRef: MatDialogRef<ViewOrderComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) { }

  ngOnInit(): void {

    const saleId = this.data?.sale?.id;
    const sale = this.data?.sale

    if (sale) {
      this.sale = sale;
    }
    if (saleId) {
      this.saleItemService.findAllBySaleId(saleId).subscribe({
        next: (saleItem) => {
          this.dataSource = saleItem
        },
        error: (err) => {
          this.snackbar.error('Erro ao carregar Item do produto');

        }
      });
    }
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

  close(): void {
    this.dialogRef.close();
  }

  price(price: number, quatity: number):number{
    return price * quatity;
  }

}
