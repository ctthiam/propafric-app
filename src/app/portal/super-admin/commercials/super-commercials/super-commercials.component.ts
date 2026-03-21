import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ToastModule }         from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule }      from 'primeng/skeleton';
import { TooltipModule }       from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-super-commercials',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastModule, ConfirmDialogModule, SkeletonModule, TooltipModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './super-commercials.component.html',
  styleUrls:  ['./super-commercials.component.scss'],
})
export class SuperCommercialsComponent implements OnInit {
  private api = `${environment.apiUrl}/agency/super-admin/commercials`;

  commercials = signal<any[]>([]);
  loading     = signal(true);
  saving      = signal(false);
  search      = signal('');
  drawerOpen  = false;
  form: FormGroup;

  filteredCommercials = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) return this.commercials();
    return this.commercials().filter(c =>
      `${c.full_name} ${c.email}`.toLowerCase().includes(q)
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
      first_name: ['', Validators.required],
      last_name:  ['', Validators.required],
      email:      ['', [Validators.required, Validators.email]],
      phone:      [''],
      password:   ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(this.api).subscribe({
      next: (res: any) => {
        this.commercials.set(Array.isArray(res?.data) ? res.data : []);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.form.reset();
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.cdr.detectChanges();
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.http.post<any>(this.api, this.form.value).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Créé', detail: res.message });
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

  toggle(c: any): void {
    this.http.put<any>(`${this.api}/${c.id}/toggle`, {}).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Mis à jour', detail: res.message });
        this.load();
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible.' })
    });
  }

  confirmDelete(c: any): void {
    this.confirm.confirm({
      message: `Supprimer <strong>${c.full_name}</strong> ? Ses agences ne seront pas supprimées.`,
      header: 'Confirmer',
      icon: 'pi pi-trash',
      acceptLabel: 'Supprimer', rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.http.delete<any>(`${this.api}/${c.id}`).subscribe({
        next: (res: any) => { this.toast.add({ severity: 'success', summary: 'Supprimé', detail: res.message }); this.load(); },
        error: () => this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible.' })
      })
    });
  }

  onSearch(e: Event): void { this.search.set((e.target as HTMLInputElement).value); }
  formatCurrency(n: number): string { return new Intl.NumberFormat('fr-SN').format(n) + ' F'; }
  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}