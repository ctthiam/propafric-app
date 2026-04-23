import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-om-tenants',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ToastModule, SkeletonModule, TooltipModule],
  providers: [MessageService],
  templateUrl: './om-tenants.component.html',
  styleUrls: ['./om-tenants.component.scss'],
})
export class OmTenantsComponent implements OnInit {
  private api = `${environment.apiUrl}/owner-manager/tenants`;

  tenants       = signal<any[]>([]);
  loading       = signal(true);
  saving        = signal(false);
  saveSuccess   = signal(false);
  editingTenant = signal<any>(null);
  search        = signal('');
  drawerOpen    = false;
  deletingId: number | null = null;
  deleting = false;

  portalTenant: any = null;
  portalEmail = '';
  portalPassword = '';
  portalSaving = false;
  portalMsg = '';
  portalIsError = false;

  filteredTenants = computed(() => {
    const q = this.search().toLowerCase();
    return this.tenants().filter(t =>
      `${t.full_name} ${t.email} ${t.phone}`.toLowerCase().includes(q)
    );
  });

  form: FormGroup;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      first_name:  ['', Validators.required],
      last_name:   ['', Validators.required],
      email:       ['', Validators.email],
      phone:       ['', Validators.required],
      profession:  [''],
      nationality: [''],
      address:     [''],
      city:        [''],
      notes:       [''],
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(this.api).subscribe({
      next: (res: any) => { this.tenants.set(Array.isArray(res?.data) ? res.data : []); this.loading.set(false); this.cdr.detectChanges(); },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void { this.editingTenant.set(null); this.form.reset(); this.saveSuccess.set(false); this.drawerOpen = true; this.cdr.detectChanges(); }

  openEdit(t: any): void { this.editingTenant.set(t); this.form.patchValue(t); this.form.markAsUntouched(); this.saveSuccess.set(false); this.drawerOpen = true; this.cdr.detectChanges(); }

  closeDrawer(): void { this.drawerOpen = false; this.editingTenant.set(null); this.form.reset(); this.saveSuccess.set(false); this.cdr.detectChanges(); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const editing = this.editingTenant();
    const req$ = editing
      ? this.http.put<any>(`${this.api}/${editing.id}`, this.form.value)
      : this.http.post<any>(this.api, this.form.value);
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

  openPortalInvite(t: any): void {
    this.portalTenant = t;
    this.portalEmail = t.email ?? '';
    this.portalPassword = '';
    this.portalMsg = '';
    this.portalIsError = false;
    this.cdr.detectChanges();
  }
  closePortalInvite(): void { this.portalTenant = null; this.cdr.detectChanges(); }

  submitPortalInvite(): void {
    if (!this.portalEmail || !this.portalPassword) return;
    this.portalSaving = true; this.portalMsg = ''; this.portalIsError = false;
    this.http.post<any>(`${this.api}/${this.portalTenant.id}/portal`, {
      email: this.portalEmail, password: this.portalPassword,
    }).subscribe({
      next: (res: any) => {
        this.portalSaving = false;
        this.portalMsg = res.message;
        this.portalIsError = false;
        this.cdr.detectChanges();
        setTimeout(() => { this.closePortalInvite(); this.load(); }, 2000);
      },
      error: (err: any) => {
        this.portalSaving = false;
        this.portalMsg = err.error?.message ?? 'Erreur.';
        this.portalIsError = true;
        this.cdr.detectChanges();
      },
    });
  }

  onSearch(e: Event): void { this.search.set((e.target as HTMLInputElement).value); }
  initials(t: any): string { return `${t.first_name?.[0] ?? ''}${t.last_name?.[0] ?? ''}`.toUpperCase(); }
}