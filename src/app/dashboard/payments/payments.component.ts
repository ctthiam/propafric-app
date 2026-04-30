import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

import { DropdownModule }      from 'primeng/dropdown';
import { InputNumberModule }   from 'primeng/inputnumber';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule }         from 'primeng/toast';
import { SkeletonModule }      from 'primeng/skeleton';
import { TooltipModule }       from 'primeng/tooltip';
import { CalendarModule }      from 'primeng/calendar';
import { ConfirmationService, MessageService } from 'primeng/api';

export interface ScheduleTenant   { id: number; full_name: string; phone: string; }
export interface ScheduleProperty { id: number; reference: string; name: string; address: string; }
export interface ScheduleLease    { id: number; reference: string; }

export interface PaymentSchedule {
  id: number;
  lease_id: number;
  due_date: string;
  period_label: string;
  schedule_type?: 'regular' | 'entry' | 'deposit_refund';
  total_amount: string;
  amount_paid: string;
  balance: string;
  status: 'pending' | 'partial' | 'paid' | 'late' | 'cancelled';
  paid_at: string | null;
  days_overdue: number | null;
  tenant?: ScheduleTenant;
  property?: ScheduleProperty;
  lease?: ScheduleLease;
  payments?: Payment[];
}

export interface Payment {
  id: number;
  receipt_number: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  schedule_id?: number;
  tenant?: { id: number; full_name: string; };
  property?: { id: number; name: string; reference: string; };
  schedule?: { id: number; period_label: string; };
}

export interface LeaseOption {
  id: number;
  reference: string;
  tenant?: { full_name: string; };
}

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    DropdownModule, InputNumberModule, ConfirmDialogModule,
    ToastModule, SkeletonModule, TooltipModule, CalendarModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.scss'],
})
export class PaymentsComponent implements OnInit {
  private api = `${environment.apiUrl}/agency`;
  exporting = signal(false);
  today = new Date();
  todayStr = new Date().toISOString().split('T')[0];
  schedules    = signal<PaymentSchedule[]>([]);
  payments     = signal<Payment[]>([]);
  leases       = signal<LeaseOption[]>([]);
  loading      = signal(true);
  saving       = signal(false);
  downloading  = signal<number | null>(null);
  activeTab    = signal<'payments' | 'schedules'>('schedules');
  search       = signal('');
  filterStatus = signal('');
  filterMethod = signal('');
  drawerOpen   = false;
  selectedSchedule = signal<PaymentSchedule | null>(null);

  filteredSchedules = computed(() => {
    let list = this.schedules();
    const q = this.search().toLowerCase();
    const s = this.filterStatus();
    // Masquer les annulées par défaut — visibles uniquement via le filtre explicite
    if (!s) list = list.filter(sc => sc.status !== 'cancelled');
    if (q) list = list.filter(sc =>
      `${sc.lease?.reference} ${sc.tenant?.full_name} ${sc.property?.name} ${sc.period_label}`.toLowerCase().includes(q)
    );
    if (s) list = list.filter(sc => sc.status === s);
    return list;
  });

  hasLateSchedules = computed(() => this.schedules().some(s => s.status === 'late'));

  filteredPayments = computed(() => {
    let list = this.payments();
    const q = this.search().toLowerCase();
    const m = this.filterMethod();
    if (q) list = list.filter(p =>
      `${p.receipt_number} ${p.tenant?.full_name ?? ''} ${p.property?.name ?? ''}`.toLowerCase().includes(q)
    );
    if (m) list = list.filter(p => p.payment_method === m);
    return list;
  });

  form: FormGroup;

  paymentMethods = [
    { label: 'Espèces',      value: 'cash' },
    { label: 'Virement',     value: 'virement' },
    { label: 'Wave',         value: 'wave' },
    { label: 'Orange Money', value: 'orange_money' },
    { label: 'Free Money',   value: 'free_money' },
    { label: 'Chèque',       value: 'cheque' },
    { label: 'Autre',        value: 'autre' },
  ];

  scheduleStatusOptions = [
    { label: 'Tous les statuts', value: '' },
    { label: 'En attente',       value: 'pending' },
    { label: 'Partiel',          value: 'partial' },
    { label: 'Payé',             value: 'paid' },
    { label: 'En retard',        value: 'late' },
    { label: 'Annulé',           value: 'cancelled' },
  ];

