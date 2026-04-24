import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-super-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonModule],
  templateUrl: './super-dashboard.component.html',
  styleUrls: ['./super-dashboard.component.scss'],
})
export class SuperDashboardComponent implements OnInit {
  private apiUrl = `${environment.apiUrl}/agency/super-admin`;

  data    = signal<any>(null);
  loading = signal(true);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any>(`${this.apiUrl}/dashboard`).subscribe({
      next: (res: any) => { this.data.set(res?.data ?? null); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  formatCurrency(n: number | string): string {
    return new Intl.NumberFormat('fr-SN').format(Number(n) || 0) + ' F';
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  planLabel(p: string): string {
    return ({ starter: 'Starter', pro: 'Pro', partner: 'Partenaire', premium: 'Premium', enterprise: 'Entreprise' } as any)[p] ?? p;
  }

  planClass(p: string): string {
    return ({ starter: 'badge-neutral', pro: 'badge-blue', partner: 'badge-gold', premium: 'badge-purple', enterprise: 'badge-purple' } as any)[p] ?? 'badge-neutral';
  }

  statusLabel(s: string): string {
    return ({ active: 'Actif', trial: 'Essai', suspended: 'Suspendu', cancelled: 'Annulé', pending: 'En attente' } as any)[s] ?? s;
  }

  statusClass(s: string): string {
    return ({ active: 'badge-success', trial: 'badge-warning', suspended: 'badge-danger', cancelled: 'badge-neutral', pending: 'badge-pending' } as any)[s] ?? 'badge-neutral';
  }

  alertLevel(days: number): string {
    if (days <= 7)  return 'alert-danger';
    if (days <= 14) return 'alert-warning';
    return 'alert-info';
  }

  geoBarWidth(count: number, max: number): string {
    return max > 0 ? `${Math.round((count / max) * 100)}%` : '0%';
  }

  geoMax(list: any[]): number {
    if (!list?.length) return 1;
    return Math.max(...list.map((g: any) => g.count));
  }
}
