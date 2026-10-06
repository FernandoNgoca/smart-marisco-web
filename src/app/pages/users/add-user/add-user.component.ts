import { Subject, takeUntil } from 'rxjs';
import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class AddUserComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  isLoading = false;
  processingImage = false;
  imageError = '';
  saveError = '';
  private destroyed = new Subject<void>();
  private closed = false;
  private imageRevision = 0;
  get busy(): boolean { return this.isLoading || this.processingImage; }
  get isViewMode(): boolean { return false; }
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
      this.router.navigate(['/users/myProfile']);
    }
  }

  private createForm(): void {
    this.form = this.fb.group({
      userName: ['', [Validators.required, Validators.pattern(/.*\S.*/), Validators.maxLength(20)]],
      fullName: ['', [Validators.required, Validators.pattern(/\S/), Validators.minLength(3), Validators.maxLength(100)]],
      password: ['', [
        Validators.required,
        Validators.minLength(12),
        Validators.maxLength(128),
        Validators.pattern(/.*\S.*/s)
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
  removeImage(): void {
    if (this.busy) return;
    this.imageRevision++;
    this.selectedFile = null; this.imagePreview = null; this.imageBase64 = null; this.imageError = '';
  }
  ngOnDestroy(): void { this.closed = true; this.imageRevision++; this.destroyed.next(); this.destroyed.complete(); }

  // Criar usuário
  onSubmit(): void {
    if (this.form.invalid || this.busy || !this.hasAdminPermission()) return;

    this.isLoading = true;
    this.saveError = '';

    const userData = {
      username: this.form.value.userName.trim(),
      fullname: this.form.value.fullName.trim(),
      password: this.form.value.password,
      roles: this.form.value.roles,
      image: this.imageBase64 || ''
    };

    this.form.disable({ emitEvent: false });
    this.userService.createUser(userData).pipe(takeUntil(this.destroyed)).subscribe({
      next: (result) => {
        this.isLoading = false;
        this.form.enable({ emitEvent: false });
        this.snackbar.success(`Usuário ${this.form.value.userName} criado com sucesso!`);
        this.resetForm();
        this.router.navigate(['/users/allUser']);
      },
      error: (error) => {
        this.isLoading = false;
        this.form.enable({ emitEvent: false });
        this.saveError = error.error?.detail || error.error?.message || 'Não foi possível guardar o utilizador. Tente novamente.';
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
    if (this.busy) return;
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
    if (this.isLoading) return;
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
