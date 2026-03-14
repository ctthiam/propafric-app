import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

import { DropdownModule }      from 'primeng/dropdown';
import { InputNumberModule }   from 'primeng/inputnumber';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule }         from 'primeng/toast';
import { SkeletonModule }      from 'primeng/skeleton';
import { TooltipModule }       from 'primeng/tooltip';
import { CheckboxModule }      from 'primeng/checkbox';
import { CalendarModule }      from 'primeng/calendar';
import { ConfirmationService, MessageService } from 'primeng/api';

export interface LeaseTenant  { id: number; full_name: string; phone: string; }
export interface LeaseProperty { id: number; name: string; reference: string; address: string; }

export interface Lease {
  id: number;
  reference: string;
  status: 'active' | 'expired' | 'terminated' | 'pending';
  contract_type: string;
  total_rent: string;
  payment_frequency: string;
  start_date: string;
  end_date: string | null;
  next_revision_date: string | null;
  tenant?: LeaseTenant;
  property?: LeaseProperty;
  created_at: string;
}

export interface DropdownOwner    { id: number; full_name: string; }
export interface DropdownTenant   { id: number; first_name: string; last_name: string; full_name: string; }
export interface DropdownProperty { id: number; name: string; reference: string; }

@Component({
  selector: 'app-leases',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    DropdownModule, InputNumberModule, ConfirmDialogModule,
    ToastModule, SkeletonModule, TooltipModule, CheckboxModule, CalendarModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './leases.component.html',
  styleUrls: ['./leases.component.scss'],
})
export class LeasesComponent implements OnInit {
  private api = `${environment.apiUrl}/agency`;

  leases       = signal<Lease[]>([]);
  properties   = signal<DropdownProperty[]>([]);
  tenants      = signal<DropdownTenant[]>([]);
  loading      = signal(true);
  saving       = signal(false);
  editingLease = signal<Lease | null>(null);
  search       = signal('');
  filterStatus = signal('');
  drawerOpen   = false;

  filteredLeases = computed(() => {
    let list = this.leases();
    const q = this.search().toLowerCase();
    const s = this.filterStatus();
    if (q) list = list.filter(l =>
      `${l.reference} ${l.tenant?.full_name} ${l.property?.name}`.toLowerCase().includes(q)
    );
    if (s) list = list.filter(l => l.status === s);
    return list;
  });

  // Calculs en temps réel
  calcRent    = signal(0);
  calcCharges = signal(0);
  calcTomRate = signal(3.6);
  calcVatRate = signal(18);
  calcTaxRate = signal(5);

  calcTom   = computed(() => Math.round(this.calcRent() * this.calcTomRate() / 100));
  calcVat   = computed(() => Math.round(this.calcTom() * this.calcVatRate() / 100));
  calcTax   = computed(() => Math.round(this.calcRent() * this.calcTaxRate() / 100));
  calcTotal = computed(() => this.calcRent() + this.calcCharges() + this.calcTom() + this.calcVat() - this.calcTax());

  form: FormGroup;

  statusFilterOptions = [
    { label: 'Tous les statuts', value: '' },
    { label: 'Actif',      value: 'active' },
    { label: 'En attente', value: 'pending' },
    { label: 'Expiré',     value: 'expired' },
    { label: 'Résilié',    value: 'terminated' },
  ];