  methodFilterOptions = [
    { label: 'Tous les modes', value: '' },
    ...this.paymentMethods,
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private confirm: ConfirmationService,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      lease_id:       [null, Validators.required],
      schedule_id:    [null, Validators.required],
      amount:         [null, [Validators.required, Validators.min(1)]],
      payment_date:   [this.todayStr, Validators.required],
      payment_method: ['cash', Validators.required],
      reference:      [''],
      notes:          [''],
    });
  }

  ngOnInit(): void {
    this.loadPayments();
    this.loadSchedules();
    this.loadLeases();
  }

  loadSchedules(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/rent-schedules?per_page=1000`).subscribe({
      next: (res: any) => {
        const list: PaymentSchedule[] = Array.isArray(res?.data) ? res.data : [];
        this.schedules.set(list);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les données.' });
        this.loading.set(false);
      }
    });
  }

  loadPayments(): void {
    this.http.get<any>(`${this.api}/rent-payments`).subscribe({
      next: (res: any) => {
        const list: Payment[] = Array.isArray(res?.data) ? res.data : [];
        this.payments.set(list);
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  loadLeases(): void {
    this.http.get<any>(`${this.api}/leases`).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.leases.set(list);
      }
    });
  }

  get leaseOptions() {
    return this.leases().map(l => ({
      label: `${l.reference}${l.tenant ? ' — ' + l.tenant.full_name : ''}`,
      value: l.id,
    }));
  }

  get scheduleOptions() {
    const leaseId = this.form.get('lease_id')?.value;
    return this.schedules()
      .filter(s => s.status !== 'paid' && s.status !== 'cancelled')
      .filter(s => !leaseId || s.lease_id === leaseId)
      .map(s => ({
        label: s.schedule_type === 'entry'
          ? `[ENTRÉE] ${s.period_label} — solde ${this.formatCurrency(s.balance)}`
          : `${s.period_label} — solde ${this.formatCurrency(s.balance)}`,
        value: s.id,
      }));
  }

  openCreate(schedule?: PaymentSchedule): void {
    this.loadLeases();
    this.loadSchedules();
    this.selectedSchedule.set(schedule ?? null);
    this.form.reset({ payment_date: this.todayStr, payment_method: 'cash' });
    if (schedule) {
      this.form.patchValue({
        lease_id:    schedule.lease_id,
        schedule_id: schedule.id,
        amount:      Number(schedule.balance),
      });
    }
    this.form.markAsUntouched();
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.selectedSchedule.set(null);
    this.form.reset();
    this.cdr.detectChanges();
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    const raw = this.form.value;
    const payload = {
      rent_schedule_id:    raw.schedule_id,
      amount:         raw.amount,
      payment_date:   this.formatDate(raw.payment_date),
      payment_method: raw.payment_method,
      reference:      raw.reference || null,
      notes:          raw.notes || null,
    };

    this.http.post<any>(`${this.api}/rent-payments`, payload).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Paiement enregistré', detail: res.message });
        this.saving.set(false);
        this.closeDrawer();
        this.loadSchedules();
        this.loadPayments();
      },
      error: (err: any) => {
        const msg = err.error?.message ?? 'Une erreur est survenue.';
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: msg });
        this.saving.set(false);
      }
    });
  }

  downloadReceipt(payment: Payment): void {
    this.downloading.set(payment.id);
    this.http.get(`${this.api}/rent-payments/${payment.id}/receipt`,
      { responseType: 'blob', observe: 'response' }
    ).subscribe({
      next: (res: HttpResponse<Blob>) => {
        const url = URL.createObjectURL(res.body!);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quittance-${payment.receipt_number ?? payment.id}.pdf`;
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

  confirmCancel(payment: Payment): void {
    this.confirm.confirm({
      message: `Annuler le paiement <strong>${payment.receipt_number}</strong> ?`,
      header: "Confirmer l'annulation",
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Annuler le paiement',
      rejectLabel: 'Fermer',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.cancelPayment(payment.id),
    });
  }

  private cancelPayment(id: number): void {
    this.http.request<any>('delete', `${this.api}/rent-payments/${id}`, {
      body: { reason: 'Annulation à la demande de l\'agence' }
    }).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Annulé', detail: res.message });
        this.loadPayments();
        this.loadSchedules();
      },
      error: (err: any) => this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Annulation impossible.' })
    });
  }

  onSearch(e: Event): void { this.search.set((e.target as HTMLInputElement).value); }
  onFilterStatus(v: string): void { this.filterStatus.set(v); }
  onFilterMethod(v: string): void { this.filterMethod.set(v); }

  formatCurrency(n: number | string): string {
    return new Intl.NumberFormat('fr-SN').format(Number(n)) + ' F';
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

  methodLabel(m: string): string {
    return this.paymentMethods.find(p => p.value === m)?.label ?? m;
  }

  statusLabel(s: string): string {
    return ({ pending: 'En attente', partial: 'Partiel', paid: 'Payé', late: 'En retard', cancelled: 'Annulé' } as any)[s] ?? s;
  }

  statusClass(s: string): string {
    return ({ paid: 'badge-success', partial: 'badge-warning', pending: 'badge-neutral', late: 'badge-danger', cancelled: 'badge-neutral' } as any)[s] ?? 'badge-neutral';
  }
  // ── 4. Méthode utilitaire à ajouter dans CHAQUE composant ──
private triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
 
private todayString(): string {
  return new Date().toISOString().split('T')[0];
}
  exportExcel(): void {
  this.exporting.set(true);
  const endpoint = this.activeTab() === 'schedules'
    ? `${this.api}/exports/schedules`
    : `${this.api}/exports/payments`;
  const filename = this.activeTab() === 'schedules'
    ? `echeances_${this.todayString()}.xlsx`
    : `paiements_${this.todayString()}.xlsx`;
 
  this.http.get(endpoint, { responseType: 'blob', observe: 'response' }).subscribe({
    next: (res: HttpResponse<Blob>) => {
      this.triggerDownload(res.body!, filename);
      this.exporting.set(false);
    },
    error: () => {
      this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Export impossible.' });
      this.exporting.set(false);
    }
  });
}

  isDownloading(id: number): boolean { return this.downloading() === id; }
  Number = Number;
}