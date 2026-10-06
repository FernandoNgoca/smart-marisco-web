import {Component,Inject,OnInit,OnDestroy} from '@angular/core';
import {FormControl,FormGroup,Validators} from '@angular/forms';
import {MAT_DIALOG_DATA,MatDialogRef} from '@angular/material/dialog';
import {Subject,takeUntil,finalize} from 'rxjs';
import {UserService} from '@app/services/user.service';
import {AuthService} from '@app/services/auth.service';
import {User} from '@app/shared/models/user';
@Component({selector:'app-user-details',templateUrl:'./user-details.component.html',styleUrls:['./user-details.component.scss']})
export class UserDetailsComponent implements OnInit,OnDestroy {
  user:User|null=null;loading=false;saving=false;error='';
  form=new FormGroup({fullName:new FormControl('',[Validators.required,Validators.pattern(/\S/),Validators.maxLength(255)]),roles:new FormControl<string[]>([],Validators.required)});
  private destroyed=new Subject<void>();
  constructor(@Inject(MAT_DIALOG_DATA) public data:{id:number;view:boolean},private ref:MatDialogRef<UserDetailsComponent>,private users:UserService,private auth:AuthService){}
  ngOnInit():void{this.load();}
  ngOnDestroy():void{this.destroyed.next();this.destroyed.complete();}
  get self():boolean{return this.user?.userName===this.auth.getUser()?.userName;}
  load():void{if(this.loading)return;this.loading=true;this.error='';this.users.getUserById(String(this.data.id)).pipe(takeUntil(this.destroyed),finalize(()=>this.loading=false)).subscribe({next:user=>{this.user=user;this.form.patchValue({fullName:user.fullName,roles:user.roles});if(this.data.view)this.form.disable();},error:()=>this.error='Não foi possível carregar o utilizador.'});}
  save():void{
    if(this.saving||this.data.view||!this.user)return;
    if(this.form.invalid){this.form.markAllAsTouched();return;}
    const value=this.form.getRawValue();
    if(this.self&&!value.roles?.includes('ROLE_ADMIN')){this.error='Não pode retirar a sua própria permissão de administrador.';return;}
    this.saving=true;this.error='';this.ref.disableClose=true;this.form.disable();
    this.users.updateUser(this.data.id,{fullName:value.fullName!.trim(),roles:value.roles}).pipe(takeUntil(this.destroyed),finalize(()=>{this.saving=false;this.ref.disableClose=false;this.form.enable();})).subscribe({next:()=>this.ref.close(true),error:err=>this.error=err.error?.detail||err.error?.message||'Não foi possível guardar as alterações.'});
  }
  close():void{if(!this.saving)this.ref.close();}
}
