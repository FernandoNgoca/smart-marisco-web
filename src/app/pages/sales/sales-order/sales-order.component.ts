import { ActivatedRoute, Router } from '@angular/router';
import { QUANTITY_MESSAGE, quantityValidator } from '@app/shared/validators/quantity.validator';
import { Subject, of, timer, switchMap, catchError, finalize, takeUntil, map, distinctUntilChanged, startWith } from 'rxjs';
import { Client } from './../../../shared/models/client';
import { Component, OnDestroy, OnInit } from '@angular/core';
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
export class SalesOrderComponent implements OnInit, OnDestroy {

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
  isSaving = false;
  orderId: number | null = null;
  loadingOrder = false;
  orderLoadError = false;
  legacyPrices = false;
  agreedPrices = new Map<number, number>();
  isAdding = false;
  clientsLoading = false;
  clientsError = false;
  private destroy$ = new Subject<void>();
  private operationKey: string | null = null;
  private operationPayload = '';

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
  totalOrdersForToday: number = 0;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private clientService: ClientService,
    private snackbar: SnackbarService,
    private saleService: SaleService,
    private stockService: StockService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      productId: [null,],
      quantity: [null, quantityValidator],
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


    this.form.get('clientId')?.valueChanges.subscribe((client: Client) => {
      if (client?.id) {
        this.selectedClient = client;
      } else {
        this.selectedClient = null;
      }
    });

this.countOrders();
    const id = this.route?.snapshot.queryParamMap.get('orderId');
    if (id) {
      this.orderId = Number(id);
      this.loadOrder();
    }
  }

  loadOrder(): void {
    if (!this.orderId) return;
    this.loadingOrder = true;
    this.orderLoadError = false;
    this.saleService.findOrder(this.orderId).pipe(takeUntil(this.destroy$), finalize(() => { this.loadingOrder = false; })).subscribe({
      next: request => {
        if (request.sale.saleStatus !== SaleStatus.ORDERS) {
          this.snackbar.error('Só é possível editar pedidos pendentes.');
          this.orderLoadError = true;
          return;
        }
        this.sale = request.sale;
        this.legacyPrices = request.items.some(item => item.unitPrice == null);
        this.agreedPrices.clear();
        this.saleItems = request.items.map(item => {
          const price = item.unitPrice ?? item.product.salePrice;
          this.agreedPrices.set(item.productId, price);
          return { ...item, unitPrice: price };
        });
        this.dataSource.data = this.saleItems;
        this.selectedClient = request.sale.client ?? null;
        this.form.get('clientId')?.setValue(this.selectedClient);
        this.form.get('clientId')?.disable();
        this.calculateTotal();
      },
      error: err => { this.orderLoadError = true; this.snackbar.error(err.error?.detail || err.error?.message || 'Não foi possível carregar o pedido.'); }
    });
  }

  countOrders() {
    this.saleService.countOrdersCurrentDay().subscribe(
      (count) => {
        this.totalOrdersForToday = count + 1;
      }
    );
  }

  loadingProducts() {
    this.productService.findOrderProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.filteredProducts = data;
      },
      error: (err) => console.error('Erro ao carregar produtos:', err)
    });
  }

  loadingClients() {
    this.form.get('clientId')!.valueChanges.pipe(
      startWith(''),
      map(value => typeof value === 'string' ? value.trim() : null),
      distinctUntilChanged(),
      switchMap(search => {
        if (search === null) return of(null);
        this.clientsLoading = true;
        this.clientsError = false;
        return timer(300).pipe(
          switchMap(() => this.clientService.findAll(0, 20, 'firstName', 'asc', search)),
          catchError(() => { this.clientsError = true; return of(null); }),
          finalize(() => { this.clientsLoading = false; })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.clients = data?._embedded?.clients ?? [];
      this.filteredClients = this.clients;
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

  displayClient(client: any): string {
    const first = client?.firstName || '';
    const last = client?.lastName || '';
    return `${first} ${last}`.trim();
  }

  calculateTotal() {
    const total = this.saleItems.reduce((sum, item) => {
      const price = item.unitPrice ?? item.product?.salePrice ?? 0;
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
      unitPrice: this.agreedPrices.get(product.id!) ?? product.salePrice,
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
    if (this.isSaving || this.isAdding || this.loadingOrder || this.orderLoadError) return;
    // Verificar se os campos obrigatórios estão preenchidos
    const product: Product = this.form.value.productId;
    const quantity: number = this.form.value.quantity;
    const client = this.selectedClient;

    if (!product?.id) {
      this.snackbar.error('Selecione um produto para adicionar ao pedido.');
      return;
    }

    if (this.form.get('quantity')?.invalid) {
      this.snackbar.error(QUANTITY_MESSAGE);
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

    this.addItemToSale(product, quantity);
  }

  removeItem(item: SaleItem) {
    if (this.isSaving || this.isAdding || this.loadingOrder || this.orderLoadError) return;
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
    if (this.isSaving || this.isAdding || this.loadingOrder || this.orderLoadError) return;
    // Preencher formulário
    this.form.patchValue({
      productId: item.product,
      quantity: item.quantity
    });

    // Retirar o artigo para edição sem limpar o cliente selecionado.
    this.saleItems = this.saleItems.filter(i => i !== item);
    this.dataSource.data = [...this.saleItems];
    this.calculateTotal();
  }

  processSale() {
    if (this.isSaving || this.isAdding || this.loadingOrder || this.orderLoadError) return;
    if (this.saleItems.length === 0) {
      this.snackbar.error(
        'Adicione pelo menos um produto antes de finalizar o pedido.'
      );
      return;
    }

    if (!this.selectedClient?.id) {
      this.snackbar.error('Selecione um cliente para continuar.');
      return;
    }
    this.saleRequest = {
      sale: {
        clientId: this.selectedClient.id,
        version: this.sale.version,
        totalValue: this.sale.totalValue,
        saleStatus: SaleStatus.ORDERS
      },
      items: this.saleItems
    };

    const fingerprint = JSON.stringify(this.saleRequest);
    if (!this.operationKey || fingerprint !== this.operationPayload) {
      this.operationKey = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
      this.operationPayload = fingerprint;
    }
    this.isSaving = true;
    const operation = this.orderId
      ? this.saleService.updateOrder(this.orderId, this.saleRequest)
      : this.saleService.create(this.saleRequest, this.operationKey);
    operation.pipe(
      finalize(() => { this.isSaving = false; })
    ).subscribe({
      next: () => {
        this.operationKey = null;
        this.operationPayload = '';
        this.snackbar.success(this.orderId ? 'Pedido atualizado!' : 'Pedido registado sem reservar stock.');
        if (this.orderId) { void this.router.navigate(['/sales/orderHistory']); return; }
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
          err.error?.detail || err.error?.message ||
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
