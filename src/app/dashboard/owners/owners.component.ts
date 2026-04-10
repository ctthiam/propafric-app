import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

import { TableModule }         from 'primeng/table';
import { ButtonModule }        from 'primeng/button';
import { InputTextModule }     from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule }      from 'primeng/dropdown';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule }         from 'primeng/toast';
import { TagModule }           from 'primeng/tag';
import { SkeletonModule }      from 'primeng/skeleton';
import { TooltipModule }       from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';

export interface Owner {
  id: number;
  user_id: number | null;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  phone_2: string | null;
  address: string | null;
  city: string | null;
  id_type: string | null;
  id_number: string | null;
  bank_name: string | null;
  bank_account: string | null;
  notes: string | null;
  management_fee_type: string | null;
  management_fee_value: string | null;
  has_portal: boolean;
  properties_count: number;
  created_at: string;
}

@Component({
  selector: 'app-owners',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, InputTextModule,
    InputTextareaModule, DropdownModule,
    ConfirmDialogModule, ToastModule, TagModule, SkeletonModule, TooltipModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './owners.component.html',
  styleUrls: ['./owners.component.scss'],
})
export class OwnersComponent implements OnInit {
  private api = `${environment.apiUrl}/agency`;

  owners       = signal<Owner[]>([]);
  loading      = signal(true);
  saving       = signal(false);
  saveSuccess  = signal(false);
  editingOwner = signal<Owner | null>(null);
  viewingOwner = signal<Owner | null>(null);
  search       = signal('');
  drawerOpen   = false;
  detailOpen   = false;

  filteredOwners = computed(() => {
    const q = this.search().toLowerCase();
    const list = this.owners();
    if (!q) return list;
    return list.filter(o =>
      `${o.first_name} ${o.last_name} ${o.email} ${o.phone}`.toLowerCase().includes(q)
    );
  });

  form: FormGroup;

  idTypes = [
    { label: 'CNI',       value: 'cni' },
    { label: 'Passeport', value: 'passeport' },
    { label: 'Permis',    value: 'permis' },
    { label: 'Autre',     value: 'autre' },
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private confirm: ConfirmationService,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      first_name:   ['', Validators.required],
      last_name:    ['', Validators.required],
      email:        ['', Validators.email],
      phone:        ['', Validators.required],
      phone_2:      [''],
      address:      [''],
      city:         [''],
      id_type:      [''],
      id_number:    [''],
      bank_name:    [''],
      bank_account: [''],
      notes:        [''],
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/owners`).subscribe({
      next: (res: any) => {
        const list: Owner[] = Array.isArray(res?.data) ? res.data : [];
        this.owners.set(list);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les propriétaires.' });
        this.loading.set(false);
      }
    });
  }

  openCreate(): void {
    this.editingOwner.set(null);
    this.form.reset();
    this.saveSuccess.set(false);
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  openEdit(owner: Owner): void {
    this.editingOwner.set(owner);
    this.form.patchValue(owner);
    this.form.markAsUntouched();
    this.saveSuccess.set(false);
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.form.reset();
    this.editingOwner.set(null);
    this.saveSuccess.set(false);
    this.cdr.detectChanges();
  }

  openDetail(owner: Owner): void {
    this.viewingOwner.set(owner);
    this.detailOpen = true;
    this.cdr.detectChanges();
  }

  closeDetail(): void {
    this.detailOpen = false;
    this.viewingOwner.set(null);
    this.cdr.detectChanges();
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.saveSuccess.set(false);

    const editing = this.editingOwner();
    const req$ = editing
      ? this.http.put<any>(`${this.api}/owners/${editing.id}`, this.form.value)
      : this.http.post<any>(`${this.api}/owners`, this.form.value);

    req$.subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Succès', detail: res.message });
        this.saving.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => {
          this.saveSuccess.set(false);
          this.closeDrawer();
          this.load();
        }, 1500);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        const msg = err.error?.message ?? 'Une erreur est survenue.';
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: msg });
        this.saving.set(false);
      }
    });
  }

  createPortal(owner: any): void {
    const password = prompt('Mot de passe pour le portail de ' + owner.full_name + ' :');
    if (!password || password.length < 8) {
      this.toast.add({ severity: 'warn', summary: 'Attention', detail: 'Mot de passe minimum 8 caractères.' });
      return;
    }
    this.http.post<any>(`${this.api}/owners/${owner.id}/portal`, {
      password,
      email: owner.email
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

  confirmDelete(owner: Owner): void {
    this.confirm.confirm({
      message: `Supprimer <strong>${owner.first_name} ${owner.last_name}</strong> ? Cette action est irréversible.`,
      header: 'Confirmer la suppression',
      icon: 'pi pi-trash',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(owner.id),
    });
  }

  private delete(id: number): void {
    this.http.delete<any>(`${this.api}/owners/${id}`).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Supprimé', detail: res.message });
        this.load();
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible.' })
    });
  }

  fullName(o: Owner): string { return `${o.first_name} ${o.last_name}`; }
  initials(o: Owner): string { return `${(o.first_name?.[0] ?? '')}${(o.last_name?.[0] ?? '')}`.toUpperCase(); }
  onSearch(event: Event): void { this.search.set((event.target as HTMLInputElement).value); }
}