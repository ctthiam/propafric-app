import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { environment } from '../../.../../../../environments/environment';

@Component({
  selector: 'app-commercial-agencies',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, SkeletonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './commercial-agencies.component.html',
  styleUrls: ['./commercial-agencies.component.scss'],
})
export class CommercialAgenciesComponent implements OnInit {
  private api = `${environment.apiUrl}/commercial`;

  agencies    = signal<any[]>([]);
  loading     = signal(true);
  saving      = signal(false);
  search      = signal('');
  filterStatus= signal('');
  drawerOpen  = false;
  form: FormGroup;

  filteredAgencies = computed(() => {
    let list = this.agencies();
    const q = this.search().toLowerCase();
    const s = this.filterStatus();
    if (q) list = list.filter(a => `${a.name} ${a.email}`.toLowerCase().includes(q));
    if (s) list = list.filter(a => a.status === s);
    return list;
  });

  yearOptions = Array.from({ length: 5 }, (_, i) => ({
    label: String(new Date().getFullYear() - i),
    value: new Date().getFullYear() - i,
  }));

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      name:             ['', Validators.required],
      email:            ['', [Validators.required, Validators.email]],
      phone:            [''],
      address:          [''],
      city:             ['Dakar'],
      plan:             ['starter', Validators.required],
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
    this.http.get<any>(`${this.api}/agencies`).subscribe({
      next: (res: any) => {
        this.agencies.set(Array.isArray(res?.data) ? res.data : []);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.form.reset({ plan: 'starter', city: 'Dakar' });
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
    this.http.post<any>(`${this.api}/agencies`, this.form.value).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Agence créée', detail: res.message });
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

  onSearch(e: Event): void { this.search.set((e.target as HTMLInputElement).value); }
  onFilterStatus(e: Event): void { this.filterStatus.set((e.target as HTMLSelectElement).value); }

  statusLabel(s: string): string {
    return ({ pending: 'En attente', active: 'Actif', suspended: 'Suspendu', cancelled: 'Annulé' } as any)[s] ?? s;
  }
  statusClass(s: string): string {
    return ({ pending: 'badge-gold', active: 'badge-success', suspended: 'badge-danger', cancelled: 'badge-neutral' } as any)[s] ?? '';
  }
  planLabel(p: string): string {
    return ({ starter: 'Starter', pro: 'Pro', premium: 'Premium' } as any)[p] ?? p;
  }
  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}