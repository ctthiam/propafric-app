import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

import { ButtonModule }        from 'primeng/button';
import { DropdownModule }      from 'primeng/dropdown';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule }         from 'primeng/toast';
import { SkeletonModule }      from 'primeng/skeleton';
import { TooltipModule }       from 'primeng/tooltip';
import { CheckboxModule }      from 'primeng/checkbox';
import { ConfirmationService, MessageService } from 'primeng/api';

export interface Owner {
  id: number;
  full_name: string;
  phone: string;
}

export interface Property {
  id: number;
  reference: string;
  name: string;
  type: string;
  address: string;
  city: string;
  zone: string | null;
  area: string | null;
  status: 'available' | 'occupied' | 'maintenance';
  is_furnished: boolean;
  owner?: Owner;
  owner_id?: number;
  active_lease?: any;
  units_count: number;
}

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    ButtonModule, DropdownModule, ConfirmDialogModule,
    ToastModule, SkeletonModule, TooltipModule, CheckboxModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './properties.component.html',
  styleUrls: ['./properties.component.scss'],
})
export class PropertiesComponent implements OnInit {
  private api = `${environment.apiUrl}/agency`;

  properties   = signal<Property[]>([]);
  owners       = signal<Owner[]>([]);
  loading      = signal(true);
  saving       = signal(false);
  editingProp  = signal<Property | null>(null);
  search       = signal('');
  filterStatus = signal('');
  drawerOpen   = false;

  filteredProperties = computed(() => {
    let list = this.properties();
    const q = this.search().toLowerCase();
    const s = this.filterStatus();
    if (q) list = list.filter(p =>
      `${p.name} ${p.reference} ${p.address} ${p.city}`.toLowerCase().includes(q)
    );
    if (s) list = list.filter(p => p.status === s);
    return list;
  });

  form: FormGroup;

  propertyTypes = [
    { label: 'Appartement', value: 'appartement' },
    { label: 'Villa',       value: 'villa' },
    { label: 'Bureau',      value: 'bureau' },
    { label: 'Commerce',    value: 'commerce' },
    { label: 'Immeuble',    value: 'immeuble' },
    { label: 'Terrain',     value: 'terrain' },
    { label: 'Autre',       value: 'autre' },
  ];

  statusOptions = [
    { label: 'Disponible',  value: 'available' },
    { label: 'Occupé',      value: 'occupied' },
    { label: 'Maintenance', value: 'maintenance' },
  ];

  filterStatusOptions = [
    { label: 'Tous les statuts', value: '' },
    { label: 'Disponible',       value: 'available' },
    { label: 'Occupé',           value: 'occupied' },
    { label: 'Maintenance',      value: 'maintenance' },
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private confirm: ConfirmationService,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      owner_id:    [null, Validators.required],
      name:        ['', Validators.required],
      type:        ['appartement', Validators.required],
      address:     ['', Validators.required],
      city:        ['Dakar', Validators.required],
      zone:        [''],
      status:      ['available', Validators.required],
      is_furnished:[false],
      description: [''],
    });
  }

  ngOnInit(): void {
    this.loadOwners();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/properties`).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.properties.set(list);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les biens.' });
        this.loading.set(false);
      }
    });
  }

  loadOwners(): void {
    this.http.get<any>(`${this.api}/owners`).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.owners.set(list);
      }
    });
  }

  get ownerOptions() {
    return this.owners().map(o => ({
      label: o.full_name,
      value: o.id,
    }));
  }

  openCreate(): void {
    this.editingProp.set(null);
    this.form.reset({ type: 'appartement', status: 'available', city: 'Dakar', is_furnished: false });
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  openEdit(p: Property): void {
    this.editingProp.set(p);
    this.form.patchValue({ ...p, owner_id: p.owner?.id ?? p.owner_id });
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.editingProp.set(null);
    this.form.reset();
    this.cdr.detectChanges();
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    const editing = this.editingProp();
    const req$ = editing
      ? this.http.put<any>(`${this.api}/properties/${editing.id}`, this.form.value)
      : this.http.post<any>(`${this.api}/properties`, this.form.value);

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

  confirmDelete(p: Property): void {
    this.confirm.confirm({
      message: `Supprimer le bien <strong>${p.name}</strong> (${p.reference}) ?`,
      header: 'Confirmer la suppression',
      icon: 'pi pi-trash',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(p.id),
    });
  }

  private delete(id: number): void {
    this.http.delete<any>(`${this.api}/properties/${id}`).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Supprimé', detail: res.message });
        this.load();
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible.' })
    });
  }

  onSearch(e: Event): void { this.search.set((e.target as HTMLInputElement).value); }
  onFilterStatus(value: string): void { this.filterStatus.set(value); }

  statusLabel(s: string): string {
    return ({ available: 'Disponible', occupied: 'Occupé', maintenance: 'Maintenance' } as any)[s] ?? s;
  }

  statusClass(s: string): string {
    return ({ available: 'badge-success', occupied: 'badge-info', maintenance: 'badge-warning' } as any)[s] ?? '';
  }

  typeIcon(t: string): string {
    return ({ villa: 'pi pi-home', bureau: 'pi pi-briefcase' } as any)[t] ?? 'pi pi-building';
  }

  ownerName(p: Property): string {
    return p.owner?.full_name ?? '—';
  }
}