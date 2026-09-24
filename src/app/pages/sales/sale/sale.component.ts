import { QUANTITY_MESSAGE, quantityValidator } from '@app/shared/validators/quantity.validator';
import { Subject, of, timer, switchMap, catchError, finalize, takeUntil, map, distinctUntilChanged, startWith } from 'rxjs';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
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
  totalSalesForToday: number = 0;
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
    private cdr: ChangeDetectorRef
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


    // Ao selecionar um produto
    this.form.get('productId')?.valueChanges.subscribe((product: Product) => {
      // Limpar campos dependentes
      this.form.patchValue({
        unitId: null,
        quantity: null,
      });
    });

    // Ao selecionar uma unidade
    this.form.get('unitId')?.valueChanges.subscribe((unitId: number) => {
      // Limpar quantidade sempre que mudar a unidade
      this.form.patchValue({
        quantity: null
      });
    });

    this.form.get('clientId')?.valueChanges.subscribe((client: Client) => {
      if (client?.id) {
        this.selectedClient = client;
      } else {
        this.selectedClient = null;
      }
    });

    this.countSalas();
  }

  countSalas() {
    this.saleService.countSalesCurrentDay().subscribe(
      (count) => {
        this.totalSalesForToday = count + 1;
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
    if (this.isSaving || this.isAdding) return;
    // Verificar se os campos obrigatórios estão preenchidos
    const product: Product = this.form.value.productId;
    const quantity: number = this.form.value.quantity;

    if (!product?.id) {
      this.snackbar.error('Selecione um produto para adicionar à venda.');
      return;
    }

    if (this.form.get('quantity')?.invalid) {
      this.snackbar.error(QUANTITY_MESSAGE);
      return;
    }

    const productAlreadyAdded = this.saleItems.some(
      item => item.productId === product.id
    );

    if (productAlreadyAdded) {
      this.snackbar.warning('Este produto já foi adicionado à venda.');
      return;
    }

    this.isAdding = true;
    this.stockService.findByProductId(product.id!).pipe(
      finalize(() => { this.isAdding = false; })
    ).subscribe({
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

  editItem(item: SaleItem) {
    if (this.isSaving || this.isAdding) return;
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
      next: () => {
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
        this.countSalas();
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
