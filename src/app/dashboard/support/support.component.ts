import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ToastModule }    from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastModule, SkeletonModule],
  providers: [MessageService],
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.scss'],
})
export class SupportComponent implements OnInit {
  private api = `${environment.apiUrl}/agency/support/tickets`;

  tickets     = signal<any[]>([]);
  loading     = signal(true);
  saving      = signal(false);
  saveSuccess = signal(false);
  showForm    = false;

  form: FormGroup;

  typeOptions = [
    { label: '🐛 Signalement de bug',         value: 'bug' },
    { label: '💡 Demande de fonctionnalité',   value: 'feature' },
    { label: '📩 Contact général',             value: 'contact' },
  ];

  priorityOptions = [
    { label: 'Faible',   value: 'low' },
    { label: 'Moyen',    value: 'medium' },
    { label: 'Élevé',    value: 'high' },
    { label: 'Urgent',   value: 'urgent' },
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      type:     ['bug', Validators.required],
      priority: ['medium', Validators.required],
      subject:  ['', [Validators.required, Validators.maxLength(255)]],
      message:  ['', Validators.required],
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(this.api).subscribe({
      next: (res: any) => {
        this.tickets.set(Array.isArray(res?.data) ? res.data : []);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false),
    });
  }

  openForm(): void {
    this.form.reset({ type: 'bug', priority: 'medium' });
    this.saveSuccess.set(false);
    this.showForm = true;
    this.cdr.detectChanges();
  }

  closeForm(): void {
    this.showForm = false;
    this.form.reset();
    this.cdr.detectChanges();
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.http.post<any>(this.api, this.form.value).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Envoyé !', detail: res.message });
        this.saving.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => {
          this.saveSuccess.set(false);
          this.closeForm();
          this.load();
        }, 2000);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' });
        this.saving.set(false);
      }
    });
  }

  typeLabel(t: string): string {
    return ({ bug: 'Bug', feature: 'Fonctionnalité', contact: 'Contact' } as any)[t] ?? t;
  }
  typeIcon(t: string): string {
    return ({ bug: 'pi pi-exclamation-triangle', feature: 'pi pi-lightbulb', contact: 'pi pi-envelope' } as any)[t] ?? 'pi pi-ticket';
  }
  typeClass(t: string): string {
    return ({ bug: 'badge-danger', feature: 'badge-blue', contact: 'badge-neutral' } as any)[t] ?? '';
  }
  statusLabel(s: string): string {
    return ({ open: 'Ouvert', in_progress: 'En cours', resolved: 'Résolu', closed: 'Fermé' } as any)[s] ?? s;
  }
  statusClass(s: string): string {
    return ({ open: 'badge-warning', in_progress: 'badge-blue', resolved: 'badge-success', closed: 'badge-neutral' } as any)[s] ?? '';
  }
  priorityLabel(p: string): string {
    return ({ low: 'Faible', medium: 'Moyen', high: 'Élevé', urgent: 'Urgent' } as any)[p] ?? p;
  }
  priorityClass(p: string): string {
    return ({ low: 'badge-neutral', medium: 'badge-warning', high: 'badge-danger', urgent: 'badge-danger' } as any)[p] ?? '';
  }
  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}