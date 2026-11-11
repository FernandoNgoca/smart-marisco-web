import { ActivatedRoute } from '@angular/router';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormControl, FormGroup } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { PageEvent } from '@angular/material/paginator';
import { environment } from 'src/environments/environment';
interface Column { label: string; kind: string; }
interface Report { title: string; period: string; generatedAt: string; columns: Column[]; rows: (string | number)[][];
  totalElements: number; metrics: { label: string; value: number; kind: string }[]; }
@Component({ selector: 'app-reports', templateUrl: './reports.component.html', styleUrls: ['./reports.component.scss'] })
export class ReportsComponent implements OnInit, OnDestroy {
  private today = new Date();
  private date(value: Date): string { return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`; }
  form = new FormGroup({ type: new FormControl('sales'), from: new FormControl(this.date(new Date(this.today.getFullYear(), this.today.getMonth(), 1))),
    to: new FormControl(this.date(this.today)), search: new FormControl(''), filter: new FormControl(''), seller: new FormControl('') });
  readonly types = [
    { value: 'sales', label: 'Vendas', hint: 'Vendas concluídas e faturação', icon: 'fa-receipt' },
    { value: 'stock', label: 'Stock atual', hint: 'Quantidades e valor em armazém', icon: 'fa-boxes-stacked' },
    { value: 'movements', label: 'Movimentos', hint: 'Entradas e saídas de stock', icon: 'fa-right-left' }
  ];
  report: Report | null = null;
  loading = false;
  exporting = false;
  error = '';
  exportError = '';
  pageIndex = 0;
  pageSize = 10;
  private applied = this.form.getRawValue();
  private destroyed = new Subject<void>();
  private cancel = new Subject<void>();
  private printWindow: Window | null = null;
  constructor(private http: HttpClient, private route: ActivatedRoute) {}
  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const from = params.get('from'), to = params.get('to');
    if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)) this.form.patchValue({from,to});
    this.apply();
  }
  ngOnDestroy(): void { if (this.exporting) this.printWindow?.close(); this.destroyed.next(); this.destroyed.complete(); this.cancel.next(); this.cancel.complete(); }
  get invalidDates(): boolean { const {type,from,to}=this.form.getRawValue(); return type !== 'stock' && (!from || !to || from > to); }
  selectType(type: string): void {
    if (this.exporting || this.form.controls.type.value === type) return;
    this.form.patchValue({ type, filter: '', search: '', seller: '' });
    this.apply();
  }
  // Atalhos de período, em hora local.
  setPeriod(period: 'month' | 'lastMonth' | 'year'): void {
    const t = this.today;
    const ranges = {
      month: [new Date(t.getFullYear(), t.getMonth(), 1), t],
      lastMonth: [new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0)],
      year: [new Date(t.getFullYear(), 0, 1), t]
    };
    const [from, to] = ranges[period];
    this.form.patchValue({ from: this.date(from), to: this.date(to) });
    this.apply();
  }
  // "2026-11-01 a 2026-11-11" -> "01/11/2026 a 11/11/2026"
  period(text: string): string {
    return text.replace(/(\d{4})-(\d{2})-(\d{2})/g, '$3/$2/$1');
  }
  private params(): HttpParams {
    let params=new HttpParams();
    for(const [key,value] of Object.entries(this.applied)) if(key!=='type' && value && !(this.applied.type==='stock' && (key==='from'||key==='to'))) params=params.set(key,value);
    return params;
  }
  apply(): void { if(this.invalidDates || this.exporting) return; this.applied=this.form.getRawValue(); this.pageIndex=0; this.load(); }
  load(): void {
    this.cancel.next(); this.loading=true; this.error=''; this.exportError=''; this.report=null;
    this.http.get<Report>(`${environment.apiURL}api/reports/v1/${this.applied.type}`,{params:this.params().set('page',this.pageIndex).set('size',this.pageSize)})
      .pipe(takeUntil(this.cancel),takeUntil(this.destroyed)).subscribe({next:report=>{this.report=report;this.loading=false;},
        error:()=>{this.loading=false;this.error='Não foi possível carregar o relatório. Tente novamente.';}});
  }
  page(event:PageEvent):void {this.pageIndex=event.pageIndex;this.pageSize=event.pageSize;this.load();}
  format(value:string|number,kind:string):string {
    if(kind==='money') return `${new Intl.NumberFormat('pt-MZ',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value))} MT`;
    if(kind==='number') return new Intl.NumberFormat('pt-PT',{maximumFractionDigits:3}).format(Number(value));
    if(kind==='date' && value) return new Date(value).toLocaleString('pt-PT',{dateStyle:'short',timeStyle:'short'});
    return String(value);
  }
  excel():void {
    if(!this.report || this.loading || this.exporting) return;
    this.exporting=true;this.exportError='';
    this.http.get(`${environment.apiURL}api/reports/v1/${this.applied.type}/excel`,{params:this.params(),responseType:'blob'})
      .pipe(takeUntil(this.destroyed)).subscribe({next:blob=>{
        const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`relatorio-${this.applied.type}.xlsx`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);this.exporting=false;
      },error:async err=>{this.exporting=false;let detail='';try{detail=JSON.parse(await err.error.text()).detail;}catch{}this.exportError=detail||'Não foi possível exportar. Reduza os filtros se houver mais de 10 000 linhas.';}});
  }
  print():void {
    if(!this.report || this.loading || this.exporting) return;
    const win=window.open('','_blank');
    if(!win){this.exportError='Permita abrir a janela de impressão no navegador.';return;}
    this.printWindow=win;win.opener=null;win.document.title='A preparar relatório';win.document.body.textContent='A preparar relatório...';
    this.exporting=true;this.exportError='';
    this.http.get<Report>(`${environment.apiURL}api/reports/v1/${this.applied.type}`,{params:this.params().set('print','true')})
      .pipe(takeUntil(this.destroyed)).subscribe({next:report=>{this.exporting=false;if(win.closed)return;this.renderPrint(win,report);},
        error:err=>{this.exporting=false;win.close();this.exportError=err.error?.detail||'Não foi possível preparar a impressão. Reduza os filtros se houver mais de 10 000 linhas.';}});
  }
  // Documento de impressão: cabeçalho com logótipo, indicadores, tabela e rodapé. Construído com DOM (sem innerHTML).
  private renderPrint(win:Window,report:Report):void {
    const doc=win.document;doc.title=`Relatório — ${report.title}`;doc.body.textContent='';
    const style=doc.createElement('style');
    style.textContent=`
      *{box-sizing:border-box}
      body{font:12px/1.45 "Inter",Arial,sans-serif;color:#0f2537;margin:0;padding:24px}
      .toolbar{margin-bottom:16px}.toolbar button{padding:10px 16px;border:0;border-radius:8px;background:#0077b6;color:#fff;font:inherit;font-weight:600;cursor:pointer}
      header{display:flex;align-items:center;gap:16px;padding-bottom:14px;border-bottom:3px solid #0077b6}
      header img{width:72px;height:72px;object-fit:contain}
      header .brand{flex:1}header .brand strong{display:block;font-size:20px;color:#0077b6}header .brand span{color:#5b6b7a}
      header .meta{text-align:right;color:#5b6b7a}header .meta h1{margin:0 0 4px;font-size:18px;color:#0f2537}
      .metrics{display:flex;gap:12px;margin:16px 0}
      .metric{flex:1;padding:10px 14px;border:1px solid #e4e9ef;border-radius:8px}
      .metric span{display:block;color:#5b6b7a;font-size:11px}.metric strong{font-size:16px}
      table{width:100%;border-collapse:collapse}
      th{background:#0077b6;color:#fff;text-align:left;padding:8px;font-weight:600}
      td{padding:7px 8px;border-bottom:1px solid #e4e9ef;overflow-wrap:anywhere}
      tbody tr:nth-child(even) td{background:#f5f7fa}
      thead{display:table-header-group}tr{break-inside:avoid}.numeric{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
      footer{margin-top:16px;padding-top:8px;border-top:1px solid #e4e9ef;color:#5b6b7a;font-size:11px;display:flex;justify-content:space-between}
      @media print{.toolbar{display:none}body{padding:0}@page{size:landscape;margin:12mm}th,tbody tr:nth-child(even) td{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;
    doc.head.appendChild(style);
    const add=(tag:string,text:string,parent:HTMLElement=doc.body,className='')=>{const el=doc.createElement(tag);el.textContent=text;if(className)el.className=className;parent.appendChild(el);return el;};
    const toolbar=add('div','',doc.body,'toolbar');const button=add('button','Imprimir / Guardar como PDF',toolbar);button.onclick=()=>win.print();
    const header=add('header','');
    const logo=doc.createElement('img');logo.alt='';logo.src=new URL('assets/log.png',document.baseURI).href;header.appendChild(logo);
    const brand=add('div','',header,'brand');add('strong','Mariscos do Índico',brand);add('span','Gestão de vendas de mariscos',brand);
    const meta=add('div','',header,'meta');add('h1',report.title,meta);add('div',this.period(report.period),meta);add('div',`Gerado em ${this.format(report.generatedAt,'date')}`,meta);
    const metrics=add('div','',doc.body,'metrics');
    report.metrics.forEach(m=>{const box=add('div','',metrics,'metric');add('span',m.label,box);add('strong',this.format(m.value,m.kind),box);});
    const table=add('table',''),thead=add('thead','',table),headRow=add('tr','',thead);
    report.columns.forEach(c=>add('th',c.label,headRow,['money','number'].includes(c.kind)?'numeric':''));
    const body=add('tbody','',table);
    report.rows.forEach(row=>{const tr=add('tr','',body);row.forEach((value,i)=>add('td',this.format(value,report.columns[i].kind),tr,['money','number'].includes(report.columns[i].kind)?'numeric':''));});
    const footer=add('footer','');add('span',`Mariscos do Índico · ${report.title}`,footer);add('span',`${report.totalElements} ${report.totalElements===1?'registo':'registos'}`,footer);
    // Imprime depois de o logótipo carregar (ou falhar), para não sair em branco.
    let printed=false;const go=()=>{if(printed||win.closed)return;printed=true;win.focus();win.print();};
    logo.onload=()=>setTimeout(go,100);logo.onerror=go;setTimeout(go,1500);
  }
}
