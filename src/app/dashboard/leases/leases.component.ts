import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

import { DropdownModule }      from 'primeng/dropdown';
import { InputNumberModule }   from 'primeng/inputnumber';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule }         from 'primeng/toast';
import { SkeletonModule }      from 'primeng/skeleton';
import { TooltipModule }       from 'primeng/tooltip';
import { CheckboxModule }      from 'primeng/checkbox';
import { ConfirmationService, MessageService } from 'primeng/api';

export interface LeaseTenant   { id: number; full_name: string; phone: string; }
export interface LeaseProperty { id: number; name: string; reference: string; address: string; }

export interface Lease {
  id: number;
  reference: string;
  status: 'active' | 'expired' | 'terminated' | 'pending';
  contract_type: string;
  calculation_mode: string | null;
  total_rent: string;
  base_rent: number | null;
  charges: number | null;
  tom_rate: number | null;
  tom_amount: number | null;
  management_fee_type: string | null;
  management_fee_value: number | null;
  management_fee_vat_rate: number | null;
  management_fee_ht: number | null;
  management_fee_ttc: number | null;
  tax_amount: number | null;
  deposit_amount: number | null;
  agency_commission_amount: number | null;
  advance_months: number | null;
  payment_frequency: string;
  payment_day: number | null;
  start_date: string;
  end_date: string | null;
  next_revision_date: string | null;
  notes: string | null;
  rent_items: any[] | null;
  charge_items: any[] | null;
  tenant?: LeaseTenant;
  property?: LeaseProperty;
  property_unit_id: number | null;
  created_at: string;
  // Sortie locataire
  inspection_date: string | null;
  deposit_retention_amount: number | null;
  deposit_retention_notes: string | null;
  refund_status?: 'pending' | 'paid' | null;
}

export interface DropdownProperty { id: number; name: string; reference: string; }
export interface DropdownTenant   { id: number; first_name: string; last_name: string; full_name: string; }

@Component({
  selector: 'app-leases',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    DropdownModule, InputNumberModule, ConfirmDialogModule,
    ToastModule, SkeletonModule, TooltipModule, CheckboxModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './leases.component.html',
  styleUrls: ['./leases.component.scss'],
})
export class LeasesComponent implements OnInit {
  private api = `${environment.apiUrl}/agency`;
  exporting = signal(false);

  leases     = signal<Lease[]>([]);
  properties = signal<DropdownProperty[]>([]);
  tenants    = signal<DropdownTenant[]>([]);
  loading    = signal(true);
  saving     = signal(false);
  saveSuccess = signal(false);
  editingLease = signal<Lease | null>(null);
  search       = signal('');
  filterStatus = signal('');
  drawerOpen   = false;

  detailOpen   = false;
  viewingLease = signal<any>(null);

  terminateDrawerOpen = false;
  terminatingLease    = signal<Lease | null>(null);
  terminateForm: FormGroup;
  refundingId         = signal<number | null>(null);

  propertyUnits = signal<any[]>([]);
  loadingUnits  = signal(false);

  agencyFeeModel = 'added';

  openDetail(lease: any): void {
    this.viewingLease.set(lease);
    this.detailOpen = true;
    this.cdr.detectChanges();
  }

  closeDetail(): void {
    this.detailOpen = false;
    this.viewingLease.set(null);
    this.cdr.detectChanges();
  }

  filteredLeases = computed(() => {
    let list = this.leases();
    const q = this.search().toLowerCase();
    const s = this.filterStatus();
    // Masquer les baux résiliés par défaut — accessibles via le filtre "Résilié"
    if (!s) list = list.filter(l => l.status !== 'terminated');
    if (q) list = list.filter(l =>
      `${l.reference} ${l.tenant?.full_name} ${l.property?.name}`.toLowerCase().includes(q)
    );
    if (s) list = list.filter(l => l.status === s);
    return list;
  });

