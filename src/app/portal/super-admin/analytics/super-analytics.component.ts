import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-super-analytics',
  standalone: true,
  imports: [CommonModule, SkeletonModule],
  templateUrl: './super-analytics.component.html',
  styleUrls: ['./super-analytics.component.scss'],
})
export class SuperAnalyticsComponent implements OnInit {
  private apiUrl = `${environment.apiUrl}/agency/super-admin`;

  data    = signal<any>(null);
  loading = signal(true);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any>(`${this.apiUrl}/analytics`).subscribe({
      next: (res) => { this.data.set(res?.data ?? null); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  formatCurrency(n: number): string {
    return new Intl.NumberFormat('fr-SN').format(Number(n) || 0) + ' F';
  }

  formatPct(value: number, total: number): string {
    if (!total) return '0%';
    return Math.round((value / total) * 100) + '%';
  }

  // ── Graphiques barres CSS ──
  maxOf(list: any[], field: string): number {
    if (!list?.length) return 1;
    return Math.max(...list.map((m: any) => Number(m[field]) || 0), 1);
  }

  barH(value: number, max: number): string {
    return max > 0 ? `${Math.max(Math.round((Number(value) / max) * 100), 2)}%` : '2%';
  }

  // ── Répartition par plan ──
  plansByStatus = computed(() => {
    if (!this.data()) return {};
    const dist = this.data().plan_distribution;
    const result: Record<string, { plan: string; active: number; trial: number; other: number; total: number }> = {};
    for (const row of dist) {
      if (!result[row.plan]) result[row.plan] = { plan: row.plan, active: 0, trial: 0, other: 0, total: 0 };
      if (row.status === 'active')      result[row.plan].active += Number(row.count);
      else if (row.status === 'trial')  result[row.plan].trial  += Number(row.count);
      else                              result[row.plan].other  += Number(row.count);
      result[row.plan].total += Number(row.count);
    }
    return result;
  });

  planDistList = computed(() => Object.values(this.plansByStatus()));
  totalAgencies = computed(() => this.planDistList().reduce((s: number, p: any) => s + p.total, 0));

  planLabel(p: string): string {
    return ({ starter: 'Starter', pro: 'Pro', partner: 'Partenaire', premium: 'Premium', enterprise: 'Entreprise' } as any)[p] ?? p;
  }
  planColor(p: string): string {
    return ({ starter: '#868e96', pro: '#4dabf7', partner: '#C9A84C', premium: '#7048e8', enterprise: '#20c997' } as any)[p] ?? '#7048e8';
  }
}
