import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ClientService } from '@app/services/client.service';
import { SnackbarService } from '@app/services/snackbar.service';
import { Client, ClientType } from '@app/shared/models/client';

export interface DialogData {
  client?: Client;
}

@Component({
  selector: 'app-add-client',
  templateUrl: './add-client.component.html',
  styleUrls: ['./add-client.component.scss']
})
export class AddClientComponent implements OnInit {

  form: FormGroup;
  ClientType = ClientType;
  isLoading = false;

  //Getter para saber se é edição
  get isEditMode(): boolean {
    return !!this.data?.client?.id;
  }

  //Getter para ID do cliente (se edição)
  get clientId(): number | undefined {
    return this.data?.client?.id;
  }

  tipos = [
    { value: ClientType.INDIVIDUAL, viewValue: 'Pessoa' },
    { value: ClientType.COMPANY, viewValue: 'Empresa' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddClientComponent>,
    private clientService: ClientService,
    private snackbar: SnackbarService,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    this.form = this.fb.group({
      id: [],
      firstName: ['', Validators.required],
      lastName: [''],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required,
      Validators.pattern(/^8[2-7]\d{7}$/)]],
      address: ['', Validators.required],
      type: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Se for edição, preenche o formulário
    if (this.isEditMode && this.data?.client) {
      this.patchForm(this.data.client);
    }

    this.form.get('type')?.valueChanges.subscribe(type => {
      const lastNameControl = this.form.get('lastName');

      if (type === ClientType.INDIVIDUAL) {
        lastNameControl?.setValidators([Validators.required]);
      } else {
        lastNameControl?.clearValidators();
        lastNameControl?.setValue('');
      }

      lastNameControl?.updateValueAndValidity();
    });
  }

  //Preenche formulário com dados do cliente (responsabilidade única)
  private patchForm(client: Client): void {
    this.form.patchValue({
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phoneNumber: client.phoneNumber?.toString().replace(/\D/g, ''),
      address: client.address,
      type: client.type
    });
  }

  //Tratamento de erro centralizado
  private handleError(error: any): void {
    const msg = error.error?.message
      || error.error?.errors?.map((e: any) => e.message).join(', ')
      || `Erro ao ${this.isEditMode ? 'atualizar' : 'salvar'} cliente.`;
    alert(msg);
  }

  // Salvar: decide entre create ou update (lógica centralizada)
  salvar(): void {

    if (this.form.valid && !this.isLoading) {
      this.isLoading = true;

      const formValue = { ...this.form.value };
      formValue.phoneNumber = formValue.phoneNumber?.replace(/\D/g, '');


      // Escolhe a operação baseada no modo
      const operation = this.isEditMode
        ? this.clientService.update(formValue)
        : this.clientService.create(formValue);

      operation.subscribe({
        next: (client: Client) => {
          this.isLoading = false;
          this.dialogRef.close(client);
          this.snackbar.success(`Cliente ${this.isEditMode ? 'atualizado' : 'Cadastrado'} com sucesso!`);
        },
        error: (error) => {
          this.isLoading = false;
          this.handleError(error);
          this.snackbar.error('Erro ao salvar cliente.');
        }
      });
    } else {
      this.form.markAllAsTouched();
    }
  }

  cancelar() {
    this.dialogRef.close();
  }

  getFormControl(name: string) {
    return this.form.get(name);
  }

  get isIndividual(): boolean {
    return this.form.get('type')?.value === ClientType.INDIVIDUAL;
  }
}
