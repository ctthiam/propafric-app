import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { SkeletonModule } from 'primeng/skeleton';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

export interface Agency {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  plan: string;
  status: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  max_properties: number | null;
  users_count: number;
  properties_count: number;
  created_at: string;
}

@Component({
  selector: 'app-super-agencies',
  standalone: true,
  imports: [CommonModule, FormsModule, SkeletonModule, ToastModule, ReactiveFormsModule, ConfirmDialogModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './super-agencies.component.html',
  styleUrls: ['./super-agencies.component.scss'],
})
export class SuperAgenciesComponent implements OnInit {
  private apiUrl = `${environment.apiUrl}/agency/super-admin`;

  agencies      = signal<Agency[]>([]);
  loading       = signal(true);
  search        = signal('');
  filterStatus  = signal('');
  filterPlan    = signal('');
  actionLoading = signal<number | null>(null);
  drawerOpen    = false;
  selectedAgency = signal<Agency | null>(null);
  extendDays    = 30;
  createOpen    = false;
  createSaving  = signal(false);
  createForm:   FormGroup;

  extendOptions = [
    { label: '30 jours (1 mois)',  value: 30  },
    { label: '60 jours (2 mois)',  value: 60  },
    { label: '90 jours (3 mois)',  value: 90  },
    { label: '180 jours (6 mois)', value: 180 },
    { label: '365 jours (1 an)',   value: 365 },
  ];

  filteredAgencies = computed(() => {
    let list = this.agencies();
    const q = this.search().toLowerCase();
    const s = this.filterStatus();
    const p = this.filterPlan();
    if (q) list = list.filter(a => `${a.name} ${a.email} ${a.city}`.toLowerCase().includes(q));
    if (s) list = list.filter(a => a.status === s);
    if (p) list = list.filter(a => a.plan === p);
    return list;
  });

  statusOptions = [
    { label: 'Tous les statuts', value: '' },
    { label: 'Actif',    value: 'active' },
    { label: 'Essai',    value: 'trial' },
    { label: 'Suspendu', value: 'suspended' },
    { label: 'Annulé',   value: 'cancelled' },
  ];

  planOptions = [
    { label: 'Tous les plans', value: '' },
    { label: 'Starter',    value: 'starter' },
    { label: 'Pro',        value: 'pro' },
    { label: 'Partenaire', value: 'partner' },
    { label: 'Entreprise', value: 'enterprise' },
  ];

  constructor(
    private http: HttpClient,
    private toast: MessageService,
    private confirm: ConfirmationService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,          // ✅ FIX 1 — injecter FormBuilder
  ) {
    this.createForm = this.fb.group({
      name:             ['', Validators.required],
      email:            ['', [Validators.required, Validators.email]],
      phone:            [''],
      address:          [''],
      city:             ['Dakar'],
      plan:             ['pro', Validators.required],
      admin_first_name: ['', Validators.required],
      admin_last_name:  ['', Validators.required],
      admin_email:      ['', [Validators.required, Validators.email]],
      admin_password:   ['', [Validators.required, Validators.minLength(8)]],
      admin_phone:      [''],
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.apiUrl}/agencies`).subscribe({
      next: (res: any) => {
        this.agencies.set(Array.isArray(res?.data) ? res.data : []);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false)
    });
  }

  openDetail(agency: Agency): void {
    this.selectedAgency.set(agency);
    this.extendDays = 30;
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.selectedAgency.set(null);
    this.cdr.detectChanges();
  }

  updateStatus(agency: Agency, status: string): void {
    this.actionLoading.set(agency.id);
    this.http.put<any>(`${this.apiUrl}/agencies/${agency.id}/status`, { status }).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Succès', detail: res.message ?? 'Statut mis à jour.' });
        this.actionLoading.set(null);
        this.closeDrawer();
        this.load();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' });
        this.actionLoading.set(null);
      }
    });
  }

  extendSubscription(agency: Agency): void {
    this.actionLoading.set(agency.id);
    this.http.post<any>(`${this.apiUrl}/agencies/${agency.id}/extend`, { days: Number(this.extendDays) }).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Prolongé', detail: res.message ?? `Abonnement prolongé de ${this.extendDays} jours.` });
        this.actionLoading.set(null);
        this.closeDrawer();
        this.load();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' });
        this.actionLoading.set(null);
      }
    });
  }

  openCreate(): void {
    this.createForm.reset({ plan: 'pro', trial_days: 30, city: 'Dakar' });
    this.createOpen = true;
    this.cdr.detectChanges();
  }

  closeCreate(): void {
    this.createOpen = false;
    this.cdr.detectChanges();
  }

  submitCreate(): void {
    if (this.createForm.invalid) { this.createForm.markAllAsTouched(); return; }
    this.createSaving.set(true);
    this.http.post<any>(`${this.apiUrl}/agencies`, this.createForm.value).subscribe({  // ✅ FIX 2 — apiUrl
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Agence créée', detail: res.message });
        this.createSaving.set(false);
        this.closeCreate();
        this.load();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' });
        this.createSaving.set(false);
      }
    });
  }

  onSearch(e: Event): void { this.search.set((e.target as HTMLInputElement).value); }
  onFilterStatus(v: string): void { this.filterStatus.set(v); }
  onFilterPlan(v: string): void { this.filterPlan.set(v); }
  isLoading(id: number): boolean { return this.actionLoading() === id; }

  formatDate(d: string): string { return d ? new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }
  planLabel(p: string): string { return ({ starter: 'Starter', pro: 'Pro', partner: 'Partenaire', enterprise: 'Entreprise' } as any)[p] ?? p; }
  planClass(p: string): string { return ({ starter: 'badge-neutral', pro: 'badge-blue', partner: 'badge-gold', enterprise: 'badge-purple' } as any)[p] ?? 'badge-neutral'; }
  statusLabel(s: string): string { return ({ active: 'Actif', trial: 'Essai', suspended: 'Suspendu', cancelled: 'Annulé' } as any)[s] ?? s; }
  statusClass(s: string): string { return ({ active: 'badge-success', trial: 'badge-warning', suspended: 'badge-danger', cancelled: 'badge-neutral' } as any)[s] ?? 'badge-neutral'; }
}