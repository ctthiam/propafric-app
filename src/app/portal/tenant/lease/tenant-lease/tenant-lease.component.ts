import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-tenant-lease',
  standalone: true,
  imports: [CommonModule, SkeletonModule],
  templateUrl: './tenant-lease.component.html',
  styleUrls: ['./tenant-lease.component.scss'],
})
export class TenantLeaseComponent implements OnInit {
  private apiUrl = `${environment.apiUrl}/portal/tenant`;
  lease   = signal<any>(null);
  loading = signal(true);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any>(`${this.apiUrl}/lease`).subscribe({
      next: (res: any) => { this.lease.set(res?.data ?? null); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  formatCurrency(n: number | string): string { return new Intl.NumberFormat('fr-SN').format(Number(n) || 0) + ' F'; }
  formatDate(d: string): string { return d ? new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'; }
  statusLabel(s: string): string { return ({ active: 'Actif', expired: 'Expiré', terminated: 'Résilié', pending: 'En attente' } as any)[s] ?? s; }
  statusClass(s: string): string { return ({ active: 'badge-success', pending: 'badge-warning', expired: 'badge-neutral', terminated: 'badge-danger' } as any)[s] ?? 'badge-neutral'; }
}