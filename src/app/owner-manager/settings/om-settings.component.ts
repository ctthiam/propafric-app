import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-om-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './om-settings.component.html',
  styleUrls: ['./om-settings.component.scss'],
})
export class OmSettingsComponent implements OnInit {
  private api     = `${environment.apiUrl}/auth`;
  private omApi   = `${environment.apiUrl}/owner-manager`;

  saving   = signal(false);
  success  = signal(false);
  error    = signal('');
  plan     = signal<any>(null);

  form = this.fb.group({
    first_name: ['', Validators.required],
    last_name:  ['', Validators.required],
    email:      ['', [Validators.required, Validators.email]],
    phone:      [''],
  });

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const u = this.auth.user();
    if (u) {
      this.form.patchValue({
        first_name: (u as any).first_name ?? '',
        last_name:  (u as any).last_name  ?? '',
        email:      u.email,
        phone:      u.phone ?? '',
      });
    }
    this.loadPlan();
  }

  loadPlan(): void {
    this.http.get<any>(`${this.omApi}/dashboard`).subscribe({
      next: (res: any) => { this.plan.set(res?.data?.manager ?? null); this.cdr.detectChanges(); },
      error: () => {},
    });
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.error.set(''); this.success.set(false);
    this.http.put<any>(`${this.api}/profile`, this.form.value).subscribe({
      next: () => {
        this.saving.set(false); this.success.set(true);
        this.cdr.detectChanges();
        setTimeout(() => this.success.set(false), 3000);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Erreur lors de la mise à jour.');
        this.cdr.detectChanges();
      },
    });
  }

  planLabel(p: string): string {
    return ({ trial: 'Essai gratuit', solo: 'Solo', pro: 'Pro' } as any)[p] ?? p;
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}
