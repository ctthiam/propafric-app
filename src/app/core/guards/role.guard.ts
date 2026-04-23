import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

const AGENCY_ROLES = ['agency_admin', 'agency_secretary', 'agency_accountant'];

/**
 * agencyGuard — dashboard agence (admin + secretary + accountant)
 */
export const agencyGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const role   = auth.user()?.role;

  if (role && AGENCY_ROLES.includes(role)) return true;
  if (role === 'super_admin') return router.createUrlTree(['/super-admin/dashboard']);
  if (role === 'owner')       return router.createUrlTree(['/portail-proprietaire']);
  if (role === 'tenant')      return router.createUrlTree(['/portail-locataire']);
  return router.createUrlTree(['/auth/login']);
};

/**
 * adminOnlyGuard — certaines pages réservées à l'admin agence
 * (ex: /dashboard/equipe, /dashboard/releves)
 */
export const adminOnlyGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const role   = auth.user()?.role;

  if (role === 'agency_admin' || role === 'agency_secretary' || role === 'super_admin') return true;
  // Rediriger vers dashboard si mauvais rôle (pas d'accès)
  return router.createUrlTree(['/dashboard']);
};

/**
 * tenantGuard
 */
export const tenantGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const role   = auth.user()?.role;

  if (role === 'tenant') return true;
  if (role && AGENCY_ROLES.includes(role)) return router.createUrlTree(['/dashboard']);
  if (role === 'super_admin') return router.createUrlTree(['/super-admin/dashboard']);
  if (role === 'owner')       return router.createUrlTree(['/portail-proprietaire']);
  return router.createUrlTree(['/auth/login']);
};

/**
 * ownerGuard
 */
export const ownerGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const role   = auth.user()?.role;

  if (role === 'owner') return true;
  if (role && AGENCY_ROLES.includes(role)) return router.createUrlTree(['/dashboard']);
  if (role === 'super_admin') return router.createUrlTree(['/super-admin/dashboard']);
  if (role === 'tenant')      return router.createUrlTree(['/portail-locataire']);
  return router.createUrlTree(['/auth/login']);
};

/**
 * superAdminGuard
 */
export const superAdminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const role   = auth.user()?.role;

  if (role === 'super_admin') return true;
  if (role && AGENCY_ROLES.includes(role)) return router.createUrlTree(['/dashboard']);
  if (role === 'tenant') return router.createUrlTree(['/portail-locataire']);
  if (role === 'owner')  return router.createUrlTree(['/portail-proprietaire']);
  return router.createUrlTree(['/auth/login']);
};

export const ownerManagerGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const role   = auth.user()?.role;
  if (role === 'owner_manager') return true;
  if (role && AGENCY_ROLES.includes(role)) return router.createUrlTree(['/dashboard']);
  if (role === 'super_admin') return router.createUrlTree(['/super-admin/dashboard']);
  if (role === 'tenant')      return router.createUrlTree(['/portail-locataire']);
  if (role === 'owner')       return router.createUrlTree(['/portail-proprietaire']);
  return router.createUrlTree(['/auth/login']);
};

/**
 * commercialGuard — pipeline commercial (commercial + super_admin)
 */
export const commercialGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const role   = auth.user()?.role;

  if (role === 'commercial' || role === 'super_admin') return true;
  if (role && AGENCY_ROLES.includes(role)) return router.createUrlTree(['/dashboard']);
  if (role === 'owner')  return router.createUrlTree(['/portail-proprietaire']);
  if (role === 'tenant') return router.createUrlTree(['/portail-locataire']);
  return router.createUrlTree(['/auth/login']);
};