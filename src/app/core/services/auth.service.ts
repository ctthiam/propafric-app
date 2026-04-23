import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';

// Et mettre à jour l'interface User pour inclure les nouveaux rôles :
export interface User {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone: string | null;
  role: 'super_admin' | 'agency_admin' | 'agency_secretary' | 'agency_accountant' | 'owner' | 'tenant' | 'commercial' | 'owner_manager';
  agency_id: number | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  // ── Signals ──
  private _user = signal<User | null>(null);
  private _loading = signal(false);

  // ── Computed publics ──
  readonly user    = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isAgencyAdmin   = computed(() => this._user()?.role === 'agency_admin');
  readonly isSuperAdmin    = computed(() => this._user()?.role === 'super_admin');
  readonly isOwner         = computed(() => this._user()?.role === 'owner');
  readonly isTenant        = computed(() => this._user()?.role === 'tenant');

  constructor(
    private http: HttpClient,
    private router: Router,
    private storage: StorageService,
  ) {}

  // ── Login ──
  login(credentials: LoginRequest): Observable<ApiResponse<{ user: User; token: string }>> {
    this._loading.set(true);
    return this.http.post<ApiResponse<{ user: User; token: string }>>(
      `${this.apiUrl}/auth/login`,
      credentials
    ).pipe(
      tap(res => {
        if (res.success) {
          this.storage.setToken(res.data.token);
          this._user.set(res.data.user);
          this.redirectAfterLogin(res.data.user);
        }
        this._loading.set(false);
      }),
      catchError(err => {
        this._loading.set(false);
        return throwError(() => err);
      })
    );
  }

  // ── Logout ──
  logout(): void {
    this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe({
      complete: () => this.clearSession(),
      error: ()    => this.clearSession(),
    });
  }

  // ── Charger le profil (après refresh) ──
  loadProfile(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/auth/me`).pipe(
      tap(res => {
        if (res.success) this._user.set(res.data);
      })
    );
  }

  // ── Changer mot de passe ──
  changePassword(data: { current_password: string; password: string; password_confirmation: string }): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.apiUrl}/auth/change-password`, data);
  }

  // ── Helpers ──
  getToken(): string | null {
    return this.storage.getToken();
  }

  hasToken(): boolean {
    return this.storage.hasToken();
  }

  private clearSession(): void {
    this.storage.clearToken();
    this._user.set(null);
    this.router.navigate(['/auth/login']);
  }

// Dans auth.service.ts, remplacer redirectAfterLogin() par :

// Dans auth.service.ts, remplacer redirectAfterLogin() par :

private redirectAfterLogin(user: User): void {
  switch (user.role) {
    case 'super_admin':
      this.router.navigate(['/super-admin/dashboard']);
      break;
    case 'agency_admin':
    case 'agency_secretary':
    case 'agency_accountant':
      this.router.navigate(['/dashboard']);
      break;
    case 'owner':
      this.router.navigate(['/portail-proprietaire']);
      break;
    case 'tenant':
      this.router.navigate(['/portail-locataire']);
      break;
    case 'commercial':
      this.router.navigate(['/commercial/pipeline']);
      break;
    case 'owner_manager':
      this.router.navigate(['/gestionnaire']);
      break;      
    default:
      this.router.navigate(['/dashboard']);
  }
}

}