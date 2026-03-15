import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule }         from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule }      from 'primeng/skeleton';
import { TooltipModule }       from 'primeng/tooltip';
import { DropdownModule }      from 'primeng/dropdown';
import { environment } from '../../../environments/environment';

interface PropertyTax {
  id: number;
  tax_year: number;
  tax_type: string;
  amount: number;
  due_date: string | null;
  status: string;
  paid_at: string | null;
  payment_reference: string | null;
  property: { id: number; name: string; reference: string; address: string } | null;
}

interface Property { id: number; name: string; reference: string; }

@Component({
  selector: 'app-property-taxes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastModule, ConfirmDialogModule, SkeletonModule, TooltipModule, DropdownModule],
  providers: [ConfirmationService, MessageService],
  templateUrl: './property-taxes.component.html',
  styleUrls:  ['./property-taxes.component.scss'],
})
export class PropertyTaxesComponent implements OnInit {
  private api = `${environment.apiUrl}/agency`;

  taxes       = signal<PropertyTax[]>([]);
  properties  = signal<Property[]>([]);
  loading     = signal(true);
  saving      = signal(false);

  drawerOpen  = false;
  payOpen     = false;
  editingTax  = signal<PropertyTax | null>(null);

  filterStatus = signal('');
  filterYear   = signal('');
  search       = signal('');

  filteredTaxes = computed(() => {
    let list = this.taxes();
    const s = this.filterStatus();
    const y = this.filterYear();
    const q = this.search().toLowerCase();
    if (s) list = list.filter(t => t.status === s);
    if (y) list = list.filter(t => String(t.tax_year) === y);
    if (q) list = list.filter(t =>
      (t.property?.name ?? '').toLowerCase().includes(q) ||
      t.tax_type.toLowerCase().includes(q)
    );
    return list;
  });

  years = computed(() =>
    [...new Set(this.taxes().map(t => t.tax_year))].sort((a, b) => b - a)
  );

  get totalPending(): number { return this.taxes().filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0); }
  get totalPaid():    number { return this.taxes().filter(t => t.status === 'paid').reduce((s, t) => s + t.amount, 0); }
  get countOverdue(): number { return this.taxes().filter(t => t.status === 'overdue').length; }

  form:    FormGroup;
  payForm: FormGroup;

  propertyOptions = computed(() =>
    this.properties().map(p => ({ label: `${p.name ?? p.reference} (${p.reference})`, value: p.id }))
  );

  currentYear = new Date().getFullYear();
  yearOptions = Array.from({ length: 5 }, (_, i) => ({
    label: String(this.currentYear - i),
    value: this.currentYear - i,
  }));

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private confirm: ConfirmationService,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      property_id: ['', Validators.required],
      tax_year:    [this.currentYear, Validators.required],
      tax_type:    ['Taxe foncière', Validators.required],
      amount:      ['', [Validators.required, Validators.min(1)]],
      due_date:    [''],
    });
    this.payForm = this.fb.group({
      paid_at:           [new Date().toISOString().split('T')[0]],
      payment_reference: [''],
    });
  }

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.loading.set(true);
    Promise.all([
      this.http.get<any>(`${this.api}/property-taxes`).toPromise(),
      this.http.get<any>(`${this.api}/properties`).toPromise(),
    ]).then(([taxes, props]) => {
      this.taxes.set(Array.isArray(taxes?.data) ? taxes.data : []);
      this.properties.set(Array.isArray(props?.data) ? props.data : []);
      this.loading.set(false);
      this.cdr.detectChanges();
    }).catch(() => {
      this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Chargement impossible.' });
      this.loading.set(false);
    });
  }

  openCreate(): void {
    this.editingTax.set(null);
    this.form.reset({ tax_year: this.currentYear, tax_type: 'Taxe foncière' });
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.payOpen    = false;
    this.editingTax.set(null);
    this.cdr.detectChanges();
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const payload = { ...this.form.value };
    if (!payload.due_date) delete payload.due_date;

    this.http.post<any>(`${this.api}/property-taxes`, payload).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Enregistré', detail: res.message });
        this.saving.set(false);
        this.closeDrawer();
        this.loadAll();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' });
        this.saving.set(false);
      }
    });
  }

  openPay(t: PropertyTax): void {
    this.editingTax.set(t);
    this.payForm.reset({ paid_at: new Date().toISOString().split('T')[0], payment_reference: '' });
    this.payOpen = true;
    this.cdr.detectChanges();
  }

  savePay(): void {
    this.saving.set(true);
    const id = this.editingTax()!.id;
    this.http.put<any>(`${this.api}/property-taxes/${id}/pay`, this.payForm.value).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Payé', detail: res.message });
        this.saving.set(false);
        this.closeDrawer();
        this.loadAll();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' });
        this.saving.set(false);
      }
    });
  }

  confirmDelete(t: PropertyTax): void {
    this.confirm.confirm({
      message: `Supprimer l'impôt <strong>${t.tax_type} ${t.tax_year}</strong> ?`,
      header: 'Confirmer',
      icon: 'pi pi-trash',
      acceptLabel: 'Supprimer', rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.http.delete<any>(`${this.api}/property-taxes/${t.id}`).subscribe({
        next: (res: any) => { this.toast.add({ severity: 'success', summary: 'Supprimé', detail: res.message }); this.loadAll(); },
        error: (err: any) => this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Impossible.' })
      })
    });
  }

  onSearch(e: Event):        void { this.search.set((e.target as HTMLInputElement).value); }
  onFilterStatus(e: Event):  void { this.filterStatus.set((e.target as HTMLSelectElement).value); }
  onFilterYear(e: Event):    void { this.filterYear.set((e.target as HTMLSelectElement).value); }

  statusLabel(s: string): string {
    return ({ pending: 'En attente', paid: 'Payé', overdue: 'En retard' } as any)[s] ?? s;
  }
  statusClass(s: string): string {
    return ({ pending: 'badge-gold', paid: 'badge-success', overdue: 'badge-danger' } as any)[s] ?? '';
  }
  formatDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  formatCurrency(n: number): string {
    return new Intl.NumberFormat('fr-SN').format(n) + ' F';
  }
}