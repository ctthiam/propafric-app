import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { SkeletonModule } from 'primeng/skeleton';

interface AgencyInfo {
  id: number; name: string; email: string; phone: string | null;
  address: string | null; city: string | null; country: string | null;
  plan: string; status: string; trial_ends_at: string | null;
  subscription_ends_at: string | null; max_properties: number | null;
  ninea: string | null; rc_number: string | null;
  created_at: string; users_count: number; properties_count: number;
}

interface FinancialStats {
  total_rent_collected: number; total_management_fees: number;
  total_expenses: number; total_expected: number;
  total_paid: number; recovery_rate: number;
}

interface MonthlyPayment { month: string; count: number; total: number; }

interface RecentPayment {
  id: number; amount: number; payment_date: string;
  payment_method: string; reference: string;
  tenant_name: string; property_name: string;
}

interface RecentStatement {
  id: number; period_label: string; total_rent_collected: number;
  total_management_fees_ttc: number; final_net_amount: number;
  status: string; generated_at: string; owner_name: string;
}

interface Property {
  id: number; reference: string; name: string;
  type: string; status: string; address: string; city: string;
}

interface ActiveLease {
  id: number; start_date: string; end_date: string | null;
  total_rent: number; tenant_name: string;
  property_name: string; property_reference: string;
}

interface TeamMember {
  id: number; first_name: string; last_name: string;
  email: string; role: string; is_active: boolean;
  last_login_at: string | null; created_at: string;
}

interface Subscription {
  id: number; plan: string; amount: number; status: string;
  started_at: string | null; ends_at: string | null; paid_at: string | null;
}

interface AgencyDetailData {
  agency: AgencyInfo;
  stats: { leases: number; active_leases: number; payments: number; statements: number; owners: number; tenants: number; last_login: string | null; };
  financials: FinancialStats;
  monthly_payments: MonthlyPayment[];
  recent_payments: RecentPayment[];
  recent_statements: RecentStatement[];
  properties: Property[];
  active_leases: ActiveLease[];
  team: TeamMember[];
  subscriptions: Subscription[];
}

@Component({
  selector: 'app-super-agency-detail',
  standalone: true,
  imports: [CommonModule, SkeletonModule, RouterLink],
  templateUrl: './super-agency-detail.component.html',
  styleUrls: ['./super-agency-detail.component.scss'],
})
export class SuperAgencyDetailComponent implements OnInit {
  private apiUrl = `${environment.apiUrl}/agency/super-admin`;

  data    = signal<AgencyDetailData | null>(null);
  loading = signal(true);
  error   = signal('');

  chartMax = computed(() => {
    const mp = this.data()?.monthly_payments ?? [];
    return mp.length ? Math.max(...mp.map(m => +m.total), 1) : 1;
  });

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/super-admin/agences']); return; }
    this.load(+id);
  }

  load(id: number): void {
    this.loading.set(true);
    this.http.get<any>(`${this.apiUrl}/agencies/${id}/financials`).subscribe({
      next: (res) => { this.data.set(res.data); this.loading.set(false); },
      error: () => { this.error.set('Impossible de charger les données.'); this.loading.set(false); },
    });
  }

  barH(total: number): number {
    const max = this.chartMax();
    return max > 0 ? Math.round((+total / max) * 120) : 4;
  }

  monthLabel(m: string): string {
    const [y, mo] = m.split('-');
    const names = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return (names[+mo - 1] ?? mo) + " '" + y.slice(2);
  }

  formatCurrency(n: number): string {
    if (!n && n !== 0) return '—';
    return new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);
  }

  formatDate(d: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  relativeTime(d: string | null): string {
    if (!d) return 'Jamais';
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (days === 0)  return "Aujourd'hui";
    if (days === 1)  return 'Hier';
    if (days < 7)   return `Il y a ${days}j`;
    if (days < 30)  return `Il y a ${Math.floor(days / 7)} sem.`;
    if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
    return `Il y a ${Math.floor(days / 365)} an(s)`;
  }

  planLabel(p: string): string {
    return ({ starter: 'Starter', pro: 'Pro', partner: 'Partenaire', premium: 'Premium', enterprise: 'Entreprise' } as any)[p] ?? p;
  }
  planClass(p: string): string {
    return ({ starter: 'badge-neutral', pro: 'badge-blue', partner: 'badge-gold', premium: 'badge-purple', enterprise: 'badge-purple' } as any)[p] ?? 'badge-neutral';
  }
  statusLabel(s: string): string {
    return ({ active: 'Actif', trial: 'Essai', suspended: 'Suspendu', cancelled: 'Annulé', pending: 'En attente' } as any)[s] ?? s;
  }
  statusClass(s: string): string {
    return ({ active: 'badge-success', trial: 'badge-warning', suspended: 'badge-danger', cancelled: 'badge-neutral', pending: 'badge-pending' } as any)[s] ?? 'badge-neutral';
  }
  propStatusLabel(s: string): string {
    return ({ occupied: 'Occupé', available: 'Disponible', maintenance: 'Travaux' } as any)[s] ?? s;
  }
  propStatusClass(s: string): string {
    return ({ occupied: 'badge-success', available: 'badge-blue', maintenance: 'badge-warning' } as any)[s] ?? 'badge-neutral';
  }
  stmtStatusLabel(s: string): string {
    return ({ generated: 'Généré', paid: 'Payé', pending: 'En attente' } as any)[s] ?? s;
  }
  stmtStatusClass(s: string): string {
    return ({ generated: 'badge-blue', paid: 'badge-success', pending: 'badge-warning' } as any)[s] ?? 'badge-neutral';
  }
  roleLabel(r: string): string {
    return ({ agency_admin: 'Administrateur', agency_secretary: 'Secrétaire', agency_manager: 'Gestionnaire' } as any)[r] ?? r;
  }
  subStatusClass(s: string): string {
    return ({ active: 'badge-success', completed: 'badge-neutral', pending: 'badge-warning', failed: 'badge-danger' } as any)[s] ?? 'badge-neutral';
  }

  get initials(): string {
    const name = this.data()?.agency?.name ?? '';
    return name.substring(0, 2).toUpperCase();
  }
}
