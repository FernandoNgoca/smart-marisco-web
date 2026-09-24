import { forkJoin, finalize } from 'rxjs';
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

  totalVendasHoje: number = 0;
  totalVendasMes: number = 0;
  totalClientes: number = 0;
  totalProdutos: number = 0;
  totalOrders: number = 0;
  variationSale: number = 0;
  yesterday: number = 0;
  salesPreviousMonth: number = 0;
  variationSaleMonth: number = 0;

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
    if (this.isLoading || !this.hasAdminPermission()) return;
    this.isLoading = true;
    this.loadError = false;
    forkJoin({
      today: this.saleService.countByCreatedDateBetweenAndSaleStatusAndStatus(),
      yesterday: this.saleService.countYesterdaySales(),
      month: this.saleService.countSalesCurrentMonth(),
      previousMonth: this.saleService.countSalesPreviousMonth(),
      clients: this.clientService.countClients(),
      products: this.productService.countProducts(),
      orders: this.saleService.countByStatusAndSaleStatus(),
      week: this.saleService.getSalesWeek(),
      top: this.saleItemService.getTopProducts()
    }).pipe(finalize(() => { this.isLoading = false; })).subscribe({
      next: data => {
        this.totalVendasHoje = data.today;
        this.yesterday = data.yesterday;
        this.totalVendasMes = data.month;
        this.salesPreviousMonth = data.previousMonth;
        this.totalClientes = data.clients;
        this.totalProdutos = data.products;
        this.totalOrders = data.orders;
        this.variationSale = this.calculateVariation(data.today, data.yesterday);
        this.variationSaleMonth = this.calculateVariation(data.month, data.previousMonth);
        this.salesByDay = this.weekTemplate.map(day => ({
          name: day.name, value: data.week.find(d => d.name === day.name)?.value ?? 0
        }));
        const max = Math.max(...this.salesByDay.map(day => day.value), 1);
        const step = Math.max(1, Math.ceil(max / 5));
        this.yAxisTicks = Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
        this.topProducts = data.top;
      },
      error: () => { this.loadError = true; }
    });
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

  // Verificar permissão de admin
  public hasAdminPermission(): boolean {
    return this.auth.hasAnyRole(['ROLE_ADMIN', 'ROLE_MANAGER']);
  }

  calculateVariation(current: number, previous: number): number {

    if (previous === 0) {

      if (current === 0) {
        return 0;
      }

      return 100; // ou null, ou Infinity, conforme a regra de negócio
    }

    return Number((((current - previous) / previous) * 100).toFixed(1));
  }
}
