import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * guest.guard.ts
 * Redirige vers /dashboard si l'utilisateur est déjà connecté.
 * Utilisé sur la landing page et /auth/login.
 */
export const guestGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.hasToken()) return true;

  return router.createUrlTree(['/dashboard']);
};