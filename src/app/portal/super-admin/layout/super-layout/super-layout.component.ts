import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-super-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './super-layout.component.html',
  styleUrls: ['./super-layout.component.scss'],
})
export class SuperLayoutComponent {
  sidebarCollapsed = signal(false);

  navItems = [
    { label: 'Dashboard',  icon: 'pi pi-home',       route: '/super-admin/dashboard' },
    { label: 'Agences',    icon: 'pi pi-building',    route: '/super-admin/agences' },
  ];

  constructor(public auth: AuthService) {}

  toggleSidebar(): void { this.sidebarCollapsed.set(!this.sidebarCollapsed()); }
  logout(): void { this.auth.logout(); }

  get userInitials(): string {
    const u = this.auth.user();
    if (!u) return 'SA';
    return `${((u as any).first_name?.[0] ?? 'S')}${((u as any).last_name?.[0] ?? 'A')}`.toUpperCase();
  }
}