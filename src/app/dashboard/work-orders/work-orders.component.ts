import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule }         from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule }      from 'primeng/skeleton';
import { TooltipModule }       from 'primeng/tooltip';
import { DropdownModule }      from 'primeng/dropdown';
import { environment } from '../../../environments/environment';

export interface WorkPhoto {
  id: string;
  path: string;
  url: string;
  name: string;
  size: number;
  disk: string;
}

interface WorkOrder {
  id: number;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  estimated_cost: number;
  actual_cost: number;
  requested_at: string;
  scheduled_at: string | null;
  completed_at: string | null;
  notes: string | null;
  photos_before: WorkPhoto[];
  photos_after:  WorkPhoto[];
  property:   { id: number; name: string; reference: string; address: string } | null;
  tenant:     { id: number; full_name: string; phone: string } | null;
  contractor: { id: number; name: string; specialty: string; phone: string } | null;
}

interface Property   { id: number; name: string; reference: string; }
interface Contractor { id: number; name: string; specialty: string; }

@Component({
  selector: 'app-work-orders',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastModule, ConfirmDialogModule, SkeletonModule, TooltipModule, DropdownModule],
  providers: [ConfirmationService, MessageService],
  templateUrl: './work-orders.component.html',
  styleUrls:  ['./work-orders.component.scss'],
})
export class WorkOrdersComponent implements OnInit {
  private api = `${environment.apiUrl}/agency`;

  orders      = signal<WorkOrder[]>([]);
  properties  = signal<Property[]>([]);
  contractors = signal<Contractor[]>([]);
  loading     = signal(true);
  saving      = signal(false);

  drawerOpen   = false;
  detailOpen   = false;
  assignOpen   = false;
  completeOpen = false;
  editingOrder = signal<WorkOrder | null>(null);

  // ── Onglet détail ──────────────────────────────────────────
  detailTab: 'info' | 'photos' = 'info';

  // ── Photos ────────────────────────────────────────────────
  uploadingBefore = signal(false);
  uploadingAfter  = signal(false);
  selectedBefore: File[] = [];
  selectedAfter:  File[] = [];
  previewBefore:  string[] = [];
  previewAfter:   string[] = [];

  filterStatus   = signal('');
  filterPriority = signal('');
  search         = signal('');

  filteredOrders = computed(() => {
    let list = this.orders();
    const s  = this.filterStatus();
    const p  = this.filterPriority();
    const q  = this.search().toLowerCase();
    if (s) list = list.filter(o => o.status === s);
    if (p) list = list.filter(o => o.priority === p);
    if (q) list = list.filter(o =>
      o.title.toLowerCase().includes(q) ||
      (o.property?.name ?? '').toLowerCase().includes(q)
    );
    return list;
  });

  form:         FormGroup;
  assignForm:   FormGroup;
  completeForm: FormGroup;

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

