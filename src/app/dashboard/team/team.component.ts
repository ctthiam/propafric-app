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

export interface TeamMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: 'agency_admin' | 'agency_secretary' | 'agency_accountant';
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    DropdownModule, ConfirmDialogModule, ToastModule, SkeletonModule, TooltipModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './team.component.html',
  styleUrls: ['./team.component.scss'],
})
export class TeamComponent implements OnInit {
  private api = `${environment.apiUrl}/agency`;

  members      = signal<TeamMember[]>([]);
  loading      = signal(true);
  saving       = signal(false);
  editingMember = signal<TeamMember | null>(null);
  search       = signal('');
  drawerOpen   = false;

  filteredMembers = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) return this.members();
    return this.members().filter(m =>
      `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(q)
    );
  });

  form: FormGroup;

  roleOptions = [
    { label: 'Administrateur',  value: 'agency_admin' },
    { label: 'Secrétaire',      value: 'agency_secretary' },
    { label: 'Comptable',       value: 'agency_accountant' },
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private confirm: ConfirmationService,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      first_name: ['', Validators.required],
      last_name:  ['', Validators.required],
      email:      ['', [Validators.required, Validators.email]],
      phone:      [''],
      role:       ['agency_secretary', Validators.required],
      password:   [''],
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/team`).subscribe({
      next: (res: any) => {
        this.members.set(Array.isArray(res?.data) ? res.data : []);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger l\'équipe.' });
        this.loading.set(false);
      }
    });
  }

  openCreate(): void {
    this.editingMember.set(null);
    this.form.reset({ role: 'agency_secretary' });
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    this.form.get('password')?.updateValueAndValidity();
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  openEdit(m: TeamMember): void {
    this.editingMember.set(m);
    this.form.patchValue(m);
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.editingMember.set(null);
    this.form.reset();
    this.cdr.detectChanges();
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    const editing = this.editingMember();
    const payload = { ...this.form.value };
    if (!payload.password) delete payload.password;

    const req$ = editing
      ? this.http.put<any>(`${this.api}/team/${editing.id}`, payload)
      : this.http.post<any>(`${this.api}/team`, payload);

    req$.subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Succès', detail: res.message });
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

  toggleActive(m: TeamMember): void {
    this.http.put<any>(`${this.api}/team/${m.id}/toggle`, {}).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: res.data?.is_active ? 'Activé' : 'Désactivé', detail: res.message });
        this.load();
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible.' })
    });
  }

  confirmDelete(m: TeamMember): void {
    this.confirm.confirm({
      message: `Supprimer <strong>${m.first_name} ${m.last_name}</strong> ?`,
      header: 'Confirmer la suppression',
      icon: 'pi pi-trash',
      acceptLabel: 'Supprimer', rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.http.delete<any>(`${this.api}/team/${m.id}`).subscribe({
        next: (res: any) => { this.toast.add({ severity: 'success', summary: 'Supprimé', detail: res.message }); this.load(); },
        error: () => this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible.' })
      })
    });
  }

  onSearch(e: Event): void { this.search.set((e.target as HTMLInputElement).value); }

  roleLabel(r: string): string {
    return ({ agency_admin: 'Administrateur', agency_secretary: 'Secrétaire', agency_accountant: 'Comptable' } as any)[r] ?? r;
  }

  roleClass(r: string): string {
    return ({ agency_admin: 'badge-purple', agency_secretary: 'badge-blue', agency_accountant: 'badge-gold' } as any)[r] ?? 'badge-neutral';
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  initials(m: TeamMember): string {
    return `${m.first_name[0] ?? ''}${m.last_name[0] ?? ''}`.toUpperCase();
  }
}