import { Subject, takeUntil } from 'rxjs';
import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SnackbarService } from '@app/services/snackbar.service';
import { unitService } from '@app/services/unit.service';
import { Unit } from '@app/shared/models/product';

export interface DialogData {
  unit?: Unit;
}

@Component({
  selector: 'app-add-unit',
  templateUrl: './add-unit.component.html',
  styleUrls: ['./add-unit.component.scss']
})
export class AddUnitComponent implements OnInit, OnDestroy {

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
    return !!this.data?.unit?.id;
  }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddUnitComponent>,
    private unitService: unitService,
    private snackbar: SnackbarService,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.form = this.fb.group({
      id: [],
      name: ['', [Validators.required, Validators.pattern(/\S/)]],
      symbol: ['', [Validators.required, Validators.pattern(/\S/)]],
      description: ['', [Validators.required, Validators.pattern(/\S/)]],
    });
  }

  ngOnInit(): void {
    // Se for edição, preenche o formulário
    if (this.isEditMode && this.data?.unit) {
      this.patchForm(this.data.unit);
    }
  }

  private patchForm(unit: Unit): void {
    this.form.patchValue({
      id: unit.id,
      name: unit.name,
      symbol: unit.symbol,
      description: unit.description
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
        symbol: formValue.symbol.trim(),
        description: formValue.description.trim()
      }

      const operation = this.isEditMode
        ? this.unitService.update({ ...payload, id: formValue.id })
        : this.unitService.create(payload);

      operation.pipe(takeUntil(this.destroyed)).subscribe({
        next: (unit: Unit) => {
          this.isLoading = false;
          this.unlockForm();
          this.dialogRef.close(unit);
          this.snackbar.success(`Unidade ${this.isEditMode ? 'atualizada' : 'criada'} com sucesso!`);
        },
        error: (error) => {
          this.isLoading = false;
          this.unlockForm();
          this.handleError(error);
        }
      });
    }
    else {
      this.form.markAllAsTouched();
    }
  }

  //Tratamento de erro centralizado
  private handleError(error: any): void {
    const msg = error.error?.detail || error.error?.message
      || error.error?.errors?.map((e: any) => e.message).join(', ')
      || `Erro ao ${this.isEditMode ? 'atualizar' : 'guardar'} os dados.`;
    this.saveError = msg;
  }

  cancelar() {
    if (this.isLoading) return;
    this.dialogRef.close();
  }
}