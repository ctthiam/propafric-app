import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-archives',
  standalone: true,
  imports: [CommonModule, ToastModule, SkeletonModule, TooltipModule],
  providers: [MessageService],
  templateUrl: './archives.component.html',
  styleUrls: ['./archives.component.scss'],
})
export class ArchivesComponent implements OnInit {
  private api = `${environment.apiUrl}/agency/archives`;

  activeTab = signal<'leases' | 'tenants' | 'work-orders' | 'properties'>('leases');

  // Baux
  leases      = signal<any[]>([]);
  loadingLeases = signal(true);
  searchLeases  = signal('');
  filterLeaseStatus = signal('');

  // Locataires
  tenants         = signal<any[]>([]);
  loadingTenants  = signal(true);
  searchTenants   = signal('');

  // Travaux
  workOrders        = signal<any[]>([]);
  loadingWorkOrders = signal(true);
  searchWorkOrders  = signal('');
  filterWOStatus    = signal('');

  // Biens
  properties         = signal<any[]>([]);
  loadingProperties  = signal(true);
  searchProperties   = signal('');

  filteredLeases = computed(() => {
    let list = this.leases();
    const q = this.searchLeases().toLowerCase();
    const s = this.filterLeaseStatus();
    if (q) list = list.filter(l =>
      `${l.reference} ${l.tenant?.full_name} ${l.property?.name}`.toLowerCase().includes(q)
    );
    if (s) list = list.filter(l => l.status === s);
    return list;
  });

  filteredTenants = computed(() => {
    const q = this.searchTenants().toLowerCase();
    if (!q) return this.tenants();
    return this.tenants().filter(t =>
      `${t.full_name} ${t.email} ${t.phone}`.toLowerCase().includes(q)
    );
  });

  filteredWorkOrders = computed(() => {
    let list = this.workOrders();
    const q = this.searchWorkOrders().toLowerCase();
    const s = this.filterWOStatus();
    if (q) list = list.filter(w =>
      `${w.title} ${w.property?.name}`.toLowerCase().includes(q)
    );
    if (s) list = list.filter(w => w.status === s);
    return list;
  });

  filteredProperties = computed(() => {
    const q = this.searchProperties().toLowerCase();
    if (!q) return this.properties();
    return this.properties().filter(p =>
      `${p.reference} ${p.name} ${p.owner?.full_name}`.toLowerCase().includes(q)
    );
  });

  constructor(
    private http: HttpClient,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadLeases();
    this.loadTenants();
    this.loadWorkOrders();
    this.loadProperties();
  }

  setTab(tab: 'leases' | 'tenants' | 'work-orders' | 'properties'): void {
    this.activeTab.set(tab);
    this.cdr.detectChanges();
  }

  loadLeases(): void {
    this.loadingLeases.set(true);
    this.http.get<any>(`${this.api}/leases`).subscribe({
      next: (res: any) => {
        this.leases.set(Array.isArray(res?.data) ? res.data : []);
        this.loadingLeases.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les baux archivés.' });
        this.loadingLeases.set(false);
      }
    });
  }

  loadTenants(): void {
    this.loadingTenants.set(true);
    this.http.get<any>(`${this.api}/tenants`).subscribe({
      next: (res: any) => {
        this.tenants.set(Array.isArray(res?.data) ? res.data : []);
        this.loadingTenants.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les locataires archivés.' });
        this.loadingTenants.set(false);
      }
    });
  }

  loadWorkOrders(): void {
    this.loadingWorkOrders.set(true);
    this.http.get<any>(`${this.api}/work-orders`).subscribe({
      next: (res: any) => {
        this.workOrders.set(Array.isArray(res?.data) ? res.data : []);
        this.loadingWorkOrders.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les travaux archivés.' });
        this.loadingWorkOrders.set(false);
      }
    });
  }

  loadProperties(): void {
    this.loadingProperties.set(true);
    this.http.get<any>(`${this.api}/properties`).subscribe({
      next: (res: any) => {
        this.properties.set(Array.isArray(res?.data) ? res.data : []);
        this.loadingProperties.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les biens archivés.' });
        this.loadingProperties.set(false);
      }
    });
  }

  onSearchLeases(e: Event): void  { this.searchLeases.set((e.target as HTMLInputElement).value); }
  onSearchTenants(e: Event): void { this.searchTenants.set((e.target as HTMLInputElement).value); }
  onSearchWO(e: Event): void      { this.searchWorkOrders.set((e.target as HTMLInputElement).value); }
  onFilterLeaseStatus(v: string): void { this.filterLeaseStatus.set(v); }
  onFilterWOStatus(v: string): void    { this.filterWOStatus.set(v); }
  onSearchProperties(e: Event): void { this.searchProperties.set((e.target as HTMLInputElement).value); }

  propertyTypeLabel(t: string): string {
    return ({ appartement: 'Appartement', villa_simple: 'Villa', bureau: 'Bureau',
              f1: 'F1', f2: 'F2', f3: 'F3', f4: 'F4', f5: 'F5' } as any)[t] ?? t;
  }

  formatCurrency(n: number | string): string {
    return new Intl.NumberFormat('fr-SN').format(Number(n)) + ' F';
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  leaseStatusLabel(s: string): string {
    return ({ terminated: 'Résilié', expired: 'Expiré' } as any)[s] ?? s;
  }

  leaseStatusClass(s: string): string {
    return ({ terminated: 'badge-danger', expired: 'badge-neutral' } as any)[s] ?? 'badge-neutral';
  }

  woStatusLabel(s: string): string {
    return ({ completed: 'Terminé', cancelled: 'Annulé' } as any)[s] ?? s;
  }

  woStatusClass(s: string): string {
    return ({ completed: 'badge-success', cancelled: 'badge-neutral' } as any)[s] ?? 'badge-neutral';
  }

  tenantTypeLabel(t: string): string {
    return ({ individual: 'Particulier', professional: 'Professionnel' } as any)[t] ?? t;
  }
}