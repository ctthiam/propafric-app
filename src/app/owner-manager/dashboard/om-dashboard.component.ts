import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-om-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SkeletonModule],
  templateUrl: './om-dashboard.component.html',
  styleUrls: ['./om-dashboard.component.scss'],
})
export class OmDashboardComponent implements OnInit {
  private api = `${environment.apiUrl}/owner-manager`;

  data    = signal<any>(null);
  loading = signal(true);

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.http.get<any>(`${this.api}/dashboard`).subscribe({
      next: (res: any) => {
        this.data.set(res?.data ?? null);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false),
    });
  }

  formatCurrency(n: number | string): string {
    return new Intl.NumberFormat('fr-SN').format(Number(n) || 0) + ' F';
  }
}