import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { environment } from '../../.../../../../environments/environment';

@Component({
  selector: 'app-commercial-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SkeletonModule],
  templateUrl: './commercial-dashboard.component.html',
  styleUrls: ['./commercial-dashboard.component.scss'],
})
export class CommercialDashboardComponent implements OnInit {
  private api = `${environment.apiUrl}/commercial`;
  data    = signal<any>(null);
  loading = signal(true);

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.http.get<any>(`${this.api}/dashboard`).subscribe({
      next: (res: any) => { this.data.set(res?.data ?? null); this.loading.set(false); this.cdr.detectChanges(); },
      error: () => this.loading.set(false),
    });
  }

  formatCurrency(n: number): string {
    return new Intl.NumberFormat('fr-SN').format(n) + ' F';
  }
  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  statusLabel(s: string): string {
    return ({ pending: 'En attente', active: 'Actif', suspended: 'Suspendu', cancelled: 'Annulé' } as any)[s] ?? s;
  }
  statusClass(s: string): string {
    return ({ pending: 'badge-gold', active: 'badge-success', suspended: 'badge-danger', cancelled: 'badge-neutral' } as any)[s] ?? '';
  }
  planLabel(p: string): string {
    return ({ starter: 'Starter', pro: 'Pro', premium: 'Premium' } as any)[p] ?? p;
  }
}