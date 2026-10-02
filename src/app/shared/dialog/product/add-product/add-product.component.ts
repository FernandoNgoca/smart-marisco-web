import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, finalize, takeUntil } from 'rxjs';
import { CategoryService } from '@app/services/category.service';
import { ProductService } from '@app/services/product.service';
import { SnackbarService } from '@app/services/snackbar.service';
import { SpeciesService } from '@app/services/species.service';
import { unitService } from '@app/services/unit.service';
import { Category } from '@app/shared/models/category';
import { Product, Unit } from '@app/shared/models/product';
import { Species } from '@app/shared/models/species';
import imageCompression from 'browser-image-compression';

export interface DialogData { product?: Product; viewOnly?: boolean; }

export function productPriceValidator(control: AbstractControl) {
  const value = control.value;
  if (value === null || value === undefined || value === '') return null;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 99999999.99
    && Math.abs(value * 100 - Math.round(value * 100)) < 0.00001 ? null : { price: true };
}

@Component({
  selector: 'app-add-product',
  templateUrl: './add-product.component.html',
  styleUrls: ['./add-product.component.scss']
})
export class AddProductComponent implements OnInit, OnDestroy {
  form: FormGroup;
  isLoading = false;
  processingImage = false;
  loadingSpecies = false;
  loadingCategorys = false;
  loadingUnit = false;
  categoriesError = false;
  speciesError = false;
  unitsError = false;
  saveError = '';
  imageError = '';
  species: Species[] = [];
  categorys: Category[] = [];
  units: Unit[] = [];
  imageBase64: string | null = null;
  imagePreview: string | null = null;
  private destroyed = new Subject<void>();
  private speciesRequest = new Subject<void>();
  private imageRevision = 0;
  private closed = false;

  get isEditMode() { return !!this.data?.product?.id; }
  get isViewMode() { return !!this.data?.viewOnly; }
  get priceUnit(): string {
    const unit = this.units.find(item => item.id === this.form.get('unitId')?.value) ?? this.data?.product?.unit;
    return unit?.symbol ? `MZN/${unit.symbol}` : 'MZN';
  }
  get busy(): boolean { return this.isLoading || this.processingImage; }
  get canSave(): boolean {
    return !this.isViewMode && !this.busy && !this.form.invalid && !this.loadingCategorys && !this.loadingUnit
      && !this.loadingSpecies && !this.categoriesError && !this.unitsError && !this.speciesError
      && !!this.form.get('speciesId')?.value;
  }

