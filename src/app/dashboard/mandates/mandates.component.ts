import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ToastModule }         from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule }      from 'primeng/skeleton';
import { TooltipModule }       from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-mandates',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastModule, ConfirmDialogModule, SkeletonModule, TooltipModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './mandates.component.html',
  styleUrls:  ['./mandates.component.scss'],
})
export class MandatesComponent implements OnInit {
  private api      = `${environment.apiUrl}/agency/mandates`;
  private ownersApi= `${environment.apiUrl}/agency/owners`;
  private propsApi = `${environment.apiUrl}/agency/properties`;

  mandates   = signal<any[]>([]);
  owners     = signal<any[]>([]);
  properties = signal<any[]>([]);
  loading    = signal(true);
  saving     = signal(false);
  search     = signal('');
  filterStatus = signal('');
  drawerOpen = false;
  editingMandate = signal<any>(null);
  form: FormGroup;
  todayStr = new Date().toISOString().split('T')[0];

  filteredMandates = computed(() => {
    let list = this.mandates();
    const q = this.search().toLowerCase();
    const s = this.filterStatus();
    if (q) list = list.filter((m: any) =>
      `${m.reference} ${m.owner?.first_name} ${m.owner?.last_name}`.toLowerCase().includes(q)
    );
    if (s) list = list.filter((m: any) => m.status === s);
    return list;
  });

 selectedOwnerId = signal<string>('');

    filteredProperties = computed(() => {
    const ownerId = this.selectedOwnerId();
    if (!ownerId) return [];
    return this.properties().filter((p: any) =>
        p.owner_id === +ownerId || p.owner?.id === +ownerId
    );
    });

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private toast: MessageService,
    private confirm: ConfirmationService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      owner_id:         ['', Validators.required],
      property_ids:     [[], Validators.required],
      start_date:       ['', Validators.required],
      duration_years:   [2, [Validators.required, Validators.min(1)]],
      auto_renew:       [true],
      commission_type:  ['percent', Validators.required],
      commission_rate:  [10],
      commission_fixed: [null],
      justice_insurance:[null],
      notice_months:    [3],
      notes:            [''],
      articles:         this.fb.array([]),
    });
    this.form.get('owner_id')!.valueChanges.subscribe((val) => {
    this.selectedOwnerId.set(val ?? '');
    this.form.patchValue({ property_ids: [] });
    this.cdr.detectChanges();
    });
  }

  get articles(): FormArray { return this.form.get('articles') as FormArray; }

  ngOnInit(): void {
    this.load();
    this.loadOwners();
    this.loadProperties();
  }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(this.api).subscribe({
      next: (res: any) => {
        this.mandates.set(Array.isArray(res?.data) ? res.data : []);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false),
    });
  }

  loadOwners(): void {
    this.http.get<any>(`${this.ownersApi}?per_page=100`).subscribe({
      next: (res: any) => this.owners.set(Array.isArray(res?.data) ? res.data : []),
    });
  }

  loadProperties(): void {
    this.http.get<any>(`${this.propsApi}?per_page=100`).subscribe({
      next: (res: any) => {
        const data = res?.data ?? [];
        this.properties.set(Array.isArray(data) ? data : []);
        this.cdr.detectChanges();
      },
    });
  }

  openCreate(): void {
    this.editingMandate.set(null);
    this.form.reset({
      owner_id: '',
      property_ids: [],
      duration_years: 2,
      auto_renew: true,
      commission_type: 'percent',
      commission_rate: 10,
      notice_months: 3,
      notes: '',
    });
    this.form.markAsUntouched();
    while (this.articles.length) this.articles.removeAt(0);
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  openEdit(m: any): void {
    this.editingMandate.set(m);
    this.form.patchValue({
      owner_id:          m.owner_id,
      property_ids:      m.properties?.map((p: any) => p.id) ?? [],
      start_date:        m.start_date?.split('T')[0] ?? '',
      duration_years:    m.duration_years,
      auto_renew:        m.auto_renew,
      commission_type:   m.commission_type,
      commission_rate:   m.commission_rate,
      commission_fixed:  m.commission_fixed,
      justice_insurance: m.justice_insurance,
      notice_months:     m.notice_months,
      notes:             m.notes ?? '',
    });
    this.form.markAsUntouched();
    while (this.articles.length) this.articles.removeAt(0);
    if (m.articles?.length) {
      m.articles.forEach((a: any) => this.addArticle(a.title, a.content));
    }
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.editingMandate.set(null);
    this.cdr.detectChanges();
  }

  addArticle(title = '', content = ''): void {
    this.articles.push(this.fb.group({ title: [title], content: [content] }));
    this.cdr.detectChanges();
  }

  removeArticle(i: number): void {
    this.articles.removeAt(i);
    this.cdr.detectChanges();
  }

  toggleProperty(id: number): void {
    const current: number[] = this.form.get('property_ids')!.value ?? [];
    const updated = current.includes(id)
      ? current.filter((p: number) => p !== id)
      : [...current, id];
    this.form.patchValue({ property_ids: updated });
    this.cdr.detectChanges();
  }

  isPropertySelected(id: number): boolean {
    return (this.form.get('property_ids')!.value ?? []).includes(id);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const editing = this.editingMandate();
    const payload = { ...this.form.value };
    const req$ = editing
      ? this.http.put<any>(`${this.api}/${editing.id}`, payload)
      : this.http.post<any>(this.api, payload);
    req$.subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: editing ? 'Mis à jour' : 'Créé', detail: res.message });
        this.saving.set(false);
        this.closeDrawer();
        this.load();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' });
        this.saving.set(false);
      }
    });
  }

  downloadDocument(m: any): void {
  this.http.get(`${this.api}/${m.id}/document`, { responseType: 'blob' }).subscribe({
    next: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mandat-${m.reference}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
    error: () => this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de télécharger le PDF.' })
  });
}

  confirmTerminate(m: any): void {
    this.confirm.confirm({
      message: `Résilier le mandat <strong>${m.reference}</strong> ?`,
      header: 'Confirmer la résiliation',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Résilier', rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.http.delete<any>(`${this.api}/${m.id}`).subscribe({
        next: (res: any) => {
          this.toast.add({ severity: 'success', summary: 'Résilié', detail: res.message });
          this.load();
        },
        error: () => this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible.' })
      })
    });
  }

  onSearch(e: Event): void { this.search.set((e.target as HTMLInputElement).value); }
  onFilterStatus(e: Event): void { this.filterStatus.set((e.target as HTMLSelectElement).value); }

  statusLabel(s: string): string {
    return ({ active: 'Actif', terminated: 'Résilié', suspended: 'Suspendu' } as any)[s] ?? s;
  }
  statusClass(s: string): string {
    return ({ active: 'badge-success', terminated: 'badge-danger', suspended: 'badge-gold' } as any)[s] ?? '';
  }
  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  ownerName(m: any): string {
    return m.owner ? `${m.owner.first_name} ${m.owner.last_name}` : '—';
  }
}