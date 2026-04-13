import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-om-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './om-layout.component.html',
  styleUrls: ['./om-layout.component.scss'],
})
export class OmLayoutComponent {
  navigating = false;

  navItems = [
    { label: 'Tableau de bord', icon: 'pi pi-th-large',   route: '/gestionnaire/dashboard' },
    { label: 'Mes biens',       icon: 'pi pi-building',    route: '/gestionnaire/biens' },
    { label: 'Locataires',      icon: 'pi pi-user',        route: '/gestionnaire/locataires' },
    { label: 'Baux',            icon: 'pi pi-file',        route: '/gestionnaire/baux' },
    { label: 'Paiements',       icon: 'pi pi-credit-card', route: '/gestionnaire/paiements' },
    { label: 'Dépenses',        icon: 'pi pi-wallet',      route: '/gestionnaire/depenses' },
    { label: 'Support',         icon: 'pi pi-question-circle', route: '/gestionnaire/support' },
  ];

  constructor(public auth: AuthService, private router: Router) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart)   this.navigating = true;
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.navigating = false;
      }
    });
  }

  logout(): void { this.auth.logout(); }

  get userName(): string {
    const u = this.auth.user();
    return u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() : 'Gestionnaire';
  }

  get initials(): string {
    const u = this.auth.user();
    if (!u) return 'G';
    return `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase();
  }
}