import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { SkeletonModule } from 'primeng/skeleton';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule }    from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-tenant-lease',
  standalone: true,
  imports: [CommonModule, SkeletonModule, DropdownModule, ToastModule, ReactiveFormsModule],
  providers: [MessageService],
  templateUrl: './tenant-lease.component.html',
  styleUrls: ['./tenant-lease.component.scss'],
})
export class TenantLeaseComponent implements OnInit {
  private apiUrl = `${environment.apiUrl}/portal/tenant`;

  lease        = signal<any>(null);
  loading      = signal(true);
  downloading  = signal(false);
  saving       = signal(false);
  reportOpen   = false;

  reportForm: FormGroup;

  categoryOptions = [
    { label: 'Urgence',    value: 'urgence'    },
    { label: 'Entretien',  value: 'entretien'  },
    { label: 'Rénovation', value: 'renovation' },
    { label: 'Sinistre',   value: 'sinistre'   },
    { label: 'Autre',      value: 'autre'      },
  ];

  priorityOptions = [
    { label: 'Basse',   value: 'low'    },
    { label: 'Moyenne', value: 'medium' },
    { label: 'Haute',   value: 'high'   },
    { label: 'Urgente', value: 'urgent' },
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.reportForm = this.fb.group({
      title:       ['', Validators.required],
      description: [''],
      category:    ['entretien', Validators.required],
      priority:    ['medium',    Validators.required],
    });
  }

  ngOnInit(): void {
    this.http.get<any>(`${this.apiUrl}/lease`).subscribe({
      next: (res: any) => { this.lease.set(res?.data ?? null); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  // ── Télécharger contrat PDF ──────────────────────────────
  downloadContract(): void {
    this.downloading.set(true);
    this.http.get(`${this.apiUrl}/lease/document`, {
      responseType: 'blob',
      observe: 'response',
    }).subscribe({
      next: (res: HttpResponse<Blob>) => {
        const ref = this.lease()?.reference ?? 'contrat';
        const url = URL.createObjectURL(res.body!);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `contrat-${ref}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloading.set(false);
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Téléchargement impossible.' });
        this.downloading.set(false);
      }
    });
  }

  // ── Signaler un problème ────────────────────────────────
  openReport(): void {
    this.reportForm.reset({ category: 'entretien', priority: 'medium' });
    this.reportOpen = true;
    this.cdr.detectChanges();
  }

  closeReport(): void {
    this.reportOpen = false;
    this.cdr.detectChanges();
  }

  submitReport(): void {
    if (this.reportForm.invalid) { this.reportForm.markAllAsTouched(); return; }
    this.saving.set(true);

    this.http.post<any>(`${this.apiUrl}/work-orders`, this.reportForm.value).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Signalement envoyé', detail: res.message ?? 'Votre demande a été transmise à l\'agence.' });
        this.saving.set(false);
        this.closeReport();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Envoi impossible.' });
        this.saving.set(false);
      }
    });
  }

  // ── Helpers ─────────────────────────────────────────────
  formatCurrency(n: number | string): string {
    return new Intl.NumberFormat('fr-SN').format(Number(n) || 0) + ' F';
  }
  formatDate(d: string): string {
    return d ? new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
  }
  statusLabel(s: string): string {
    return ({ active: 'Actif', expired: 'Expiré', terminated: 'Résilié', pending: 'En attente' } as any)[s] ?? s;
  }
  statusClass(s: string): string {
    return ({ active: 'badge-success', pending: 'badge-warning', expired: 'badge-neutral', terminated: 'badge-danger' } as any)[s] ?? 'badge-neutral';
  }
}