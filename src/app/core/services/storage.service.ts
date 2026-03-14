import { Injectable } from '@angular/core';

/**
 * Stocke le token Sanctum en mémoire uniquement.
 * Jamais localStorage / sessionStorage — conformément aux règles PropAfric.
 * Le token est perdu au refresh → l'utilisateur est redirigé vers login.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private token: string | null = null;

  setToken(token: string): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken(): void {
    this.token = null;
  }

  hasToken(): boolean {
    return this.token !== null;
  }
}