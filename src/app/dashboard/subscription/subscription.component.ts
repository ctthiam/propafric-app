import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { ToastModule }    from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { environment }    from '../../../environments/environment';

interface PlanOption {
  key: string;
  label: string;
  price_monthly: number;
  price_yearly: number;
  max_properties: string;
  features: string[];
  popular: boolean;
}

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [CommonModule, ToastModule, SkeletonModule],
  providers: [MessageService],
  templateUrl: './subscription.component.html',
  styleUrls:  ['./subscription.component.scss'],
})
export class SubscriptionComponent implements OnInit {
  private api = `${environment.apiUrl}/agency/subscription`;

  data     = signal<any>(null);
  loading  = signal(true);
  paying   = signal(false);
  period   = signal<'monthly' | 'yearly'>('monthly');
  selectedPlan = signal<string>('');

  plans: PlanOption[] = [
    {
      key: 'solo', label: 'Solo',
      price_monthly: 5000, price_yearly: 50000,
      max_properties: '5 biens',
      popular: false,
      features: ['Gestion en autonomie', 'Baux + échéances + paiements', 'Quittances PDF', 'Portail locataire', 'Support standard'],
    },
    {
      key: 'starter', label: 'Starter',
      price_monthly: 10000, price_yearly: 100000,
      max_properties: '10 biens',
      popular: false,
      features: ['Baux + échéances + paiements', 'Quittances PDF', 'Portail locataire',
                 'Relevés propriétaires', 'Gestion dépenses', 'Support prioritaire'],
    },
    {
      key: 'pro', label: 'Pro',
      price_monthly: 25000, price_yearly: 250000,
      max_properties: '50 biens',
      popular: true,
      features: ['Tout Starter', 'Portail propriétaire', 'Exports Excel',
                 'Sous-profils (secrétaire, comptable)', 'Travaux & prestataires',
                 'Messagerie interne', 'Support dédié'],
    },
    {
      key: 'premium', label: 'Premium',
      price_monthly: 50000, price_yearly: 500000,
      max_properties: 'Illimité',
      popular: false,
      features: ['Tout Pro', 'Biens illimités', 'Gestion immeubles (unités)',
                 'Rapports avancés', 'API access', 'Onboarding dédié'],
    },
  ];

  constructor(
    private http: HttpClient,
    private toast: MessageService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
    // Gérer le retour de NabooPay
    this.route.queryParams.subscribe(params => {
      if (params['status'] === 'success') {
        this.toast.add({ severity: 'success', summary: 'Paiement réussi !', detail: 'Votre abonnement a été activé.' });
        this.load();
      } else if (params['status'] === 'error') {
        this.toast.add({ severity: 'error', summary: 'Paiement échoué', detail: 'Le paiement n\'a pas pu être effectué.' });
      }
    });
  }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}`).subscribe({
      next: (res: any) => {
        this.data.set(res?.data ?? null);
        console.log('history', res?.data?.history);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false),
    });
  }

  subscribe(planKey: string): void {
    this.paying.set(true);
    this.selectedPlan.set(planKey);

    this.http.post<any>(`${this.api}/initiate`, {
      plan:   planKey,
      period: this.period(),
    }).subscribe({
      next: (res: any) => {
        this.paying.set(false);
        if (res?.data?.test_mode) {
          // Mode test — simuler l'activation
          this.toast.add({
            severity: 'info',
            summary:  'Mode test',
            detail:   'Pas de clé NabooPay configurée. Paiement simulé.',
          });
          setTimeout(() => this.load(), 1000);
          return;
        }
        // Rediriger vers NabooPay
        if (res?.data?.checkout_url) {
          window.location.href = res.data.checkout_url;
        }
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' });
        this.paying.set(false);
      }
    });
  }

  get currentPlan(): string { return this.data()?.agency?.plan ?? ''; }
  get daysLeft():    number { return this.data()?.agency?.days_left ?? 0; }
  get isExpired(): boolean {
  const status = this.data()?.agency?.status;
  if (!status || status === 'partner') return false;
  if (status === 'pending') return true;
  return this.daysLeft <= 0;
}

  price(plan: PlanOption): number {
    return this.period() === 'monthly' ? plan.price_monthly : plan.price_yearly;
  }

  formatCurrency(n: number): string {
    return new Intl.NumberFormat('fr-SN').format(n) + ' F';
  }
  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  downloadInvoice(h: any): void {
    this.http.get(`${this.api}/invoice/${h.id}`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `${h.invoice_number}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Facture introuvable.' })
    });
  }

}