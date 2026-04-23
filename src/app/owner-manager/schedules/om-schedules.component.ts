import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SkeletonModule } from 'primeng/skeleton';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-om-schedules',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonModule],
  templateUrl: './om-schedules.component.html',
  styleUrls: ['./om-schedules.component.scss'],
})
export class OmSchedulesComponent implements OnInit {
  private api = `${environment.apiUrl}/owner-manager`;

  schedules = signal<any[]>([]);
  loading   = signal(true);
  filterStatus = '';

  filteredSchedules = computed(() => {
    const list = this.schedules();
    if (!this.filterStatus) return list;
    return list.filter((s: any) => s.status === this.filterStatus);
  });

  totals = computed(() => {
    const list = this.filteredSchedules();
    return {
      total:   list.reduce((a: number, s: any) => a + s.total_amount, 0),
      paid:    list.reduce((a: number, s: any) => a + s.amount_paid,  0),
      balance: list.reduce((a: number, s: any) => a + s.balance,      0),
    };
  });

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/schedules?all=1`).subscribe({
      next: (res: any) => {
        this.schedules.set(Array.isArray(res?.data) ? res.data : []);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false),
    });
  }

  statusLabel(s: string): string {
    return ({ pending: 'En attente', partial: 'Partiel', late: 'En retard', paid: 'Payé', cancelled: 'Annulé' } as any)[s] ?? s;
  }

  statusClass(s: string): string {
    return ({ pending: 'badge-pending', partial: 'badge-partial', late: 'badge-overdue', paid: 'badge-paid', cancelled: 'badge-cancelled' } as any)[s] ?? '';
  }

  formatCurrency(n: any): string {
    return new Intl.NumberFormat('fr-SN').format(Number(n) || 0) + ' F';
  }
}
