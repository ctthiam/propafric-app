import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { SkeletonModule } from 'primeng/skeleton';

export interface TenantSchedule {
  id: number;
  period_label: string;
  due_date: string;
  total_amount: string;
  amount_paid: string;
  balance: string;
  status: 'pending' | 'paid' | 'late' | 'partial';
  days_overdue: number | null;
}

@Component({
  selector: 'app-tenant-schedules',
  standalone: true,
  imports: [CommonModule, SkeletonModule],
  templateUrl: './tenant-schedules.component.html',
  styleUrls: ['./tenant-schedules.component.scss'],
})
export class TenantSchedulesComponent implements OnInit {
  private apiUrl = `${environment.apiUrl}/portal/tenant`;

  schedules    = signal<TenantSchedule[]>([]);
  loading      = signal(true);
  filterStatus = signal('');
  search       = signal('');

  filteredSchedules = computed(() => {
    let list = this.schedules();
    const s = this.filterStatus();
    const q = this.search().toLowerCase();
    if (s) list = list.filter(x => x.status === s);
    if (q) list = list.filter(x => x.period_label.toLowerCase().includes(q));
    return list;
  });

  get totalDue(): number { return this.schedules().reduce((sum, s) => sum + Number(s.total_amount), 0); }
  get totalPaid(): number { return this.schedules().reduce((sum, s) => sum + Number(s.amount_paid), 0); }
  get totalBalance(): number { return this.schedules().reduce((sum, s) => sum + Number(s.balance), 0); }

  statusOptions = [
    { label: 'Tous', value: '' },
    { label: 'En attente', value: 'pending' },
    { label: 'Payé', value: 'paid' },
    { label: 'En retard', value: 'late' },
    { label: 'Partiel', value: 'partial' },
  ];

  Number = Number;
  Math = Math;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any>(`${this.apiUrl}/schedules`).subscribe({
      next: (res: any) => {
        this.schedules.set(Array.isArray(res?.data) ? res.data : []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onSearch(e: Event): void { this.search.set((e.target as HTMLInputElement).value); }
  onFilter(v: string): void { this.filterStatus.set(v); }

  formatCurrency(n: number | string): string { return new Intl.NumberFormat('fr-SN').format(Number(n) || 0) + ' F'; }
  formatDate(d: string): string { return d ? new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }
  statusLabel(s: string): string { return ({ pending: 'En attente', paid: 'Payé', late: 'En retard', partial: 'Partiel' } as any)[s] ?? s; }
  statusClass(s: string): string { return ({ paid: 'badge-success', pending: 'badge-neutral', late: 'badge-danger', partial: 'badge-warning' } as any)[s] ?? 'badge-neutral'; }
}