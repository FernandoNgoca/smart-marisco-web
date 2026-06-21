import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { SnackbarService } from '@app/services/snackbar.service';
import { Sale, SaleItem } from '@app/shared/models/sale';

export interface DialogData {
  sale?: Sale;
}

@Component({
  selector: 'app-view-order',
  templateUrl: './view-order.component.html',
  styleUrls: ['./view-order.component.scss']
})
export class ViewOrderComponent implements OnInit {

  displayedColumns: string[] = ['image', 'productName', 'quantity', 'unit', 'productPrice'];
  dataSource: SaleItem[] = [];
  totalElements = 0;
  pageSize = 5;
  pageIndex = 0;
  previewImage: string | null = null;
  previewX = 0;
  previewY = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private dialog: MatDialog,
    private snackbar: SnackbarService,
  ) { }

  ngOnInit(): void {
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

}
