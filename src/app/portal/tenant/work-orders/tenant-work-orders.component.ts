import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { ToastModule }    from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule }  from 'primeng/tooltip';
import { DropdownModule } from 'primeng/dropdown';
import { environment }    from '../../.../../../../environments/environment';

export interface WorkPhoto {
  id: string; url: string; name: string; size: number;
}

interface WorkOrder {
  id: number;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  requested_at: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  photos_before: WorkPhoto[];
  photos_after:  WorkPhoto[];
  property:   { name: string; address: string } | null;
  contractor: { name: string; phone: string } | null;
}

@Component({
  selector: 'app-tenant-work-orders',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastModule, SkeletonModule, TooltipModule, DropdownModule],
  providers: [MessageService],
  templateUrl: './tenant-work-orders.component.html',
  styleUrls:   ['./tenant-work-orders.component.scss'],
})
export class TenantWorkOrdersComponent implements OnInit {
  private api = `${environment.apiUrl}/portal/tenant`;

  orders        = signal<WorkOrder[]>([]);
  loading       = signal(true);
  saving        = signal(false);
  formOpen      = false;
  detailOpen    = false;
  selectedOrder = signal<WorkOrder | null>(null);
  filterStatus  = signal('');

  selectedPhotos: File[]   = [];
  previewUrls:    string[] = [];

  filteredOrders = computed(() => {
    const s = this.filterStatus();
    if (!s) return this.orders();
    if (s === 'active') return this.orders().filter(o => ['reported', 'assigned', 'in_progress'].includes(o.status));
    return this.orders().filter(o => o.status === s);
  });

  form: FormGroup;

  categoryOptions = [
    { label: 'Urgence',    value: 'urgence'    },
    { label: 'Entretien',  value: 'entretien'  },
    { label: 'Rénovation', value: 'renovation' },
    { label: 'Sinistre',   value: 'sinistre'   },
    { label: 'Autre',      value: 'autre'      },
  ];

  priorityOptions = [
    { label: 'Basse',   value: 'low'    },
    { label: 'Moyenne', value: 'medium' },
    { label: 'Haute',   value: 'high'   },
    { label: 'Urgente', value: 'urgent' },
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      title:       ['', Validators.required],
      description: [''],
      category:    ['entretien', Validators.required],
      priority:    ['medium', Validators.required],
    });
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/work-orders`).subscribe({
      next: (res: any) => {
        this.orders.set(Array.isArray(res?.data) ? res.data : []);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false),
    });
  }

  openForm(): void {
    this.form.reset({ category: 'entretien', priority: 'medium' });
    this.selectedPhotos = [];
    this.previewUrls    = [];
    this.formOpen = true;
    this.cdr.detectChanges();
  }

  closeForm(): void {
    this.formOpen       = false;
    this.selectedPhotos = [];
    this.previewUrls    = [];
    this.cdr.detectChanges();
  }

  openDetail(o: WorkOrder): void {
    this.selectedOrder.set(o);
    this.detailOpen = true;
    this.cdr.detectChanges();
  }

  closeDetail(): void {
    this.detailOpen = false;
    this.selectedOrder.set(null);
    this.cdr.detectChanges();
  }

  onPhotosSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const valid = Array.from(input.files).filter(f => {
      if (!allowed.includes(f.type)) { this.toast.add({ severity: 'warn', summary: 'Format invalide', detail: f.name }); return false; }
      if (f.size > 5 * 1024 * 1024) { this.toast.add({ severity: 'warn', summary: 'Trop lourd', detail: `${f.name} : max 5MB` }); return false; }
      return true;
    });
    this.selectedPhotos = valid.slice(0, 5);
    this.previewUrls    = [];
    this.selectedPhotos.forEach(f => {
      const r = new FileReader();
      r.onload = e => { this.previewUrls.push(e.target?.result as string); this.cdr.detectChanges(); };
      r.readAsDataURL(f);
    });
    input.value = '';
    this.cdr.detectChanges();
  }

  removePhoto(i: number): void {
    this.selectedPhotos.splice(i, 1);
    this.previewUrls.splice(i, 1);
    this.cdr.detectChanges();
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const formData = new FormData();
    formData.append('title',       this.form.value.title);
    formData.append('description', this.form.value.description ?? '');
    formData.append('category',    this.form.value.category);
    formData.append('priority',    this.form.value.priority);
    this.selectedPhotos.forEach(f => formData.append('photos[]', f, f.name));

    this.http.post<any>(`${this.api}/work-orders`, formData).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Signalement envoyé', detail: res.message });
        this.saving.set(false);
        this.closeForm();
        this.load();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Envoi échoué.' });
        this.saving.set(false);
      }
    });
  }

  onFilter(e: Event): void { this.filterStatus.set((e.target as HTMLSelectElement).value); }

  get statsTotal():     number { return this.orders().length; }
  get statsActive():    number { return this.orders().filter(o => ['reported', 'assigned', 'in_progress'].includes(o.status)).length; }
  get statsCompleted(): number { return this.orders().filter(o => o.status === 'completed').length; }

  statusLabel(s: string): string { return ({ reported: 'Signalé', assigned: 'Assigné', in_progress: 'En cours', completed: 'Terminé', cancelled: 'Annulé' } as any)[s] ?? s; }
  statusClass(s: string): string { return ({ reported: 'badge-blue', assigned: 'badge-gold', in_progress: 'badge-purple', completed: 'badge-success', cancelled: 'badge-neutral' } as any)[s] ?? ''; }
  priorityLabel(p: string): string { return ({ low: 'Basse', medium: 'Moyenne', high: 'Haute', urgent: 'Urgente' } as any)[p] ?? p; }
  categoryLabel(c: string): string { return ({ urgence: 'Urgence', entretien: 'Entretien', renovation: 'Rénovation', sinistre: 'Sinistre', autre: 'Autre' } as any)[c] ?? c; }
  formatDate(d: string | null): string { if (!d) return '—'; return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  photoCount(o: WorkOrder): number { return (o.photos_before?.length ?? 0) + (o.photos_after?.length ?? 0); }
}