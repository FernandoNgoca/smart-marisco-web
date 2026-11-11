import { Router } from '@angular/router';
import { QUANTITY_MESSAGE, quantityValidator } from '@app/shared/validators/quantity.validator';
import { Subject, of, timer, switchMap, catchError, finalize, takeUntil, map, distinctUntilChanged, startWith } from 'rxjs';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { ClientService } from '@app/services/client.service';
import { ProductService } from '@app/services/product.service';
import { SaleService } from '@app/services/sale.service';
import { SnackbarService } from '@app/services/snackbar.service';
import { StockService } from '@app/services/stock.service';
import { Client } from '@app/shared/models/client';
import { Product } from '@app/shared/models/product';
import { Sale, SaleItem, SaleRequest, SaleStatus } from '@app/shared/models/sale';

@Component({
  selector: 'app-sale',
  templateUrl: './sale.component.html',
  styleUrls: ['./sale.component.scss']
})
export class SaleComponent implements OnInit, OnDestroy {

  @ViewChild('quantityInput') quantityInput?: ElementRef<HTMLInputElement>;

  dataSource = new MatTableDataSource<SaleItem>();
  saleItems: SaleItem[] = [];
  valueSale: number = 0;
  search = new FormControl('', { nonNullable: true });
  products: Product[] = [];
  filteredProducts: Product[] = [];
  clients: Client[] = [];
  filteredClients: Client[] = [];
  selectedClient: Client | null = null;
  sale: Sale = {} as Sale;
  saleRequest = {} as SaleRequest;
  form: FormGroup;
  isSaving = false;
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
    private cdr: ChangeDetectorRef,
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
  }

  loadingProducts() {
    this.productService.findAvailableProducts().subscribe({
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

  get selectedProduct(): Product | null {
    return this.form.get('productId')?.value ?? null;
  }

  // Escolher um produto na grelha e passar o foco para a quantidade.
  selectProduct(product: Product) {
    if (this.isSaving || this.isAdding) return;
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
      const price = item.product?.salePrice || 0;
      return sum + (item.quantity * price);
    }, 0);

    this.valueSale = total;
    this.sale.totalValue = total;
  }

  private addItemToSale(product: Product, quantity: number) {
    // Produto já no carrinho: soma a quantidade em vez de criar outra linha.
    const existing = this.saleItems.find(item => item.productId === product.id);
    if (existing) {
      existing.quantity = roundQuantity(existing.quantity + quantity);
    } else {
      this.saleItems.push({ productId: product.id!, product, quantity });
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
    if (this.isSaving || this.isAdding) return;
    // Verificar se os campos obrigatórios estão preenchidos
    const product: Product = this.form.value.productId;
    const quantity = Number(this.form.value.quantity);

    if (!product?.id) {
      this.snackbar.error('Selecione um produto para adicionar à venda.');
      return;
    }

    if (this.form.get('quantity')?.invalid) {
      this.snackbar.error(QUANTITY_MESSAGE);
      return;
    }

    const wanted = roundQuantity(this.quantityInCart(product) + quantity);

    this.isAdding = true;
    this.stockService.findByProductId(product.id!).pipe(
      finalize(() => { this.isAdding = false; })
    ).subscribe({
      next: (stock) => {
        product.stockQuantity = stock.quantity;
        if (stock.quantity < wanted) {
          this.snackbar.error(
            `Estoque insuficiente. Disponível: ${stock.quantity} ${product.unit?.symbol ?? 'unidade(s)'}.`
          );
          return;
        } else {
          this.addItemToSale(product, quantity);
        }
      },
      error: (err) => {
        this.snackbar.error(
          'Não foi possível verificar o estoque do produto. Tente novamente.', err
        );
      }
    });
  }

  removeItem(item: SaleItem) {
    if (this.isSaving || this.isAdding) return;
    this.saleItems = this.saleItems.filter(i => i !== item);
    this.dataSource.data = [...this.saleItems];

    this.snackbar.success('Produto removido da venda.');

    if (this.saleItems.length === 0) {
      this.form.get('clientId')?.enable();
      this.form.get('clientId')?.setValue(null);
    }

    this.calculateTotal();
  }

  // Alterar a quantidade diretamente na linha do carrinho.
  updateQuantity(item: SaleItem, input: HTMLInputElement) {
    if (this.isSaving || this.isAdding) return;
    const quantity = Number(input.value);
    const available = item.product.stockQuantity;
    if (quantityValidator(new FormControl(input.value))) {
      this.snackbar.error(QUANTITY_MESSAGE);
    } else if (available != null && quantity > available) {
      this.snackbar.error(`Estoque insuficiente. Disponível: ${available} ${item.product.unit?.symbol ?? 'unidade(s)'}.`);
    } else {
      item.quantity = quantity;
      this.calculateTotal();
      return;
    }
    input.value = String(item.quantity);
  }

  processSale() {
    if (this.isSaving || this.isAdding) return;
    if (this.saleItems.length === 0) {
      this.snackbar.error(
        'Adicione pelo menos um produto antes de finalizar a venda.'
      );
      return;
    }

    this.saleRequest = {
      sale: {
        clientId: this.selectedClient?.id,
        totalValue: this.sale.totalValue,
        saleStatus: SaleStatus.COMPLETED
      },
      items: this.saleItems
    };

    const fingerprint = JSON.stringify(this.saleRequest);
    if (!this.operationKey || fingerprint !== this.operationPayload) {
      this.operationKey = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
      this.operationPayload = fingerprint;
    }
    this.isSaving = true;
    this.saleService.create(this.saleRequest, this.operationKey).pipe(
      finalize(() => { this.isSaving = false; })
    ).subscribe({
      next: (saved) => {
        this.operationKey = null;
        this.operationPayload = '';
        this.snackbar.success('Venda registada com sucesso!');
        // Resetar tudo
        this.saleItems = [];
        this.dataSource.data = [];
        this.selectedClient = null;
        this.form.reset();
        this.form.get('clientId')?.enable();
        this.valueSale = 0;
        this.loadingProducts();
        if (saved?.id) void this.router.navigate(['/sales/receipt', saved.id]);
      },
      error: (err) => {
        this.snackbar.error(
          err.error?.message || 'Não foi possível concluir a venda.'
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

// Quantidades têm no máximo 3 casas decimais; evita 0.30000000000000004 ao somar.
function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}
