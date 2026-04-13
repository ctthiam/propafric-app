import { Component, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { StorageService } from '../../core/services/storage.service';

@Component({
  selector: 'app-om-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './om-register.component.html',
  styleUrls: ['./om-register.component.scss'],
})
export class OmRegisterComponent {
  private api = `${environment.apiUrl}/owner-manager/register`;

  form: FormGroup;
  saving  = signal(false);
  error   = signal<string | null>(null);
  success = signal(false);

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private storage: StorageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      first_name: ['', Validators.required],
      last_name:  ['', Validators.required],
      email:      ['', Validators.email],
      phone:      ['', Validators.required],
      password:   ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set(null);

    this.http.post<any>(this.api, this.form.value).subscribe({
      next: (res: any) => {
        this.storage.setToken(res.data.token);
        this.saving.set(false);
        this.success.set(true);
        setTimeout(() => this.router.navigate(['/gestionnaire/dashboard']), 1500);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error.set(err.error?.message ?? 'Erreur lors de l\'inscription.');
        this.saving.set(false);
        this.cdr.detectChanges();
      }
    });
  }
}