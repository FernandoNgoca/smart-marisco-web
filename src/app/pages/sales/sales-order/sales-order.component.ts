import { ActivatedRoute, Router } from '@angular/router';
import { QUANTITY_MESSAGE, quantityValidator } from '@app/shared/validators/quantity.validator';
import { Subject, of, timer, switchMap, catchError, finalize, takeUntil, map, distinctUntilChanged, startWith } from 'rxjs';
import { Client } from './../../../shared/models/client';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
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
  styleUrls: ['../sale/sale.component.scss', './sales-order.component.scss']
})
export class SalesOrderComponent implements OnInit, OnDestroy {

  @ViewChild('quantityInput') quantityInput?: ElementRef<HTMLInputElement>;

  search = new FormControl('', { nonNullable: true });
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

    this.search.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.filterProducts());


    this.form.get('clientId')?.valueChanges.subscribe((client: Client) => {
      if (client?.id) {
        this.selectedClient = client;
      } else {
        this.selectedClient = null;
      }
    });

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

  loadingProducts() {
    this.productService.findOrderProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.filterProducts();
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

  get blocked(): boolean {
    return this.isSaving || this.isAdding || this.loadingOrder || this.orderLoadError;
  }

  get selectedProduct(): Product | null {
    return this.form.get('productId')?.value ?? null;
  }

  // Preço combinado no pedido (mantido ao editar) ou o preço atual do produto.
  priceOf(product: Product): number {
    return this.agreedPrices.get(product.id!) ?? product.salePrice;
  }

  selectProduct(product: Product) {
    if (this.blocked) return;
    this.form.patchValue({ productId: product, quantity: null });
    setTimeout(() => this.quantityInput?.nativeElement.focus());
  }

  clearSelection() {
    this.form.patchValue({ productId: null, quantity: null });
  }

  quantityInCart(product: Product): number {
    return this.saleItems.find(item => item.productId === product.id)?.quantity ?? 0;
  }

  // Filtro produtos
  filterProducts() {
    const value = this.search.value.trim().toLowerCase();
    this.filteredProducts = value
      ? this.products.filter(p => p.name.toLowerCase().includes(value) || (p.code ?? '').toLowerCase().includes(value))
      : this.products;
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
    // Produto já no pedido: soma a quantidade em vez de criar outra linha.
    const existing = this.saleItems.find(item => item.productId === product.id);
    if (existing) {
      existing.quantity = Math.round((existing.quantity + quantity) * 1000) / 1000;
    } else {
      this.saleItems.push({ productId: product.id!, product, quantity, unitPrice: this.priceOf(product) });
    }
    this.dataSource.data = [...this.saleItems];

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
    if (this.blocked) return;
    // Verificar se os campos obrigatórios estão preenchidos
    const product: Product = this.form.value.productId;
    const quantity = Number(this.form.value.quantity);
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

  // Alterar a quantidade diretamente na linha. Pedidos não reservam stock; a API verifica ao concluir.
  updateQuantity(item: SaleItem, input: HTMLInputElement) {
    if (this.blocked) return;
    if (quantityValidator(new FormControl(input.value))) {
      this.snackbar.error(QUANTITY_MESSAGE);
      input.value = String(item.quantity);
      return;
    }
    item.quantity = Number(input.value);
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
