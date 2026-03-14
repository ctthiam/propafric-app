import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-owner-schedules',
  standalone: true,
  imports: [CommonModule, SkeletonModule],
  templateUrl: './owner-schedules.component.html',
  styleUrls: ['./owner-schedules.component.scss'],
})
export class OwnerSchedulesComponent implements OnInit {
  private apiUrl = `${environment.apiUrl}/portal/owner`;
  schedules    = signal<any[]>([]);
  loading      = signal(true);
  filterStatus = signal('');
  search       = signal('');

  filteredSchedules = computed(() => {
    let list = this.schedules();
    const s = this.filterStatus();
    const q = this.search().toLowerCase();
    if (s) list = list.filter(x => x.status === s);
    if (q) list = list.filter(x => `${x.period_label} ${x.property?.name} ${x.tenant?.full_name}`.toLowerCase().includes(q));
    return list;
  });

  get totalCollected(): number { return this.schedules().filter(s => s.status === 'paid').reduce((sum, s) => sum + Number(s.amount_paid), 0); }
  get totalPending(): number { return this.schedules().filter(s => s.status !== 'paid').reduce((sum, s) => sum + Number(s.balance), 0); }

  statusOptions = [
    { label: 'Tous', value: '' }, { label: 'Payé', value: 'paid' },
    { label: 'En attente', value: 'pending' }, { label: 'En retard', value: 'late' },
  ];

  Number = Number;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any>(`${this.apiUrl}/schedules`).subscribe({
      next: (r: any) => { this.schedules.set(Array.isArray(r?.data) ? r.data : []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onSearch(e: Event): void { this.search.set((e.target as HTMLInputElement).value); }
  onFilter(v: string): void { this.filterStatus.set(v); }
  formatCurrency(n: number | string): string { return new Intl.NumberFormat('fr-SN').format(Number(n) || 0) + ' F'; }
  formatDate(d: string): string { return d ? new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }
  statusLabel(s: string): string { return ({ paid: 'Payé', pending: 'En attente', late: 'En retard', partial: 'Partiel' } as any)[s] ?? s; }
  statusClass(s: string): string { return ({ paid: 'badge-success', pending: 'badge-neutral', late: 'badge-danger', partial: 'badge-warning' } as any)[s] ?? 'badge-neutral'; }
}