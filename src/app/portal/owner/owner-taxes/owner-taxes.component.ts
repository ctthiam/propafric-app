import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SkeletonModule } from 'primeng/skeleton';
import { environment } from '../../.../../../../environments/environment';

interface PropertyTax {
  id: number;
  tax_year: number;
  tax_type: string;
  amount: number;
  due_date: string | null;
  status: string;
  paid_at: string | null;
  payment_reference: string | null;
  property: { name: string; reference: string; address: string } | null;
}

@Component({
  selector: 'app-owner-taxes',
  standalone: true,
  imports: [CommonModule, SkeletonModule],
  templateUrl: './owner-taxes.component.html',
  styleUrls:  ['./owner-taxes.component.scss'],
})
export class OwnerTaxesComponent implements OnInit {
  private api = `${environment.apiUrl}/portal/owner`;

  taxes   = signal<PropertyTax[]>([]);
  loading = signal(true);
  filterStatus = signal('');
  filterYear   = signal('');

  filteredTaxes = computed(() => {
    let list = this.taxes();
    const s = this.filterStatus();
    const y = this.filterYear();
    if (s) list = list.filter(t => t.status === s);
    if (y) list = list.filter(t => String(t.tax_year) === y);
    return list;
  });

  years = computed(() => {
    const ys = [...new Set(this.taxes().map(t => t.tax_year))].sort((a, b) => b - a);
    return ys;
  });

  get totalDue():  number { return this.taxes().filter(t => t.status !== 'paid').reduce((s, t) => s + t.amount, 0); }
  get totalPaid(): number { return this.taxes().filter(t => t.status === 'paid').reduce((s, t) => s + t.amount, 0); }
  get countPending(): number { return this.taxes().filter(t => t.status === 'pending').length; }
  get countOverdue(): number { return this.taxes().filter(t => t.status === 'overdue').length; }

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/property-taxes`).subscribe({
      next: (res: any) => {
        this.taxes.set(Array.isArray(res?.data) ? res.data : []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onFilterStatus(e: Event): void { this.filterStatus.set((e.target as HTMLSelectElement).value); }
  onFilterYear(e: Event):   void { this.filterYear.set((e.target as HTMLSelectElement).value); }

  statusLabel(s: string): string {
    return ({ pending: 'En attente', paid: 'Payé', overdue: 'En retard' } as any)[s] ?? s;
  }
  statusClass(s: string): string {
    return ({ pending: 'badge-gold', paid: 'badge-success', overdue: 'badge-danger' } as any)[s] ?? '';
  }
  formatDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  formatCurrency(n: number): string {
    return new Intl.NumberFormat('fr-SN').format(n) + ' F';
  }
}