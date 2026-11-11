import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy } from '@angular/core';

/**
 * Copia o texto de cada cabeçalho para `data-label` das células da mesma coluna.
 * Em ecrãs pequenos, `_tables.scss` usa esse atributo para mostrar cada linha como um cartão.
 */
@Directive({
  selector: '.app-data-table',
  standalone: true
})
export class ResponsiveTableDirective implements AfterViewInit, OnDestroy {
  private observer?: MutationObserver;

  constructor(private el: ElementRef<HTMLElement>, private zone: NgZone) { }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.label();
      // Só observa filhos: escrever data-label não volta a disparar o observer.
      this.observer = new MutationObserver(() => this.label());
      this.observer.observe(this.el.nativeElement, { childList: true, subtree: true });
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private label(): void {
    const host = this.el.nativeElement;
    const labels = new Map<string, string>();
    host.querySelectorAll('.mat-header-cell').forEach(header => {
      const column = columnOf(header);
      if (column) labels.set(column, header.textContent?.trim() ?? '');
    });
    host.querySelectorAll('.mat-cell').forEach(cell => {
      const label = labels.get(columnOf(cell) ?? '');
      if (label !== undefined && cell.getAttribute('data-label') !== label) {
        cell.setAttribute('data-label', label);
      }
    });
  }
}

function columnOf(element: Element): string | undefined {
  return Array.from(element.classList).find(name => name.startsWith('mat-column-'));
}
