import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { DropdownModule }      from 'primeng/dropdown';
import { InputNumberModule }   from 'primeng/inputnumber';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule }         from 'primeng/toast';
import { SkeletonModule }      from 'primeng/skeleton';
import { TooltipModule }       from 'primeng/tooltip';
import { CalendarModule }      from 'primeng/calendar';
import { CheckboxModule }      from 'primeng/checkbox';
import { ConfirmationService, MessageService } from 'primeng/api';

export interface Contractor {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  specialty: string | null;
  id_type: string | null;    // ← ajouté
  id_number: string | null;  // ← ajouté
}

export interface Expense {
  id: number;
  category: string;
  description: string;
  amount_ht: number;
  vat_rate: number;
  vat_amount: number;
  amount_ttc: number;
  charged_to_owner: boolean;
  expense_date: string;
  status: string;
  notes: string | null;
  property?: { id: number; name: string; reference: string; address: string; };
  contractor?: Contractor | null;
}

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    DropdownModule, InputNumberModule, ConfirmDialogModule,
    ToastModule, SkeletonModule, TooltipModule, CalendarModule, CheckboxModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './expenses.component.html',
  styleUrls: ['./expenses.component.scss'],
})
export class ExpensesComponent implements OnInit {
  private api = `${environment.apiUrl}/agency`;
  exporting = signal(false);
  today = new Date();

  expenses       = signal<Expense[]>([]);
  contractors    = signal<Contractor[]>([]);
  properties     = signal<{ id: number; name: string; reference: string }[]>([]);
  loading        = signal(true);
  saving         = signal(false);
  editingExpense = signal<Expense | null>(null);
  editingVendor  = signal<Contractor | null>(null);
  activeTab      = signal<'expenses' | 'vendors'>('expenses');
  search         = signal('');
  filterCat      = signal('');
  drawerOpen     = false;
  vendorDrawer   = false;

  filteredExpenses = computed(() => {
    let list = this.expenses();
    const q = this.search().toLowerCase();
    const c = this.filterCat();
    if (q) list = list.filter(e =>
      `${e.description} ${e.property?.name} ${e.contractor?.name}`.toLowerCase().includes(q)
    );
    if (c) list = list.filter(e => e.category === c);
    return list;
  });