  // ── Calculs temps réel ──────────────────────────────────────
  calcBaseRent  = signal(0);
  calcCharges   = signal(0);
  calcTomRate   = signal(3.6);
  calcVatRate   = signal(18);
  calcTaxRate   = signal(0);
  calcFeeType   = signal('percent_ht');
  calcFeeValue  = signal(0);
  calcMode      = signal('from_base');

  calcCommission = signal(0);
  calcDeposit    = signal(0);

  calcTom = computed(() => Math.round(this.calcBaseRent() * this.calcTomRate() / 100));

  calcFeeHt = computed(() => {
    const base = this.calcBaseRent();
    const charges = this.calcCharges();
    const feeType = this.calcFeeType();
    const feeValue = this.calcFeeValue();
    const vatRate = this.calcVatRate();

    if (feeType === 'fixed') return feeValue;
    if (feeType === 'percent_ht') return Math.round((base + charges) * feeValue / 100);
    if (feeType === 'percent_ttc') {
      // Même formule que le backend calculateFromBase :
      // baseContrib = base × (1 + TOM/100 + TVA/100) + charges
      const tomAmount = Math.round(base * this.calcTomRate() / 100);
      const taxAmount = Math.round(base * vatRate / 100); // TVA sur loyer de base
      const baseContrib = base + tomAmount + taxAmount + charges;
      const denominator = 1 - (feeValue / 100);
      if (denominator <= 0) return 0;
      const totalTtc = Math.round(baseContrib / denominator);
      return Math.round(totalTtc * feeValue / 100); // feeHt = feeTtc (pas de TVA sur frais)
    }
    return 0;
  });

  // Pas de TVA sur les frais de gestion — la TVA s'applique sur le loyer de base
  calcFeeVat  = computed(() => 0);
  calcFeeTtc  = computed(() => this.calcFeeHt());
  calcTax     = computed(() => Math.round(this.calcBaseRent() * this.calcVatRate() / 100));
  calcTotal = computed(() => {
    const base = this.calcBaseRent() + this.calcCharges() + this.calcTom() + this.calcTax();
    if (this.agencyFeeModel === 'deducted') {
      return base;
    }
    return base + this.calcFeeTtc();
  });

  calcEntryTotal = computed(() =>
    this.calcTotal() + this.calcDeposit() + this.calcCommission()
  );

  form: FormGroup;

  statusFilterOptions = [
    { label: 'Tous les statuts', value: '' },
    { label: 'Actif',      value: 'active' },
    { label: 'En attente', value: 'pending' },
    { label: 'Expiré',     value: 'expired' },
    { label: 'Résilié',    value: 'terminated' },
  ];

  feeTypeOptions = [
    { label: '% sur loyer HT (base + charges)', value: 'percent_ht' },
    { label: '% sur loyer TTC',                 value: 'percent_ttc' },
    { label: 'Montant forfaitaire (F CFA)',      value: 'fixed' },
  ];

  contractTypeOptions = [
    { label: 'Habitation',     value: 'habitation' },
    { label: 'Professionnel',  value: 'professionnel' },
    { label: 'Commercial',     value: 'commercial' },
  ];

  paymentFrequencyOptions = [
    { label: 'Mensuel',       value: 'monthly' },
    { label: 'Trimestriel',   value: 'quarterly' },
    { label: 'Semestriel',    value: 'biannual' },
    { label: 'Annuel',        value: 'annual' },
  ];

  paymentDayOptions = Array.from({ length: 28 }, (_, i) => ({ label: `Le ${i + 1} du mois`, value: i + 1 }));

  // ── Révision triennale ──────────────────────────────────────
  revisionOpen    = false;
  revisionLease   = signal<any>(null);
  revisionPreview = signal<any>(null);
  loadingPreview  = signal(false);
  revisionForm:   FormGroup;

