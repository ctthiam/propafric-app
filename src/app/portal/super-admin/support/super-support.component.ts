import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastModule }    from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-super-support',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ToastModule, SkeletonModule],
  providers: [MessageService],
  templateUrl: './super-support.component.html',
  styleUrls: ['./super-support.component.scss'],
})
export class SuperSupportComponent implements OnInit {
  private api = `${environment.apiUrl}/super-admin/support/tickets`;

  tickets      = signal<any[]>([]);
  loading      = signal(true);
  saving       = signal(false);
  filterStatus = '';
  filterType   = '';

  selectedTicket = signal<any>(null);
  drawerOpen     = false;
  responseForm: FormGroup;

  statusOptions = [
    { label: 'Tous',       value: '' },
    { label: 'Ouvert',     value: 'open' },
    { label: 'En cours',   value: 'in_progress' },
    { label: 'Résolu',     value: 'resolved' },
    { label: 'Fermé',      value: 'closed' },
  ];

  typeOptions = [
    { label: 'Tous',               value: '' },
    { label: 'Bug',                value: 'bug' },
    { label: 'Fonctionnalité',     value: 'feature' },
    { label: 'Contact',            value: 'contact' },
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.responseForm = this.fb.group({
      status:         ['in_progress'],
      admin_response: [''],
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    let url = this.api + '?';
    if (this.filterStatus) url += `status=${this.filterStatus}&`;
    if (this.filterType)   url += `type=${this.filterType}&`;

    this.http.get<any>(url).subscribe({
      next: (res: any) => {
        this.tickets.set(Array.isArray(res?.data) ? res.data : []);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false),
    });
  }

  openTicket(t: any): void {
    this.selectedTicket.set(t);
    this.responseForm.patchValue({
      status:         t.status,
      admin_response: t.admin_response ?? '',
    });
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.selectedTicket.set(null);
    this.cdr.detectChanges();
  }

  respond(): void {
    const t = this.selectedTicket();
    if (!t) return;
    this.saving.set(true);
    this.http.put<any>(`${this.api}/${t.id}`, this.responseForm.value).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Mis à jour', detail: res.message });
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

  onFilterChange(): void { this.load(); }

  typeLabel(t: string): string { return ({ bug: 'Bug', feature: 'Fonctionnalité', contact: 'Contact' } as any)[t] ?? t; }
  typeIcon(t: string): string  { return ({ bug: 'pi pi-exclamation-triangle', feature: 'pi pi-lightbulb', contact: 'pi pi-envelope' } as any)[t] ?? 'pi pi-ticket'; }
  typeClass(t: string): string { return ({ bug: 'badge-danger', feature: 'badge-blue', contact: 'badge-neutral' } as any)[t] ?? ''; }
  statusLabel(s: string): string { return ({ open: 'Ouvert', in_progress: 'En cours', resolved: 'Résolu', closed: 'Fermé' } as any)[s] ?? s; }
  statusClass(s: string): string { return ({ open: 'badge-warning', in_progress: 'badge-blue', resolved: 'badge-success', closed: 'badge-neutral' } as any)[s] ?? ''; }
  priorityLabel(p: string): string { return ({ low: 'Faible', medium: 'Moyen', high: 'Élevé', urgent: 'Urgent' } as any)[p] ?? p; }
  priorityClass(p: string): string { return ({ low: 'badge-neutral', medium: 'badge-warning', high: 'badge-danger', urgent: 'badge-danger' } as any)[p] ?? ''; }
  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}