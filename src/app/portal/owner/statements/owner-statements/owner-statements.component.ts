import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-owner-statements',
  standalone: true,
  imports: [CommonModule, SkeletonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './owner-statements.component.html',
  styleUrls: ['./owner-statements.component.scss'],
})
export class OwnerStatementsComponent implements OnInit {
  private apiUrl = `${environment.apiUrl}/portal/owner`;
  statements  = signal<any[]>([]);
  loading     = signal(true);
  downloading = signal<number | null>(null);
  search      = signal('');

  filteredStatements = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) return this.statements();
    return this.statements().filter(s => s.period_label.toLowerCase().includes(q));
  });

  constructor(private http: HttpClient, private toast: MessageService) {}

  ngOnInit(): void {
    this.http.get<any>(`${this.apiUrl}/statements`).subscribe({
      next: (r: any) => { this.statements.set(Array.isArray(r?.data) ? r.data : []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  download(s: any): void {
    this.downloading.set(s.id);
    this.http.get(`${this.apiUrl}/statements/${s.id}/download`,
      { responseType: 'blob', observe: 'response' }
    ).subscribe({
      next: (res: HttpResponse<Blob>) => {
        const url = URL.createObjectURL(res.body!);
        const a = document.createElement('a');
        a.href = url;
        a.download = `releve-${s.period_label}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloading.set(null);
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Téléchargement impossible.' });
        this.downloading.set(null);
      }
    });
  }

  onSearch(e: Event): void { this.search.set((e.target as HTMLInputElement).value); }
  isDownloading(id: number): boolean { return this.downloading() === id; }
  formatCurrency(n: number | string): string { return new Intl.NumberFormat('fr-SN').format(Number(n) || 0) + ' F'; }
  formatDate(d: string): string { return d ? new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }
  statusLabel(s: string): string { return ({ draft: 'Brouillon', sent: 'Envoyé', validated: 'Validé' } as any)[s] ?? s; }
  statusClass(s: string): string { return ({ draft: 'badge-neutral', sent: 'badge-info', validated: 'badge-success' } as any)[s] ?? 'badge-neutral'; }
}