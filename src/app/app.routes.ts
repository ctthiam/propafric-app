import { Routes } from '@angular/router';
import { authGuard }  from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { agencyGuard, adminOnlyGuard, tenantGuard, ownerGuard, superAdminGuard } from './core/guards/role.guard';

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

  // ── Dashboard Agence ──
  {
    path: 'dashboard',
    canActivate: [authGuard, agencyGuard],
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
      { path: 'equipe',        canActivate: [adminOnlyGuard], loadComponent: () => import('./dashboard/team/team.component').then(m => m.TeamComponent) },
      { path: 'travaux',       loadComponent: () => import('./dashboard/work-orders/work-orders.component').then(m => m.WorkOrdersComponent) },
      { path: 'messages',      loadComponent: () => import('./dashboard/messages/agency-messages-page.component').then(m => m.AgencyMessagesPageComponent) },
      { path: 'impots',        loadComponent: () => import('./dashboard/property-taxes/property-taxes.component').then(m => m.PropertyTaxesComponent) },
      { path: 'abonnement',    loadComponent: () => import('./dashboard/subscription/subscription.component').then(m => m.SubscriptionComponent) },
      { path: 'archives', loadComponent: () => import('./dashboard/archives/archives.component').then(m => m.ArchivesComponent) },
      { path: 'parametres', canActivate: [adminOnlyGuard], loadComponent: () => import('./dashboard/settings/settings.component').then(m => m.SettingsComponent) },
    ]
  },

  // ── Portail Locataire ──
  {
    path: 'portail-locataire',
    canActivate: [authGuard, tenantGuard],
    loadComponent: () => import('./portal/tenant/layout/tenant-layout/tenant-layout.component').then(m => m.TenantLayoutComponent),
    children: [
      { path: '',           redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',  loadComponent: () => import('./portal/tenant/dashboard/tenant-dashboard/tenant-dashboard.component').then(m => m.TenantDashboardComponent) },
      { path: 'bail',       loadComponent: () => import('./portal/tenant/lease/tenant-lease/tenant-lease.component').then(m => m.TenantLeaseComponent) },
      { path: 'echeances',  loadComponent: () => import('./portal/tenant/schedules/tenant-schedules/tenant-schedules.component').then(m => m.TenantSchedulesComponent) },
      { path: 'quittances', loadComponent: () => import('./portal/tenant/receipts/tenant-receipts/tenant-receipts.component').then(m => m.TenantReceiptsComponent) },
      { path: 'messages',  loadComponent: () => import('./portal/tenant/messages/tenant-messages-page.component').then(m => m.TenantMessagesPageComponent) },
      { path: 'signalements', loadComponent: () => import('./portal/tenant/work-orders/tenant-work-orders.component').then(m => m.TenantWorkOrdersComponent) },
    ]
  },

    // ── Portail Commercial ──────────────────────────────────────────────
  {
    path: 'commercial',
    loadComponent: () => import('./portal/commercial/layout/commercial-layout.component').then(m => m.CommercialLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./portal/commercial/dashboard/commercial-dashboard.component').then(m => m.CommercialDashboardComponent) },
      { path: 'agencies',  loadComponent: () => import('./portal/commercial/agencies/commercial-agencies.component').then(m => m.CommercialAgenciesComponent) },
    ],
  },

  // ── Portail Propriétaire ──
  {
    path: 'portail-proprietaire',
    canActivate: [authGuard, ownerGuard],
    loadComponent: () => import('./portal/owner/layout/owner-layout/owner-layout.component').then(m => m.OwnerLayoutComponent),
    children: [
      { path: '',          redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./portal/owner/dashboard/owner-dashboard/owner-dashboard.component').then(m => m.OwnerDashboardComponent) },
      { path: 'biens',     loadComponent: () => import('./portal/owner/properties/owner-properties/owner-properties.component').then(m => m.OwnerPropertiesComponent) },
      { path: 'echeances', loadComponent: () => import('./portal/owner/schedules/owner-schedules/owner-schedules.component').then(m => m.OwnerSchedulesComponent) },
      { path: 'releves',   loadComponent: () => import('./portal/owner/statements/owner-statements/owner-statements.component').then(m => m.OwnerStatementsComponent) },
      { path: 'travaux',   loadComponent: () => import('./portal/owner/owner-work-orders/owner-work-orders.component').then(m => m.OwnerWorkOrdersComponent) },
      { path: 'impots',    loadComponent: () => import('./portal/owner/owner-taxes/owner-taxes.component').then(m => m.OwnerTaxesComponent) },
      { path: 'messages',  loadComponent: () => import('./portal/owner/messages/owner-messages-page.component').then(m => m.OwnerMessagesPageComponent) },
    ]
  },

  // ── Super Admin ──
  {
    path: 'super-admin',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: () => import('./portal/super-admin/layout/super-layout/super-layout.component').then(m => m.SuperLayoutComponent),
    children: [
      { path: '',          redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./portal/super-admin/dashboard/super-dashboard/super-dashboard.component').then(m => m.SuperDashboardComponent) },
      { path: 'agences',   loadComponent: () => import('./portal/super-admin/agencies/super-agencies/super-agencies.component').then(m => m.SuperAgenciesComponent) },
      { path: 'revenus',   loadComponent: () => import('./portal/super-admin/revenue/super-revenue/super-revenue.component').then(m => m.SuperRevenueComponent) },
    ]
  },

  { path: '**', redirectTo: 'dashboard' }
];