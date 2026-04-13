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
  selector: 'app-om-leases',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastModule, SkeletonModule, TooltipModule],
  providers: [MessageService],
  templateUrl: './om-leases.component.html',
  styleUrls: ['./om-leases.component.scss'],
})
export class OmLeasesComponent implements OnInit {
  private api    = `${environment.apiUrl}/owner-manager`;
  leases         = signal<any[]>([]);
  properties     = signal<any[]>([]);
  tenants        = signal<any[]>([]);
  loading        = signal(true);
  saving         = signal(false);
  saveSuccess    = signal(false);
  drawerOpen     = false;

  form: FormGroup;

  frequencyOptions = [
    { label: 'Mensuel',     value: 'monthly' },
    { label: 'Trimestriel', value: 'quarterly' },
    { label: 'Semestriel',  value: 'biannual' },
    { label: 'Annuel',      value: 'annual' },
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      property_id:       [null, Validators.required],
      tenant_id:         [null, Validators.required],
      base_rent:         [0, [Validators.required, Validators.min(1)]],
      charges:           [0],
      payment_frequency: ['monthly', Validators.required],
      payment_day:       [5],
      start_date:        ['', Validators.required],
      end_date:          [''],
      deposit_amount:    [0],
      notes:             [''],
    });
  }

  ngOnInit(): void { this.load(); this.loadDropdowns(); }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/leases`).subscribe({
      next: (res: any) => { this.leases.set(Array.isArray(res?.data) ? res.data : []); this.loading.set(false); this.cdr.detectChanges(); },
      error: () => this.loading.set(false),
    });
  }

  loadDropdowns(): void {
    this.http.get<any>(`${this.api}/properties`).subscribe({ next: (res: any) => this.properties.set(Array.isArray(res?.data) ? res.data : []) });
    this.http.get<any>(`${this.api}/tenants`).subscribe({ next: (res: any) => this.tenants.set(Array.isArray(res?.data) ? res.data : []) });
  }

  openCreate(): void { this.form.reset({ payment_frequency: 'monthly', payment_day: 5, base_rent: 0, charges: 0, deposit_amount: 0 }); this.saveSuccess.set(false); this.drawerOpen = true; this.cdr.detectChanges(); }
  closeDrawer(): void { this.drawerOpen = false; this.form.reset(); this.saveSuccess.set(false); this.cdr.detectChanges(); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.http.post<any>(`${this.api}/leases`, this.form.value).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Succès', detail: res.message });
        this.saving.set(false); this.saveSuccess.set(true);
        setTimeout(() => { this.saveSuccess.set(false); this.closeDrawer(); this.load(); }, 1500);
        this.cdr.detectChanges();
      },
      error: (err: any) => { this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' }); this.saving.set(false); }
    });
  }

  formatCurrency(n: any): string { return new Intl.NumberFormat('fr-SN').format(Number(n) || 0) + ' F'; }
  statusLabel(s: string): string { return ({ active: 'Actif', terminated: 'Résilié', expired: 'Expiré' } as any)[s] ?? s; }
  statusClass(s: string): string { return ({ active: 'badge-success', terminated: 'badge-danger', expired: 'badge-neutral' } as any)[s] ?? ''; }
}