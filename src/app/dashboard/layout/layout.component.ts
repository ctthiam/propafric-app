import { Component, signal, computed, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
})
export class LayoutComponent {
  collapsed = signal(false);
  mobileOpen = signal(false);

  readonly user = this.auth.user;

  navItems: NavItem[] = [
    { label: 'Tableau de bord', icon: 'pi pi-th-large',      route: '/dashboard' },
    { label: 'Propriétaires',   icon: 'pi pi-users',          route: '/dashboard/proprietaires' },
    { label: 'Biens',           icon: 'pi pi-building',       route: '/dashboard/biens' },
    { label: 'Locataires',      icon: 'pi pi-user',           route: '/dashboard/locataires' },
    { label: 'Baux',            icon: 'pi pi-file',           route: '/dashboard/baux' },
    { label: 'Paiements',       icon: 'pi pi-credit-card',    route: '/dashboard/paiements' },
    { label: 'Dépenses',        icon: 'pi pi-wallet',         route: '/dashboard/depenses' },
    { label: 'Prestataires',    icon: 'pi pi-briefcase',      route: '/dashboard/prestataires' },
    { label: 'Relevés',         icon: 'pi pi-chart-bar',      route: '/dashboard/releves' },
  ];

  constructor(private auth: AuthService) {}

  toggleSidebar(): void {
    this.collapsed.update(v => !v);
  }

  toggleMobile(): void {
    this.mobileOpen.update(v => !v);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
  }

  get userInitials(): string {
    const name = this.user()?.name ?? '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    if ((event.target as Window).innerWidth > 768) {
      this.mobileOpen.set(false);
    }
  }
}