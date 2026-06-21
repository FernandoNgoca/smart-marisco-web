import { Client } from './../../../shared/models/client';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { ClientService } from '@app/services/client.service';
import { ProductService } from '@app/services/product.service';
import { SaleService } from '@app/services/sale.service';
import { SnackbarService } from '@app/services/snackbar.service';
import { StockService } from '@app/services/stock.service';
import { Product } from '@app/shared/models/product';
import { Sale, SaleItem, SaleRequest, SaleStatus } from '@app/shared/models/sale';

@Component({
  selector: 'app-sales-order',
  templateUrl: './sales-order.component.html',
  styleUrls: ['./sales-order.component.scss']
})
export class SalesOrderComponent implements OnInit {

  displayedColumns: string[] = [
    'image',
    'productName',
    'unitaryValue',
    'quantity',
    'unit',
    'totalValue',
    'action'
  ];

  dataSource = new MatTableDataSource<SaleItem>();
  saleItems: SaleItem[] = [];
  valueSale: number = 0;
  products: Product[] = [];
  filteredProducts: Product[] = [];
  clients: Client[] = [];
  filteredClients: Client[] = [];
  selectedClient: Client | null = null;
  sale: Sale = {} as Sale;
  saleRequest = {} as SaleRequest;
  form: FormGroup;
  totalOrdersForToday: number = 0;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private clientService: ClientService,
    private snackbar: SnackbarService,
    private saleService: SaleService,
    private stockService: StockService
  ) {
    this.form = this.fb.group({
      productId: [null,],
      quantity: [null,],
      clientId: [null,]
    });
  }

  ngOnInit(): void {
    this.loadingProducts();
    this.loadingClients();

    // Produto
    this.form.get('productId')?.valueChanges.subscribe(() => {
      this.filterProducts();
    });

    // Cliente
    this.form.get('clientId')?.valueChanges.subscribe(() => {
      this.filterClients();
    });

    this.form.get('clientId')?.valueChanges.subscribe((client: Client) => {
      if (client?.id) {
        this.selectedClient = client;
      } else {
        this.selectedClient = null;
      }
    });

this.countOrders();
  }

  countOrders() {
    this.saleService.countOrdersCurrentDay().subscribe(
      (count) => {
        this.totalOrdersForToday = count + 1;
      }
    );
  }

  loadingProducts() {
    this.productService.findAvailableProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.filteredProducts = data;
      },
      error: (err) => console.error('Erro ao carregar produtos:', err)
    });
  }

  loadingClients() {
    this.clientService.findAll(0, 100, '', 'asc').subscribe({
      next: (data) => {
        this.clients = data._embedded.client;
        this.filteredClients = data._embedded.clients;
      },
      error: (err) => console.error('Erro ao carregar clientes:', err)
    });
  }

  // Mostrar nome no input
  displayProduct(prod: Product): string {
    return prod?.name || '';
  }

  // Filtro produtos
  filterProducts() {
    const value = this.form.get('productId')?.value;

    if (typeof value === 'string') {
      this.filteredProducts = this.products.filter(p =>
        p.name.toLowerCase().includes(value.toLowerCase())
      );
    } else {
      this.filteredProducts = this.products;
    }
  }

  // Filtro clientes
  filterClients() {
    const value = this.form.get('clientId')?.value;

    if (typeof value === 'string') {
      this.filteredClients = this.clients.filter(c =>
        c.firstName.toLowerCase().includes(value.toLowerCase())
      );
    } else {
      this.filteredClients = this.clients;
    }
  }

  displayClient(client: any): string {
    const first = client?.firstName || '';
    const last = client?.lastName || '';
    return `${first} ${last}`.trim();
  }

  calculateTotal() {
    const total = this.saleItems.reduce((sum, item) => {
      const price = item.product?.salePrice || 0;
      return sum + (item.quantity * price);
    }, 0);

    this.valueSale = total;
    this.sale.totalValue = total;
  }

  private addItemToSale(product: Product, quantity: number) {

    // Calcular subtotal
    const subTotal = quantity * product.salePrice;

    // Montar item da venda
    const item: SaleItem = {
      productId: product.id!,
      product: product,
      quantity: quantity,
    };

    // Adicionar à lista e atualizar tabela
    this.saleItems.push(item);
    this.dataSource.data = this.saleItems;

    if (this.saleItems.length >= 1 && this.selectedClient) {
      this.form.get('clientId')?.disable();
    }

    // Atualizar total da venda
    this.calculateTotal();

    // Resetar formulário
    this.form.patchValue({
      productId: null,
      quantity: null
    });
  }

  addItem() {
    // Verificar se os campos obrigatórios estão preenchidos
    const product: Product = this.form.value.productId;
    const quantity: number = this.form.value.quantity;
    const client = this.selectedClient;

    if (!product) {
      this.snackbar.error('Selecione um produto para adicionar ao pedido.');
      return;
    }

    if (!quantity || quantity <= 0) {
      this.snackbar.error('Informe uma quantidade válida.');
      return;
    }

    if (!client) {
      this.snackbar.error('Selecione um cliente para continuar.');
      return;
    }
    const productAlreadyAdded = this.saleItems.some(
      item => item.productId === product.id
    );

    if (productAlreadyAdded) {
      this.snackbar.warning('Este produto já se encontra na lista do pedido.');
      return;
    }

    this.stockService.findByProductId(product.id!).subscribe({
      next: (stock) => {
        if (stock.quantity < quantity) {
          this.snackbar.error(
            `Estoque insuficiente. Disponível: ${stock.quantity} unidade(s).`
          );
          return;
        } else {
          this.addItemToSale(product, quantity);
        }
      },
      error: (err) => {
        this.snackbar.error(
          'Não foi possível verificar o estoque do produto.'
        );
      }
    });
  }

  removeItem(item: SaleItem) {
    this.saleItems = this.saleItems.filter(i => i !== item);
    this.dataSource.data = [...this.saleItems];

    if (this.saleItems.length === 0) {
      this.form.get('clientId')?.enable();
      this.form.get('clientId')?.setValue(null);
    }

    this.calculateTotal();

    this.snackbar.success('Produto removido do pedido.');
  }

  editItem(item: SaleItem) {
    // Preencher formulário
    this.form.patchValue({
      productId: item.product,
      quantity: item.quantity
    });

    // Remover temporariamente para não duplicar
    this.removeItem(item);
  }

  processSale() {
    if (this.saleItems.length === 0) {
      this.snackbar.error(
        'Adicione pelo menos um produto antes de finalizar o pedido.'
      );
      return;
    }

    this.saleRequest = {
      sale: {
        clientId: this.selectedClient?.id,
        totalValue: this.sale.totalValue,
        saleStatus: SaleStatus.ORDERS
      },
      items: this.saleItems
    };

    this.saleService.create(this.saleRequest).subscribe({
      next: () => {
        this.snackbar.success('Pedido registado com sucesso!');
        // Resetar tudo
        this.saleItems = [];
        this.dataSource.data = [];
        this.selectedClient = null;
        this.form.reset();
        this.form.get('clientId')?.enable();
        this.valueSale = 0;
        this.countOrders();
      },
      error: (err) => {
        this.snackbar.error(
          err.error?.message ||
          'Não foi possível concluir o pedido. Tente novamente.'
        );
      }
    });
  }

  getImage(image: string | undefined): string {
    if (!image) return 'assets/No_Image.svg.png';
    return image.startsWith('data:')
      ? image
      : 'data:image/jpeg;base64,' + image;
  }
}
