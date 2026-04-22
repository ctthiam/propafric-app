import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

import { InputNumberModule }   from 'primeng/inputnumber';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule }         from 'primeng/toast';
import { SkeletonModule }      from 'primeng/skeleton';
import { TooltipModule }       from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';

export interface SalaryRecord {
  id: number;
  employee_name: string;
  employee_function: string;
  contract_type: 'cdi' | 'cdd' | 'freelance' | 'stagiaire';
  base_salary: number;
  bonus: number;
  advance: number;
  deductions: number;
  net_salary: number;
  payment_date: string;
  payment_method: string;
  reference: string | null;
  period_month: number;
  period_year: number;
  notes: string | null;
}

@Component({
  selector: 'app-salaries',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    InputNumberModule, ConfirmDialogModule,
    ToastModule, SkeletonModule, TooltipModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './salaries.component.html',
  styleUrls: ['./salaries.component.scss'],
})
export class SalariesComponent implements OnInit {
  private api = `${environment.apiUrl}/agency`;

  records  = signal<SalaryRecord[]>([]);
  loading      = signal(true);
  saving       = signal(false);
  downloading  = signal<number | null>(null);

  drawerOpen    = false;
  editingRecord = signal<SalaryRecord | null>(null);

  selectedMonth = signal(new Date().getMonth() + 1);
  selectedYear  = signal(new Date().getFullYear());
  search        = signal('');

  form: FormGroup;

  contractTypes = [
    { label: 'CDI',       value: 'cdi' },
    { label: 'CDD',       value: 'cdd' },
    { label: 'Freelance', value: 'freelance' },
    { label: 'Stagiaire', value: 'stagiaire' },
  ];

  paymentMethods = [
    { label: 'Espèces',      value: 'cash' },
    { label: 'Wave',         value: 'wave' },
    { label: 'Orange Money', value: 'orange_money' },
    { label: 'Virement',     value: 'bank_transfer' },
    { label: 'Chèque',       value: 'cheque' },
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

  filteredRecords = computed(() => {
    const q = this.search().toLowerCase();
    let list = this.records();
    if (q) list = list.filter(r =>
      `${r.employee_name} ${r.employee_function}`.toLowerCase().includes(q)
    );
    return list;
  });

  totalNet = computed(() =>
    this.records().reduce((sum, r) => sum + r.net_salary, 0)
  );

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private confirm: ConfirmationService,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      employee_name:     ['', Validators.required],
      employee_function: ['', Validators.required],
      contract_type:     ['cdi', Validators.required],
      base_salary:       [null, [Validators.required, Validators.min(1)]],
      bonus:             [0],
      advance:           [0],
      deductions:        [0],
      payment_date:      [this.todayStr(), Validators.required],
      payment_method:    ['cash'],
      reference:         [''],
      period_month:      [this.selectedMonth(), Validators.required],
      period_year:       [this.selectedYear(), Validators.required],
      notes:             [''],
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    const params = `month=${this.selectedMonth()}&year=${this.selectedYear()}`;
    this.http.get<any>(`${this.api}/salaries?${params}`).subscribe({
      next: (res: any) => {
        this.records.set(Array.isArray(res?.data?.records) ? res.data.records : []);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les salaires.' });
        this.loading.set(false);
      },
    });
  }

  onPeriodChange(): void { this.load(); }
  onSearch(e: Event): void { this.search.set((e.target as HTMLInputElement).value); }

  openCreate(): void {
    this.editingRecord.set(null);
    this.form.reset({
      contract_type:  'cdi',
      bonus:          0,
      advance:        0,
      deductions:     0,
      payment_date:   this.todayStr(),
      payment_method: 'cash',
      period_month:   this.selectedMonth(),
      period_year:    this.selectedYear(),
    });
    this.form.markAsUntouched();
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  openEdit(r: SalaryRecord): void {
    this.editingRecord.set(r);
    this.form.reset({
      employee_name:     r.employee_name,
      employee_function: r.employee_function,
      contract_type:     r.contract_type,
      base_salary:       r.base_salary,
      bonus:             r.bonus,
      advance:           r.advance,
      deductions:        r.deductions,
      payment_date:      r.payment_date,
      payment_method:    r.payment_method,
      reference:         r.reference ?? '',
      period_month:      r.period_month,
      period_year:       r.period_year,
      notes:             r.notes ?? '',
    });
    this.form.markAsUntouched();
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.editingRecord.set(null);
    this.form.reset();
    this.cdr.detectChanges();
  }

  get previewNet(): number {
    const v = this.form.value;
    return Math.max(0, (v.base_salary ?? 0) + (v.bonus ?? 0) - (v.advance ?? 0) - (v.deductions ?? 0));
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    const req$ = this.editingRecord()
      ? this.http.put<any>(`${this.api}/salaries/${this.editingRecord()!.id}`, this.form.value)
      : this.http.post<any>(`${this.api}/salaries`, this.form.value);

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

  downloadSlip(r: SalaryRecord): void {
    this.downloading.set(r.id);
    this.http.get(`${this.api}/salaries/${r.id}/slip`, { responseType: 'blob', observe: 'response' }).subscribe({
      next: (res: HttpResponse<Blob>) => {
        const url = URL.createObjectURL(res.body!);
        const a   = document.createElement('a');
        const months = ['', 'Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
        a.href     = url;
        a.download = `bulletin_${r.employee_name}_${months[r.period_month]}_${r.period_year}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloading.set(null);
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de générer le bulletin.' });
        this.downloading.set(null);
      },
    });
  }

  confirmDelete(r: SalaryRecord): void {
    this.confirm.confirm({
      message: `Supprimer le salaire de <strong>${r.employee_name}</strong> ?<br><small>L'écriture comptable liée sera également supprimée.</small>`,
      header: 'Confirmer la suppression',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(r.id),
    });
  }

  private delete(id: number): void {
    this.http.delete<any>(`${this.api}/salaries/${id}`).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Supprimé', detail: res.message });
        this.load();
      },
      error: (err: any) => this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Suppression impossible.' }),
    });
  }

  contractLabel(c: string): string {
    return this.contractTypes.find(x => x.value === c)?.label ?? c;
  }

  methodLabel(m: string): string {
    return this.paymentMethods.find(x => x.value === m)?.label ?? m;
  }

  monthLabel(n: number): string {
    return this.months.find(m => m.value === n)?.label ?? String(n);
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
