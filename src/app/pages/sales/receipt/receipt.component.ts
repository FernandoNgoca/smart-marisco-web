import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { environment } from 'src/environments/environment';
interface Receipt {id:number;date:string;client:string;operator:string;total:number;roundingAdjustment:number;items:{product:string;unit:string;quantity:number;unitPrice:number|null;subtotal:number|null}[];}
@Component({selector:'app-receipt',templateUrl:'./receipt.component.html',styleUrls:['./receipt.component.scss']})
export class ReceiptComponent implements OnInit,OnDestroy {
  receipt:Receipt|null=null;loading=false;error='';printError='';
  // URL absoluto para o logótipo continuar a carregar na janela de impressão.
  readonly logoUrl=new URL('assets/log.png',document.baseURI).href;
  @ViewChild('paper') paper?:ElementRef<HTMLElement>;
  private destroyed=new Subject<void>();
  constructor(private route:ActivatedRoute,private http:HttpClient){}
  ngOnInit():void {this.load();}
  ngOnDestroy():void {this.destroyed.next();this.destroyed.complete();}
  quantity(value:number):string {return new Intl.NumberFormat('pt-MZ',{maximumFractionDigits:3}).format(value);}
  get missingPrices():boolean {return this.receipt?.items.some(i=>i.unitPrice===null)||false;}
  load():void {
    if(this.loading)return;
    const id=Number(this.route.snapshot.paramMap.get('id'));
    if(!Number.isSafeInteger(id)||id<=0){this.error='Número de venda inválido.';return;}
    this.loading=true;this.error='';
    this.http.get<Receipt>(`${environment.apiURL}api/sale/v1/${id}/receipt`).pipe(takeUntil(this.destroyed)).subscribe({next:receipt=>{this.receipt=receipt;this.loading=false;},error:err=>{this.loading=false;this.error=err.error?.detail||err.error?.message||'Não foi possível carregar o recibo. A venda registada não foi alterada.';}});
  }
  print():void {
    if(!this.paper||!this.receipt)return;
    this.printError='';const win=window.open('','_blank');
    if(!win){this.printError='Permita abrir a janela de impressão no navegador.';return;}
    win.opener=null;win.document.title=`Recibo-${this.receipt.id}`;
    const style=win.document.createElement('style');style.textContent=RECEIPT_PRINT_CSS;
    win.document.head.appendChild(style);win.document.body.appendChild(win.document.importNode(this.paper.nativeElement,true));
    // Imprime depois de o logótipo carregar (ou falhar), para não sair em branco.
    const logo=win.document.querySelector('img');let printed=false;
    const go=()=>{if(printed||win.closed)return;printed=true;win.focus();win.print();};
    if(logo&&!logo.complete){logo.addEventListener('load',()=>setTimeout(go,100));logo.addEventListener('error',go);setTimeout(go,1500);}else setTimeout(go,100);
  }
}

const RECEIPT_PRINT_CSS=`
  *{box-sizing:border-box}body{font:14px/1.45 Arial,sans-serif;color:#0f2537;margin:24px}
  article{max-width:760px;margin:auto}
  header{display:flex;justify-content:space-between;align-items:center;gap:20px;border-bottom:3px solid #0077b6;padding-bottom:16px;margin-bottom:20px}
  .brand{display:flex;align-items:center;gap:14px}.logo{width:64px;height:64px;object-fit:contain}
  h2{margin:0 0 2px;font-size:20px;color:#0077b6}h3{margin:0 0 4px;font-size:18px}p{margin:4px 0}header p{color:#5b6b7a}.meta{text-align:right}
  .parties{display:flex;flex-wrap:wrap;gap:8px 32px}.parties p{display:flex;flex-direction:column}.parties span{font-size:12px;color:#5b6b7a}
  table{width:100%;border-collapse:collapse;margin:20px 0}th{background:#f5f7fa;color:#5b6b7a;font-size:12px}
  th,td{padding:10px 8px;border-bottom:1px solid #e4e9ef;text-align:left;overflow-wrap:anywhere}
  .numeric{text-align:right;white-space:nowrap}thead{display:table-header-group}tr{break-inside:avoid}
  .total{display:flex;justify-content:flex-end;align-items:baseline;gap:16px;padding:12px 8px;border-top:2px solid #0f2537}.total span{color:#5b6b7a}.total strong{font-size:22px}
  .note{font-size:12px;color:#5b6b7a}.thanks{margin-top:20px;text-align:center;color:#5b6b7a;font-size:13px}
  @media print{th{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:15mm}}`;
