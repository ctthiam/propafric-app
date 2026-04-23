import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-om-properties',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastModule, SkeletonModule, TooltipModule],
  providers: [MessageService],
  templateUrl: './om-properties.component.html',
  styleUrls: ['./om-properties.component.scss'],
})
export class OmPropertiesComponent implements OnInit {
  private api = `${environment.apiUrl}/owner-manager/properties`;

  properties    = signal<any[]>([]);
  loading       = signal(true);
  saving        = signal(false);
  saveSuccess   = signal(false);
  editingProp   = signal<any>(null);
  search        = signal('');
  drawerOpen    = false;
  deletingId: number | null = null;
  deleting = false;

  filteredProperties = computed(() => {
    const q = this.search().toLowerCase();
    return this.properties().filter(p =>
      `${p.name} ${p.reference} ${p.address}`.toLowerCase().includes(q)
    );
  });

  form: FormGroup;

  propertyTypes = [
    { label: 'Appartement', value: 'appartement' },
    { label: 'Villa',       value: 'villa_simple' },
    { label: 'Studio',      value: 'studio' },
    { label: 'F2',          value: 'f2' },
    { label: 'F3',          value: 'f3' },
    { label: 'F4',          value: 'f4' },
    { label: 'Bureau',      value: 'bureau' },
    { label: 'Boutique',    value: 'boutique' },
    { label: 'Immeuble R+1', value: 'immeuble_r1' },
    { label: 'Immeuble R+2', value: 'immeuble_r2' },
    { label: 'Autre',       value: 'autre' },
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      name:        ['', Validators.required],
      type:        ['appartement', Validators.required],
      address:     ['', Validators.required],
      city:        ['', Validators.required],
      zone:        [''],
      is_furnished:[false],
      description: [''],
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(this.api).subscribe({
      next: (res: any) => {
        this.properties.set(Array.isArray(res?.data) ? res.data : []);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editingProp.set(null);
    this.form.reset({ type: 'appartement', is_furnished: false });
    this.saveSuccess.set(false);
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  openEdit(p: any): void {
    this.editingProp.set(p);
    this.form.patchValue(p);
    this.form.markAsUntouched();
    this.saveSuccess.set(false);
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.editingProp.set(null);
    this.form.reset();
    this.saveSuccess.set(false);
    this.cdr.detectChanges();
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const editing = this.editingProp();
    const req$ = editing
      ? this.http.put<any>(`${this.api}/${editing.id}`, this.form.value)
      : this.http.post<any>(this.api, this.form.value);
    req$.subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Succès', detail: res.message });
        this.saving.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => { this.saveSuccess.set(false); this.closeDrawer(); this.load(); }, 1500);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' });
        this.saving.set(false);
      }
    });
  }

  confirmDelete(id: number): void { this.deletingId = id; this.cdr.detectChanges(); }
  cancelDelete(): void { this.deletingId = null; this.cdr.detectChanges(); }

  doDelete(): void {
    if (!this.deletingId) return;
    this.deleting = true;
    this.http.delete<any>(`${this.api}/${this.deletingId}`).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Supprimé', detail: res.message });
        this.deletingId = null; this.deleting = false; this.load(); this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Impossible de supprimer.' });
        this.deletingId = null; this.deleting = false; this.cdr.detectChanges();
      },
    });
  }

  onSearch(e: Event): void { this.search.set((e.target as HTMLInputElement).value); }
  statusLabel(s: string): string { return ({ available: 'Disponible', occupied: 'Occupé', maintenance: 'Maintenance', archived: 'Archivé' } as any)[s] ?? s; }
  statusClass(s: string): string { return ({ available: 'badge-success', occupied: 'badge-warning', maintenance: 'badge-neutral', archived: 'badge-danger' } as any)[s] ?? ''; }
}