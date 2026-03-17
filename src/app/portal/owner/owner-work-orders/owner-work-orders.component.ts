import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule }  from 'primeng/tooltip';
import { environment } from '../../.../../../../environments/environment';

export interface WorkPhoto {
  id: string; url: string; name: string; size: number;
}

interface WorkOrder {
  id: number;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  estimated_cost: number;
  actual_cost: number;
  requested_at: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  photos_before: WorkPhoto[];
  photos_after:  WorkPhoto[];
  property:   { name: string; address: string } | null;
  tenant:     { full_name: string } | null;
  contractor: { name: string; specialty: string; phone: string } | null;
}

@Component({
  selector: 'app-owner-work-orders',
  standalone: true,
  imports: [CommonModule, SkeletonModule, TooltipModule],
  templateUrl: './owner-work-orders.component.html',
  styleUrls:  ['./owner-work-orders.component.scss'],
})
export class OwnerWorkOrdersComponent implements OnInit {
  private api = `${environment.apiUrl}/portal/owner`;

  orders  = signal<WorkOrder[]>([]);
  stats   = signal<any>({});
  loading = signal(true);
  filterStatus  = signal('');
  selectedOrder = signal<WorkOrder | null>(null);
  detailOpen    = false;

  filteredOrders = computed(() => {
    const s = this.filterStatus();
    if (!s) return this.orders();
    if (s === 'active') return this.orders().filter(o =>
      ['reported', 'assigned', 'in_progress'].includes(o.status)
    );
    return this.orders().filter(o => o.status === s);
  });

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/work-orders`).subscribe({
      next: (res: any) => {
        this.orders.set(Array.isArray(res?.data) ? res.data : []);
        this.stats.set(res?.meta ?? {});
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openDetail(o: WorkOrder): void { this.selectedOrder.set(o); this.detailOpen = true; }
  closeDetail(): void { this.detailOpen = false; this.selectedOrder.set(null); }
  onFilter(e: Event): void { this.filterStatus.set((e.target as HTMLSelectElement).value); }

  photoCount(o: WorkOrder): number {
    return (o.photos_before?.length ?? 0) + (o.photos_after?.length ?? 0);
  }

  statusLabel(s: string): string { return ({ reported: 'Signalé', assigned: 'Assigné', in_progress: 'En cours', completed: 'Terminé', cancelled: 'Annulé' } as any)[s] ?? s; }
  statusClass(s: string): string { return ({ reported: 'badge-blue', assigned: 'badge-gold', in_progress: 'badge-purple', completed: 'badge-success', cancelled: 'badge-neutral' } as any)[s] ?? ''; }
  priorityLabel(p: string): string { return ({ low: 'Basse', medium: 'Moyenne', high: 'Haute', urgent: 'Urgente' } as any)[p] ?? p; }
  categoryLabel(c: string): string { return ({ urgence: 'Urgence', entretien: 'Entretien', renovation: 'Rénovation', sinistre: 'Sinistre', autre: 'Autre' } as any)[c] ?? c; }
  formatDate(d: string | null): string { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  formatCurrency(n: number): string { return n > 0 ? new Intl.NumberFormat('fr-SN').format(n) + ' F' : '—'; }
}