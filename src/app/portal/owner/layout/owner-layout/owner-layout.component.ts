import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-owner-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './owner-layout.component.html',
  styleUrls: ['./owner-layout.component.scss'],
})
export class OwnerLayoutComponent {
  sidebarCollapsed = signal(false);

  navItems = [
    { label: 'Tableau de bord', icon: 'pi pi-home',      route: '/portail-proprietaire/dashboard' },
    { label: 'Mes biens',       icon: 'pi pi-building',   route: '/portail-proprietaire/biens' },
    { label: 'Échéances',       icon: 'pi pi-calendar',   route: '/portail-proprietaire/echeances' },
    { label: 'Mes relevés',     icon: 'pi pi-file-pdf',   route: '/portail-proprietaire/releves' },
  ];

  constructor(public auth: AuthService) {}

  toggleSidebar(): void { this.sidebarCollapsed.set(!this.sidebarCollapsed()); }
  logout(): void { this.auth.logout(); }

  get userName(): string {
    const u = this.auth.user();
    return u ? ((u as any).first_name ?? u.name ?? 'Propriétaire') : 'Propriétaire';
  }

  get userInitials(): string {
    const u = this.auth.user();
    if (!u) return '?';
    return `${((u as any).first_name?.[0] ?? '')}${((u as any).last_name?.[0] ?? '')}`.toUpperCase();
  }
}