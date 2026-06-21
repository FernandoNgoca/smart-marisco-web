import { Component, OnInit } from '@angular/core';
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

  salesByDay: { name: string; value: number }[] = [];

  topProducts: any[] = [];

  totalVendasHoje: number = 0;
  totalVendasMes: number = 0;
  totalClientes: number = 0;
  totalProdutos: number = 0;
  totalOrders: number=0;

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
    private saleItemService: SaleItemService
  ) { }

  ngOnInit(): void {
    this.loadTotalVendasHoje();
  }

  public loadTotalVendasHoje(): void {
    this.saleService.countByCreatedDateBetweenAndSaleStatusAndStatus().subscribe(
      (count) => {
        this.totalVendasHoje = count;
        if (this.totalVendasHoje > 0) {
          this.totalVendasHoje = this.totalVendasHoje;
        }
      }
    );

    this.saleService.countSalesCurrentMonth().subscribe(
      (count) => {
        this.totalVendasMes = count;
        if (this.totalVendasMes > 0) {
          this.totalVendasMes = this.totalVendasMes;
        }
      }
    );

    this.clientService.countClients().subscribe(
      (count) => {
        this.totalClientes = count;
      }
    );

    this.productService.countProducts().subscribe(
      (count) => {
        this.totalProdutos = count;
      }
    );

    this.saleService.countByStatusAndSaleStatus().subscribe(
      (count) => {
        this.totalOrders = count;
      }
    );

    this.saleService.getSalesWeek().subscribe({
      next: (data) => {

        const merged = this.weekTemplate.map(day => {
          const found = data.find(d => d.name === day.name);
          return {
            name: day.name,
            value: found ? found.value : 0
          };
        });

        this.salesByDay = merged;

        const maxSales = Math.max(...merged.map(d => d.value), 1);
        this.yAxisTicks = [];
        for (let i = 0; i <= maxSales + 1; i++) {
          this.yAxisTicks.push(i);
        }

      },
      error: () => {
        this.salesByDay = [...this.weekTemplate];
        this.yAxisTicks = [0, 1];
      }
    });
    this.saleItemService.getTopProducts().subscribe(data => {
      this.topProducts = data;
    });
  }

  getImage(image: string | undefined): string {
    if (!image) return 'assets/No_Image.svg.png';
    return image.startsWith('data:')
      ? image
      : 'data:image/jpeg;base64,' + image;
  }

  public formatYAxisTicks(val: number):string{
    return Math.floor(val).toString();
  }
}
