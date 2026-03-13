import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  // Landing page
  {
    path: '',
    loadComponent: () => import('./landing/landing.component').then(m => m.LandingComponent),
    canActivate: [guestGuard],  // redirige vers dashboard si déjà connecté
  },

  // Auth
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent),
      },
    ],
  },

  // Dashboard (protégé)
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./dashboard/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./dashboard/home/home.component').then(m => m.HomeComponent) },
      { path: 'proprietaires', loadComponent: () => import('./dashboard/owners/owners.component').then(m => m.OwnersComponent) },
      { path: 'biens', loadComponent: () => import('./dashboard/properties/properties.component').then(m => m.PropertiesComponent) },
      { path: 'locataires', loadComponent: () => import('./dashboard/tenants/tenants.component').then(m => m.TenantsComponent) },
      { path: 'baux', loadComponent: () => import('./dashboard/leases/leases.component').then(m => m.LeasesComponent) },
      { path: 'paiements', loadComponent: () => import('./dashboard/payments/payments.component').then(m => m.PaymentsComponent) },
      { path: 'depenses', loadComponent: () => import('./dashboard/expenses/expenses.component').then(m => m.ExpensesComponent) },
      { path: 'prestataires', loadComponent: () => import('./dashboard/contractors/contractors.component').then(m => m.ContractorsComponent) },
      { path: 'releves', loadComponent: () => import('./dashboard/statements/statements.component').then(m => m.StatementsComponent) },
      { path: 'notifications', loadComponent: () => import('./dashboard/notifications/notifications.component').then(m => m.NotificationsComponent) },
    ],
  },

  // Portail Propriétaire
  {
    path: 'portail-proprietaire',
    canActivate: [authGuard],
    loadComponent: () => import('./portal-owner/portal-owner.component').then(m => m.PortalOwnerComponent),
  },

  // Portail Locataire
  {
    path: 'portail-locataire',
    canActivate: [authGuard],
    loadComponent: () => import('./portal-tenant/portal-tenant.component').then(m => m.PortalTenantComponent),
  },

  // Fallback
  { path: '**', redirectTo: '' },
];