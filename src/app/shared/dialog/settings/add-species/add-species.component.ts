import { Subject, takeUntil } from 'rxjs';
import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CategoryService } from '@app/services/category.service';
import { SnackbarService } from '@app/services/snackbar.service';
import { SpeciesService } from '@app/services/species.service';
import { Category } from '@app/shared/models/category';
import { Species } from '@app/shared/models/species';

export interface DialogData {
  species?: Species;
  viewOnly?: boolean;
}

@Component({
  selector: 'app-add-species',
  templateUrl: './add-species.component.html',
  styleUrls: ['./add-species.component.scss']
})
export class AddSpeciesComponent implements OnInit, OnDestroy {

  form: FormGroup;
  isLoading = false;
  saveError = '';
  private destroyed = new Subject<void>();
  private disabledFields: string[] = [];
  private lockForm(): void {
    this.saveError = '';
    this.disabledFields = Object.keys(this.form.controls).filter(key => this.form.get(key)!.disabled);
    this.form.disable({ emitEvent: false });
    this.dialogRef.disableClose = true;
  }
  private unlockForm(): void {
    this.dialogRef.disableClose = false;
    this.form.enable({ emitEvent: false });
    this.disabledFields.forEach(key => this.form.get(key)!.disable({ emitEvent: false }));
  }
  ngOnDestroy(): void { this.destroyed.next(); this.destroyed.complete(); }

  categorys: Category[] = [];
  loadingCategory = false;
  categoryError = false;

  get isEditMode(): boolean {
    return !!this.data?.species?.id;
  }

  get isViewMode(): boolean {
    return !!this.data?.viewOnly;
  }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddSpeciesComponent>,
    private speciesService: SpeciesService,
    private snackbar: SnackbarService,
    private categoryService: CategoryService,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.form = this.fb.group({
      id: [],
      name: ['', [Validators.required, Validators.pattern(/\S/)]],
      description: ['', Validators.maxLength(255)],
      categoryId: ['', Validators.required],
      category: []
    });
  }

  ngOnInit(): void {
    this.loadCategorys();
    // Se for edição, preenche o formulário
    if (this.isEditMode && this.data?.species) {
      this.patchForm(this.data.species);
    }
    if (this.isViewMode) this.form.disable({ emitEvent: false });
  }

  private patchForm(species: Species): void {
    this.form.patchValue({
      id: species.id,
      name: species.name,
      description: species.description,
      categoryId: species.categoryId,
      category: species.category,
    });
  }

  salvar(): void {
    if (this.isViewMode || this.loadingCategory || this.categoryError) return;
    if (this.form.valid && !this.isLoading) {
      this.isLoading = true;
      this.lockForm();

      const formValue = this.form.getRawValue();

      const payload = {
        id: formValue.id,
        name: formValue.name.trim(),
        description: (formValue.description ?? '').trim(),
        categoryId: formValue.categoryId
      }

      const operation = this.isEditMode
        ? this.speciesService.update({ ...payload, id: formValue.id })
        : this.speciesService.create(payload);

      operation.pipe(takeUntil(this.destroyed)).subscribe({
        next: (response) => {
          this.snackbar.success(`Espécie ${this.isEditMode ? 'atualizada' : 'Cadastrado'} com sucesso!`);
          this.dialogRef.close(true); // Fecha o diálogo e indica sucesso
        },
        error: (err) => {
          this.isLoading = false;
          this.unlockForm();
          const msg = err.error?.detail || err.error?.message
            || err.error?.errors?.map((e: any) => e.message).join(', ')
            || `Erro ao ${this.isEditMode ? 'atualizar' : 'salvar'} Espécie.`;
          this.saveError = msg;
        }
      });
    }
    else {
      this.form.markAllAsTouched();
    }
  }

  cancelar() {
    if (this.isLoading) return;
    this.dialogRef.close();
  }

  loadCategorys(): void {
    if (this.loadingCategory) return;
    this.categoryError = false;
    this.loadingCategory = true;

    this.categoryService.findAll(0, 100, 'name', 'asc').pipe(takeUntil(this.destroyed)).subscribe({
      next: (categories) => {
        this.categorys = categories._embedded?.categorys ?? [];
        this.loadingCategory = false;


      },
      error: (err) => {
        console.error('Erro ao carregar categorias', err);
        this.categoryError = true;
        this.categorys = [];
        this.loadingCategory = false;
      }
    });
  }

}
