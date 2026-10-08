import { DashboardService, DashboardOverview } from '@app/services/dashboard.service';
import { Subject, takeUntil, timeout } from 'rxjs';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '@app/services/auth.service';
import { ScaleType } from '@swimlane/ngx-charts';

@Component({selector:'app-dashboard-list',templateUrl:'./dashboard-list.component.html',styleUrls:['./dashboard-list.component.scss']})
export class DashboardListComponent implements OnInit, OnDestroy {
  isLoading = false;
  loadError = false;
  data: DashboardOverview | null = null;
  chartMode = 'sales';
  get dailyAverage(): number {
    return this.data?.dailySales.length ? this.data.totals.revenue / this.data.dailySales.length : 0;
  }
  get activeDays(): number { return this.data?.dailySales.filter(day => day.value > 0).length ?? 0; }
  get bestDay(): DashboardOverview['dailySales'][number] | null {
    return this.data?.dailySales.reduce<DashboardOverview['dailySales'][number] | null>(
      (best, day) => day.value > 0 && (!best || day.revenue > best.revenue) ? day : best, null) ?? null;
  }
  get previousAverageSale(): number {
    return this.data?.previous.sales ? this.data.previous.revenue / this.data.previous.sales : 0;
  }

  revenueSeries: { name: string; series: { name: string; value: number }[] }[] = [];
  preset = 'month';
  from = '';
  to = '';
  maxDate = this.localDate(new Date());
  yAxisTicks = [0,1];
  readonly chartColors = {name:'marisco',selectable:true,group:ScaleType.Ordinal,domain:['#0f5265']};
  private cancel = new Subject<void>();
  private destroyed = new Subject<void>();
  constructor(private dashboardService: DashboardService, private auth: AuthService) {}
  ngOnInit(): void { this.selectPeriod('month'); }
  ngOnDestroy(): void { this.destroyed.next(); this.destroyed.complete(); this.cancel.next(); this.cancel.complete(); }
  private localDate(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
  selectPeriod(preset: string): void {
    this.preset = preset;
    if (preset === 'custom') return;
    const start = new Date(); this.to = this.localDate(start); this.maxDate = this.to;
    if (preset === 'month') start.setDate(1);
    if (preset === 'week') start.setDate(start.getDate()-6);
    this.from = this.localDate(start); this.load();
  }
  get invalidPeriod(): boolean {
    const start = Date.parse(this.from), end = Date.parse(this.to);
    return !Number.isFinite(start) || !Number.isFinite(end) || start > end || (end-start)/86400000 > 365 || this.to > this.maxDate;
  }
  load(): void {
    if (!this.hasDashboardPermission() || this.invalidPeriod) return;
    this.cancel.next(); this.isLoading=true; this.loadError=false; this.data=null;
    this.dashboardService.overview(this.from,this.to).pipe(timeout(15000),takeUntil(this.cancel),takeUntil(this.destroyed)).subscribe({
      next:data=>{
        this.data=data; this.isLoading=false;
        this.revenueSeries=[{name:'Faturação (MZN)',series:data.dailySales.map(day=>({name:day.name,value:day.revenue}))}];
        const max=Math.max(...data.dailySales.map(d=>d.value),1), step=Math.max(1,Math.ceil(max/5));
        this.yAxisTicks=Array.from({length:Math.ceil(max/step)+1},(_,i)=>i*step);
      },
      error:()=>{this.isLoading=false;this.loadError=true;}
    });
  }
  hasDashboardPermission(): boolean { return !this.auth.hasAnyRole(['ROLE_ADMIN']) && this.auth.hasAnyRole(['ROLE_MANAGER']); }
  formatYAxisTicks(value:number):string {return Math.floor(value).toString();}
  formatRevenue(value:number):string {return new Intl.NumberFormat('pt-PT',{maximumFractionDigits:2}).format(value)+' MZN';}
  formatDay(value:string):string {return value.slice(8,10)+'/'+value.slice(5,7);}
  calculateVariation(current:number,previous:number):number|null {return previous===0 ? (current===0 ? 0 : null) : Number(((current-previous)/previous*100).toFixed(1));}
  variation(current:number,previous:number):string {const value=this.calculateVariation(current,previous);return value===null ? 'Sem base de comparação' : `${value>0?'+':''}${value}%`;}
}
