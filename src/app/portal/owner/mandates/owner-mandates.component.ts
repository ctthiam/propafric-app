import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SkeletonModule } from 'primeng/skeleton';
import { environment } from '../../.../../../../environments/environment';

@Component({
  selector: 'app-owner-mandates',
  standalone: true,
  imports: [CommonModule, SkeletonModule],
  templateUrl: './owner-mandates.component.html',
  styleUrls: ['./owner-mandates.component.scss'],
})
export class OwnerMandatesComponent implements OnInit {
  private api = `${environment.apiUrl}/portal/owner/mandates`;

  mandates = signal<any[]>([]);
  loading  = signal(true);

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.http.get<any>(this.api).subscribe({
      next: (res: any) => {
        this.mandates.set(Array.isArray(res?.data) ? res.data : []);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false),
    });
  }

  downloadMandate(m: any): void {
    this.http.get(`${this.api}/${m.id}/document`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `mandat-${m.reference}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
    });
  }

  statusLabel(s: string): string {
    return ({ active: 'Actif', terminated: 'Résilié', suspended: 'Suspendu' } as any)[s] ?? s;
  }
  statusClass(s: string): string {
    return ({ active: 'badge-success', terminated: 'badge-danger', suspended: 'badge-gold' } as any)[s] ?? '';
  }
  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}