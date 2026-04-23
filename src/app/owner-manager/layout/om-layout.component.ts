import { Component, signal, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-om-layout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './om-layout.component.html',
  styleUrls: ['./om-layout.component.scss'],
})
export class OmLayoutComponent {
  private api = `${environment.apiUrl}/auth`;
  navigating = false;

  pwdDrawerOpen = false;
  pwdSaving     = false;
  pwdError      = '';
  pwdSuccess    = false;
  pwdForm = this.fb.group({
    current_password:      ['', Validators.required],
    password:              ['', [Validators.required, Validators.minLength(8)]],
    password_confirmation: ['', Validators.required],
  });

  navItems = [
    { label: 'Tableau de bord', icon: 'pi pi-th-large',   route: '/gestionnaire/dashboard' },
    { label: 'Mes biens',       icon: 'pi pi-building',    route: '/gestionnaire/biens' },
    { label: 'Locataires',      icon: 'pi pi-user',        route: '/gestionnaire/locataires' },
    { label: 'Baux',            icon: 'pi pi-file',        route: '/gestionnaire/baux' },
    { label: 'Paiements',       icon: 'pi pi-credit-card', route: '/gestionnaire/paiements' },
    { label: 'Dépenses',        icon: 'pi pi-wallet',      route: '/gestionnaire/depenses' },
    { label: 'Support',         icon: 'pi pi-question-circle', route: '/gestionnaire/support' },
  ];

  constructor(
    public auth: AuthService,
    private router: Router,
    private fb: FormBuilder,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart)   this.navigating = true;
      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        this.navigating = false;
      }
    });
  }

  logout(): void { this.auth.logout(); }

  openPwdDrawer(): void {
    this.pwdForm.reset(); this.pwdError = ''; this.pwdSuccess = false;
    this.pwdDrawerOpen = true;
  }

  closePwdDrawer(): void { this.pwdDrawerOpen = false; }

  submitPassword(): void {
    if (this.pwdForm.invalid) { this.pwdForm.markAllAsTouched(); return; }
    const v = this.pwdForm.value;
    if (v.password !== v.password_confirmation) { this.pwdError = 'Les mots de passe ne correspondent pas.'; return; }
    this.pwdSaving = true; this.pwdError = '';
    this.http.post<any>(`${this.api}/change-password`, v).subscribe({
      next: () => { this.pwdSaving = false; this.pwdSuccess = true; this.cdr.detectChanges(); setTimeout(() => this.closePwdDrawer(), 1800); },
      error: (err: any) => { this.pwdSaving = false; this.pwdError = err?.error?.message ?? 'Erreur.'; this.cdr.detectChanges(); },
    });
  }

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