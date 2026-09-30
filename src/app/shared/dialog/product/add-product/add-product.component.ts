import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CategoryService } from '@app/services/category.service';
import { ProductService } from '@app/services/product.service';
import { SnackbarService } from '@app/services/snackbar.service';
import { SpeciesService } from '@app/services/species.service';
import { unitService } from '@app/services/unit.service';
import { Category } from '@app/shared/models/category';
import { Product, Unit } from '@app/shared/models/product';
import { Species } from '@app/shared/models/species';
import imageCompression from 'browser-image-compression';

export interface DialogData {
  product?: Product;
  viewOnly?: boolean;
}

@Component({
  selector: 'app-add-product',
  templateUrl: './add-product.component.html',
  styleUrls: ['./add-product.component.scss']
})
export class AddProductComponent implements OnInit {

  form: FormGroup;
  isLoading = false;
  loadingSpecies = false;
  loadingCategorys = false;
  loadingUnit = false;
  species: Species[] = [];
  categorys: Category[] = [];
  units: Unit[] = [];
  selectedFile: File | null = null;
  imageBase64: string | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  private isFormPatched = false;

  //Getter para saber se é edição
  get isEditMode(): boolean {
    return !!this.data?.product?.id;
  }

  //Getter para ID do Produto (se edição)
  get productId(): number | undefined {
    return this.data?.product?.id;
  }

  get isViewMode(): boolean {
    return !!this.data?.viewOnly;
  }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddProductComponent>,
    private productService: ProductService,
    private speciesService: SpeciesService,
    private snackbar: SnackbarService,
    private categoryService: CategoryService,
    private unitService: unitService,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.form = this.fb.group({
      id: [],
      name: ['', Validators.required],
      description: [''],
      price: ['', Validators.required],
      salePrice: ['', Validators.required],
      categoryId: ['', Validators.required],
      species: [],
      speciesId: ['', Validators.required],
      unit: [],
      unitId: ['', Validators.required],
      image: []
    });
  }

  ngOnInit(): void {
    // Carrega categorias e unidades
    this.loadCategorys();
    this.loadUnits();

    // Se for edição, carrega os dados após as listas serem carregadas
    if (this.isEditMode && this.data?.product) {
      // Aguarda as listas carregarem
      setTimeout(() => {
        const product = this.data.product;

        // Verifica se product existe antes de usar
        if (product) {
          // Carrega as espécies da categoria do produto
          const categoryId = product.species?.categoryId || product.species?.category?.id;
          if (categoryId) {
            this.loadSpecies(categoryId);
          }

          // Preenche o formulário
          this.patchForm(product);
        }
      }, 500);
    }

    this.form.get('categoryId')?.valueChanges.subscribe(categoryId => {
      if (categoryId) {
        this.loadSpecies(categoryId);
        this.form.get('speciesId')?.reset();
      }
    });
  }

  private loadCategorys() {
    this.loadingCategorys = true;

    this.categoryService.findAll(0, 100, '', 'asc').subscribe({
      next: (category) => {
        this.categorys = category._embedded?.categorys ?? [];
        this.loadingCategorys = false;

        // Se estiver editando e a categoria já estiver carregada, atualiza a seleção
        if (this.isEditMode && this.data?.product?.species?.category) {
          this.patchForm(this.data.product);
        }
      },
      error: (err) => {
        this.snackbar.error('Erro ao carregar categorias. ' + err);
        this.species = [];
        this.loadingSpecies = false;
      }
    });
  }

  private loadUnits() {
    this.loadingUnit = true;

    this.unitService.findAll(0, 100, '', 'asc').subscribe({
      next: (unit) => {
        this.units = unit._embedded?.Unit ?? [];
        this.loadingUnit = false;

        // Se estiver editando e a categoria já estiver carregada, atualiza a seleção
        if (this.isEditMode && this.data?.product?.unit) {
          this.patchForm(this.data.product);
        }
      },
      error: (err) => {
        this.snackbar.error('Erro ao carregar Unidades ' + err);
        this.units = [];
        this.loadingUnit = false;
      }
    });
  }

  private loadSpecies(id: number): void {
    this.loadingSpecies = true;

    this.speciesService.findByCategoryId(id).subscribe({
      next: (species) => {
        this.species = species;
        this.loadingSpecies = false;

        // Se estiver editando e a categoria já estiver carregada, atualiza a seleção
        if (this.isEditMode && this.data?.product?.species) {
          this.patchForm(this.data.product);
        }
      },
      error: (err) => {
        this.snackbar.error('Erro ao carregar categorias');
        this.species = [];
        this.loadingSpecies = false;
      }
    });
  }

  private patchForm(product: Product): void {
    // Obtém o categoryId através da espécie
    const categoryId = product.species?.categoryId || product.species?.category?.id;

    // Garante que os IDs sejam definidos
    const speciesId = product.speciesId || product.species?.id;
    const unitId = product.unitId || product.unit?.id;

    this.form.patchValue(
  {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    salePrice: product.salePrice,
    categoryId,
    speciesId,
    unitId,
    species: product.species,
    unit: product.unit,
    image: product.image
  },
  {
    emitEvent: false
  }
);

    if (product.image) {
      this.imagePreview = product.image;
      this.imageBase64 = product.image;
    }
  }

  salvar(): void {
    if (this.form.valid && !this.isLoading) {
      this.isLoading = true;

      const formValue = this.form.getRawValue();

      // Monta payload: extrai categoryId do objeto Category selecionado
      const payload = {
        id: formValue.id,
        name: formValue.name,
        description: formValue.description,
        price: formValue.price,
        salePrice: formValue.salePrice,
        speciesId: formValue.speciesId,
        unitId: formValue.unitId,
        image: this.imageBase64 ?? undefined
      };
      const operation = this.isEditMode
        ? this.productService.update({ ...payload, id: formValue.id })
        : this.productService.create(payload);

      operation.subscribe({
        next: (product: Product) => {
          this.isLoading = false;
          this.dialogRef.close(product);
          this.snackbar.success(`Produto ${this.isEditMode ? 'atualizado' : 'Cadastrado'} com sucesso!`);
        },
        error: (error) => {
          this.isLoading = false;
          this.handleError(error);
          this.snackbar.error('Erro ao salvar produto.');
        }
      });
    } else {
      this.form.markAllAsTouched();
    }
  }

  //Tratamento de erro centralizado
  private handleError(error: any): void {
    const msg = error.error?.message
      || error.error?.errors?.map((e: any) => e.message).join(', ')
      || `Erro ao ${this.isEditMode ? 'atualizar' : 'salvar'} cliente.`;
    alert(msg);
  }

  cancelar() {
    this.dialogRef.close();
  }

  onSpeciesChange(event: any): void {
    setTimeout(() => {
      this.form.get('species')?.updateValueAndValidity();
    });
  }

  async onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    try {
      // Opções de compressão
      const options = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 800,
        useWebWorker: true
      };

      // comprime a imagem
      const compressedFile = await imageCompression(file, options);

      this.selectedFile = compressedFile;

      const reader = new FileReader();

      reader.onload = () => {
        this.imagePreview = reader.result;
        this.imageBase64 = reader.result as string;
      };

      reader.readAsDataURL(compressedFile);

    } catch (error) {
      this.snackbar.error('Erro ao comprimir imagem: ' + error);
    }
  }

}
