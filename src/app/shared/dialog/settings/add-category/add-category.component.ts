import { Subject, takeUntil } from 'rxjs';
import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CategoryService } from '@app/services/category.service';
import { SnackbarService } from '@app/services/snackbar.service';
import { Category } from '@app/shared/models/category';

export interface DialogData {
  category?: Category;
}

@Component({
  selector: 'app-add-category',
  templateUrl: './add-category.component.html',
  styleUrls: ['./add-category.component.scss']
})
export class AddCategoryComponent implements OnInit, OnDestroy {

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


  //Getter para saber se é edição
  get isEditMode(): boolean {
    return !!this.data?.category?.id;
  }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddCategoryComponent>,
    private categoryService: CategoryService,
    private snackbar: SnackbarService,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.form = this.fb.group({
      id: [],
      name: ['', [Validators.required, Validators.pattern(/\S/)]],
      description: ['', [Validators.required, Validators.pattern(/\S/)]]
    });
  }

  ngOnInit(): void {
    // Se for edição, preenche o formulário
    if (this.isEditMode && this.data?.category) {
      this.patchForm(this.data.category);
    }
  }

  private patchForm(category: Category): void {
    this.form.patchValue({
      id: category.id,
      name: category.name,
      description: category.description
    });
  }

  salvar(): void {
    if (this.form.valid && !this.isLoading) {
      this.isLoading = true;
      this.lockForm();

      const formValue = this.form.getRawValue();

      const payload = {
        id: formValue.id,
        name: formValue.name.trim(),
        description: formValue.description.trim()
      }

      const operation = this.isEditMode
        ? this.categoryService.update({ ...payload, id: formValue.id })
        : this.categoryService.create(payload);

      operation.pipe(takeUntil(this.destroyed)).subscribe({
        next: (response) => {
          this.snackbar.success(`Categoria ${this.isEditMode ? 'atualizada' : 'Cadastrado'} com sucesso!`);
          this.dialogRef.close(true); // Fecha o diálogo e indica sucesso
        },
        error: (err) => {
          this.isLoading = false;
          this.unlockForm();
          const msg = err.error?.detail || err.error?.message
            || err.error?.errors?.map((e: any) => e.message).join(', ')
            || `Erro ao ${this.isEditMode ? 'atualizar' : 'salvar'} categoria.`;
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

}
