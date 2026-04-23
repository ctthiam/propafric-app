import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-om-expenses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastModule, SkeletonModule, TooltipModule],
  providers: [MessageService],
  templateUrl: './om-expenses.component.html',
  styleUrls: ['./om-expenses.component.scss'],
})
export class OmExpensesComponent implements OnInit {
  private api = `${environment.apiUrl}/owner-manager`;

  expenses      = signal<any[]>([]);
  properties    = signal<any[]>([]);
  loading       = signal(true);
  saving        = signal(false);
  saveSuccess   = signal(false);
  editingExpense = signal<any>(null);
  drawerOpen    = false;
  deletingId: number | null = null;
  deleting = false;

  form: FormGroup;

  categories = [
    { label: 'Réparation',    value: 'reparation' },
    { label: 'Entretien',     value: 'entretien' },
    { label: 'Gardiennage',   value: 'gardiennage' },
    { label: 'Taxe foncière', value: 'taxe' },
    { label: 'Autre',         value: 'autre' },
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      property_id:  [null, Validators.required],
      description:  ['', Validators.required],
      amount_ttc:   [0, [Validators.required, Validators.min(1)]],
      category:     ['entretien', Validators.required],
      expense_date: ['', Validators.required],
      notes:        [''],
    });
  }

  ngOnInit(): void { this.load(); this.loadProperties(); }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/expenses`).subscribe({
      next: (res: any) => { this.expenses.set(Array.isArray(res?.data) ? res.data : []); this.loading.set(false); this.cdr.detectChanges(); },
      error: () => this.loading.set(false),
    });
  }

  loadProperties(): void {
    this.http.get<any>(`${this.api}/properties`).subscribe({ next: (res: any) => this.properties.set(Array.isArray(res?.data) ? res.data : []) });
  }

  openCreate(): void {
    this.editingExpense.set(null);
    const today = new Date().toISOString().split('T')[0];
    this.form.reset({ category: 'entretien', expense_date: today, amount_ttc: 0 });
    this.saveSuccess.set(false);
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  openEdit(e: any): void {
    this.editingExpense.set(e);
    this.form.patchValue(e);
    this.form.markAsUntouched();
    this.saveSuccess.set(false);
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  closeDrawer(): void { this.drawerOpen = false; this.editingExpense.set(null); this.form.reset(); this.saveSuccess.set(false); this.cdr.detectChanges(); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const editing = this.editingExpense();
    const req$ = editing
      ? this.http.put<any>(`${this.api}/expenses/${editing.id}`, this.form.value)
      : this.http.post<any>(`${this.api}/expenses`, this.form.value);
    req$.subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Succès', detail: res.message });
        this.saving.set(false); this.saveSuccess.set(true);
        setTimeout(() => { this.saveSuccess.set(false); this.closeDrawer(); this.load(); }, 1500);
        this.cdr.detectChanges();
      },
      error: (err: any) => { this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' }); this.saving.set(false); }
    });
  }

  confirmDelete(id: number): void { this.deletingId = id; this.cdr.detectChanges(); }
  cancelDelete(): void { this.deletingId = null; this.cdr.detectChanges(); }

  doDelete(): void {
    if (!this.deletingId) return;
    this.deleting = true;
    this.http.delete<any>(`${this.api}/expenses/${this.deletingId}`).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Supprimée', detail: res.message });
        this.deletingId = null; this.deleting = false; this.load(); this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Impossible de supprimer.' });
        this.deletingId = null; this.deleting = false; this.cdr.detectChanges();
      },
    });
  }

  categoryLabel(c: string): string {
    return this.categories.find(x => x.value === c)?.label ?? c;
  }
  formatCurrency(n: any): string { return new Intl.NumberFormat('fr-SN').format(Number(n) || 0) + ' F'; }
}
