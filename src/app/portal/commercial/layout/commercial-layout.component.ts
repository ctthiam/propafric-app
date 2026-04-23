import { Component, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { filter } from 'rxjs/operators';
import { StorageService } from '../../../core/services/storage.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-commercial-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './commercial-layout.component.html',
  styleUrls: ['./commercial-layout.component.scss'],
})
export class CommercialLayoutComponent {
  sidebarOpen = false;
  user = signal<any>(null);

  navItems = [
    { label: 'Tableau de bord', icon: 'pi pi-home',       route: '/commercial/dashboard' },
    { label: 'Pipeline CRM',    icon: 'pi pi-chart-bar',  route: '/commercial/pipeline' },
    { label: 'Mes agences',     icon: 'pi pi-building',   route: '/commercial/agencies' },
  ];

  constructor(
    private router: Router,
    private http: HttpClient,
    private storage: StorageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => { this.sidebarOpen = false; this.cdr.detectChanges(); });

    this.http.get<any>(`${environment.apiUrl}/auth/me`).subscribe({
      next: (res: any) => { this.user.set(res?.data ?? null); this.cdr.detectChanges(); }
    });
  }

  logout(): void {
    this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe();
    this.storage.clearToken();
    this.router.navigate(['/auth/login']);
  }

  initials(): string {
    const u = this.user();
    if (!u) return 'C';
    return `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase();
  }
}