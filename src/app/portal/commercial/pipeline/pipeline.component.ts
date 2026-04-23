import {
  Component, OnInit, signal, computed, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { InputNumberModule } from 'primeng/inputnumber';

export interface Prospect {
  id: number;
  commercial_id: number;
  agency_name: string;
  contact_name: string;
  phone: string;
  phone_2: string | null;
  email: string | null;
  zone: string | null;
  city: string | null;
  country: string;
  estimated_properties: number;
  estimated_revenue: number;
  status: string;
  temperature: string;
  score: number;
  source: string | null;
  notes: string | null;
  next_followup_date: string | null;
  converted_agency_id: number | null;
  created_at: string;
  updated_at: string;
  commercial?: { first_name: string; last_name: string };
  activities?: Activity[];
}

export interface Activity {
  id: number;
  prospect_id: number;
  user_id: number;
  type: string;
  title: string;
  description: string | null;
  outcome: string | null;
  activity_date: string;
  next_action_date: string | null;
  next_action_note: string | null;
  user?: { first_name: string; last_name: string };
}

@Component({
  selector: 'app-pipeline',
  standalone: true,
  imports: [CommonModule, FormsModule, InputNumberModule],
  templateUrl: './pipeline.component.html',
  styleUrls: ['./pipeline.component.scss'],
})
export class PipelineComponent implements OnInit {
  private api = `${environment.apiUrl}/commercial`;

  // ── State ──
  prospects   = signal<Prospect[]>([]);
  stats       = signal<any>(null);
  loading     = signal(true);
  saving      = signal(false);
  drawerOpen  = false;
  detailOpen  = false;
  activityDrawerOpen = false;

  selectedProspect = signal<Prospect | null>(null);
  activities       = signal<Activity[]>([]);
  loadingActivities = signal(false);

  searchTerm  = signal('');
  filterTemp  = signal('');
  filterStatus = signal('');

  // ── Kanban columns ──
  columns = [
    { key: 'new',         label: 'Nouveau',       color: '#6c757d' },
    { key: 'contacted',   label: 'Contacté',      color: '#0d6efd' },
    { key: 'demo',        label: 'Démo',          color: '#fd7e14' },
    { key: 'proposal',    label: 'Proposition',   color: '#6f42c1' },
    { key: 'negotiation', label: 'Négociation',   color: '#20c997' },
    { key: 'won',         label: 'Gagné ✓',       color: '#198754' },
    { key: 'lost',        label: 'Perdu',         color: '#dc3545' },
  ];

  // ── Filtered list ──
  filteredProspects = computed(() => {
    let list = this.prospects();
    const s  = this.searchTerm().toLowerCase().trim();
    const t  = this.filterTemp();
    const st = this.filterStatus();

    if (s) list = list.filter(p =>
      p.agency_name.toLowerCase().includes(s) ||
      p.contact_name.toLowerCase().includes(s) ||
      (p.city ?? '').toLowerCase().includes(s) ||
      p.phone.includes(s)
    );
    if (t)  list = list.filter(p => p.temperature === t);
    if (st) list = list.filter(p => p.status === st);
    return list;
  });

  // ── Kanban grouped ──
  columnProspects = computed((): Record<string, Prospect[]> => {
    const map: Record<string, Prospect[]> = {};
    for (const col of this.columns) {
      map[col.key] = this.filteredProspects().filter(p => p.status === col.key);
    }
    return map;
  });

  // ── Form ──
  form: Partial<Prospect> & { id?: number } = {};
  isEdit = false;

  // ── Status change ──
  statusChangeProspect = signal<Prospect | null>(null);
  statusChangeForm = { status: '', note: '', next_followup_date: '' };

  // ── Activity form ──
  activityForm = {
    type: 'call',
    title: '',
    description: '',
    outcome: '',
    activity_date: new Date().toISOString().slice(0, 16),
    next_action_date: '',
    next_action_note: '',
  };

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadAll();
    this.loadStats();
  }

  loadAll(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/prospects`).subscribe({
      next: (res: any) => {
        this.prospects.set(res?.data?.prospects ?? []);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false),
    });
  }

  loadStats(): void {
    this.http.get<any>(`${this.api}/pipeline/dashboard`).subscribe({
      next: (res: any) => { this.stats.set(res?.data ?? null); this.cdr.detectChanges(); }
    });
  }

  // ── Drawer create/edit ──
  openCreate(): void {
    this.isEdit = false;
    this.form = { country: 'Sénégal', estimated_properties: 0, estimated_revenue: 0 };
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  openEdit(p: Prospect): void {
    this.isEdit = true;
    this.form = { ...p };
    this.drawerOpen = true;
    this.detailOpen = false;
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.cdr.detectChanges();
  }

  save(): void {
    if (this.saving()) return;
    this.saving.set(true);

    const obs = this.isEdit
      ? this.http.put<any>(`${this.api}/prospects/${this.form['id']}`, this.form)
      : this.http.post<any>(`${this.api}/prospects`, this.form);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.drawerOpen = false;
        this.loadAll();
        this.loadStats();
      },
      error: () => this.saving.set(false),
    });
  }

  // ── Detail sidebar ──
  openDetail(p: Prospect): void {
    this.selectedProspect.set(p);
    this.detailOpen = true;
    this.loadActivities(p.id);
    this.cdr.detectChanges();
  }

  closeDetail(): void {
    this.detailOpen = false;
    this.selectedProspect.set(null);
    this.cdr.detectChanges();
  }

  loadActivities(id: number): void {
    this.loadingActivities.set(true);
    this.http.get<any>(`${this.api}/prospects/${id}/activities`).subscribe({
      next: (res: any) => {
        this.activities.set(res?.data ?? []);
        this.loadingActivities.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loadingActivities.set(false),
    });
  }

  // ── Status change ──
  openStatusChange(p: Prospect): void {
    this.statusChangeProspect.set(p);
    this.statusChangeForm = { status: p.status, note: '', next_followup_date: '' };
    this.cdr.detectChanges();
  }

  closeStatusChange(): void {
    this.statusChangeProspect.set(null);
    this.cdr.detectChanges();
  }

  confirmStatusChange(): void {
    const p = this.statusChangeProspect();
    if (!p) return;
    this.http.patch<any>(`${this.api}/prospects/${p.id}/status`, this.statusChangeForm).subscribe({
      next: (res: any) => {
        this.statusChangeProspect.set(null);
        const updated = res?.data;
        if (updated) {
          this.prospects.update(list => list.map(x => x.id === updated.id ? updated : x));
          if (this.selectedProspect()?.id === updated.id) {
            this.selectedProspect.set(updated);
          }
        }
        this.loadStats();
        this.cdr.detectChanges();
      },
    });
  }

  // ── Activity drawer ──
  openActivityDrawer(): void {
    this.activityForm = {
      type: 'call', title: '', description: '', outcome: '',
      activity_date: new Date().toISOString().slice(0, 16),
      next_action_date: '', next_action_note: '',
    };
    this.activityDrawerOpen = true;
    this.cdr.detectChanges();
  }

  closeActivityDrawer(): void {
    this.activityDrawerOpen = false;
    this.cdr.detectChanges();
  }

  saveActivity(): void {
    const p = this.selectedProspect();
    if (!p) return;
    this.http.post<any>(`${this.api}/prospects/${p.id}/activities`, this.activityForm).subscribe({
      next: () => {
        this.activityDrawerOpen = false;
        this.loadActivities(p.id);
      },
    });
  }

  // ── Delete ──
  deleteProspect(p: Prospect): void {
    if (!confirm(`Supprimer ${p.agency_name} ?`)) return;
    this.http.delete<any>(`${this.api}/prospects/${p.id}`).subscribe({
      next: () => {
        this.prospects.update(list => list.filter(x => x.id !== p.id));
        if (this.detailOpen && this.selectedProspect()?.id === p.id) {
          this.closeDetail();
        }
        this.loadStats();
        this.cdr.detectChanges();
      },
    });
  }

  // ── Helpers ──
  formatCurrency(n: number): string {
    return new Intl.NumberFormat('fr-SN').format(n) + ' F';
  }

  tempLabel(t: string): string {
    return t === 'hot' ? '🔥 Chaud' : t === 'warm' ? '🌤 Tiède' : '❄ Froid';
  }

  tempClass(t: string): string {
    return t === 'hot' ? 'temp-hot' : t === 'warm' ? 'temp-warm' : 'temp-cold';
  }

  sourceLabel(s: string | null): string {
    const map: Record<string, string> = {
      referral: 'Référence', linkedin: 'LinkedIn', cold_call: 'Appel direct',
      event: 'Événement', other: 'Autre',
    };
    return s ? (map[s] ?? s) : '-';
  }

  activityTypeLabel(t: string): string {
    const map: Record<string, string> = {
      call: 'Appel', email: 'Email', meeting: 'Réunion', demo: 'Démo',
      proposal: 'Proposition', note: 'Note', followup: 'Relance', status_change: 'Changement statut',
    };
    return map[t] ?? t;
  }

  activityTypeIcon(t: string): string {
    const map: Record<string, string> = {
      call: 'pi pi-phone', email: 'pi pi-envelope', meeting: 'pi pi-users',
      demo: 'pi pi-desktop', proposal: 'pi pi-file', note: 'pi pi-pencil',
      followup: 'pi pi-refresh', status_change: 'pi pi-sync',
    };
    return map[t] ?? 'pi pi-circle';
  }

  isToday(dateStr: string | null): boolean {
    if (!dateStr) return false;
    return dateStr.slice(0, 10) === new Date().toISOString().slice(0, 10);
  }

  isOverdue(dateStr: string | null): boolean {
    if (!dateStr) return false;
    return dateStr.slice(0, 10) < new Date().toISOString().slice(0, 10);
  }
}
