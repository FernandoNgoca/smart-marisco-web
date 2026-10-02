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
  changeType(): void { this.form.patchValue({filter:'',search:'',seller:''}); this.apply(); }
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
    if(kind==='money') return new Intl.NumberFormat('pt-PT',{style:'currency',currency:'MZN'}).format(Number(value));
    if(kind==='number') return new Intl.NumberFormat('pt-PT',{maximumFractionDigits:3}).format(Number(value));
    if(kind==='date' && value) return new Date(value).toLocaleString('pt-PT');
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
  private renderPrint(win:Window,report:Report):void {
    const doc=win.document;doc.title=`Relatório — ${report.title}`;doc.body.textContent='';
    const style=doc.createElement('style');style.textContent='body{font:12px Arial;color:#18334c;padding:20px}h1{font-size:22px}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left;overflow-wrap:anywhere}th{background:#f3f7fa}thead{display:table-header-group}tr{break-inside:avoid}.numeric{text-align:right}button{padding:10px;margin-bottom:16px}@media print{button{display:none}@page{size:landscape;margin:12mm}}';doc.head.appendChild(style);
    const add=(tag:string,text:string,parent:HTMLElement=doc.body)=>{const el=doc.createElement(tag);el.textContent=text;parent.appendChild(el);return el;};
    const button=add('button','Imprimir / Guardar como PDF');button.onclick=()=>win.print();
    add('h1',`Mariscos do Índico — ${report.title}`);add('p',report.period);add('p',`Gerado em ${this.format(report.generatedAt,'date')} · ${report.totalElements} registos`);
    add('p',report.metrics.map(m=>`${m.label}: ${this.format(m.value,m.kind)}`).join(' | '));
    const table=add('table',''),thead=add('thead','',table),header=add('tr','',thead);
    report.columns.forEach(c=>add('th',c.label,header));const body=add('tbody','',table);
    report.rows.forEach(row=>{const tr=add('tr','',body);row.forEach((value,i)=>{const td=add('td',this.format(value,report.columns[i].kind),tr);if(['money','number'].includes(report.columns[i].kind))td.className='numeric';});});
    win.focus();setTimeout(()=>{if(!win.closed)win.print();},150);
  }
}
