import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { SkeletonModule } from 'primeng/skeleton';

export interface TenantProfile {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  company_name: string | null;
  has_insurance: boolean;
  active_lease: any;
}

export interface TenantLease {
  id: number;
  reference: string;
  status: string;
  total_rent: string;
  start_date: string;
  end_date: string | null;
  payment_frequency: string;
  property: { id: number; name: string; address: string; reference: string; };
}

export interface TenantSchedule {
  id: number;
  period_label: string;
  due_date: string;
  total_amount: string;
  amount_paid: string;
  balance: string;
  status: string;
}

@Component({
  selector: 'app-tenant-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonModule],
  templateUrl: './tenant-dashboard.component.html',
  styleUrls: ['./tenant-dashboard.component.scss'],
})
export class TenantDashboardComponent implements OnInit {
  private apiUrl = `${environment.apiUrl}/portal/tenant`;

  profile   = signal<TenantProfile | null>(null);
  lease     = signal<TenantLease | null>(null);
  schedules = signal<TenantSchedule[]>([]);
  loading   = signal(true);
  paying    = signal(false);
  paymentMessage  = signal<string | null>(null);
  paymentSuccess  = signal(false);

  paidCount = computed(() =>
    this.schedules().filter(s => s.status === 'paid').length
  );

  get overdueCount(): number {
    return this.schedules().filter(s => s.status === 'late').length;
  }
  get overdueAmount(): number {
    return this.schedules()
      .filter(s => s.status === 'late')
      .reduce((sum, s) => sum + Number(s.balance), 0);
  }
  get nextSchedule(): TenantSchedule | null {
    const pending = this.schedules()
      .filter(s => s.status === 'pending' || s.status === 'late' || s.status === 'partial')
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    return pending[0] ?? null;
  }
  get totalPaid(): number {
    return this.schedules()
      .filter(s => s.status === 'paid')
      .reduce((sum, s) => sum + Number(s.amount_paid), 0);
  }

  Number = Number;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadAll();
    // Vérifier le retour PayDunya
    this.route.queryParams.subscribe(params => {
      if (params['status'] === 'success') {
        this.paymentSuccess.set(true);
        this.paymentMessage.set('Paiement effectué avec succès ! Votre échéance sera mise à jour sous peu.');
        this.cdr.detectChanges();
        // Recharger les données après 3 secondes
        setTimeout(() => { this.loadAll(); }, 3000);
      } else if (params['status'] === 'error') {
        this.paymentSuccess.set(false);
        this.paymentMessage.set('Le paiement a été annulé ou a échoué. Veuillez réessayer.');
        this.cdr.detectChanges();
      }
    });
  }

  loadAll(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.apiUrl}/profile`).subscribe({
      next: (res: any) => this.profile.set(res?.data ?? null),
      error: () => {}
    });
    this.http.get<any>(`${this.apiUrl}/lease`).subscribe({
      next: (res: any) => this.lease.set(res?.data ?? null),
      error: () => {}
    });
    this.http.get<any>(`${this.apiUrl}/schedules`).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.schedules.set(list);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false)
    });
  }

  initiatePayment(): void {
    this.paying.set(true);
    this.paymentMessage.set(null);
    this.http.post<any>(`${this.apiUrl}/payment/initiate`, {}).subscribe({
      next: (res: any) => {
        this.paying.set(false);
        if (res?.data?.payment_url) {
          window.location.href = res.data.payment_url;
        } else {
          this.paymentSuccess.set(false);
          this.paymentMessage.set('Impossible d\'initier le paiement.');
          this.cdr.detectChanges();
        }
      },
      error: (err: any) => {
        this.paying.set(false);
        this.paymentSuccess.set(false);
        this.paymentMessage.set(err.error?.message ?? 'Erreur lors de l\'initiation du paiement.');
        this.cdr.detectChanges();
      }
    });
  }

  formatCurrency(n: number | string): string {
    return new Intl.NumberFormat('fr-SN').format(Number(n) || 0) + ' F';
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  statusLabel(s: string): string {
    return ({ pending: 'En attente', paid: 'Payé', late: 'En retard', partial: 'Partiel' } as any)[s] ?? s;
  }

  statusClass(s: string): string {
    return ({ paid: 'badge-success', pending: 'badge-neutral', late: 'badge-danger', partial: 'badge-warning' } as any)[s] ?? 'badge-neutral';
  }
}