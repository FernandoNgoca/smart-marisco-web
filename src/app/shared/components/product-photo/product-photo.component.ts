import {Component,Input,OnChanges,Inject} from '@angular/core';
import {MatDialog,MAT_DIALOG_DATA} from '@angular/material/dialog';

export function productPhotoSource(value?:string):string {
  if(!value)return 'assets/No_Image.svg.png';
  return value.startsWith('data:') ? value : 'data:image/jpeg;base64,'+value;
}
@Component({selector:'app-product-photo',template:`
  <button type="button" class="photo-button" [disabled]="!image || failed" (click)="open()" [attr.aria-label]="'Ampliar foto de ' + name" [matTooltip]="image && !failed ? 'Clique para ampliar' : 'Produto sem foto'">
    <img [src]="source" [alt]="name" width="48" height="48" loading="lazy" (error)="onError()">
  </button>`,styles:[`:host{display:block}.photo-button{display:flex;align-items:center;justify-content:center;width:56px;height:56px;padding:4px;background:white;border:1px solid var(--app-border);border-radius:8px;cursor:zoom-in;flex-shrink:0}.photo-button:disabled{cursor:default}.photo-button:hover:not(:disabled){border-color:var(--app-primary)}.photo-button:focus-visible{outline:3px solid var(--app-primary);outline-offset:3px}img{width:48px;height:48px;object-fit:contain;border-radius:4px}`]})
export class ProductPhotoComponent implements OnChanges {
  @Input() image?:string;
  @Input() name='Produto';
  source='assets/No_Image.svg.png';failed=false;
  constructor(private dialog:MatDialog){}
  ngOnChanges():void{this.failed=false;this.source=productPhotoSource(this.image);}
  onError():void{if(!this.failed){this.failed=true;this.source='assets/No_Image.svg.png';}}
  open():void{if(this.image&&!this.failed)this.dialog.open(ProductPhotoDialogComponent,{width:'840px',maxWidth:'95vw',maxHeight:'92vh',data:{name:this.name,source:this.source},ariaLabel:'Fotografia de '+this.name});}
}
@Component({selector:'app-product-photo-dialog',template:`
  <h2 mat-dialog-title>{{data.name}}</h2>
  <mat-dialog-content><div class="photo-stage" [class.zoomed]="zoomed"><img *ngIf="!failed" [src]="data.source" [alt]="data.name" (error)="failed=true"><p *ngIf="failed" role="alert">Não foi possível abrir esta imagem.</p></div></mat-dialog-content>
  <mat-dialog-actions align="end" class="app-action-row"><button mat-stroked-button class="app-button" [disabled]="failed" (click)="zoomed=!zoomed" [attr.aria-pressed]="zoomed">{{zoomed ? 'Ajustar à janela' : 'Ampliar'}}</button><button mat-flat-button class="app-button btn-add" mat-dialog-close>Fechar</button></mat-dialog-actions>`,styles:[`h2{overflow-wrap:anywhere;color:var(--app-text)}.photo-stage{height:55vh;overflow:auto;border:1px solid var(--app-border);border-radius:8px;background:var(--app-background)}img{display:block;width:100%;height:100%;object-fit:contain}.zoomed img{width:200%;height:auto;max-width:none;min-height:100%;object-fit:contain}mat-dialog-actions{padding-top:16px}p{padding:24px}`]})
export class ProductPhotoDialogComponent {
  zoomed=false;failed=false;
  constructor(@Inject(MAT_DIALOG_DATA) public data:{name:string;source:string}){}
}
