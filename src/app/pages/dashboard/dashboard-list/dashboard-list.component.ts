import { DashboardService, DashboardSummary } from '@app/services/dashboard.service';
import { forkJoin, finalize, catchError, of, Observable, switchMap, timeout } from 'rxjs';
import { Component, OnInit } from '@angular/core';
import { AuthService } from '@app/services/auth.service';
import { ClientService } from '@app/services/client.service';
import { ProductService } from '@app/services/product.service';
import { SaleService } from '@app/services/sale.service';
import { SaleItemService } from '@app/services/saleItem.service';

@Component({
  selector: 'app-dashboard-list',
  templateUrl: './dashboard-list.component.html',
  styleUrls: ['./dashboard-list.component.scss']
})
export class DashboardListComponent implements OnInit {

  isLoading = false;
  loadError = false;

  salesByDay: { name: string; value: number }[] = [];

  topProducts: any[] = [];
  weekUnavailable = false;
  topUnavailable = false;

  totalVendasHoje: number | null = null;
  totalVendasMes: number | null = null;
  totalClientes: number | null = null;
  totalProdutos: number | null = null;
  totalOrders: number | null = null;
  summary: DashboardSummary | null = null;
  variationSale: number | null = 0;
  variationSaleMonth: number | null = 0;

  yAxisTicks: number[] = [0, 1];

  private weekTemplate = [
    { name: 'SEG', value: 0 },
    { name: 'TER', value: 0 },
    { name: 'QUA', value: 0 },
    { name: 'QUI', value: 0 },
    { name: 'SEX', value: 0 },
    { name: 'SAB', value: 0 },
    { name: 'DOM', value: 0 }
  ];

  constructor(
    private dashboardService: DashboardService,
    private saleService: SaleService,
    private clientService: ClientService,
    private productService: ProductService,
    private auth: AuthService,
    private saleItemService: SaleItemService
  ) { }

  ngOnInit(): void {
    this.loadTotalVendasHoje();
  }

  public loadTotalVendasHoje(): void {
    if (this.isLoading || !this.hasDashboardPermission()) return;
    this.isLoading = true;
    this.loadError = false;
    forkJoin({
      sales: this.available(this.dashboardService.summary()).pipe(switchMap(summary => {
        if (summary) return of({ summary, today: summary.salesToday, month: summary.salesMonth });
        // Keep existing counters available when the new summary endpoint is unavailable.
        return forkJoin({
          summary: of(null),
          today: this.available(this.saleService.countByCreatedDateBetweenAndSaleStatusAndStatus()),
          month: this.available(this.saleService.countSalesCurrentMonth())
        });
      })),
      clients: this.available(this.clientService.countClients()),
      products: this.available(this.productService.countProducts()),
      orders: this.available(this.saleService.countByStatusAndSaleStatus()),
      week: this.available(this.saleService.getSalesWeek()),
      top: this.available(this.saleItemService.getTopProducts())
    }).pipe(finalize(() => { this.isLoading = false; })).subscribe(data => {
      this.summary = data.sales.summary;
      this.totalVendasHoje = data.sales.today;
      this.totalVendasMes = data.sales.month;
      this.totalClientes = data.clients;
      this.totalProdutos = data.products;
      this.totalOrders = data.orders;
      this.variationSale = this.summary
        ? this.calculateVariation(this.summary.salesToday, this.summary.salesYesterday) : null;
      this.variationSaleMonth = this.summary
        ? this.calculateVariation(this.summary.salesMonth, this.summary.salesPreviousPeriod) : null;
      this.weekUnavailable = data.week === null;
      this.topUnavailable = data.top === null;
      this.salesByDay = this.weekTemplate.map(day => ({
        name: day.name, value: data.week?.find(d => d.name === day.name)?.value ?? 0
      }));
      const max = Math.max(...this.salesByDay.map(day => day.value), 1);
      const step = Math.max(1, Math.ceil(max / 5));
      this.yAxisTicks = Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
      this.topProducts = data.top ?? [];
    });
  }

  private available<T>(request: Observable<T>): Observable<T | null> {
    return request.pipe(timeout(15000), catchError(() => {
      this.loadError = true;
      return of(null);
    }));
  }

  getImage(image: string | undefined): string {
    if (!image) return 'assets/No_Image.svg.png';
    return image.startsWith('data:')
      ? image
      : 'data:image/jpeg;base64,' + image;
  }

  public formatYAxisTicks(val: number): string {
    return Math.floor(val).toString();
  }

  // Dashboard exclusiva do gerente
  public hasDashboardPermission(): boolean {
    return !this.auth.hasAnyRole(['ROLE_ADMIN']) && this.auth.hasAnyRole(['ROLE_MANAGER']);
  }

  calculateVariation(current: number, previous: number): number | null {

    if (previous === 0) {

      if (current === 0) {
        return 0;
      }

      return null;
    }

    return Number((((current - previous) / previous) * 100).toFixed(1));
  }
}
