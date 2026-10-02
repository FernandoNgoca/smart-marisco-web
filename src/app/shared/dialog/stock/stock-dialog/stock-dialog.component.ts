import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { FormControl, FormGroup } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { StockService } from '@app/services/stock.service';
import { StockMovementService } from '@app/services/stockMovement.service';
import { Stock, StockCounters } from '@app/shared/models/stock';
import { StockMovement } from '@app/shared/models/stockMovement';
import { DialogData } from '../add-stock/add-stock.component';
import { AddStockMovementComponent } from '../add-stock-movement/add-stock-movement.component';

@Component({ selector: 'app-stock-dialog', templateUrl: './stock-dialog.component.html', styleUrls: ['./stock-dialog.component.scss'] })
export class StockDialogComponent implements OnInit, OnDestroy {
  stockSelecionado: Stock | null = null;
  counters: StockCounters | null = null;
  movements: StockMovement[] = [];
  displayedColumns = ['quantity', 'type', 'description', 'createdBy', 'createdDate'];
  totalElements = 0;
  pageSize = 5;
  pageIndex = 0;
  loading = false;
  error = '';
  stockError = '';
  filters = new FormGroup({ type: new FormControl(''), from: new FormControl(''), to: new FormControl('') });
  private destroyed = new Subject<void>();
  private cancelLoad = new Subject<void>();
  private quantityFormat = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 3 });
  constructor(public dialogRef: MatDialogRef<StockDialogComponent>, private stockService: StockService,
    private stockMovementService: StockMovementService, private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: DialogData) {}

  get unit(): string { return this.stockSelecionado?.product?.unit?.symbol || this.stockSelecionado?.product?.unit?.name || ''; }
  get invalidDates(): boolean {
    const { from, to } = this.filters.getRawValue();
    return !!(from && to && from > to);
  }
  formatQuantity(value: number): string { return this.quantityFormat.format(value); }
  ngOnInit(): void {
    this.stockSelecionado = this.data?.stock || null;
    this.loadMovements();
    this.refreshStock();
  }
  ngOnDestroy(): void { this.destroyed.next(); this.destroyed.complete(); this.cancelLoad.next(); this.cancelLoad.complete(); }
  loadMovements(): void {
    if (this.invalidDates) return;
    const productId = this.stockSelecionado?.productId ?? this.stockSelecionado?.product?.id;
    if (!productId) { this.error = 'Não foi possível identificar o produto.'; return; }
    this.cancelLoad.next();
    this.loading = true;
    this.error = '';
    const { type, from, to } = this.filters.getRawValue();
    this.stockMovementService.history(productId, this.pageIndex, this.pageSize, type || '', from || '', to || '')
      .pipe(takeUntil(this.cancelLoad), takeUntil(this.destroyed)).subscribe({
        next: result => {
          this.movements = result.items;
          this.totalElements = result.totalElements;
          this.counters = { totalLancamentos: result.movements, totalEntradas: result.entries,
            totalSaidas: result.exits, estoqueAtual: this.stockSelecionado?.quantity ?? 0 };
          this.loading = false;
        },
        error: () => { this.loading = false; this.movements = []; this.totalElements = 0; this.counters = null;
          this.error = 'Não foi possível carregar os movimentos.'; }
      });
  }
  refreshStock(): void {
    const productId = this.stockSelecionado?.productId ?? this.stockSelecionado?.product?.id;
    if (!productId) return;
    this.stockError = '';
    this.stockService.findByProductId(productId).pipe(takeUntil(this.destroyed)).subscribe({
      next: stock => { this.stockSelecionado = { ...stock, product: stock.product || this.stockSelecionado?.product };
        if (this.counters) this.counters.estoqueAtual = stock.quantity; },
      error: () => this.stockError = 'Não foi possível atualizar o stock atual.'
    });
  }
  applyFilters(): void { if (!this.invalidDates) { this.pageIndex = 0; this.loadMovements(); } }
  clearFilters(): void { this.filters.reset({ type: '', from: '', to: '' }); this.applyFilters(); }
  onPageChange(event: PageEvent): void { this.pageIndex = event.pageIndex; this.pageSize = event.pageSize; this.loadMovements(); }
  close(): void { this.dialogRef.close(); }
  abrirDialog(): void {
    if (!this.stockSelecionado) return;
    this.dialog.open(AddStockMovementComponent, { width: '600px', data: { stock: this.stockSelecionado } })
      .afterClosed().pipe(takeUntil(this.destroyed)).subscribe(result => {
        if (result) { this.pageIndex = 0; this.loadMovements(); this.refreshStock(); }
      });
  }
}
