import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { environment } from 'src/environments/environment';
interface Receipt {id:number;date:string;client:string;operator:string;total:number;roundingAdjustment:number;items:{product:string;unit:string;quantity:number;unitPrice:number|null;subtotal:number|null}[];}
@Component({selector:'app-receipt',templateUrl:'./receipt.component.html',styleUrls:['./receipt.component.scss']})
export class ReceiptComponent implements OnInit,OnDestroy {
  receipt:Receipt|null=null;loading=false;error='';printError='';
  @ViewChild('paper') paper?:ElementRef<HTMLElement>;
  private destroyed=new Subject<void>();
  constructor(private route:ActivatedRoute,private http:HttpClient){}
  ngOnInit():void {this.load();}
  ngOnDestroy():void {this.destroyed.next();this.destroyed.complete();}
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
    const style=win.document.createElement('style');style.textContent='body{font:14px Arial;color:#18334c;margin:24px}article{max-width:800px;margin:auto}header{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #0f5265;padding-bottom:16px}h2,h3{margin:0 0 8px}p{margin:6px 0}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{padding:10px 8px;border-bottom:1px solid #ddd;text-align:left;overflow-wrap:anywhere}.numeric{text-align:right;white-space:nowrap}thead{display:table-header-group}tr{break-inside:avoid}.total{text-align:right;font-size:20px;font-weight:bold}.note{font-size:12px;color:#586b7c}@page{margin:15mm}';
    win.document.head.appendChild(style);win.document.body.appendChild(win.document.importNode(this.paper.nativeElement,true));
    win.focus();setTimeout(()=>{if(!win.closed)win.print();},100);
  }
}
