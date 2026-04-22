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
import { ConfirmationService, MessageService } from 'primeng/api';

export interface AccountingEntry {
  id: number;
  date: string;
  label: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  payment_method: string | null;
  reference: string | null;
  depositor: string | null;
  property: { id: number; name: string } | null;
  tenant: { id: number; full_name: string } | null;
  notes: string | null;
  is_auto: boolean;
  running_balance?: number;
}

export interface AccountingSummary {
  total_income: number;
  total_expense: number;
  balance: number;
}

export interface PropertyOption { id: number; name: string; reference: string; }
export interface TenantOption   { id: number; full_name: string; }

@Component({
  selector: 'app-accounting',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    DropdownModule, InputNumberModule, ConfirmDialogModule,
    ToastModule, SkeletonModule, TooltipModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './accounting.component.html',
  styleUrls: ['./accounting.component.scss'],
})
export class AccountingComponent implements OnInit {
  private api = `${environment.apiUrl}/agency`;

  entries    = signal<AccountingEntry[]>([]);
  summary    = signal<AccountingSummary>({ total_income: 0, total_expense: 0, balance: 0 });
  properties = signal<PropertyOption[]>([]);
  tenants    = signal<TenantOption[]>([]);

  loading    = signal(true);
  saving     = signal(false);
  exporting  = signal(false);

  activeTab    = signal<'ledger' | 'income' | 'expense' | 'charges' | 'recap'>('ledger');
  search       = signal('');
  filterType   = signal('');
  filterCategory = signal('');
  dailyView    = signal(false);

  selectedMonth = signal(new Date().getMonth() + 1);
  selectedYear  = signal(new Date().getFullYear());

  drawerOpen     = false;
  editingEntry   = signal<AccountingEntry | null>(null);

  form: FormGroup;

  incomeCategories = [
    { label: 'Loyer',           value: 'rent' },
    { label: 'Dépôt de garantie', value: 'deposit' },
    { label: 'Autre revenu',    value: 'other_income' },
  ];

  expenseCategories = [
    { label: 'Salaire',           value: 'salary' },
    { label: 'Loyer bureau',      value: 'rent_office' },
    { label: 'Transport',         value: 'transport' },
    { label: 'Matériaux',         value: 'materials' },
    { label: 'Électricité / Eau', value: 'utilities' },
    { label: 'Fournitures',       value: 'supplies' },
    { label: 'Marketing',         value: 'marketing' },
    { label: 'Maintenance',       value: 'maintenance' },
    { label: 'Honoraires',        value: 'honoraires' },
    { label: 'Taxes',             value: 'taxes' },
    { label: 'Versement proprio', value: 'owner_payment' },
    { label: 'Restauration',      value: 'restaurant' },
    { label: 'Autre dépense',     value: 'other_expense' },
  ];

  paymentMethods = [
    { label: 'Espèces',        value: 'cash' },
    { label: 'Wave',           value: 'wave' },
    { label: 'Orange Money',   value: 'orange_money' },
    { label: 'Virement',       value: 'bank_transfer' },
    { label: 'Chèque',         value: 'cheque' },
    { label: 'Autre',          value: 'autre' },
  ];

  months = [
    { label: 'Janvier', value: 1 }, { label: 'Février', value: 2 },
    { label: 'Mars', value: 3 },    { label: 'Avril', value: 4 },
    { label: 'Mai', value: 5 },     { label: 'Juin', value: 6 },
    { label: 'Juillet', value: 7 }, { label: 'Août', value: 8 },
    { label: 'Septembre', value: 9 },{ label: 'Octobre', value: 10 },
    { label: 'Novembre', value: 11 },{ label: 'Décembre', value: 12 },
  ];

  years = Array.from({ length: 5 }, (_, i) => {
    const y = new Date().getFullYear() - 2 + i;
    return { label: String(y), value: y };
  });

  get currentCategories() {
    const t = this.form.get('type')?.value;
    return t === 'income' ? this.incomeCategories : this.expenseCategories;
  }

  get allCategories() {
    return [...this.incomeCategories, ...this.expenseCategories];
  }

  // Catégories considérées comme "charges fixes"
  readonly fixedChargeCategories = ['salary', 'rent_office', 'utilities', 'supplies', 'transport', 'marketing', 'honoraires', 'taxes'];

  // Entrées avec solde cumulé calculé côté frontend
  entriesWithBalance = computed(() => {
    const sorted = [...this.entries()].sort((a, b) =>
      a.date.localeCompare(b.date) || a.id - b.id
    );
    let running = 0;
    return sorted.map(e => {
      running += e.type === 'income' ? e.amount : -e.amount;
      return { ...e, running_balance: running };
    }).reverse(); // Plus récent en premier
  });

  filteredEntries = computed(() => {
    let list = this.entriesWithBalance();
    const q  = this.search().toLowerCase();
    const ft = this.filterType();
    const fc = this.filterCategory();
    const tab = this.activeTab();

    if (tab === 'income')  list = list.filter(e => e.type === 'income');
    if (tab === 'expense') list = list.filter(e => e.type === 'expense');
    if (tab === 'charges') list = list.filter(e => e.type === 'expense' && this.fixedChargeCategories.includes(e.category));
    if (ft) list = list.filter(e => e.type === ft);
    if (fc) list = list.filter(e => e.category === fc);
    if (q)  list = list.filter(e =>
      `${e.label} ${e.depositor ?? ''} ${e.reference ?? ''} ${e.property?.name ?? ''}`.toLowerCase().includes(q)
    );
    return list;
  });

