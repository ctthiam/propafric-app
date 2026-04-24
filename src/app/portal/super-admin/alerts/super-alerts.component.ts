import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-super-alerts',
  standalone: true,
  imports: [CommonModule, SkeletonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './super-alerts.component.html',
  styleUrls: ['./super-alerts.component.scss'],
})
export class SuperAlertsComponent implements OnInit {
  private apiUrl = `${environment.apiUrl}/agency/super-admin`;

  data          = signal<any>(null);
  loading       = signal(true);
  actionLoading = signal<number | null>(null);
  activeTab     = signal<string>('overdue');

  constructor(private http: HttpClient, private toast: MessageService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.apiUrl}/alerts`).subscribe({
      next: (res) => { this.data.set(res?.data ?? null); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  setTab(tab: string): void { this.activeTab.set(tab); }

  extend(agencyId: number, days = 30): void {
    this.actionLoading.set(agencyId);
    this.http.post<any>(`${this.apiUrl}/agencies/${agencyId}/extend`, { days }).subscribe({
      next: (res) => {
        this.toast.add({ severity: 'success', summary: 'Prolongé', detail: res.message });
        this.actionLoading.set(null);
        this.load();
      },
      error: (err) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' });
        this.actionLoading.set(null);
      },
    });
  }

  activate(agencyId: number): void {
    this.actionLoading.set(agencyId);
    this.http.put<any>(`${this.apiUrl}/agencies/${agencyId}/status`, { status: 'active' }).subscribe({
      next: (res) => {
        this.toast.add({ severity: 'success', summary: 'Activé', detail: res.message });
        this.actionLoading.set(null);
        this.load();
      },
      error: (err) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' });
        this.actionLoading.set(null);
      },
    });
  }

  tabs() {
    if (!this.data()) return [];
    const s = this.data().summary;
    return [
      { key: 'overdue',   label: 'Expirés',       count: s.overdue,    icon: 'pi-exclamation-triangle', level: 'danger'  },
      { key: 'expiring',  label: 'Expirent bientôt', count: s.expiring, icon: 'pi-clock',               level: 'warning' },
      { key: 'pending',   label: 'En attente',     count: s.pending,    icon: 'pi-hourglass',            level: 'info'    },
      { key: 'inactive',  label: 'Inactifs',       count: s.inactive,   icon: 'pi-eye-slash',            level: 'warning' },
      { key: 'ghost',     label: 'Fantômes',       count: s.ghost,      icon: 'pi-ghost',                level: 'neutral' },
      { key: 'near_limit',label: 'Limite biens',   count: s.near_limit, icon: 'pi-chart-bar',            level: 'info'    },
    ];
  }

  currentList(): any[] {
    if (!this.data()) return [];
    const map: any = {
      overdue:    this.data().overdue_agencies,
      expiring:   this.data().expiring_soon,
      pending:    this.data().pending_agencies,
      inactive:   this.data().inactive_agencies,
      ghost:      this.data().ghost_agencies,
      near_limit: this.data().near_limit,
    };
    return map[this.activeTab()] ?? [];
  }

  isLoading(id: number): boolean { return this.actionLoading() === id; }

  planLabel(p: string): string {
    return ({ starter: 'Starter', pro: 'Pro', partner: 'Partenaire', premium: 'Premium' } as any)[p] ?? p;
  }
  planClass(p: string): string {
    return ({ starter: 'badge-neutral', pro: 'badge-blue', partner: 'badge-gold', premium: 'badge-purple' } as any)[p] ?? 'badge-neutral';
  }
  statusLabel(s: string): string {
    return ({ active: 'Actif', trial: 'Essai', pending: 'En attente', suspended: 'Suspendu', cancelled: 'Annulé' } as any)[s] ?? s;
  }
  statusClass(s: string): string {
    return ({ active: 'badge-success', trial: 'badge-warning', pending: 'badge-pending', suspended: 'badge-danger', cancelled: 'badge-neutral' } as any)[s] ?? 'badge-neutral';
  }
  formatDate(d: string): string {
    return d ? new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  }
}
