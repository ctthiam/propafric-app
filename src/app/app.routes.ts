import { Routes } from '@angular/router';
import { authGuard }  from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { ownerManagerGuard, commercialGuard } from './core/guards/role.guard';
import { agencyGuard, adminOnlyGuard, tenantGuard, ownerGuard, superAdminGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./landing/landing.component').then(m => m.LandingComponent) },
  // ── Auth ──
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      { path: 'login', loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent) },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'inscription-gestionnaire', loadComponent: () => import('./owner-manager/auth/om-register.component').then(m => m.OmRegisterComponent) },
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
      { path: 'mandats', loadComponent: () => import('./dashboard/mandates/mandates.component').then(m => m.MandatesComponent) },
      { path: 'biens',         loadComponent: () => import('./dashboard/properties/properties.component').then(m => m.PropertiesComponent) },
      { path: 'locataires',    loadComponent: () => import('./dashboard/tenants/tenants.component').then(m => m.TenantsComponent) },
      { path: 'baux',          loadComponent: () => import('./dashboard/leases/leases.component').then(m => m.LeasesComponent) },
      { path: 'paiements',     loadComponent: () => import('./dashboard/payments/payments.component').then(m => m.PaymentsComponent) },
      { path: 'depenses',      loadComponent: () => import('./dashboard/expenses/expenses.component').then(m => m.ExpensesComponent) },
      { path: 'prestataires',  loadComponent: () => import('./dashboard/expenses/expenses.component').then(m => m.ExpensesComponent) },
      { path: 'releves',       loadComponent: () => import('./dashboard/statements/statements.component').then(m => m.StatementsComponent) },
      { path: 'comptabilite', loadComponent: () => import('./dashboard/accounting/accounting.component').then(m => m.AccountingComponent) },
      { path: 'salaires',     loadComponent: () => import('./dashboard/salaries/salaries.component').then(m => m.SalariesComponent) },
      { path: 'equipe',        canActivate: [adminOnlyGuard], loadComponent: () => import('./dashboard/team/team.component').then(m => m.TeamComponent) },
      { path: 'travaux',       loadComponent: () => import('./dashboard/work-orders/work-orders.component').then(m => m.WorkOrdersComponent) },
      { path: 'messages',      loadComponent: () => import('./dashboard/messages/agency-messages-page.component').then(m => m.AgencyMessagesPageComponent) },
      { path: 'impots',        loadComponent: () => import('./dashboard/property-taxes/property-taxes.component').then(m => m.PropertyTaxesComponent) },
      { path: 'abonnement',    loadComponent: () => import('./dashboard/subscription/subscription.component').then(m => m.SubscriptionComponent) },
      { path: 'archives', loadComponent: () => import('./dashboard/archives/archives.component').then(m => m.ArchivesComponent) },
      { path: 'parametres', canActivate: [adminOnlyGuard], loadComponent: () => import('./dashboard/settings/settings.component').then(m => m.SettingsComponent) },
      { path: 'support', loadComponent: () => import('./dashboard/support/support.component').then(m => m.SupportComponent) },
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
    canActivate: [authGuard, commercialGuard],
    loadComponent: () => import('./portal/commercial/layout/commercial-layout.component').then(m => m.CommercialLayoutComponent),
    children: [
      { path: '', redirectTo: 'pipeline', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./portal/commercial/dashboard/commercial-dashboard.component').then(m => m.CommercialDashboardComponent) },
      { path: 'pipeline',  loadComponent: () => import('./portal/commercial/pipeline/pipeline.component').then(m => m.PipelineComponent) },
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
      { path: 'mandats', loadComponent: () => import('./portal/owner/mandates/owner-mandates.component').then(m => m.OwnerMandatesComponent) },
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
      { path: 'agences',    loadComponent: () => import('./portal/super-admin/agencies/super-agencies/super-agencies.component').then(m => m.SuperAgenciesComponent) },
      { path: 'agences/:id', loadComponent: () => import('./portal/super-admin/agencies/super-agency-detail/super-agency-detail.component').then(m => m.SuperAgencyDetailComponent) },
      { path: 'revenus',      loadComponent: () => import('./portal/super-admin/revenue/super-revenue/super-revenue.component').then(m => m.SuperRevenueComponent) },
      { path: 'commerciaux',  loadComponent: () => import('./portal/super-admin/commercials/super-commercials/super-commercials.component').then(m => m.SuperCommercialsComponent) },
      { path: 'alertes',      loadComponent: () => import('./portal/super-admin/alerts/super-alerts.component').then(m => m.SuperAlertsComponent) },
      { path: 'analytiques',  loadComponent: () => import('./portal/super-admin/analytics/super-analytics.component').then(m => m.SuperAnalyticsComponent) },
      { path: 'support',      loadComponent: () => import('./portal/super-admin/support/super-support.component').then(m => m.SuperSupportComponent) },
    ]
  },

  {
  path: 'gestionnaire',
  canActivate: [authGuard, ownerManagerGuard],
  loadComponent: () => import('./owner-manager/layout/om-layout.component').then(m => m.OmLayoutComponent),
  children: [
    { path: '',           redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'dashboard',  loadComponent: () => import('./owner-manager/dashboard/om-dashboard.component').then(m => m.OmDashboardComponent) },
    { path: 'biens',      loadComponent: () => import('./owner-manager/properties/om-properties.component').then(m => m.OmPropertiesComponent) },
    { path: 'locataires', loadComponent: () => import('./owner-manager/tenants/om-tenants.component').then(m => m.OmTenantsComponent) },
    { path: 'baux',       loadComponent: () => import('./owner-manager/leases/om-leases.component').then(m => m.OmLeasesComponent) },
    { path: 'paiements',   loadComponent: () => import('./owner-manager/payments/om-payments.component').then(m => m.OmPaymentsComponent) },
    { path: 'depenses',    loadComponent: () => import('./owner-manager/expenses/om-expenses.component').then(m => m.OmExpensesComponent) },
    { path: 'echeancier',  loadComponent: () => import('./owner-manager/schedules/om-schedules.component').then(m => m.OmSchedulesComponent) },
    { path: 'parametres',  loadComponent: () => import('./owner-manager/settings/om-settings.component').then(m => m.OmSettingsComponent) },
    { path: 'support',     loadComponent: () => import('./owner-manager/support/om-support.component').then(m => m.OmSupportComponent) },
  ]
},

  { path: '**', redirectTo: 'dashboard' }
];