  paymentDayOptions = Array.from({ length: 28 }, (_, i) => ({ label: `Le ${i + 1} du mois`, value: i + 1 }));

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private confirm: ConfirmationService,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      property_id:     [null, Validators.required],
      tenant_id:       [null, Validators.required],
      start_date:      [null, Validators.required],
      end_date:        [null],
      is_open_ended:   [true],
      duration_months: [null],
      rent_amount:     [0, [Validators.required, Validators.min(1)]],
      charges:         [0],
      tom_rate:        [3.6],
      vat_rate:        [18],
      tax_rate:        [5],
      deposit:         [0],
      payment_day:     [5],
      notes:           [''],
    });

    this.form.get('rent_amount')?.valueChanges.subscribe(v => this.calcRent.set(v ?? 0));
    this.form.get('charges')?.valueChanges.subscribe(v => this.calcCharges.set(v ?? 0));
    this.form.get('tom_rate')?.valueChanges.subscribe(v => this.calcTomRate.set(v ?? 3.6));
    this.form.get('vat_rate')?.valueChanges.subscribe(v => this.calcVatRate.set(v ?? 18));
    this.form.get('tax_rate')?.valueChanges.subscribe(v => this.calcTaxRate.set(v ?? 5));
  }

  ngOnInit(): void {
    this.loadDropdowns();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/leases`).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.leases.set(list);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les baux.' });
        this.loading.set(false);
      }
    });
  }

  loadDropdowns(): void {
    this.http.get<any>(`${this.api}/properties`).subscribe({
      next: (res: any) => this.properties.set(Array.isArray(res?.data) ? res.data : [])
    });
    this.http.get<any>(`${this.api}/tenants`).subscribe({
      next: (res: any) => this.tenants.set(Array.isArray(res?.data) ? res.data : [])
    });
  }

  get propertyOptions() {
    return this.properties().map(p => ({ label: `${p.reference} — ${p.name}`, value: p.id }));
  }

  get tenantOptions() {
    return this.tenants().map(t => ({ label: t.full_name, value: t.id }));
  }

  get isOpenEnded(): boolean { return !!this.form.get('is_open_ended')?.value; }

  openCreate(): void {
    this.editingLease.set(null);
    this.form.reset({ is_open_ended: true, tom_rate: 3.6, vat_rate: 18, tax_rate: 5, payment_day: 5, charges: 0, deposit: 0, rent_amount: 0 });
    this.resetCalc();
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  openEdit(lease: Lease): void {
    this.editingLease.set(lease);
    this.form.patchValue({
      property_id: lease.property?.id,
      tenant_id:   lease.tenant?.id,
      start_date:  new Date(lease.start_date),
      end_date:    lease.end_date ? new Date(lease.end_date) : null,
    });
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.editingLease.set(null);
    this.form.reset();
    this.resetCalc();
    this.cdr.detectChanges();
  }

  private resetCalc(): void {
    this.calcRent.set(0); this.calcCharges.set(0);
    this.calcTomRate.set(3.6); this.calcVatRate.set(18); this.calcTaxRate.set(5);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    const raw = this.form.value;
    const payload = {
      ...raw,
      start_date: this.formatDate(raw.start_date),
      end_date: raw.end_date ? this.formatDate(raw.end_date) : null,
    };

    const editing = this.editingLease();
    const req$ = editing
      ? this.http.put<any>(`${this.api}/leases/${editing.id}`, payload)
      : this.http.post<any>(`${this.api}/leases`, payload);

    req$.subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Succès', detail: res.message });
        this.saving.set(false);
        this.closeDrawer();
        this.load();
      },
      error: (err: any) => {
        const msg = err.error?.message ?? 'Une erreur est survenue.';
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: msg });
        this.saving.set(false);
      }
    });
  }

  confirmTerminate(lease: Lease): void {
    this.confirm.confirm({
      message: `Résilier le bail <strong>${lease.reference}</strong> ?`,
      header: 'Confirmer la résiliation',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Résilier',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.terminate(lease.id),
    });
  }

  private terminate(id: number): void {
    this.http.post<any>(`${this.api}/leases/${id}/terminate`, {}).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Résilié', detail: res.message });
        this.load();
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Résiliation impossible.' })
    });
  }

  onSearch(e: Event): void { this.search.set((e.target as HTMLInputElement).value); }
  onFilterStatus(value: string): void { this.filterStatus.set(value); }

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

  statusLabel(s: string): string {
    return ({ active: 'Actif', pending: 'En attente', expired: 'Expiré', terminated: 'Résilié' } as any)[s] ?? s;
  }

  statusClass(s: string): string {
    return ({ active: 'badge-success', pending: 'badge-warning', expired: 'badge-neutral', terminated: 'badge-danger' } as any)[s] ?? 'badge-neutral';
  }
}