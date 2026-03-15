import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SkeletonModule } from 'primeng/skeleton';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-super-revenue',
  standalone: true,
  imports: [CommonModule, SkeletonModule],
  templateUrl: './super-revenue.component.html',
  styleUrls:  ['./super-revenue.component.scss'],
})
export class SuperRevenueComponent implements OnInit {
  private api = `${environment.apiUrl}/agency/super-admin`;

  summary  = signal<any>({});
  monthly  = signal<any[]>([]);
  byPlan   = signal<any[]>([]);
  subs     = signal<any[]>([]);
  loading  = signal(true);
  activeTab = signal<'revenue' | 'subscriptions'>('revenue');

  selectedYear = new Date().getFullYear();
  years = Array.from({ length: 4 }, (_, i) => this.selectedYear - i);

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    Promise.all([
      this.http.get<any>(`${this.api}/revenue?year=${this.selectedYear}`).toPromise(),
      this.http.get<any>(`${this.api}/subscriptions`).toPromise(),
    ]).then(([rev, subs]) => {
      this.summary.set(rev?.data?.summary ?? {});
      this.monthly.set(Array.isArray(rev?.data?.monthly) ? rev.data.monthly : []);
      this.byPlan.set(Array.isArray(rev?.data?.by_plan) ? rev.data.by_plan : []);
      this.subs.set(Array.isArray(subs?.data) ? subs.data : []);
      this.loading.set(false);
    }).catch(() => this.loading.set(false));
  }

  onYearChange(e: Event): void {
    this.selectedYear = Number((e.target as HTMLSelectElement).value);
    this.load();
  }

  get maxMonthly(): number {
    return Math.max(...this.monthly().map(m => m.total), 1);
  }

  barHeight(total: number): number {
    return Math.round((total / this.maxMonthly) * 100);
  }

  planLabel(p: string): string {
    return ({ starter: 'Starter', pro: 'Pro', premium: 'Premium', partner: 'Partenaire' } as any)[p] ?? p;
  }

  statusLabel(s: string): string {
    return ({ active: 'Actif', expired: 'Expiré', cancelled: 'Annulé', pending: 'En attente' } as any)[s] ?? s;
  }
  statusClass(s: string): string {
    return ({ active: 'badge-success', expired: 'badge-neutral', cancelled: 'badge-danger', pending: 'badge-gold' } as any)[s] ?? '';
  }

  formatCurrency(n: number): string {
    if (!n) return '0 F';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' M F';
    if (n >= 1_000)     return Math.round(n / 1_000) + ' k F';
    return n + ' F';
  }
  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}