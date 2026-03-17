import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-tenant-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './tenant-layout.component.html',
  styleUrls: ['./tenant-layout.component.scss'],
})
export class TenantLayoutComponent implements OnInit {
  sidebarCollapsed = signal(false);

  navItems = [
  { label: 'Tableau de bord', icon: 'pi pi-home',        route: '/portail-locataire/dashboard' },
  { label: 'Mon bail',        icon: 'pi pi-file',         route: '/portail-locataire/bail' },
  { label: 'Mes échéances',   icon: 'pi pi-calendar',     route: '/portail-locataire/echeances' },
  { label: 'Mes quittances',  icon: 'pi pi-file-pdf',     route: '/portail-locataire/quittances' },
  { label: 'Signalements',    icon: 'pi pi-wrench',       route: '/portail-locataire/signalements' },
  { label: 'Messages',        icon: 'pi pi-comments',     route: '/portail-locataire/messages' },
];

  constructor(
    public auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {}

  toggleSidebar(): void {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }

  logout(): void {
    this.auth.logout();
  }

  get userName(): string {
    const u = this.auth.user();
    return u ? `${(u as any).first_name ?? u.name ?? ''}` : 'Locataire';
  }

  get userInitials(): string {
    const u = this.auth.user();
    if (!u) return '?';
    const name = (u as any).first_name ?? u.name ?? '';
    const last  = (u as any).last_name ?? '';
    return `${name[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
  }
}