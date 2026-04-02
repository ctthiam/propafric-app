import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  form: FormGroup;
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
  ) {
    this.form = this.fb.group({
      identifier: ['', Validators.required], // email ou téléphone
      password:   ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  get identifier() { return this.form.get('identifier')!; }
  get password()   { return this.form.get('password')!; }

  fillDemo(email: string, password: string): void {
    this.form.patchValue({ identifier: email, password });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const value = this.form.value;
    // Déterminer si c'est un email ou un téléphone
    const isEmail = value.identifier.includes('@');
    const payload = {
      email:    isEmail ? value.identifier : null,
      phone:    isEmail ? null : value.identifier,
      password: value.password,
    };

    this.auth.login(payload).subscribe({
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (err.status === 401 || err.status === 422) {
          this.errorMessage.set('Identifiant ou mot de passe incorrect.');
        } else {
          this.errorMessage.set('Erreur serveur. Veuillez réessayer.');
        }
      },
    });
  }
}