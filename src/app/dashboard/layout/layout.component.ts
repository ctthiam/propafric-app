import { Component, signal, computed, HostListener, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
  badge?: string | number;
}

interface Notification {
  id: number;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
  data?: any;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
})
export class LayoutComponent implements OnInit, OnDestroy {
  private api = environment.apiUrl;
  private pollInterval: any;

  collapsed  = signal(false);
  mobileOpen = signal(false);

  // ── Notifications ──
  notifications    = signal<Notification[]>([]);
  unreadCount      = signal(0);
  notifOpen        = false;
  loadingNotifs    = false;

  readonly user = this.auth.user;

  private readonly allNavItems: NavItem[] = [
    { label: 'Tableau de bord', icon: 'pi pi-th-large',   route: '/dashboard' },
    { label: 'Propriétaires',   icon: 'pi pi-users',       route: '/dashboard/proprietaires', roles: ['agency_admin', 'agency_secretary'] },
    { label: 'Biens',           icon: 'pi pi-building',    route: '/dashboard/biens',          roles: ['agency_admin', 'agency_secretary'] },
    { label: 'Locataires',      icon: 'pi pi-user',        route: '/dashboard/locataires',     roles: ['agency_admin', 'agency_secretary'] },
    { label: 'Baux',            icon: 'pi pi-file',        route: '/dashboard/baux',           roles: ['agency_admin', 'agency_secretary'] },
    { label: 'Paiements',       icon: 'pi pi-credit-card', route: '/dashboard/paiements',      roles: ['agency_admin', 'agency_accountant'] },
    { label: 'Dépenses',        icon: 'pi pi-wallet',      route: '/dashboard/depenses',       roles: ['agency_admin', 'agency_accountant'] },
    { label: 'Prestataires',    icon: 'pi pi-briefcase',   route: '/dashboard/prestataires',   roles: ['agency_admin', 'agency_secretary', 'agency_accountant'] },
    { label: 'Travaux',         icon: 'pi pi-wrench',      route: '/dashboard/travaux',         roles: ['agency_admin', 'agency_secretary'] },
    { label: 'Relevés',         icon: 'pi pi-chart-bar',   route: '/dashboard/releves',        roles: ['agency_admin', 'agency_accountant'] },
    { label: 'Impôts fonciers', icon: 'pi pi-building',    route: '/dashboard/impots',          roles: ['agency_admin', 'agency_accountant'] },
    { label: 'Messages',        icon: 'pi pi-comments',    route: '/dashboard/messages' },
    { label: 'Abonnement',      icon: 'pi pi-credit-card', route: '/dashboard/abonnement',      roles: ['agency_admin'] },
    { label: 'Équipe',          icon: 'pi pi-users',       route: '/dashboard/equipe',         roles: ['agency_admin'] },
  ];

  filteredNavItems = computed(() => {
    const role = this.user()?.role ?? '';
    return this.allNavItems.filter(item => !item.roles || item.roles.includes(role));
  });