  leasesNeedingRevision = computed(() => {
    const in60days = new Date();
    in60days.setDate(in60days.getDate() + 60);
    return this.leases().filter(l => {
      if (l.status !== 'active' || !l.next_revision_date) return false;
      try { return new Date(l.next_revision_date + 'T00:00:00') <= in60days; }
      catch { return false; }
    });
  });

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private confirm: ConfirmationService,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      property_id:         [null, Validators.required],
      tenant_id:           [null, Validators.required],
      property_unit_id:    [null],
      contract_type:       ['habitation', Validators.required],
      calculation_mode:    ['from_base', Validators.required],
      // Loyer de base — postes dynamiques
      base_rent_items:     this.fb.array([this.createRentItem()]),
      // Charges — postes dynamiques
      charge_items:        this.fb.array([]),
      // Mode from_total
      total_rent_input:    [0],
      // Frais de gestion
      management_fee_type:  ['percent_ht', Validators.required],
      management_fee_value: [0, [Validators.required, Validators.min(0)]],
      // Taux fiscaux
      tom_rate:             [3.6],
      management_fee_vat_rate: [18],
      tax_rate:             [0],
      // Paiement
      payment_frequency:   ['monthly', Validators.required],
      payment_day:         [5],
      deposit_amount:            [0],
      agency_commission_amount:  [0],
      advance_months:            [0],
      // Dates
      start_date:          [null, Validators.required],
      end_date:            [null],
      is_open_ended:       [true],
      // Révision
      revision_index_base: [null],
      // Document
      signed_at:           [null],
      notes:               [''],
    });

    this.revisionForm = this.fb.group({
      revision_rate: ['', [Validators.required, Validators.min(0), Validators.max(50)]],
    });

    this.terminateForm = this.fb.group({
      termination_date:          [new Date().toISOString().split('T')[0], Validators.required],
      reason:                    [''],
      inspection_date:           [''],
      deposit_retention_amount:  [0, [Validators.min(0)]],
      deposit_retention_notes:   [''],
    });

    // Abonnements pour calculs temps réel
    this.form.get('calculation_mode')?.valueChanges.subscribe(v => {
      this.calcMode.set(v ?? 'from_base');
    });
    this.form.get('tom_rate')?.valueChanges.subscribe(v => this.calcTomRate.set(v ?? 3.6));
    this.form.get('management_fee_vat_rate')?.valueChanges.subscribe(v => this.calcVatRate.set(v ?? 18));
    this.form.get('tax_rate')?.valueChanges.subscribe(v => this.calcTaxRate.set(v ?? 0));
    this.form.get('management_fee_type')?.valueChanges.subscribe(v => this.calcFeeType.set(v ?? 'percent_ht'));
    this.form.get('management_fee_value')?.valueChanges.subscribe(v => this.calcFeeValue.set(v ?? 0));

    this.form.get('deposit_amount')?.valueChanges.subscribe(v => this.calcDeposit.set(v ?? 0));
    this.form.get('agency_commission_amount')?.valueChanges.subscribe(v => this.calcCommission.set(v ?? 0));

    // Recalcul base_rent depuis les postes
    this.baseRentItems.valueChanges.subscribe(() => this.updateCalcBaseRent());
    this.chargeItems.valueChanges.subscribe(() => this.updateCalcCharges());
  }

  ngOnInit(): void {
    this.loadDropdowns();
    this.load();
  }

  // ── FormArrays ──────────────────────────────────────────────
  get baseRentItems(): FormArray { return this.form.get('base_rent_items') as FormArray; }
  get chargeItems(): FormArray   { return this.form.get('charge_items') as FormArray; }

  createRentItem(label = '', amount = 0): FormGroup {
    return this.fb.group({
      label:  [label,  Validators.required],
      amount: [amount, [Validators.required, Validators.min(0)]],
    });
  }

  createChargeItem(label = '', amount = 0): FormGroup {
    return this.fb.group({
      label:  [label,  Validators.required],
      amount: [amount, [Validators.required, Validators.min(0)]],
    });
  }

  addRentItem(): void   { this.baseRentItems.push(this.createRentItem()); }
  removeRentItem(i: number): void {
    if (this.baseRentItems.length > 1) this.baseRentItems.removeAt(i);
  }

  addChargeItem(): void { this.chargeItems.push(this.createChargeItem()); }
  removeChargeItem(i: number): void { this.chargeItems.removeAt(i); }

  private updateCalcBaseRent(): void {
    const total = this.baseRentItems.controls.reduce((sum, c) => sum + (Number(c.get('amount')?.value) || 0), 0);
    this.calcBaseRent.set(total);
  }

  private updateCalcCharges(): void {
    const total = this.chargeItems.controls.reduce((sum, c) => sum + (Number(c.get('amount')?.value) || 0), 0);
    this.calcCharges.set(total);
  }

  get totalBaseRent(): number { return this.calcBaseRent(); }
  get totalCharges(): number  { return this.calcCharges(); }
  get isFromBase(): boolean   { return this.form.get('calculation_mode')?.value === 'from_base'; }
  get isOpenEnded(): boolean  { return !!this.form.get('is_open_ended')?.value; }

  // ── CRUD ────────────────────────────────────────────────────
  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/leases`).subscribe({
      next: (res: any) => {
        this.leases.set(Array.isArray(res?.data) ? res.data : []);
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
    this.http.get<any>(`${this.api.replace('/agency', '')}/agency/settings`).subscribe({
      next: (res: any) => {
        this.agencyFeeModel = res?.data?.fee_model ?? 'added';
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  get propertyOptions() { return this.properties().map(p => ({ label: `${p.reference} — ${p.name}`, value: p.id })); }
  get tenantOptions()   { return this.tenants().map(t => ({ label: t.full_name, value: t.id })); }

  onPropertyChange(propertyId: number): void {
    this.form.patchValue({ property_unit_id: null });
    this.propertyUnits.set([]);
    if (!propertyId) return;
    this.loadingUnits.set(true);
    this.http.get<any>(`${this.api}/properties/${propertyId}/units`).subscribe({
      next: (res: any) => {
        const units = Array.isArray(res?.data) ? res.data.filter((u: any) => u.status === 'available') : [];
        this.propertyUnits.set(units);
        this.loadingUnits.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loadingUnits.set(false),
    });
  }

  unitTypeLabel(t: string): string {
    return ({ studio: 'Studio', f1: 'F1', f2: 'F2', f3: 'F3', f4: 'F4', f5: 'F5', bureau: 'Bureau', boutique: 'Boutique' } as any)[t] ?? t;
  }

  openCreate(): void {
    this.editingLease.set(null);
    this.form.reset({
      contract_type: 'habitation', calculation_mode: 'from_base',
      management_fee_type: 'percent_ht', management_fee_value: 0,
      tom_rate: 3.6, management_fee_vat_rate: 18, tax_rate: 0,
      payment_frequency: 'monthly', payment_day: 5,
      deposit_amount: 0, agency_commission_amount: 0, advance_months: 0, is_open_ended: true,
    });
    // Reset FormArrays
    while (this.baseRentItems.length) this.baseRentItems.removeAt(0);
    this.baseRentItems.push(this.createRentItem('Loyer de base', 0));
    while (this.chargeItems.length) this.chargeItems.removeAt(0);

    this.calcBaseRent.set(0); this.calcCharges.set(0);
    this.calcTomRate.set(3.6); this.calcVatRate.set(18); this.calcTaxRate.set(0);
    this.calcFeeType.set('percent_ht'); this.calcFeeValue.set(0);
    this.drawerOpen = true;
    this.cdr.detectChanges();
    this.saveSuccess.set(false);
  }

  openEdit(lease: Lease): void {
    this.editingLease.set(lease);
    this.form.patchValue({
      property_id:          lease.property?.id,
      tenant_id:            lease.tenant?.id,
      property_unit_id: lease.property_unit_id ?? null,
      contract_type:        lease.contract_type,
      calculation_mode:     lease.calculation_mode,
      start_date:           lease.start_date?.split('T')[0] ?? '',
      end_date:             lease.end_date?.split('T')[0] ?? '',
      payment_frequency:    lease.payment_frequency,
      payment_day:          lease.payment_day,
      tom_rate:             lease.tom_rate,
      management_fee_type:  lease.management_fee_type,
      management_fee_value: lease.management_fee_value,
      management_fee_vat_rate: lease.management_fee_vat_rate,
      deposit_amount:            lease.deposit_amount,
      agency_commission_amount:  lease.agency_commission_amount,
      advance_months:            lease.advance_months,
      notes:                lease.notes ?? '',
      is_open_ended:        lease.end_date ? false : true,
    }, { emitEvent: false });

    this.calcMode.set(lease.calculation_mode ?? 'from_base');
    this.calcTomRate.set(lease.tom_rate ?? 3.6);
    this.calcVatRate.set(lease.management_fee_vat_rate ?? 18);
    this.calcFeeType.set(lease.management_fee_type ?? 'percent_ht');
    this.calcFeeValue.set(lease.management_fee_value ?? 0);
    this.calcCharges.set(lease.charges ?? 0);
    this.calcBaseRent.set(lease.base_rent ?? 0);
    this.calcDeposit.set(lease.deposit_amount ?? 0);
    this.calcCommission.set(lease.agency_commission_amount ?? 0);

    if (lease.property?.id) {
      this.loadingUnits.set(true);
      this.http.get<any>(`${this.api}/properties/${lease.property.id}/units`).subscribe({
        next: (res: any) => {
          // En modification : montrer toutes les unités sauf archivées
          const units = Array.isArray(res?.data) ? res.data.filter((u: any) => u.status !== 'archived') : [];
          this.propertyUnits.set(units);
          this.loadingUnits.set(false);
          // Pré-sélectionner l'unité du bail
          this.form.patchValue({ property_unit_id: lease.property_unit_id ?? null });
          this.cdr.detectChanges();
        },
        error: () => this.loadingUnits.set(false),
      });
    }

    // Remplir les postes loyer
    while (this.baseRentItems.length) this.baseRentItems.removeAt(0);
    const rentItems = lease.rent_items ?? [];
    if (rentItems.length > 0) {
      rentItems.forEach((item: any) => this.baseRentItems.push(this.createRentItem(item.label, item.amount)));
    } else {
      this.baseRentItems.push(this.createRentItem('Loyer de base', lease.base_rent ?? 0));
    }
    this.calcBaseRent.set(
      this.baseRentItems.controls.reduce((sum, c) => sum + (Number(c.get('amount')?.value) || 0), 0)
    );

    // Remplir les charges
    while (this.chargeItems.length) this.chargeItems.removeAt(0);
    const chargeItems = lease.charge_items ?? [];
    if (chargeItems.length > 0) {
      chargeItems.forEach((item: any) => this.chargeItems.push(this.createChargeItem(item.label, item.amount)));
    } else if ((lease.charges ?? 0) > 0) {
      this.chargeItems.push(this.createChargeItem('Charges', lease.charges ?? 0));
    }
    this.calcCharges.set(lease.charges ?? 0);

    this.form.markAsUntouched();
    this.drawerOpen = true;
    this.cdr.detectChanges();
    this.saveSuccess.set(false);
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.editingLease.set(null);
    this.form.reset();
    this.cdr.detectChanges();
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    const raw = this.form.value;

    // Construire base_rent_items
    const baseRentItems = (raw.base_rent_items || []).filter((i: any) => i.label && i.amount > 0);
    const baseRent = baseRentItems.reduce((sum: number, i: any) => sum + Number(i.amount), 0);

    // Construire charges depuis charge_items
    const chargeItems = (raw.charge_items || []).filter((i: any) => i.label && i.amount > 0);
    const charges = chargeItems.reduce((sum: number, i: any) => sum + Number(i.amount), 0);

    const payload: any = {
      property_id:              raw.property_id,
      tenant_id:                raw.tenant_id,
      property_unit_id:         raw.property_unit_id ?? null,
      contract_type:            raw.contract_type,
      calculation_mode:         raw.calculation_mode,
      base_rent_items:          baseRentItems,
      base_rent:                baseRent,
      charges:                  charges,
      management_fee_type:      raw.management_fee_type,
      management_fee_value:     raw.management_fee_value,
      tom_rate:                 raw.tom_rate,
      management_fee_vat_rate:  raw.management_fee_vat_rate,
      tax_rate:                 raw.tax_rate,
      payment_frequency:        raw.payment_frequency,
      payment_day:              raw.payment_day,
      deposit_amount:            raw.deposit_amount,
      agency_commission_amount:  raw.agency_commission_amount,
      advance_months:            raw.advance_months,
      start_date:               this.formatDate(raw.start_date),
      end_date:                 raw.end_date ? this.formatDate(raw.end_date) : null,
      notes:                    raw.notes,
    };

    // Mode from_total
    if (raw.calculation_mode === 'from_total') {
      payload.total_rent = raw.total_rent_input;
    }

    const editing = this.editingLease();
    const req$ = editing
      ? this.http.put<any>(`${this.api}/leases/${editing.id}`, payload)
      : this.http.post<any>(`${this.api}/leases`, payload);

    req$.subscribe({
      next: (res: any) => {
        this.saveSuccess.set(true); setTimeout(() => { this.saveSuccess.set(false); this.closeDrawer(); this.load(); }, 1500);
        this.toast.add({ severity: 'success', summary: 'Succès', detail: res.message });
        this.saving.set(false);
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Une erreur est survenue.' });
        this.saving.set(false);
      }
    });
  }

  // ── Résiliation ─────────────────────────────────────────────
  confirmTerminate(lease: Lease): void {
    this.terminatingLease.set(lease);
    const maxRetention = lease.deposit_amount ?? 0;
    this.terminateForm.patchValue({
      termination_date:         new Date().toISOString().split('T')[0],
      reason:                   '',
      inspection_date:          '',
      deposit_retention_amount: 0,
      deposit_retention_notes:  '',
    });
    this.terminateForm.get('deposit_retention_amount')?.setValidators([
      Validators.min(0), Validators.max(maxRetention),
    ]);
    this.terminateForm.get('deposit_retention_amount')?.updateValueAndValidity();
    this.terminateDrawerOpen = true;
    this.cdr.detectChanges();
  }

  closeTerminateDrawer(): void {
    this.terminateDrawerOpen = false;
    this.terminatingLease.set(null);
    this.cdr.detectChanges();
  }

  calcRefund(): number {
    const lease = this.terminatingLease();
    if (!lease) return 0;
    const deposit   = lease.deposit_amount ?? 0;
    const retention = +(this.terminateForm.get('deposit_retention_amount')?.value ?? 0);
    return Math.max(0, deposit - retention);
  }

  saveTerminate(): void {
    if (this.terminateForm.invalid) { this.terminateForm.markAllAsTouched(); return; }
    const lease = this.terminatingLease();
    if (!lease) return;
    this.saving.set(true);
    const raw = this.terminateForm.value;
    const payload: any = {
      termination_date: raw.termination_date,
      reason:           raw.reason || null,
      inspection_date:  raw.inspection_date || null,
      deposit_retention_amount: raw.deposit_retention_amount ?? 0,
      deposit_retention_notes:  raw.deposit_retention_notes || null,
    };
    this.http.post<any>(`${this.api}/leases/${lease.id}/terminate`, payload).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Résilié', detail: res.message });
        this.saving.set(false);
        this.closeTerminateDrawer();
        this.load();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Résiliation impossible.' });
        this.saving.set(false);
      }
    });
  }

  markRefunded(lease: any): void {
    this.refundingId.set(lease.id);
    this.http.post<any>(`${this.api}/leases/${lease.id}/refund-deposit`, {}).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Remboursé', detail: res.message });
        this.refundingId.set(null);
        // Rafraîchir le bail dans la vue détail
        this.http.get<any>(`${this.api}/leases/${lease.id}`).subscribe({
          next: (r: any) => {
            if (r?.data) { this.viewingLease.set(r.data); this.cdr.detectChanges(); }
          }
        });
        this.load();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Opération impossible.' });
        this.refundingId.set(null);
      }
    });
  }

  // ── Contrat PDF ─────────────────────────────────────────────
  downloadContract(lease: Lease): void {
    this.http.get(`${this.api}/leases/${lease.id}/contract`,
      { responseType: 'blob', observe: 'response' }
    ).subscribe({
      next: (res: HttpResponse<Blob>) => {
        const url = URL.createObjectURL(res.body!);
        const a = document.createElement('a');
        a.href = url; a.download = `contrat-${lease.reference}.pdf`;
        a.click(); URL.revokeObjectURL(url);
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Téléchargement impossible.' })
    });
  }

  // ── Révision triennale ──────────────────────────────────────
  isDueForRevision(lease: any): boolean {
    if (!lease.next_revision_date) return false;
    try {
      const revDate = new Date(lease.next_revision_date + 'T00:00:00');
      const in60days = new Date();
      in60days.setDate(in60days.getDate() + 60);
      return revDate <= in60days;
    } catch { return false; }
  }

  openRevision(lease: any): void {
    this.revisionLease.set(lease);
    this.revisionPreview.set(null);
    this.revisionForm.reset();
    this.revisionOpen = true;
    this.cdr.detectChanges();
  }

  closeRevision(): void {
    this.revisionOpen = false;
    this.revisionLease.set(null);
    this.revisionPreview.set(null);
    this.cdr.detectChanges();
  }

  previewRevision(): void {
    if (this.revisionForm.invalid) return;
    this.loadingPreview.set(true);
    const id = this.revisionLease()!.id;
    this.http.post<any>(`${this.api}/leases/${id}/revise/preview`, this.revisionForm.value).subscribe({
      next: (res: any) => {
        this.revisionPreview.set(res?.data ?? null);
        this.loadingPreview.set(false);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Aperçu impossible.' });
        this.loadingPreview.set(false);
      }
    });
  }

  applyRevision(): void {
    if (!this.revisionPreview()) return;
    this.saving.set(true);
    const id = this.revisionLease()!.id;
    this.http.post<any>(`${this.api}/leases/${id}/revise`, this.revisionForm.value).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Révision appliquée', detail: res.message });
        this.saving.set(false);
        this.closeRevision();
        this.load();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' });
        this.saving.set(false);
      }
    });
  }

  // ── Export Excel ────────────────────────────────────────────
  exportExcel(): void {
    this.exporting.set(true);
    this.http.get(`${this.api}/exports/leases`, { responseType: 'blob', observe: 'response' }).subscribe({
      next: (res: HttpResponse<Blob>) => {
        const url = URL.createObjectURL(res.body!);
        const a = document.createElement('a');
        a.href = url; a.download = `baux_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click(); URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Export impossible.' });
        this.exporting.set(false);
      }
    });
  }

  // ── Helpers ─────────────────────────────────────────────────
  onSearch(e: Event): void { this.search.set((e.target as HTMLInputElement).value); }
  onFilterStatus(v: string): void { this.filterStatus.set(v); }

  formatCurrency(n: number | string): string {
    return new Intl.NumberFormat('fr-SN').format(Number(n) || 0) + ' F';
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