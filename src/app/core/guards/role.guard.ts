import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * role.guard.ts
 * Vérifie que l'utilisateur a le bon rôle pour accéder à la route.
 * Redirige vers le bon portail si le rôle ne correspond pas.
 */
export const agencyGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  const role = auth.user()?.role;
  if (role === 'agency_admin' || role === 'super_admin') return true;

  // Rediriger vers le bon portail selon le rôle
  if (role === 'tenant') return router.createUrlTree(['/portail-locataire']);
  if (role === 'owner')  return router.createUrlTree(['/portail-proprietaire']);

  return router.createUrlTree(['/auth/login']);
};

export const tenantGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  const role = auth.user()?.role;
  if (role === 'tenant') return true;

  if (role === 'agency_admin') return router.createUrlTree(['/dashboard']);
  if (role === 'super_admin')  return router.createUrlTree(['/super-admin/dashboard']);
  if (role === 'owner')        return router.createUrlTree(['/portail-proprietaire']);

  return router.createUrlTree(['/auth/login']);
};

export const ownerGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  const role = auth.user()?.role;
  if (role === 'owner') return true;

  if (role === 'agency_admin') return router.createUrlTree(['/dashboard']);
  if (role === 'super_admin')  return router.createUrlTree(['/super-admin/dashboard']);
  if (role === 'tenant')       return router.createUrlTree(['/portail-locataire']);

  return router.createUrlTree(['/auth/login']);
};

export const superAdminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  const role = auth.user()?.role;
  if (role === 'super_admin') return true;

  if (role === 'agency_admin') return router.createUrlTree(['/dashboard']);
  if (role === 'tenant')       return router.createUrlTree(['/portail-locataire']);
  if (role === 'owner')        return router.createUrlTree(['/portail-proprietaire']);

  return router.createUrlTree(['/auth/login']);
};