  recapByCategory = computed(() => {
    const map = new Map<string, { label: string; type: string; total: number; count: number }>();
    for (const e of this.entries()) {
      const cat = this.categoryLabel(e.category);
      if (!map.has(e.category)) map.set(e.category, { label: cat, type: e.type, total: 0, count: 0 });
      const entry = map.get(e.category)!;
      entry.total += e.amount;
      entry.count++;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  });

  dailyTotals = computed(() => {
    const sorted = [...this.entries()].sort((a, b) =>
      a.date.localeCompare(b.date) || a.id - b.id
    );
    const map = new Map<string, { date: string; income: number; expense: number }>();
    for (const e of sorted) {
      if (!map.has(e.date)) map.set(e.date, { date: e.date, income: 0, expense: 0 });
      const day = map.get(e.date)!;
      if (e.type === 'income') day.income += e.amount;
      else day.expense += e.amount;
    }
    let running = 0;
    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => {
        running += d.income - d.expense;
        return { ...d, balance: d.income - d.expense, running_balance: running };
      })
      .reverse();
  });

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private confirm: ConfirmationService,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      date:           [this.todayStr(), Validators.required],
      label:          ['', Validators.required],
      type:           ['expense', Validators.required],
      category:       ['', Validators.required],
      amount:         [null, [Validators.required, Validators.min(1)]],
      payment_method: ['cash'],
      reference:      [''],
      depositor:      [''],
      property_id:    [null],
      tenant_id:      [null],
      notes:          [''],
    });
  }

  ngOnInit(): void {
    this.load();
    this.loadProperties();
    this.loadTenants();
  }

  load(): void {
    this.loading.set(true);
    const params = `month=${this.selectedMonth()}&year=${this.selectedYear()}`;
    this.http.get<any>(`${this.api}/accounting?${params}`).subscribe({
      next: (res: any) => {
        this.entries.set(res?.data?.entries ?? []);
        this.summary.set(res?.data?.summary ?? { total_income: 0, total_expense: 0, balance: 0 });
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger la comptabilité.' });
        this.loading.set(false);
      },
    });
  }

  loadProperties(): void {
    this.http.get<any>(`${this.api}/properties?per_page=500`).subscribe({
      next: (res: any) => this.properties.set(Array.isArray(res?.data) ? res.data : []),
    });
  }

  loadTenants(): void {
    this.http.get<any>(`${this.api}/tenants?per_page=500`).subscribe({
      next: (res: any) => this.tenants.set(Array.isArray(res?.data) ? res.data : []),
    });
  }

  onPeriodChange(): void { this.load(); }

  get propertyOptions() {
    return this.properties().map(p => ({ label: `${p.name} (${p.reference})`, value: p.id }));
  }

  get tenantOptions() {
    return this.tenants().map(t => ({ label: t.full_name, value: t.id }));
  }

  openCreate(): void {
    this.editingEntry.set(null);
    this.form.reset({ date: this.todayStr(), type: 'expense', payment_method: 'cash' });
    this.form.markAsUntouched();
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  openEdit(e: AccountingEntry): void {
    if (e.is_auto) return;
    this.editingEntry.set(e);
    this.form.reset({
      date:           e.date,
      label:          e.label,
      type:           e.type,
      category:       e.category,
      amount:         e.amount,
      payment_method: e.payment_method ?? 'cash',
      reference:      e.reference ?? '',
      depositor:      e.depositor ?? '',
      property_id:    e.property?.id ?? null,
      tenant_id:      e.tenant?.id   ?? null,
      notes:          e.notes ?? '',
    });
    this.form.markAsUntouched();
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.editingEntry.set(null);
    this.form.reset();
    this.cdr.detectChanges();
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    const payload = { ...this.form.value };

    const req$ = this.editingEntry()
      ? this.http.put<any>(`${this.api}/accounting/${this.editingEntry()!.id}`, payload)
      : this.http.post<any>(`${this.api}/accounting`, payload);

    req$.subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Enregistré', detail: res.message });
        this.saving.set(false);
        this.closeDrawer();
        this.load();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Une erreur est survenue.' });
        this.saving.set(false);
      },
    });
  }

  confirmDelete(e: AccountingEntry): void {
    this.confirm.confirm({
      message: `Supprimer <strong>${e.label}</strong> ?`,
      header: 'Confirmer la suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(e.id),
    });
  }

  private delete(id: number): void {
    this.http.delete<any>(`${this.api}/accounting/${id}`).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Supprimé', detail: res.message });
        this.load();
      },
      error: (err: any) => this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Suppression impossible.' }),
    });
  }

  exportExcel(): void {
    this.exporting.set(true);
    const params = `month=${this.selectedMonth()}&year=${this.selectedYear()}`;
    this.http.get(`${this.api}/accounting/export?${params}`, { responseType: 'blob', observe: 'response' }).subscribe({
      next: (res: HttpResponse<Blob>) => {
        const url = URL.createObjectURL(res.body!);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grand_livre_${this.selectedYear()}_${String(this.selectedMonth()).padStart(2, '0')}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Export impossible.' });
        this.exporting.set(false);
      },
    });
  }

  onSearch(e: Event): void { this.search.set((e.target as HTMLInputElement).value); }
  onFilterType(v: string): void { this.filterType.set(v); }
  onFilterCategory(v: string): void { this.filterCategory.set(v); }
  toggleDailyView(): void { this.dailyView.set(!this.dailyView()); }

  categoryLabel(c: string): string {
    return this.allCategories.find(x => x.value === c)?.label ?? c;
  }

  methodLabel(m: string): string {
    return this.paymentMethods.find(x => x.value === m)?.label ?? m;
  }

  formatCurrency(n: number): string {
    return new Intl.NumberFormat('fr-SN').format(Math.round(n)) + ' F';
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private todayStr(): string {
    return new Date().toISOString().split('T')[0];
  }
}
