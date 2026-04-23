import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-om-payments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastModule, SkeletonModule],
  providers: [MessageService],
  templateUrl: './om-payments.component.html',
  styleUrls: ['./om-payments.component.scss'],
})
export class OmPaymentsComponent implements OnInit {
  private api = `${environment.apiUrl}/owner-manager`;

  payments    = signal<any[]>([]);
  schedules   = signal<any[]>([]);
  loading     = signal(true);
  saving      = signal(false);
  saveSuccess = signal(false);
  drawerOpen  = false;

  form: FormGroup;

  paymentMethods = [
    { label: 'Espèces',       value: 'cash' },
    { label: 'Virement',      value: 'bank_transfer' },
    { label: 'Wave',          value: 'wave_senegal' },
    { label: 'Orange Money',  value: 'orange_money' },
    { label: 'Chèque',        value: 'cheque' },
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      schedule_id:    [null, Validators.required],
      amount:         [0, [Validators.required, Validators.min(1)]],
      payment_date:   ['', Validators.required],
      payment_method: ['cash', Validators.required],
      notes:          [''],
    });
  }

  ngOnInit(): void { this.load(); this.loadSchedules(); }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/payments`).subscribe({
      next: (res: any) => { this.payments.set(Array.isArray(res?.data) ? res.data : []); this.loading.set(false); this.cdr.detectChanges(); },
      error: () => this.loading.set(false),
    });
  }

  loadSchedules(): void {
    this.http.get<any>(`${this.api}/schedules`).subscribe({
      next: (res: any) => {
        this.schedules.set(Array.isArray(res?.data) ? res.data : []);
        this.cdr.detectChanges();
      }
    });
  }

  onScheduleChange(scheduleId: any): void {
    const s = this.schedules().find((s: any) => s.id == scheduleId);
    if (s) this.form.patchValue({ amount: s.balance });
  }

  openCreate(): void {
    const today = new Date().toISOString().split('T')[0];
    this.form.reset({ payment_method: 'cash', payment_date: today, amount: 0 });
    this.saveSuccess.set(false);
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  closeDrawer(): void { this.drawerOpen = false; this.form.reset(); this.saveSuccess.set(false); this.cdr.detectChanges(); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.http.post<any>(`${this.api}/payments`, this.form.value).subscribe({
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
}