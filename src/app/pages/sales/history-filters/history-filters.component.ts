import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { HistoryFilter, HistorySummary } from '@app/services/sale.service';
import { Subject, debounceTime, distinctUntilChanged, map, takeUntil } from 'rxjs';

export interface StatusOption {
  value: string;
  label: string;
}

/** Barra de filtros comum aos históricos de vendas e de pedidos. */
@Component({
  selector: 'app-history-filters',
  templateUrl: './history-filters.component.html',
  styleUrls: ['./history-filters.component.scss']
})
export class HistoryFiltersComponent implements OnInit, OnDestroy {
  @Input() statusOptions: StatusOption[] = [];
  @Input() summary: HistorySummary | null = null;
  @Input() searchPlaceholder = 'Cliente ou nº';
  @Output() filterChange = new EventEmitter<HistoryFilter>();

  form = this.fb.nonNullable.group({ search: '', saleStatus: '', from: '', to: '' });
  private destroyed = new Subject<void>();

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.form.valueChanges.pipe(
      debounceTime(300),
      map(() => this.form.getRawValue()),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      takeUntil(this.destroyed)
    ).subscribe(value => this.filterChange.emit(value));
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }

  get hasFilters(): boolean {
    const { search, saleStatus, from, to } = this.form.getRawValue();
    return !!(search || saleStatus || from || to);
  }

  setStatus(value: string): void {
    this.form.patchValue({ saleStatus: value });
  }

  // Atalhos de período, em hora local.
  setPeriod(period: 'today' | 'week' | 'month'): void {
    const today = new Date();
    const start = new Date(today);
    if (period === 'week') start.setDate(today.getDate() - 6);
    if (period === 'month') start.setDate(1);
    this.form.patchValue({ from: isoDate(start), to: isoDate(today) });
  }

  clear(): void {
    this.form.setValue({ search: '', saleStatus: '', from: '', to: '' });
  }
}

function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