  statusOptions = [
    { label: 'Signalé',    value: 'reported'    },
    { label: 'Assigné',    value: 'assigned'    },
    { label: 'En cours',   value: 'in_progress' },
    { label: 'Terminé',    value: 'completed'   },
    { label: 'Annulé',     value: 'cancelled'   },
  ];

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private confirm: ConfirmationService,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      property_id:    ['', Validators.required],
      title:          ['', Validators.required],
      description:    [''],
      category:       ['entretien', Validators.required],
      priority:       ['medium', Validators.required],
      estimated_cost: [''],
      scheduled_at:   [''],
    });

    this.assignForm = this.fb.group({
      contractor_id: ['', Validators.required],
      scheduled_at:  [''],
    });

    this.completeForm = this.fb.group({
      actual_cost:  [''],
      completed_at: [''],
      notes:        [''],
    });
  }

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.loading.set(true);
    Promise.all([
      this.http.get<any>(`${this.api}/work-orders`).toPromise(),
      this.http.get<any>(`${this.api}/properties`).toPromise(),
      this.http.get<any>(`${this.api}/contractors`).toPromise(),
    ]).then(([wo, props, conts]) => {
      this.orders.set(Array.isArray(wo?.data) ? wo.data : []);
      this.properties.set(Array.isArray(props?.data) ? props.data : []);
      this.contractors.set(Array.isArray(conts?.data) ? conts.data : []);
      this.loading.set(false);
      this.cdr.detectChanges();
    }).catch(() => {
      this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Chargement impossible.' });
      this.loading.set(false);
    });
  }

  private loadDropdownData(): void {
    this.http.get<any>(`${this.api}/properties`).subscribe({
      next: (res: any) => this.properties.set(Array.isArray(res?.data) ? res.data : [])
    });
    this.http.get<any>(`${this.api}/contractors`).subscribe({
      next: (res: any) => this.contractors.set(Array.isArray(res?.data) ? res.data : [])
    });
  }

  // ── CRUD ──────────────────────────────────────────────────

  openCreate(): void {
    this.loadDropdownData();
    this.editingOrder.set(null);
    this.form.reset({ category: 'entretien', priority: 'medium' });
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  openEdit(o: WorkOrder): void {
    this.loadDropdownData();
    this.editingOrder.set(o);
    this.form.patchValue({
      property_id:    o.property?.id ?? '',
      title:          o.title,
      description:    o.description ?? '',
      category:       o.category,
      priority:       o.priority,
      estimated_cost: o.estimated_cost || '',
      scheduled_at:   o.scheduled_at ?? '',
    });
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  openDetail(o: WorkOrder): void {
    this.editingOrder.set(o);
    this.detailTab = 'info';
    this.clearAllPreviews();
    this.detailOpen = true;
    this.cdr.detectChanges();
  }

  openAssign(o: WorkOrder): void {
    this.loadDropdownData();
    this.editingOrder.set(o);
    this.assignForm.reset({ contractor_id: o.contractor?.id ?? '' });
    this.assignOpen = true;
    this.cdr.detectChanges();
  }

  openComplete(o: WorkOrder): void {
    this.editingOrder.set(o);
    this.completeForm.reset({ actual_cost: o.estimated_cost || '' });
    this.completeOpen = true;
    this.cdr.detectChanges();
  }

  closeAll(): void {
    this.drawerOpen   = false;
    this.detailOpen   = false;
    this.assignOpen   = false;
    this.completeOpen = false;
    this.editingOrder.set(null);
    this.clearAllPreviews();
    this.cdr.detectChanges();
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const editing = this.editingOrder();
    const payload = { ...this.form.value };
    if (!payload.estimated_cost) delete payload.estimated_cost;
    if (!payload.scheduled_at)   delete payload.scheduled_at;

    const req$ = editing
      ? this.http.put<any>(`${this.api}/work-orders/${editing.id}`, payload)
      : this.http.post<any>(`${this.api}/work-orders`, payload);

    req$.subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Succès', detail: res.message });
        this.saving.set(false);
        this.closeAll();
        this.loadAll();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' });
        this.saving.set(false);
      }
    });
  }

  saveAssign(): void {
    if (this.assignForm.invalid) { this.assignForm.markAllAsTouched(); return; }
    this.saving.set(true);
    const id = this.editingOrder()!.id;
    const payload = { ...this.assignForm.value };
    if (!payload.scheduled_at) delete payload.scheduled_at;

    this.http.post<any>(`${this.api}/work-orders/${id}/assign`, payload).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Assigné', detail: res.message });
        this.saving.set(false);
        this.closeAll();
        this.loadAll();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' });
        this.saving.set(false);
      }
    });
  }

  saveComplete(): void {
    this.saving.set(true);
    const id = this.editingOrder()!.id;
    const payload = { ...this.completeForm.value };
    if (!payload.actual_cost)  delete payload.actual_cost;
    if (!payload.completed_at) delete payload.completed_at;

    this.http.post<any>(`${this.api}/work-orders/${id}/complete`, payload).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Terminé', detail: res.message });
        this.saving.set(false);
        this.closeAll();
        this.loadAll();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' });
        this.saving.set(false);
      }
    });
  }

  confirmDelete(o: WorkOrder): void {
    this.confirm.confirm({
      message: `Supprimer <strong>${o.title}</strong> ?`,
      header: 'Confirmer',
      icon: 'pi pi-trash',
      acceptLabel: 'Supprimer', rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.http.delete<any>(`${this.api}/work-orders/${o.id}`).subscribe({
        next: (res: any) => {
          this.toast.add({ severity: 'success', summary: 'Supprimé', detail: res.message });
          this.loadAll();
        },
        error: (err: any) => this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Impossible.' })
      })
    });
  }

  // ── PHOTOS ────────────────────────────────────────────────

  onFilesSelected(event: Event, type: 'before' | 'after'): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files   = Array.from(input.files);
    const maxSize = 5 * 1024 * 1024;
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

    const valid = files.filter(f => {
      if (!allowed.includes(f.type)) {
        this.toast.add({ severity: 'warn', summary: 'Format invalide', detail: `${f.name} non supporté` });
        return false;
      }
      if (f.size > maxSize) {
        this.toast.add({ severity: 'warn', summary: 'Trop lourd', detail: `${f.name} : max 5MB` });
        return false;
      }
      return true;
    });

    if (!valid.length) return;

    const order    = this.editingOrder();
    const existing = type === 'before'
      ? (order?.photos_before ?? []).length
      : (order?.photos_after  ?? []).length;
    const remaining = 10 - existing;
    const toAdd = valid.slice(0, remaining);

    if (type === 'before') {
      this.selectedBefore = toAdd;
      this.previewBefore  = [];
      toAdd.forEach(f => { const r = new FileReader(); r.onload = e => { this.previewBefore.push(e.target?.result as string); this.cdr.detectChanges(); }; r.readAsDataURL(f); });
    } else {
      this.selectedAfter = toAdd;
      this.previewAfter  = [];
      toAdd.forEach(f => { const r = new FileReader(); r.onload = e => { this.previewAfter.push(e.target?.result as string); this.cdr.detectChanges(); }; r.readAsDataURL(f); });
    }

    input.value = '';
    this.cdr.detectChanges();
  }

  uploadPhotos(type: 'before' | 'after'): void {
    const files = type === 'before' ? this.selectedBefore : this.selectedAfter;
    if (!files.length) return;
    const order = this.editingOrder();
    if (!order) return;

    if (type === 'before') this.uploadingBefore.set(true);
    else                   this.uploadingAfter.set(true);

    const formData = new FormData();
    formData.append('type', type);
    files.forEach(f => formData.append('photos[]', f, f.name));

    this.http.post<any>(`${this.api}/work-orders/${order.id}/photos`, formData).subscribe({
      next: (res: any) => {
        const updated: WorkOrder = res.data;
        this.editingOrder.set(updated);
        this.orders.update(list => list.map(o => o.id === updated.id ? updated : o));

        if (type === 'before') { this.selectedBefore = []; this.previewBefore = []; this.uploadingBefore.set(false); }
        else                   { this.selectedAfter  = []; this.previewAfter  = []; this.uploadingAfter.set(false);  }

        this.toast.add({ severity: 'success', summary: 'Succès', detail: res.message });
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Upload échoué.' });
        if (type === 'before') this.uploadingBefore.set(false);
        else                   this.uploadingAfter.set(false);
      }
    });
  }

  deletePhoto(photo: WorkPhoto, type: 'before' | 'after'): void {
    const order = this.editingOrder();
    if (!order) return;

    this.confirm.confirm({
      message: 'Supprimer cette photo ?',
      header: 'Confirmer',
      icon: 'pi pi-trash',
      acceptLabel: 'Supprimer', rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.http.delete<any>(`${this.api}/work-orders/${order.id}/photos/${photo.id}?type=${type}`).subscribe({
          next: (res: any) => {
            const updated = {
              ...order,
              photos_before: type === 'before' ? order.photos_before.filter(p => p.id !== photo.id) : order.photos_before,
              photos_after:  type === 'after'  ? order.photos_after.filter(p => p.id !== photo.id)  : order.photos_after,
            };
            this.editingOrder.set(updated);
            this.orders.update(list => list.map(o => o.id === updated.id ? updated : o));
            this.toast.add({ severity: 'success', summary: 'Supprimée', detail: res.message });
            this.cdr.detectChanges();
          },
          error: () => this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible.' })
        });
      }
    });
  }

  clearAllPreviews(): void {
    this.selectedBefore = []; this.previewBefore = [];
    this.selectedAfter  = []; this.previewAfter  = [];
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  photoCount(o: WorkOrder): number {
    return (o.photos_before?.length ?? 0) + (o.photos_after?.length ?? 0);
  }

  // ── Filtres ───────────────────────────────────────────────
  onSearch(e: Event):         void { this.search.set((e.target as HTMLInputElement).value); }
  onFilterStatus(e: Event):   void { this.filterStatus.set((e.target as HTMLSelectElement).value); }
  onFilterPriority(e: Event): void { this.filterPriority.set((e.target as HTMLSelectElement).value); }

  // ── Labels ────────────────────────────────────────────────
  statusLabel(s: string): string {
    return ({ reported: 'Signalé', assigned: 'Assigné', in_progress: 'En cours', completed: 'Terminé', cancelled: 'Annulé' } as any)[s] ?? s;
  }
  statusClass(s: string): string {
    return ({ reported: 'badge-blue', assigned: 'badge-gold', in_progress: 'badge-purple', completed: 'badge-success', cancelled: 'badge-neutral' } as any)[s] ?? '';
  }
  priorityLabel(p: string): string {
    return ({ low: 'Basse', medium: 'Moyenne', high: 'Haute', urgent: 'Urgente' } as any)[p] ?? p;
  }
  priorityClass(p: string): string {
    return ({ low: 'priority-low', medium: 'priority-medium', high: 'priority-high', urgent: 'priority-urgent' } as any)[p] ?? '';
  }
  categoryLabel(c: string): string {
    return ({ urgence: 'Urgence', entretien: 'Entretien', renovation: 'Rénovation', sinistre: 'Sinistre', autre: 'Autre' } as any)[c] ?? c;
  }
  formatDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  formatCurrency(n: number): string {
    return Number(n).toLocaleString('fr-SN') + ' F';
  }

  propertyOptions   = computed(() => this.properties().map(p => ({ label: p.name ?? p.reference, value: p.id })));
  contractorOptions = computed(() => this.contractors().map(c => ({ label: `${c.name} — ${c.specialty}`, value: c.id })));

  get statsReported():   number { return this.orders().filter(o => o.status === 'reported').length; }
  get statsInProgress(): number { return this.orders().filter(o => o.status === 'in_progress' || o.status === 'assigned').length; }
  get statsCompleted():  number { return this.orders().filter(o => o.status === 'completed').length; }
  get statsUrgent():     number { return this.orders().filter(o => o.priority === 'urgent' && o.status !== 'completed').length; }
}