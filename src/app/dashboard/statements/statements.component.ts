import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

import { DropdownModule }      from 'primeng/dropdown';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule }         from 'primeng/toast';
import { SkeletonModule }      from 'primeng/skeleton';
import { TooltipModule }       from 'primeng/tooltip';
import { CalendarModule }      from 'primeng/calendar';
import { ConfirmationService, MessageService } from 'primeng/api';

export interface Owner {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface Statement {
  id: number;
  owner_id: number;
  period_label: string;
  period_start: string;
  period_end: string;
  total_rent_collected: string;
  final_net_amount: string;
  status: 'draft' | 'sent' | 'validated';
  generated_at: string | null;
  // enrichi côté frontend
  owner?: Owner;
}

@Component({
  selector: 'app-statements',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    DropdownModule, ConfirmDialogModule,
    ToastModule, SkeletonModule, TooltipModule, CalendarModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './statements.component.html',
  styleUrls: ['./statements.component.scss'],
})
export class StatementsComponent implements OnInit {
  private api = `${environment.apiUrl}/agency`;

  statements   = signal<Statement[]>([]);
  owners       = signal<Owner[]>([]);
  loading      = signal(true);
  saving       = signal(false);
  previewing   = signal(false);
  downloading  = signal<number | null>(null);
  search       = signal('');
  filterStatus = signal('');
  filterOwner  = signal<number | null>(null);
  drawerOpen   = false;

  filteredStatements = computed(() => {
    let list = this.statements();
    const q = this.search().toLowerCase();
    const s = this.filterStatus();
    const o = this.filterOwner();
    if (q) list = list.filter(x =>
      `${x.period_label} ${x.owner?.full_name}`.toLowerCase().includes(q)
    );
    if (s) list = list.filter(x => x.status === s);
    if (o) list = list.filter(x => x.owner_id === o);
    return list;
  });

  generateForm: FormGroup;

  statusOptions = [
    { label: 'Tous les statuts', value: '' },
    { label: 'Brouillon',  value: 'draft' },
    { label: 'Envoyé',     value: 'sent' },
    { label: 'Validé',     value: 'validated' },
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private confirm: ConfirmationService,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.generateForm = this.fb.group({
      owner_id:     [null, Validators.required],
      period_start: [null, Validators.required],
      period_end:   [null, Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadOwners();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/owner-statements`).subscribe({
      next: (res: any) => {
        const list: Statement[] = Array.isArray(res?.data) ? res.data : [];
        // Enrichir avec le nom du propriétaire
        const enriched = list.map(s => ({
          ...s,
          owner: this.owners().find(o => o.id === s.owner_id),
        }));
        this.statements.set(enriched);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les relevés.' });
        this.loading.set(false);
      }
    });
  }

  loadOwners(): void {
    this.http.get<any>(`${this.api}/owners`).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.owners.set(list);
        // Recharger les relevés après avoir les propriétaires
        if (this.statements().length > 0) {
          const enriched = this.statements().map(s => ({
            ...s,
            owner: list.find((o: Owner) => o.id === s.owner_id),
          }));
          this.statements.set(enriched);
          this.cdr.detectChanges();
        }
      }
    });
  }

  get ownerOptions() {
    return this.owners().map(o => ({ label: o.full_name, value: o.id }));
  }

  get ownerFilterOptions() {
    return [
      { label: 'Tous les propriétaires', value: null },
      ...this.ownerOptions,
    ];
  }

  openGenerate(): void {
    this.generateForm.reset();
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.generateForm.reset();
    this.cdr.detectChanges();
  }

  generate(): void {
    if (this.generateForm.invalid) { this.generateForm.markAllAsTouched(); return; }
    this.saving.set(true);

    const raw = this.generateForm.value;
    const payload = {
      owner_id:  raw.owner_id,
      date_from: this.formatDate(raw.period_start),
      date_to:   this.formatDate(raw.period_end),
    };

    this.http.post<any>(`${this.api}/owner-statements/generate`, payload).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Relevé généré', detail: res.message });
        this.saving.set(false);
        this.closeDrawer();
        this.load();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Génération impossible.' });
        this.saving.set(false);
      }
    });
  }

  downloadPdf(statement: Statement): void {
    this.downloading.set(statement.id);
    this.http.get(
      `${this.api}/owner-statements/${statement.id}/download`,
      { responseType: 'blob', observe: 'response' }
    ).subscribe({
      next: (res: HttpResponse<Blob>) => {
        const url = URL.createObjectURL(res.body!);
        const a = document.createElement('a');
        a.href = url;
        a.download = `releve-${statement.id}-${statement.period_label}.pdf`;
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

  confirmDelete(s: Statement): void {
    this.confirm.confirm({
      message: `Supprimer le relevé de <strong>${s.period_label}</strong> ?`,
      header: 'Confirmer la suppression',
      icon: 'pi pi-trash',
      acceptLabel: 'Supprimer', rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.http.delete<any>(`${this.api}/owner-statements/${s.id}`).subscribe({
        next: (res: any) => {
          this.toast.add({ severity: 'success', summary: 'Supprimé', detail: res.message });
          this.load();
        },
        error: () => this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible.' })
      })
    });
  }

  onSearch(e: Event): void { this.search.set((e.target as HTMLInputElement).value); }
  onFilterStatus(v: string): void { this.filterStatus.set(v); }
  onFilterOwner(v: number | null): void { this.filterOwner.set(v); }

  ownerInitials(s: Statement): string {
    const o = s.owner;
    if (!o) return '?';
    return `${o.first_name?.[0] ?? ''}${o.last_name?.[0] ?? ''}`.toUpperCase();
  }

  formatDate(d: Date | string): string {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toISOString().split('T')[0];
  }

  formatDateDisplay(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatCurrency(n: number | string): string {
    return new Intl.NumberFormat('fr-SN').format(Number(n) || 0) + ' F';
  }

  statusLabel(s: string): string {
    return ({ draft: 'Brouillon', sent: 'Envoyé', validated: 'Validé' } as any)[s] ?? s;
  }

  statusClass(s: string): string {
    return ({ draft: 'badge-neutral', sent: 'badge-info', validated: 'badge-success' } as any)[s] ?? 'badge-neutral';
  }

  isDownloading(id: number): boolean { return this.downloading() === id; }
}