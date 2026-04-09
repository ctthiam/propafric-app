import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { ToastModule }    from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { environment }    from '../../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToastModule, SkeletonModule],
  providers: [MessageService],
  templateUrl: './settings.component.html',
  styleUrls:   ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {
  private api = `${environment.apiUrl}/agency/settings`;

  agency        = signal<any>(null);
  loading       = signal(true);
  saving        = signal(false);
  uploadingLogo = signal(false);
  logoPreview   = signal<string | null>(null);

  colorPrimary   = signal<string>('#1a1a1a');
  colorSecondary = signal<string>('#555555');

  form: FormGroup;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      name:                ['', Validators.required],
      email:               ['', [Validators.required, Validators.email]],
      phone:               [''],
      address:             [''],
      city:                [''],
      country:             [''],
      website:             [''],
      ninea:               [''],
      rc_number:           [''],
      pdf_color_primary:   ['#1a1a1a'],
      pdf_color_secondary: ['#555555'],
      fee_model:           ['added'],
      lease_articles:      this.fb.array([]),
    });
  }

  get leaseArticles(): FormArray {
    return this.form.get('lease_articles') as FormArray;
  }

  addArticle(title = '', content = ''): void {
    this.leaseArticles.push(this.fb.group({ title: [title], content: [content] }));
    this.cdr.detectChanges();
  }

  removeArticle(i: number): void {
    this.leaseArticles.removeAt(i);
    this.cdr.detectChanges();
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(this.api).subscribe({
      next: (res: any) => {
        const a = res?.data;
        this.agency.set(a);
        this.logoPreview.set(a?.logo_url ?? null);

        const primary   = a?.pdf_color_primary   ?? '#1a1a1a';
        const secondary = a?.pdf_color_secondary ?? '#555555';
        this.colorPrimary.set(primary);
        this.colorSecondary.set(secondary);

        this.form.patchValue({
          name:                a?.name      ?? '',
          email:               a?.email     ?? '',
          phone:               a?.phone     ?? '',
          address:             a?.address   ?? '',
          city:                a?.city      ?? '',
          country:             a?.country   ?? '',
          website:             a?.website   ?? '',
          ninea:               a?.ninea     ?? '',
          rc_number:           a?.rc_number ?? '',
          fee_model:           a?.fee_model ?? 'added',
          pdf_color_primary:   primary,
          pdf_color_secondary: secondary,
        });

        // Charger les articles de bail
        while (this.leaseArticles.length) this.leaseArticles.removeAt(0);
        const articles = a?.lease_articles ?? [];
        articles.forEach((art: any) => this.addArticle(art.title ?? '', art.content ?? ''));

        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => this.loading.set(false),
    });
  }

  onColorChange(field: 'pdf_color_primary' | 'pdf_color_secondary', value: string): void {
    if (field === 'pdf_color_primary')   this.colorPrimary.set(value);
    if (field === 'pdf_color_secondary') this.colorSecondary.set(value);
    this.form.get(field)?.setValue(value);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.http.put<any>(this.api, this.form.value).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Succès', detail: res.message });
        this.saving.set(false);
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Erreur.' });
        this.saving.set(false);
      }
    });
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];

    if (!['image/jpeg','image/png','image/jpg','image/webp'].includes(file.type)) {
      this.toast.add({ severity: 'warn', summary: 'Format invalide', detail: 'JPEG, PNG ou WebP uniquement' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.toast.add({ severity: 'warn', summary: 'Trop lourd', detail: 'Max 2MB' });
      return;
    }

    const reader = new FileReader();
    reader.onload = e => { this.logoPreview.set(e.target?.result as string); this.cdr.detectChanges(); };
    reader.readAsDataURL(file);

    this.uploadingLogo.set(true);
    const formData = new FormData();
    formData.append('logo', file, file.name);

    this.http.post<any>(`${this.api}/logo`, formData).subscribe({
      next: (res: any) => {
        this.logoPreview.set(res.data?.logo_url ?? this.logoPreview());
        this.agency.update(a => ({ ...a, logo_url: res.data?.logo_url, logo_path: res.data?.logo_path }));
        this.toast.add({ severity: 'success', summary: 'Logo mis à jour', detail: res.message });
        this.uploadingLogo.set(false);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message ?? 'Upload échoué.' });
        this.uploadingLogo.set(false);
      }
    });
    input.value = '';
  }

  deleteLogo(): void {
    this.http.delete<any>(`${this.api}/logo`).subscribe({
      next: (res: any) => {
        this.logoPreview.set(null);
        this.agency.update(a => ({ ...a, logo_url: null, logo_path: null }));
        this.toast.add({ severity: 'success', summary: 'Supprimé', detail: res.message });
        this.cdr.detectChanges();
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible.' })
    });
  }

  planLabel(p: string): string {
    return ({ starter: 'Starter', pro: 'Pro', premium: 'Premium', partner: 'Partenaire' } as any)[p] ?? p;
  }
  planClass(p: string): string {
    return ({ starter: 'badge-neutral', pro: 'badge-blue', premium: 'badge-gold', partner: 'badge-success' } as any)[p] ?? '';
  }
}