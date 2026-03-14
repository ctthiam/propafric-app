import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * auth.guard.ts
 * Redirige vers /auth/login si l'utilisateur n'est pas connecté.
 */
export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.hasToken()) return true;

  return router.createUrlTree(['/auth/login']);
};