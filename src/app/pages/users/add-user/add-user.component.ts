import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@app/services/auth.service';
import { SnackbarService } from '@app/services/snackbar.service';
import { UserService } from '@app/services/user.service';
import imageCompression from 'browser-image-compression';

@Component({
  selector: 'app-add-user',
  templateUrl: './add-user.component.html',
  styleUrls: ['./add-user.component.scss']
})
export class AddUserComponent implements OnInit {

  form!: FormGroup;
  isLoading = false;
  hidePassword = true;
  hideConfirmPassword = true;

  // Controle de imagem
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  imageBase64: string | null = null;
  defaultAvatar = 'assets/perfil.png';

  // Permissões disponíveis
  availableRoles: string[] = [
    'ROLE_MANAGER',
    'ROLE_USER'
  ];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private snackbar: SnackbarService,
    private router: Router,
    private auth: AuthService
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    // Verificar permissão do usuário logado
    if (!this.hasAdminPermission()) {
      this.snackbar.error('Você não tem permissão para criar usuários');
      this.router.navigate(['/dashboard']);
    }
  }

  private createForm(): void {
    this.form = this.fb.group({
      userName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      fullName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      ]],
      confirmPassword: ['', [Validators.required]],
      roles: [[], [Validators.required, Validators.minLength(1)]],
    }, { validators: this.passwordMatchValidator });
  }

  // Validador de senhas iguais
  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordsMismatch: true };
  }

  // Verificar permissão de admin
  private hasAdminPermission(): boolean {
    const user = this.auth.getUser();
    return user?.roles?.includes('ROLE_ADMIN') || false;
  }

  // Upload e compressão de imagem
  async onFileSelected(event: any): Promise<void> {
    const file: File = event.target.files[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.match(/image\/(jpeg|png|jpg)/i)) {
      this.snackbar.error('Formato inválido. Use JPG ou PNG');
      return;
    }

    try {
      const options = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 800,
        useWebWorker: true
      };

      const compressedFile = await imageCompression(file, options);
      this.selectedFile = compressedFile;

      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
        this.imageBase64 = reader.result as string;
      };
      reader.readAsDataURL(compressedFile);

    } catch (error) {
      console.error('Erro ao comprimir imagem:', error);
      this.snackbar.error('Erro ao processar imagem');
    }
  }

  // Remover imagem selecionada
  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.imageBase64 = null;
  }

  // Criar usuário
  onSubmit(): void {
    if (this.form.invalid) return;

    this.isLoading = true;

    const userData = {
      username: this.form.value.userName,
      fullname: this.form.value.fullName,
      password: this.form.value.password,
      roles: this.form.value.roles,
      image: this.imageBase64 || ''
    };

    this.userService.createUser(userData).subscribe({
      next: (result) => {
        this.isLoading = false;
        this.snackbar.success(`Usuário ${this.form.value.userName} criado com sucesso!`);
        this.resetForm();
        this.router.navigate(['/users/allUser']);
      },
      error: (error) => {
        this.isLoading = false;
        this.snackbar.error(error.error?.message || 'Erro ao criar usuário');
      }
    });
  }

  // Resetar formulário
  resetForm(): void {
    this.form.reset({
      userName: '',
      fullName: '',
      password: '',
      confirmPassword: '',
      roles: []
    });
    this.removeImage();
    this.hidePassword = true;
    this.hideConfirmPassword = true;
  }

  // Cancelar e voltar
  onCancel(): void {
    this.router.navigate(['/users/allUser']);
    this.resetForm();
  }

  // Verificar se permissão está selecionada
  isRoleSelected(role: string): boolean {
    const roles = this.form.get('roles')?.value || [];
    return roles.includes(role);
  }

  // Alternar permissão
  toggleRole(role: string): void {
    const roles = this.form.get('roles')?.value || [];
    const index = roles.indexOf(role);

    if (index > -1) {
      roles.splice(index, 1);
    } else {
      roles.push(role);
    }

    this.form.get('roles')?.setValue([...roles]);
    this.form.get('roles')?.markAsTouched();
  }

}
