import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  HostListener,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { isPlatformBrowser, NgClass, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {

  // ── State ──
  isScrolled   = false;
  pricingMode: 'mensuel' | 'annuel' = 'mensuel';
  mouseX = 0;
  mouseY = 0;
  ringX  = 0;
  ringY  = 0;

  private rafId: number | null = null;
  private revealObserver: IntersectionObserver | null = null;
  private statsObserver:  IntersectionObserver | null = null;
  private isBrowser: boolean;

  // ── Pricing data ──
  plans = [
    {
      id: 'starter',
      name: 'Starter',
      priceMonthly: '10 000',
      priceAnnual:  '100 000',
      period: 'FCFA / mois · jusqu\'à 10 biens',
      desc: 'Idéal pour les petites agences qui démarrent leur digitalisation.',
      features: [
        'Baux + échéances + paiements',
        'Quittances PDF automatiques',
        'Relevés propriétaires PDF',
        'Gestion dépenses & prestataires',
        'Portail locataire',
        '1 utilisateur agence',
        'Support prioritaire',
      ],
      popular: false,
      cta: 'Commencer',
      ctaStyle: 'outline',
    },
    {
      id: 'pro',
      name: 'Professionnel',
      priceMonthly: '25 000',
      priceAnnual:  '250 000',
      period: 'FCFA / mois · jusqu\'à 50 biens',
      desc: 'Pour les agences en croissance qui veulent tout gérer depuis une seule plateforme.',
      features: [
        'Tout le plan Starter',
        'Portail propriétaire',
        'Exports Excel (5 types)',
        'Gestion dépenses & prestataires',
        '3 utilisateurs agence',
        'Sous-profils utilisateurs (secrétaires, comptables…)',
        'Messagerie interne',
        'Support dédié',
      ],
      popular: true,
      cta: 'Commencer',
      ctaStyle: 'white',
    },
    {
      id: 'enterprise',
      name: 'Entreprise',
      priceMonthly: null,
      priceAnnual:  null,
      period: 'Biens illimités · Multi-agences',
      desc: 'Pour les grands groupes immobiliers et les réseaux d\'agences en Afrique de l\'Ouest.',
      features: [
        'Tout le plan Professionnel', 
        'Biens illimités',
        'Multi-agences (réseau)',
        'API access',
        'Intégration Paiement en ligne/Wave/OM...',
        'Gestion immeubles (unités)',
        'Onboarding dédié',
        'Rapports avancés',
        'SLA garanti',
      ],
      popular: false,
      cta: 'Nous contacter',
      ctaStyle: 'outline',
    },
  ];

  // ── Features ──
  features = [
    {
      icon: '🏘️', num: '01',
      title: 'Gestion complète des baux',
      text: 'Créez vos contrats en quelques minutes. TOM automatique, frais de gestion TTC, révision triennale ANSD, contrat PDF prêt à signer.',
      featured: true, tag: '⭐ Fonctionnalité phare',
    },
    {
      icon: '🧾', num: '02',
      title: 'Quittances PDF automatiques',
      text: 'Quittance générée à chaque paiement. Wave, Orange Money, Free Money — tous les modes acceptés.',
      featured: false,
    },
    {
      icon: '📊', num: '03',
      title: 'Relevés propriétaires',
      text: 'Relevé mensuel net propriétaire : loyers − TOM − frais − dépenses − frais d\'envoi + avoir.',
      featured: false,
    },
    {
      icon: '🔔', num: '04',
      title: 'Alertes & rappels automatiques',
      text: 'Rappels loyers J-3, alertes retards, fin de bail, révision triennale, assurance expirée.',
      featured: false,
    },
    {
      icon: '🏢', num: '05',
      title: 'Multi-agences & multi-biens',
      text: 'Architecture multi-tenant — chaque agence isolée. Immeubles avec unités individuelles.',
      featured: false,
    },
    {
      icon: '📱', num: '06',
      title: 'Portails dédiés',
      text: 'Portail propriétaire pour biens, relevés et dépenses. Portail locataire pour bails et quittances.',
      featured: false,
    },
    {
      icon: '💼', num: '07',
      title: 'Gestion des dépenses',
      text: 'Travaux, entretien, assurance — chaque dépense liée à un bien et imputée automatiquement.',
      featured: false,
    },
    {
      icon: '📥', num: '08',
      title: 'Exports Excel & PDF',
      text: 'Baux, paiements, échéances, dépenses et propriétaires en Excel formaté.',
      featured: false,
    },
  ];

  // ── Testimonials ──
  testimonials = [
    {
      quote: 'PropAfric a transformé notre façon de gérer nos 80 biens. Les relevés propriétaires qu\'on faisait à la main en 3 jours, maintenant c\'est 10 minutes.',
      name: 'Aïda Mbodji',
      role: 'Directeur — Citron Vert Immobilier, Dakar',
      initials: 'AM',
      featured: false,
    },
    {
      quote: 'Le portail propriétaire, c\'est ce qui nous a fait choisir PropAfric. Nos clients ne nous appellent plus pour savoir où en sont leurs loyers.',
      name: 'Mariama Isabelle Diallo',
      role: 'Gérante — Prestige Realty, Dakar',
      initials: 'MI',
      featured: true,
    },
    {
      quote: 'PropAfric nous a permis de professionnaliser notre gestion locative. La génération automatique des quittances et le suivi des impayés ont changé notre quotidien. Je le recommande à toutes les agences.',
      name: 'Aboubacar',
      role: 'Directeur — GESIB Immo, Dakar',
      initials: 'AB',
      featured: false,
    },
  ];

  // ── Dashboard rows ──
  dashboardRows = [
    { name: 'Almadies — Apt. RDC',    amount: '215 260 F', dot: 'dot-green', late: false },
    { name: 'Plateau — Villa duplex', amount: '380 000 F', dot: 'dot-green', late: false },
    { name: 'Mermoz — Bureau S3',     amount: '480 000 F', dot: 'dot-gold',  late: false },
    { name: 'Ouakam — Apt. F4',       amount: 'En retard',  dot: 'dot-red',   late: true  },
  ];

  // ── Pain points ──
  painPoints = [
    { icon: '📋', title: 'Baux gérés sur papier ou Excel',    text: 'Risques d\'erreurs, révisions oubliées, pas de traçabilité.' },
    { icon: '💸', title: 'Calcul TOM et TVA manuel',           text: 'Erreurs fréquentes sur les 3,6% et la TVA 18% sur frais de gestion.' },
    { icon: '📞', title: 'Propriétaires qui appellent tout le temps', text: 'Sans portail dédié, ils ne savent pas ce qui se passe avec leurs biens.' },
    { icon: '⏰', title: 'Relances loyers chronophages',       text: 'Sans automatisation, chaque impayé demande une intervention manuelle.' },
  ];

  // ── Solution cards ──
  solutionCards = [
    { icon: '⚡', title: 'Automatisation complète',   text: 'Génération automatique des échéances, rappels, quittances PDF en un clic. Zéro saisie répétitive.' },
    { icon: '🧮', title: 'Calculs conformes OHADA',   text: 'TOM, TVA sur frais de gestion, révision triennale ANSD — tout calculé automatiquement.' },
    { icon: '👥', title: 'Portails propriétaires & locataires', text: 'Chaque partie accède à son espace personnel. Relevés, quittances, baux — disponibles 24h/24.' },
    { icon: '📊', title: 'Tableaux de bord en temps réel', text: 'Taux d\'occupation, collecte mensuelle, alertes retards — votre agence pilotée par la donnée.' },
  ];

  // ── Stats ──
  stats = [
    { value: '50+',  label: 'Agences actives au Sénégal & Afrique de l\'Ouest' },
    { value: '2K+',  label: 'Baux gérés sur la plateforme' },
    { value: '98%',  label: 'Taux de satisfaction client' },
    { value: '5h',   label: 'Économisées par semaine par agence en moyenne' },
  ];

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.initCursor();
    this.initRevealObserver();
  }

  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.revealObserver?.disconnect();
    this.statsObserver?.disconnect();
  }

  // ── Scroll ──
  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled = window.scrollY > 40;
  }

  // ── Mouse ──
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    const cursor = document.getElementById('pa-cursor');
    if (cursor) cursor.style.transform = `translate(${this.mouseX - 6}px, ${this.mouseY - 6}px)`;
  }

  private initCursor(): void {
    const ring = document.getElementById('pa-cursor-ring');
    if (!ring) return;

    const animate = () => {
      this.ringX += (this.mouseX - this.ringX - 18) * 0.12;
      this.ringY += (this.mouseY - this.ringY - 18) * 0.12;
      ring.style.transform = `translate(${this.ringX}px, ${this.ringY}px)`;
      this.rafId = requestAnimationFrame(animate);
    };
    animate();

    document.querySelectorAll('a, button, .feature-card, .solution-card, .pricing-card').forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('hovering'));
      el.addEventListener('mouseleave', () => ring.classList.remove('hovering'));
    });
  }

  private initRevealObserver(): void {
    this.revealObserver = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(el => this.revealObserver!.observe(el));
  }

  // ── Pricing toggle ──
  setPricingMode(mode: 'mensuel' | 'annuel'): void {
    this.pricingMode = mode;
  }

  getPlanPrice(plan: typeof this.plans[0]): string {
    if (!plan.priceMonthly) return 'Sur mesure';
    return this.pricingMode === 'mensuel' ? plan.priceMonthly : plan.priceAnnual!;
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}