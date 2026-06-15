import { Component, Inject, OnInit } from '@angular/core';
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
export class AddSpeciesComponent implements OnInit {

  form: FormGroup;
  isLoading = false;
  categorys: Category[] = [];
  loadingCategory = false;

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
      name: ['', Validators.required],
      description: ['', Validators.required],
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
    if (this.form.valid && !this.isLoading) {
      this.isLoading = true;

      const formValue = this.form.getRawValue();

      const payload = {
        id: formValue.id,
        name: formValue.name,
        description: formValue.description,
        categoryId: formValue.categoryId
      }

      const operation = this.isEditMode
        ? this.speciesService.update({ ...payload, id: formValue.id })
        : this.speciesService.create(payload);

      operation.subscribe({
        next: (response) => {
          this.snackbar.success(`Espécie ${this.isEditMode ? 'atualizada' : 'Cadastrado'} com sucesso!`);
          this.dialogRef.close(true); // Fecha o diálogo e indica sucesso
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err.error?.message
            || err.error?.errors?.map((e: any) => e.message).join(', ')
            || `Erro ao ${this.isEditMode ? 'atualizar' : 'salvar'} Espécie.`;
          this.snackbar.error(msg);
        }
      });
    }
    else {
      this.form.markAllAsTouched();
    }
  }

  cancelar() {
    this.dialogRef.close();
  }

  private loadCategorys(): void {
    this.loadingCategory = true;

    this.categoryService.findAll(0, 100, '', 'asc').subscribe({
      next: (categories) => {
        this.categorys = categories._embedded?.categorys ?? [];
        this.loadingCategory = false;

        // Se estiver editando e a categoria já estiver carregada, atualiza a seleção
        if (this.isEditMode && this.data?.species?.category) {
          this.patchForm(this.data.species);
        }
      },
      error: (err) => {
        console.error('Erro ao carregar categorias', err);
        this.snackbar.error('Erro ao carregar categorias');
        this.categorys = [];
        this.loadingCategory = false;
      }
    });
  }

}
