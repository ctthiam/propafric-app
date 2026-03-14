import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonModule],
  templateUrl: './owner-dashboard.component.html',
  styleUrls: ['./owner-dashboard.component.scss'],
})
export class OwnerDashboardComponent implements OnInit {
  private apiUrl = `${environment.apiUrl}/portal/owner`;

  profile    = signal<any>(null);
  properties = signal<any[]>([]);
  statements = signal<any[]>([]);
  schedules  = signal<any[]>([]);
  loading    = signal(true);

  get occupiedCount(): number { return this.properties().filter(p => p.status === 'occupied').length; }
  get availableCount(): number { return this.properties().filter(p => p.status === 'available').length; }
  get totalRent(): number { return this.properties().filter(p => p.active_lease).reduce((s, p) => s + Number(p.active_lease.total_rent), 0); }
  get lateCount(): number { return this.schedules().filter(s => s.status === 'late').length; }
  get lateAmount(): number { return this.schedules().filter(s => s.status === 'late').reduce((s, x) => s + Number(x.balance), 0); }
  get lastStatement(): any { return this.statements()[0] ?? null; }

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any>(`${this.apiUrl}/profile`).subscribe({ next: (r: any) => this.profile.set(r?.data) });
    this.http.get<any>(`${this.apiUrl}/properties`).subscribe({ next: (r: any) => this.properties.set(Array.isArray(r?.data) ? r.data : []) });
    this.http.get<any>(`${this.apiUrl}/statements`).subscribe({ next: (r: any) => this.statements.set(Array.isArray(r?.data) ? r.data : []) });
    this.http.get<any>(`${this.apiUrl}/schedules`).subscribe({
      next: (r: any) => {
        this.schedules.set(Array.isArray(r?.data) ? r.data : []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  formatCurrency(n: number | string): string { return new Intl.NumberFormat('fr-SN').format(Number(n) || 0) + ' F'; }
  formatDate(d: string): string { return d ? new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }
  statusLabel(s: string): string { return ({ occupied: 'Occupé', available: 'Disponible', maintenance: 'Maintenance' } as any)[s] ?? s; }
  statusClass(s: string): string { return ({ occupied: 'badge-success', available: 'badge-neutral', maintenance: 'badge-warning' } as any)[s] ?? 'badge-neutral'; }
  scheduleStatusLabel(s: string): string { return ({ paid: 'Payé', pending: 'En attente', late: 'En retard', partial: 'Partiel' } as any)[s] ?? s; }
  scheduleStatusClass(s: string): string { return ({ paid: 'badge-success', pending: 'badge-neutral', late: 'badge-danger', partial: 'badge-warning' } as any)[s] ?? 'badge-neutral'; }
  statementStatusLabel(s: string): string { return ({ draft: 'Brouillon', sent: 'Envoyé', validated: 'Validé' } as any)[s] ?? s; }
  statementStatusClass(s: string): string { return ({ draft: 'badge-neutral', sent: 'badge-info', validated: 'badge-success' } as any)[s] ?? 'badge-neutral'; }
}