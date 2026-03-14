import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

export interface TenantReceipt {
  id: number;
  receipt_number: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  period_label?: string;
}

@Component({
  selector: 'app-tenant-receipts',
  standalone: true,
  imports: [CommonModule, SkeletonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './tenant-receipts.component.html',
  styleUrls: ['./tenant-receipts.component.scss'],
})
export class TenantReceiptsComponent implements OnInit {
  private apiUrl = `${environment.apiUrl}/portal/tenant`;

  receipts     = signal<TenantReceipt[]>([]);
  loading      = signal(true);
  downloading  = signal<number | null>(null);
  search       = signal('');

  filteredReceipts = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) return this.receipts();
    return this.receipts().filter(r =>
      `${r.receipt_number} ${r.period_label}`.toLowerCase().includes(q)
    );
  });

  constructor(private http: HttpClient, private toast: MessageService) {}

  ngOnInit(): void {
    this.http.get<any>(`${this.apiUrl}/receipts`).subscribe({
      next: (res: any) => {
        this.receipts.set(Array.isArray(res?.data) ? res.data : []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  download(receipt: TenantReceipt): void {
    this.downloading.set(receipt.id);
    this.http.get(
      `${this.apiUrl}/receipts/${receipt.id}/download`,
      { responseType: 'blob', observe: 'response' }
    ).subscribe({
      next: (res: HttpResponse<Blob>) => {
        const url = URL.createObjectURL(res.body!);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quittance-${receipt.receipt_number}.pdf`;
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
  formatCurrency(n: number): string { return new Intl.NumberFormat('fr-SN').format(n || 0) + ' F'; }
  formatDate(d: string): string { return d ? new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }
  methodLabel(m: string): string { return ({ cash: 'Espèces', virement: 'Virement', wave: 'Wave', orange_money: 'Orange Money', cheque: 'Chèque' } as any)[m] ?? m; }
}