  constructor(
    private auth: AuthService,
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadUnreadCount();
    // Polling toutes les 60s pour le badge
    this.pollInterval = setInterval(() => this.loadUnreadCount(), 60_000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  // ── Notifications ──────────────────────────────────────────

  loadUnreadCount(): void {
    this.http.get<any>(`${this.api}/agency/notifications/unread-count`).subscribe({
      next: (res: any) => {
        this.unreadCount.set(Number(res?.data?.unread_count ?? res?.data?.count ?? 0));
        this.cdr.detectChanges();
      },
      error: () => {} // silencieux
    });
  }

  toggleNotifPanel(): void {
    this.notifOpen = !this.notifOpen;
    if (this.notifOpen && this.notifications().length === 0) {
      this.loadNotifications();
    }
    this.cdr.detectChanges();
  }

  closeNotifPanel(): void {
    this.notifOpen = false;
    this.cdr.detectChanges();
  }

  loadNotifications(): void {
    this.loadingNotifs = true;
    this.http.get<any>(`${this.api}/agency/notifications?per_page=10`).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.notifications.set(list);
        this.loadingNotifs = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loadingNotifs = false; }
    });
  }

  markAsRead(notif: Notification): void {
    if (notif.is_read) {
      this.navigateNotif(notif);
      return;
    }
    this.http.put<any>(`${this.api}/agency/notifications/${notif.id}/read`, {}).subscribe({
      next: () => {
        this.notifications.update(list =>
          list.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
        );
        this.unreadCount.update(c => Math.max(0, c - 1));
        this.navigateNotif(notif);
        this.cdr.detectChanges();
      }
    });
  }

  markAllRead(): void {
    this.http.put<any>(`${this.api}/agency/notifications/read-all`, {}).subscribe({
      next: () => {
        this.notifications.update(list => list.map(n => ({ ...n, is_read: true })));
        this.unreadCount.set(0);
        this.cdr.detectChanges();
      }
    });
  }

  private navigateNotif(notif: Notification): void {
    // Navigation contextuelle selon le type
    const routes: Record<string, string> = {
      'rent_late':         '/dashboard/paiements',
      'lease_expiry':      '/dashboard/baux',
      'lease_revision':    '/dashboard/baux',
      'payment_received':  '/dashboard/paiements',
      'work_order':        '/dashboard/travaux',
      'subscription':      '/dashboard',
    };
    const route = routes[notif.type] ?? '/dashboard';
    this.router.navigate([route]);
    this.closeNotifPanel();
  }

  notifIcon(type: string): string {
    const icons: Record<string, string> = {
      'rent_late':        'pi pi-exclamation-triangle',
      'lease_expiry':     'pi pi-calendar-times',
      'lease_revision':   'pi pi-refresh',
      'payment_received': 'pi pi-check-circle',
      'work_order':       'pi pi-wrench',
      'subscription':     'pi pi-credit-card',
    };
    return icons[type] ?? 'pi pi-bell';
  }

  notifIconClass(type: string): string {
    const classes: Record<string, string> = {
      'rent_late':        'notif-icon-red',
      'lease_expiry':     'notif-icon-orange',
      'lease_revision':   'notif-icon-blue',
      'payment_received': 'notif-icon-green',
      'work_order':       'notif-icon-purple',
      'subscription':     'notif-icon-gold',
    };
    return classes[type] ?? 'notif-icon-default';
  }

  timeAgo(date: string): string {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60)   return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    return `Il y a ${Math.floor(diff / 86400)}j`;
  }

  // ── Sidebar ────────────────────────────────────────────────

  toggleSidebar(): void { this.collapsed.update(v => !v); }
  toggleMobile():  void { this.mobileOpen.update(v => !v); }
  closeMobile():   void { this.mobileOpen.set(false); }
  logout():        void { this.auth.logout(); }

  get roleLabel(): string {
    const labels: Record<string, string> = {
      agency_admin:      'Administrateur',
      agency_secretary:  'Secrétaire',
      agency_accountant: 'Comptable',
      super_admin:       'Super Admin',
    };
    return labels[this.user()?.role ?? ''] ?? 'Agence';
  }

  get userInitials(): string {
    const u = this.user();
    const first = (u as any)?.first_name?.[0] ?? '';
    const last  = (u as any)?.last_name?.[0]  ?? '';
    return (first + last).toUpperCase() || (u?.name?.[0] ?? '?').toUpperCase();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event): void {
    const target = e.target as HTMLElement;
    if (!target.closest('.notif-wrapper')) {
      this.notifOpen = false;
      this.cdr.detectChanges();
    }
    if ((e.target as Window).innerWidth > 768 && !target.closest('.sidebar') && !target.closest('.topbar-burger')) {
      this.mobileOpen.set(false);
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    if ((event.target as Window).innerWidth > 768) {
      this.mobileOpen.set(false);
    }
  }
}