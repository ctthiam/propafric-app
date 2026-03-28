import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

import { DropdownModule }      from 'primeng/dropdown';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule }         from 'primeng/toast';
import { SkeletonModule }      from 'primeng/skeleton';
import { TooltipModule }       from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';

export interface Tenant {
  id: number;
  user_id: number | null;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  phone_2: string | null;
  nationality: string | null;
  profession: string | null;
  company_name: string | null;
  tenant_type: string;
  has_insurance: boolean;
  has_portal: boolean;
  active_lease: any | null;
  // champs formulaire
  address?: string | null;
  city?: string | null;
  id_type?: string | null;
  id_number?: string | null;
  employer?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  notes?: string | null;
}

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    DropdownModule, ConfirmDialogModule, ToastModule, SkeletonModule, TooltipModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './tenants.component.html',
  styleUrls: ['./tenants.component.scss'],
})
export class TenantsComponent implements OnInit {
  private api = `${environment.apiUrl}/agency`;

  tenants       = signal<Tenant[]>([]);
  loading       = signal(true);
  saving        = signal(false);
  editingTenant = signal<Tenant | null>(null);
  search        = signal('');
  drawerOpen    = false;

  filteredTenants = computed(() => {
    const q = this.search().toLowerCase();
    const list = this.tenants();
    if (!q) return list;
    return list.filter(t =>
      `${t.first_name} ${t.last_name} ${t.email} ${t.phone}`.toLowerCase().includes(q)
    );
  });

  form: FormGroup;

  idTypes = [
    { label: 'CNI',       value: 'cni' },
    { label: 'Passeport', value: 'passeport' },
    { label: 'Permis',    value: 'permis' },
    { label: 'Autre',     value: 'autre' },
  ];

  tenantTypes = [
    { label: 'Particulier',  value: 'individual' },
    { label: 'Professionnel', value: 'professional' },
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private confirm: ConfirmationService,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      first_name:              ['', Validators.required],
      last_name:               ['', Validators.required],
      email:                   ['', [Validators.required, Validators.email]],
      phone:                   ['', Validators.required],
      phone_2:                 [''],
      tenant_type:             ['individual'],
      nationality:             ['Sénégalaise'],
      profession:              [''],
      company_name:            [''],
      employer:                [''],
      address:                 [''],
      city:                    [''],
      id_type:                 [''],
      id_number:               [''],
      emergency_contact_name:  [''],
      emergency_contact_phone: [''],
      notes:                   [''],
      portal_password:         [''],
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/tenants`).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.tenants.set(list);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les locataires.' });
        this.loading.set(false);
      }
    });
  }

  openCreate(): void {
    this.editingTenant.set(null);
    this.form.reset({ nationality: 'Sénégalaise', tenant_type: 'individual' });
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  openEdit(t: Tenant): void {
    this.editingTenant.set(t);
    this.form.patchValue({ ...t, portal_password: '' });
    this.form.markAsUntouched();
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.editingTenant.set(null);
    this.form.reset();
    this.cdr.detectChanges();
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    const editing = this.editingTenant();
    const payload = { ...this.form.value };
    if (editing && !payload.portal_password) delete payload.portal_password;

    const req$ = editing
      ? this.http.put<any>(`${this.api}/tenants/${editing.id}`, payload)
      : this.http.post<any>(`${this.api}/tenants`, payload);

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

  createPortal(t: any): void {
  const password = prompt('Mot de passe pour le portail de ' + t.full_name + ' :');
  if (!password || password.length < 8) {
    this.toast.add({ severity: 'warn', summary: 'Attention', detail: 'Mot de passe minimum 8 caractères.' });
    return;
  }
  this.http.post<any>(`${this.api}/tenants/${t.id}/portal`, { 
    password,
    email: t.email 
  }).subscribe({
    next: (res: any) => {
      this.toast.add({ severity: 'success', summary: 'Portail créé', detail: res.message });
      this.load();
    },
    error: (err: any) => {
      this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' });
    }
  });
}

  confirmDelete(t: Tenant): void {
    this.confirm.confirm({
      message: `Supprimer <strong>${t.first_name} ${t.last_name}</strong> ?`,
      header: 'Confirmer la suppression',
      icon: 'pi pi-trash',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(t.id),
    });
  }

  private delete(id: number): void {
    this.http.delete<any>(`${this.api}/tenants/${id}`).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Supprimé', detail: res.message });
        this.load();
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible.' })
    });
  }

  onSearch(e: Event): void { this.search.set((e.target as HTMLInputElement).value); }
  fullName(t: Tenant): string { return `${t.first_name} ${t.last_name}`; }
  initials(t: Tenant): string { return `${t.first_name?.[0] ?? ''}${t.last_name?.[0] ?? ''}`.toUpperCase(); }
  portalClass(t: Tenant): string { return t.has_portal ? 'badge-success' : 'badge-neutral'; }
  portalLabel(t: Tenant): string { return t.has_portal ? 'Actif' : 'Inactif'; }
}