  filteredVendors = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) return this.contractors();
    return this.contractors().filter(v =>
      `${v.name} ${v.specialty} ${v.phone}`.toLowerCase().includes(q)
    );
  });

  totalExpenses = computed(() =>
    this.filteredExpenses().reduce((sum, e) => sum + (e.amount_ttc ?? 0), 0)
  );

  expenseForm: FormGroup;
  vendorForm:  FormGroup;

  categories = [
    { label: 'Travaux / Réparation', value: 'travaux' },
    { label: 'Entretien',            value: 'entretien' },
    { label: 'Gardiennage',          value: 'gardiennage' },
    { label: 'Eau / Électricité',    value: 'utilities' },
    { label: 'Assurance',            value: 'assurance' },
    { label: 'Taxe / Impôt',         value: 'taxe' },
    { label: 'Commission',           value: 'commission' },
    { label: 'Autre',                value: 'autre' },
  ];

  categoryFilterOptions = [
    { label: 'Toutes les catégories', value: '' },
    ...this.categories,
  ];

  paymentMethods = [
    { label: 'Espèces',      value: 'cash' },
    { label: 'Virement',     value: 'virement' },
    { label: 'Wave',         value: 'wave' },
    { label: 'Orange Money', value: 'orange_money' },
    { label: 'Chèque',       value: 'cheque' },
    { label: 'Autre',        value: 'autre' },
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private confirm: ConfirmationService,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
  ) {
    this.expenseForm = this.fb.group({
      property_id:      [null],
      contractor_id:    [null],
      description:      ['', Validators.required],
      category:         ['entretien', Validators.required],
      amount_ht:        [null, [Validators.required, Validators.min(1)]],
      vat_rate:         [18],
      expense_date:     [new Date(), Validators.required],
      charged_to_owner: [true],
      notes:            [''],
    });

    this.vendorForm = this.fb.group({
      name:      ['', Validators.required],
      phone:     [''],
      email:     [''],
      specialty: ['autre'],
      address:   [''],
      id_type:   [''],      // ← ajouté
      id_number: [''],
      notes:     [''],
    });
  }

  ngOnInit(): void {
    // Détecter la route pour sélectionner le bon onglet
    const url = this.route.snapshot.routeConfig?.path ?? '';
    if (url.includes('prestataires')) {
      this.activeTab.set('vendors');
    }
    this.load();
    this.loadContractors();
    this.loadProperties();
  }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/expenses`).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.expenses.set(list);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les dépenses.' });
        this.loading.set(false);
      }
    });
  }

  loadContractors(): void {
    this.http.get<any>(`${this.api}/contractors`).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.contractors.set(list);
        this.cdr.detectChanges();
      }
    });
  }

  loadProperties(): void {
    this.http.get<any>(`${this.api}/properties`).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.properties.set(list);
      }
    });
  }

  get propertyOptions() {
    return [
      { label: 'Aucun bien lié', value: null },
      ...this.properties().map(p => ({ label: `${p.reference} — ${p.name}`, value: p.id })),
    ];
  }

  get contractorOptions() {
    return [
      { label: 'Aucun prestataire', value: null },
      ...this.contractors().map(v => ({ label: v.name, value: v.id })),
    ];
  }

  // ── Dépenses ──
  openCreateExpense(): void {
    this.editingExpense.set(null);
    this.expenseForm.reset({ category: 'entretien', vat_rate: 18, expense_date: new Date(), charged_to_owner: true });
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  openEditExpense(e: Expense): void {
    this.editingExpense.set(e);
    this.expenseForm.patchValue({
      ...e,
      property_id:   e.property?.id ?? null,
      contractor_id: e.contractor?.id ?? null,
      expense_date:  new Date(e.expense_date),
    });
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  closeExpenseDrawer(): void {
    this.drawerOpen = false;
    this.editingExpense.set(null);
    this.expenseForm.reset();
    this.cdr.detectChanges();
  }

  saveExpense(): void {
    if (this.expenseForm.invalid) { this.expenseForm.markAllAsTouched(); return; }
    this.saving.set(true);

    const raw = this.expenseForm.value;
    const payload = { ...raw, expense_date: this.formatDate(raw.expense_date) };
    const editing = this.editingExpense();

    const req$ = editing
      ? this.http.put<any>(`${this.api}/expenses/${editing.id}`, payload)
      : this.http.post<any>(`${this.api}/expenses`, payload);

    req$.subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Succès', detail: res.message });
        this.saving.set(false);
        this.closeExpenseDrawer();
        this.load();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' });
        this.saving.set(false);
      }
    });
  }

  confirmDeleteExpense(e: Expense): void {
    this.confirm.confirm({
      message: `Supprimer la dépense <strong>${e.description}</strong> ?`,
      header: 'Confirmer la suppression',
      icon: 'pi pi-trash',
      acceptLabel: 'Supprimer', rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.http.delete<any>(`${this.api}/expenses/${e.id}`).subscribe({
        next: (res: any) => { this.toast.add({ severity: 'success', summary: 'Supprimé', detail: res.message }); this.load(); },
        error: () => this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible.' })
      })
    });
  }

  // ── Prestataires ──
 openCreateVendor(): void {
  this.editingVendor.set(null);
  this.vendorForm.patchValue({
    name:      '',
    phone:     '',
    email:     '',
    specialty: 'autre',
    address:   '',
    id_type:   '',
    id_number: '',
    notes:     '',
  });
  this.vendorForm.markAsPristine();
  this.vendorForm.markAsUntouched();
  this.vendorDrawer = true;
  this.cdr.detectChanges();
}

  openEditVendor(v: Contractor): void {
    this.editingVendor.set(v);
    this.vendorForm.patchValue(v);
    this.vendorDrawer = true;
    this.cdr.detectChanges();
  }

  closeVendorDrawer(): void {
    this.vendorDrawer = false;
    this.editingVendor.set(null);
    this.vendorForm.reset();
    this.cdr.detectChanges();
  }

  saveVendor(): void {
    if (this.vendorForm.invalid) { this.vendorForm.markAllAsTouched(); return; }
    this.saving.set(true);

    const editing = this.editingVendor();
    const req$ = editing
      ? this.http.put<any>(`${this.api}/contractors/${editing.id}`, this.vendorForm.value)
      : this.http.post<any>(`${this.api}/contractors`, this.vendorForm.value);

    req$.subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Succès', detail: res.message });
        this.saving.set(false);
        this.closeVendorDrawer();
        this.loadContractors();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' });
        this.saving.set(false);
      }
    });
  }

  confirmDeleteVendor(v: Contractor): void {
    this.confirm.confirm({
      message: `Supprimer le prestataire <strong>${v.name}</strong> ?`,
      header: 'Confirmer la suppression',
      icon: 'pi pi-trash',
      acceptLabel: 'Supprimer', rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.http.delete<any>(`${this.api}/contractors/${v.id}`).subscribe({
        next: (res: any) => { this.toast.add({ severity: 'success', summary: 'Supprimé', detail: res.message }); this.loadContractors(); },
        error: () => this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible.' })
      })
    });
  }

  onSearch(e: Event): void { this.search.set((e.target as HTMLInputElement).value); }
  onFilterCat(v: string): void { this.filterCat.set(v); }

  formatDate(d: Date | string): string {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toISOString().split('T')[0];
  }

  formatDateDisplay(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatCurrency(n: number): string { return new Intl.NumberFormat('fr-SN').format(n ?? 0) + ' F'; }

  categoryLabel(c: string): string {
    return this.categories.find(x => x.value === c)?.label ?? c;
  }

  categoryClass(c: string): string {
    const map: Record<string, string> = {
      travaux: 'badge-danger', entretien: 'badge-warning',
      assurance: 'badge-info', taxe: 'badge-neutral',
      utilities: 'badge-info', commission: 'badge-warning',
    };
    return map[c] ?? 'badge-neutral';
  }

  statusLabel(s: string): string {
    return ({ pending: 'En attente', approved: 'Approuvé', rejected: 'Rejeté', paid: 'Payé' } as any)[s] ?? s;
  }

  statusClass(s: string): string {
    return ({ approved: 'badge-success', pending: 'badge-warning', rejected: 'badge-danger', paid: 'badge-success' } as any)[s] ?? 'badge-neutral';
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
  this.http.get(`${this.api}/exports/expenses`, {
    responseType: 'blob',
    observe: 'response',
  }).subscribe({
    next: (res: HttpResponse<Blob>) => {
      this.triggerDownload(res.body!, `depenses_${this.todayString()}.xlsx`);
      this.exporting.set(false);
    },
    error: () => {
      this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Export impossible.' });
      this.exporting.set(false);
    }
  });
}
}