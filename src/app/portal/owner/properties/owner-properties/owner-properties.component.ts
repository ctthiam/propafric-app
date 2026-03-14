import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-owner-properties',
  standalone: true,
  imports: [CommonModule, SkeletonModule],
  templateUrl: './owner-properties.component.html',
  styleUrls: ['./owner-properties.component.scss'],
})
export class OwnerPropertiesComponent implements OnInit {
  private apiUrl = `${environment.apiUrl}/portal/owner`;
  properties = signal<any[]>([]);
  loading    = signal(true);
  search     = signal('');

  filteredProperties = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) return this.properties();
    return this.properties().filter(p =>
      `${p.name} ${p.reference} ${p.address} ${p.city}`.toLowerCase().includes(q)
    );
  });

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any>(`${this.apiUrl}/properties`).subscribe({
      next: (r: any) => { this.properties.set(Array.isArray(r?.data) ? r.data : []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onSearch(e: Event): void { this.search.set((e.target as HTMLInputElement).value); }
  formatCurrency(n: number | string): string { return new Intl.NumberFormat('fr-SN').format(Number(n) || 0) + ' F'; }
  statusLabel(s: string): string { return ({ occupied: 'Occupé', available: 'Disponible', maintenance: 'Maintenance' } as any)[s] ?? s; }
  statusClass(s: string): string { return ({ occupied: 'badge-success', available: 'badge-neutral', maintenance: 'badge-warning' } as any)[s] ?? 'badge-neutral'; }
  typeLabel(t: string): string { return ({ apartment: 'Appartement', villa: 'Villa', office: 'Bureau', commercial: 'Commercial', land: 'Terrain' } as any)[t] ?? t; }
}