  constructor(private fb: FormBuilder, private dialogRef: MatDialogRef<AddProductComponent>,
    private productService: ProductService, private speciesService: SpeciesService,
    private snackbar: SnackbarService, private categoryService: CategoryService,
    private unitService: unitService, @Inject(MAT_DIALOG_DATA) public data: DialogData) {
    this.form = this.fb.group({
      id: [null], name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
      description: [''], price: [null, [Validators.required, productPriceValidator]],
      salePrice: [null, [Validators.required, productPriceValidator]],
      categoryId: [null, Validators.required], speciesId: [{ value: null, disabled: true }, Validators.required],
      unitId: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    const product = this.data?.product;
    if (product) {
      this.form.patchValue({ id: product.id, name: product.name, description: product.description,
        price: product.price, salePrice: product.salePrice,
        categoryId: product.species?.categoryId ?? product.species?.category?.id,
        speciesId: product.speciesId ?? product.species?.id, unitId: product.unitId ?? product.unit?.id
      }, { emitEvent: false });
      this.imageBase64 = product.image ?? null;
      this.imagePreview = product.image ? (product.image.startsWith('data:') ? product.image : `data:image/jpeg;base64,${product.image}`) : null;
    }
    if (this.isViewMode) this.form.disable({ emitEvent: false });
    this.loadCategorys();
    this.loadUnits();
    this.loadSpecies(false);
    this.form.get('categoryId')!.valueChanges.pipe(takeUntil(this.destroyed)).subscribe(() => this.loadSpecies(true));
  }

  loadCategorys(): void {
    if (this.loadingCategorys) return;
    this.categoriesError = false;
    this.loadingCategorys = true;
    this.categoryService.findAll(0, 100, 'name', 'asc').pipe(takeUntil(this.destroyed),
      finalize(() => { this.loadingCategorys = false; })).subscribe({
      next: response => {
        this.categorys = response._embedded?.categorys ?? [];
        const current = this.data?.product?.species?.category;
        if (current && !this.categorys.some(item => item.id === current.id)) this.categorys = [current, ...this.categorys];
      }, error: () => { this.categoriesError = true; }
    });
  }

  loadUnits(): void {
    if (this.loadingUnit) return;
    this.unitsError = false;
    this.loadingUnit = true;
    this.unitService.findAll(0, 100, 'name', 'asc').pipe(takeUntil(this.destroyed),
      finalize(() => { this.loadingUnit = false; })).subscribe({
      next: response => {
        this.units = response._embedded?.Unit ?? response._embedded?.units ?? [];
        const current = this.data?.product?.unit;
        if (current && !this.units.some(item => item.id === current.id)) this.units = [current, ...this.units];
      }, error: () => { this.unitsError = true; }
    });
  }

  loadSpecies(reset = false): void {
    this.speciesRequest.next();
    this.species = [];
    this.speciesError = false;
    const control = this.form.get('speciesId')!;
    if (reset) control.reset(null, { emitEvent: false });
    control.disable({ emitEvent: false });
    const category = this.form.get('categoryId')!.value;
    if (!category) return;
    this.loadingSpecies = true;
    this.speciesService.findByCategoryId(category).pipe(takeUntil(this.speciesRequest), takeUntil(this.destroyed),
      finalize(() => { this.loadingSpecies = false; })).subscribe({
      next: species => {
        this.species = species;
        if (!species.some(item => item.id === control.value)) control.reset(null, { emitEvent: false });
        if (species.length && !this.isViewMode && !this.isLoading) control.enable({ emitEvent: false });
      }, error: () => { this.speciesError = true; }
    });
  }

  salvar(): void {
    if (!this.canSave) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    const payload = { id: value.id, name: value.name.trim(), description: (value.description ?? '').trim(),
      price: value.price, salePrice: value.salePrice, speciesId: value.speciesId, unitId: value.unitId,
      image: this.imageBase64 ?? '' };
    this.saveError = '';
    this.isLoading = true;
    this.dialogRef.disableClose = true;
    this.form.disable({ emitEvent: false });
    const operation = this.isEditMode ? this.productService.update(payload) : this.productService.create(payload);
    operation.pipe(takeUntil(this.destroyed), finalize(() => {
      this.isLoading = false;
      this.dialogRef.disableClose = false;
      if (!this.closed) {
        this.form.enable({ emitEvent: false });
        if (!this.species.length || this.speciesError) this.form.get('speciesId')!.disable({ emitEvent: false });
      }
    })).subscribe({
      next: product => {
        this.dialogRef.close(product);
        this.snackbar.success(`Produto ${this.isEditMode ? 'atualizado' : 'registado'} com sucesso!`);
      }, error: error => {
        this.saveError = error.error?.detail || error.error?.message || 'Não foi possível guardar o produto. Tente novamente.';
      }
    });
  }

  cancelar(): void { if (!this.isLoading) this.dialogRef.close(); }
  removeImage(): void {
    if (this.isViewMode || this.busy) return;
    this.imageRevision++;
    this.imageBase64 = null; this.imagePreview = null; this.imageError = '';
  }
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.isViewMode || this.busy) return;
    this.imageError = '';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      this.imageError = 'Selecione uma imagem JPG, PNG ou WebP até 10 MB.'; return;
    }
    const revision = ++this.imageRevision;
    this.processingImage = true;
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 800, useWebWorker: true });
      const result = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Imagem ilegível'));
        reader.readAsDataURL(compressed);
      });
      if (!this.closed && revision === this.imageRevision) { this.imagePreview = result; this.imageBase64 = result; }
    } catch {
      if (!this.closed) this.imageError = 'Não foi possível processar a imagem. Escolha outra imagem.';
    } finally { if (!this.closed) this.processingImage = false; }
  }
  ngOnDestroy(): void {
    this.closed = true; this.imageRevision++;
    this.destroyed.next(); this.destroyed.complete(); this.speciesRequest.complete();
  }
}
