import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../../app/core/services/auth.service';

import { NgApexchartsModule } from 'ng-apexcharts';
import type {
  ApexChart, ApexNonAxisChartSeries, ApexAxisChartSeries,
  ApexXAxis, ApexYAxis, ApexDataLabels, ApexStroke,
  ApexFill, ApexTooltip, ApexPlotOptions, ApexLegend,
  ApexResponsive, ApexGrid,
} from 'ng-apexcharts';

import { SkeletonModule } from 'primeng/skeleton';

// ── Interfaces correspondant à la vraie réponse backend ──

export interface LateSchedule {
  id: number;
  period_label: string;
  due_date: string;
  balance: number;
  days_overdue: number;
  tenant: string;
  property: string;
}

export interface CollectionMonth {
  month: string;
  collected: number;
  due: number;
  rate: number;
}

export interface DashboardData {
  period: { label: string; date_from: string; date_to: string };
  kpis: {
    total_properties: number;
    occupied_properties: number;
    available_properties: number;
    total_leases: number;
    active_leases: number;
    expiring_leases_30d: number;
    total_owners: number;
    total_tenants: number;
    tenants_no_insurance: number;
  };
  financials: {
    total_due: number;
    total_collected: number;
    total_pending: number;
    total_late: number;
    collection_rate: number;
    management_revenue: number;
    tom_collected: number;
  };
  occupancy: {
    total: number;
    occupied: number;
    available: number;
    maintenance: number;
    rate: number;
  };
  alerts: {
    late_schedules: LateSchedule[];
    expiring_leases: any[];
    no_insurance: any[];
    counts: { late: number; expiring: number; no_insurance: number };
  };
  collections: CollectionMonth[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, NgApexchartsModule, SkeletonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  private apiUrl = environment.apiUrl;

  loading = signal(true);
  data    = signal<DashboardData | null>(null);
  period  = signal<'month' | 'quarter' | 'year'>('month');

  collectionsChart = signal<{
    series: ApexAxisChartSeries;
    chart: ApexChart;
    xaxis: ApexXAxis;
    yaxis: ApexYAxis;
    stroke: ApexStroke;
    fill: ApexFill;
    tooltip: ApexTooltip;
    grid: ApexGrid;
    colors: string[];
    dataLabels: ApexDataLabels;
  } | null>(null);

  leasesChart = signal<{
    series: ApexNonAxisChartSeries;
    chart: ApexChart;
    labels: string[];
    colors: string[];
    legend: ApexLegend;
    dataLabels: ApexDataLabels;
    plotOptions: ApexPlotOptions;
    responsive: ApexResponsive[];
    tooltip: ApexTooltip;
  } | null>(null);

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  ngOnInit(): void { this.loadDashboard(); }

  loadDashboard(): void {
    this.loading.set(true);
    this.http.get<{ success: boolean; data: DashboardData }>(
      `${this.apiUrl}/agency/dashboard?period=${this.period()}`
    ).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.data.set(res.data);
          this.buildCharts(res.data);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  canSeePaiements(): boolean {
  const role = this.auth.user()?.role;
  return role === 'agency_admin' || role === 'agency_accountant';
}

  setPeriod(p: 'month' | 'quarter' | 'year'): void {
    this.period.set(p);
    this.loadDashboard();
  }

  private buildCharts(d: DashboardData): void {
    // ── Collections area chart ──
    const collections = Array.isArray(d.collections) ? d.collections : [];
    const months  = collections.map(c => c.month);
    const amounts = collections.map(c => c.collected);

    this.collectionsChart.set({
      series: [{ name: 'Loyers collectés', data: amounts }],
      chart: {
        type: 'area', height: 240,
        toolbar: { show: false },
        fontFamily: 'DM Sans, sans-serif',
        background: 'transparent',
      },
      xaxis: {
        categories: months,
        labels: { style: { colors: '#4a6357', fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks:  { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: '#4a6357', fontSize: '11px' },
          formatter: (v: number) => v >= 1000000
            ? (v / 1000000).toFixed(1) + 'M'
            : v >= 1000 ? (v / 1000).toFixed(0) + 'K' : String(v),
        },
      },
      stroke:  { curve: 'smooth', width: 2.5 },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.25, opacityTo: 0.02 },
      },
      colors:     ['#2D6A4F'],
      tooltip:    { y: { formatter: (v: number) => new Intl.NumberFormat('fr-SN').format(v) + ' F CFA' }, theme: 'light' },
      grid:       { borderColor: 'rgba(0,0,0,0.05)', strokeDashArray: 4, xaxis: { lines: { show: false } } },
      dataLabels: { enabled: false },
    });

    // ── Leases donut ── (occupancy: occupied / available / maintenance)
    const occ = d.occupancy ?? { occupied: 0, available: 0, maintenance: 0 };
    this.leasesChart.set({
      series: [occ.occupied ?? 0, occ.available ?? 0, occ.maintenance ?? 0],
      chart: {
        type: 'donut', height: 240,
        toolbar: { show: false },
        fontFamily: 'DM Sans, sans-serif',
        background: 'transparent',
      },
      labels: ['Occupés', 'Disponibles', 'Maintenance'],
      colors: ['#2D6A4F', '#C9A84C', '#e57373'],
      legend: { position: 'bottom', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                fontSize: '12px',
                color: '#4a6357',
                formatter: (w: { globals: { seriesTotals: number[] } }) =>
                  String(w.globals.seriesTotals.reduce((a, b) => a + b, 0)),
              },
            },
          },
        },
      },
      responsive: [{ breakpoint: 480, options: { chart: { height: 200 } } }],
      tooltip: { y: { formatter: (v: number) => v + ' bien(s)' } },
    });
  }

  // ── Helpers ──

  occupancyRate(): number {
    const d = this.data();
    return d ? (d.occupancy?.rate ?? 0) : 0;
  }

  collectionRate(): number {
    const d = this.data();
    return d ? (d.financials?.collection_rate ?? 0) : 0;
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-SN').format(amount ?? 0) + ' F';
  }

  formatDate(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}