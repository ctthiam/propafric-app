import { Routes } from '@angular/router';
import { authGuard }  from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

   // ── Auth ──
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      { path: 'login', loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent) },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ]
  },

  // ── Dashboard Agence (agency_admin / super_admin) ──
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./dashboard/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '',              loadComponent: () => import('./dashboard/home/home.component').then(m => m.HomeComponent) },
      { path: 'proprietaires', loadComponent: () => import('./dashboard/owners/owners.component').then(m => m.OwnersComponent) },
      { path: 'biens',         loadComponent: () => import('./dashboard/properties/properties.component').then(m => m.PropertiesComponent) },
      { path: 'locataires',    loadComponent: () => import('./dashboard/tenants/tenants.component').then(m => m.TenantsComponent) },
      { path: 'baux',          loadComponent: () => import('./dashboard/leases/leases.component').then(m => m.LeasesComponent) },
      { path: 'paiements',     loadComponent: () => import('./dashboard/payments/payments.component').then(m => m.PaymentsComponent) },
      { path: 'depenses',      loadComponent: () => import('./dashboard/expenses/expenses.component').then(m => m.ExpensesComponent) },
      { path: 'prestataires',  loadComponent: () => import('./dashboard/expenses/expenses.component').then(m => m.ExpensesComponent) },
      { path: 'releves',       loadComponent: () => import('./dashboard/statements/statements.component').then(m => m.StatementsComponent) },
    ]
  },

{
  path: 'portail-locataire',
  canActivate: [authGuard],
  loadComponent: () => import('./portal/tenant/layout/tenant-layout/tenant-layout.component').then(m => m.TenantLayoutComponent),
  children: [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'dashboard',  loadComponent: () => import('./portal/tenant/dashboard/tenant-dashboard/tenant-dashboard.component').then(m => m.TenantDashboardComponent) },
    { path: 'bail',       loadComponent: () => import('./portal/tenant/lease/tenant-lease/tenant-lease.component').then(m => m.TenantLeaseComponent) },
    { path: 'echeances',  loadComponent: () => import('./portal/tenant/schedules/tenant-schedules/tenant-schedules.component').then(m => m.TenantSchedulesComponent) },
    { path: 'quittances', loadComponent: () => import('./portal/tenant/receipts/tenant-receipts/tenant-receipts.component').then(m => m.TenantReceiptsComponent) },
  ]
},
{
  path: 'portail-proprietaire',
  canActivate: [authGuard],
  loadComponent: () => import('./portal/owner/layout/owner-layout/owner-layout.component').then(m => m.OwnerLayoutComponent),
  children: [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'dashboard',   loadComponent: () => import('./portal/owner/dashboard/owner-dashboard/owner-dashboard.component').then(m => m.OwnerDashboardComponent) },
    { path: 'biens',       loadComponent: () => import('./portal/owner/properties/owner-properties/owner-properties.component').then(m => m.OwnerPropertiesComponent) },
    { path: 'echeances',   loadComponent: () => import('./portal/owner/schedules/owner-schedules/owner-schedules.component').then(m => m.OwnerSchedulesComponent) },
    { path: 'releves',     loadComponent: () => import('./portal/owner/statements/owner-statements/owner-statements.component').then(m => m.OwnerStatementsComponent) },
  ]
},
{
  path: 'super-admin',
  canActivate: [authGuard],
  loadComponent: () => import('./portal/super-admin/layout/super-layout/super-layout.component').then(m => m.SuperLayoutComponent),
  children: [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'dashboard', loadComponent: () => import('./portal/super-admin/dashboard/super-dashboard/super-dashboard.component').then(m => m.SuperDashboardComponent) },
    { path: 'agences',   loadComponent: () => import('./portal/super-admin/agencies/super-agencies/super-agencies.component').then(m => m.SuperAgenciesComponent) },
  ]
},
  { path: '**', redirectTo: 'dashboard' }
];