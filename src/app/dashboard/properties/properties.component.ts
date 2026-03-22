import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

import { ButtonModule }        from 'primeng/button';
import { DropdownModule }      from 'primeng/dropdown';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule }         from 'primeng/toast';
import { SkeletonModule }      from 'primeng/skeleton';
import { TooltipModule }       from 'primeng/tooltip';
import { CheckboxModule }      from 'primeng/checkbox';
import { ConfirmationService, MessageService } from 'primeng/api';

export interface Owner {
  id: number;
  full_name: string;
  phone: string;
}

export interface PropertyPhoto {
  id: string;
  path: string;
  url: string;
  name: string;
  size: number;
  disk: string;
}

export interface Property {
  id: number;
  reference: string;
  name: string;
  type: string;
  address: string;
  city: string;
  zone: string | null;
  area: string | null;
  status: 'available' | 'occupied' | 'maintenance' | 'archived';
  is_furnished: boolean;
  photos: PropertyPhoto[];
  owner?: Owner;
  owner_id?: number;
  active_lease?: any;
  units_count: number;
  rooms: string[] | null;
  amenities: string[] | null;
  equipment: string[] | null;
}

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    ButtonModule, DropdownModule, ConfirmDialogModule,
    ToastModule, SkeletonModule, TooltipModule, CheckboxModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './properties.component.html',
  styleUrls: ['./properties.component.scss'],
})
export class PropertiesComponent implements OnInit {
  private api = `${environment.apiUrl}/agency`;

  properties   = signal<Property[]>([]);
  owners       = signal<Owner[]>([]);
  loading      = signal(true);
  saving       = signal(false);
  editingProp  = signal<Property | null>(null);
  search       = signal('');
  filterStatus = signal('');
  drawerOpen   = false;

  // ── Onglets drawer ──────────────────────────────────────────
  activeTab: 'info' | 'photos' = 'info';

  // ── Photos ──────────────────────────────────────────────────
  currentPhotos  = signal<PropertyPhoto[]>([]);
  uploadingPhoto = signal(false);
  selectedFiles: File[] = [];
  previewUrls: string[] = [];

  filteredProperties = computed(() => {
    let list = this.properties();
    const q = this.search().toLowerCase();
    const s = this.filterStatus();
    if (q) list = list.filter(p =>
      `${p.name} ${p.reference} ${p.address} ${p.city}`.toLowerCase().includes(q)
    );
    if (s) list = list.filter(p => p.status === s);
    return list;
  });

  form: FormGroup;

  propertyTypes = [
    { label: 'Chambre',             value: 'chambre' },
    { label: 'Studio',              value: 'studio' },
    { label: 'F1',                  value: 'f1' },
    { label: 'F2',                  value: 'f2' },
    { label: 'F3',                  value: 'f3' },
    { label: 'F4',                  value: 'f4' },
    { label: 'F5',                  value: 'f5' },
    { label: 'Appartement',         value: 'appartement' },
    { label: 'Duplex',              value: 'duplex' },
    { label: 'Triplex',             value: 'triplex' },
    { label: 'Penthouse',           value: 'penthouse' },
    { label: 'Mezzanine',           value: 'mezzanine' },
    { label: 'Villa simple',        value: 'villa_simple' },
    { label: 'Villa R+1',           value: 'villa_r1' },
    { label: 'Villa R+2',           value: 'villa_r2' },
    { label: 'Villa R+3',           value: 'villa_r3' },
    { label: 'Villa R+4',           value: 'villa_r4' },
    { label: 'Immeuble R+1',        value: 'immeuble_r1' },
    { label: 'Immeuble R+2',        value: 'immeuble_r2' },
    { label: 'Immeuble R+3',        value: 'immeuble_r3' },
    { label: 'Immeuble R+4',        value: 'immeuble_r4' },
    { label: 'Immeuble R+5',        value: 'immeuble_r5' },
    { label: 'Résidence meublée',   value: 'residence_meublee' },
    { label: 'Boutique',            value: 'boutique' },
    { label: 'Magasin',             value: 'magasin' },
    { label: 'Showroom',            value: 'showroom' },
    { label: 'Local commercial',    value: 'local_commercial' },
    { label: 'Bureau',              value: 'bureau' },
    { label: 'Plateau de bureaux',  value: 'plateau_bureaux' },
    { label: 'Immeuble de bureaux', value: 'immeuble_bureaux' },
    { label: 'Coworking',           value: 'coworking' },
    { label: 'Entrepôt',            value: 'entrepot' },
    { label: 'Dépôt',               value: 'depot' },
    { label: 'Hangar',              value: 'hangar' },
    { label: 'Usine',               value: 'usine' },
    { label: 'Terrain nu',          value: 'terrain_nu' },
    { label: 'Terrain viabilisé',   value: 'terrain_viabilise' },
    { label: 'Parking',             value: 'parking' },
    { label: 'Garage',              value: 'garage' },
  ];

  statusOptions = [
    { label: 'Disponible',  value: 'available' },
    { label: 'Occupé',      value: 'occupied' },
    { label: 'Maintenance', value: 'maintenance' },
  ];

  filterStatusOptions = [
    { label: 'Tous les statuts', value: '' },
    { label: 'Disponible',       value: 'available' },
    { label: 'Occupé',           value: 'occupied' },
    { label: 'Maintenance',      value: 'maintenance' },
  ];

  roomOptions = [
    { label: 'Salon',              value: 'salon' },
    { label: 'Salle à manger',     value: 'salle_a_manger' },
    { label: 'Chambre',            value: 'chambre' },
    { label: 'Salle de bain',      value: 'salle_de_bain' },
    { label: "Salle d'eau",        value: 'salle_eau' },
    { label: 'Cuisine',            value: 'cuisine' },
    { label: 'Bureau',             value: 'bureau' },
    { label: 'Parking',            value: 'parking' },
    { label: 'Balcon',             value: 'balcon' },
    { label: 'Terrasse',           value: 'terrasse' },
    { label: 'Jardin',             value: 'jardin' },
    { label: 'Cour avant',         value: 'cour_avant' },
    { label: 'Cour arrière',       value: 'cour_arriere' },
    { label: 'Buanderie',          value: 'buanderie' },
    { label: 'Chambre domestique', value: 'chambre_domestique' },
    { label: 'Magasin',            value: 'magasin' },
  ];

  amenityOptions = [
    { label: 'Piscine',            value: 'piscine' },
    { label: 'Ascenseur',          value: 'ascenseur' },
    { label: 'Gardiennage',        value: 'gardiennage' },
    { label: 'Vidéosurveillance',  value: 'videosurveillance' },
    { label: 'Groupe électrogène', value: 'groupe_electrogene' },
    { label: 'Forage',             value: 'forage' },
    { label: 'Surpresseur',        value: 'surpresseur' },
    { label: 'Interphone',         value: 'interphone' },
    { label: 'Panneaux solaires',  value: 'panneaux_solaires' },
    { label: 'Salle de sport',     value: 'salle_sport' },
    { label: 'Réservoir',          value: 'reservoir' },
    { label: 'Bâche à eau',        value: 'bache_eau' },
    { label: 'Conciergerie',       value: 'conciergerie' },
    { label: 'Salle polyvalente',  value: 'salle_polyvalente' },
  ];

  equipmentOptions = [
    { label: 'Climatisation',       value: 'climatisation' },
    { label: 'Chauffe-eau',         value: 'chauffe_eau' },
    { label: 'Cuisine équipée',     value: 'cuisine_equipee' },
    { label: 'Fibre optique',       value: 'fibre_optique' },
    { label: 'Portail automatique', value: 'portail_automatique' },
    { label: "Château d'eau",       value: 'chateau_eau' },
    { label: 'Placards intégrés',   value: 'placards_integres' },
    { label: 'Alarme',              value: 'alarme' },
    { label: 'Détecteur incendie',  value: 'detecteur_incendie' },
  ];

  selectedRooms:     string[] = [];
  selectedAmenities: string[] = [];
  selectedEquipment: string[] = [];

  isSelected(list: string[], value: string): boolean {
    return list.includes(value);
  }

  toggleItem(list: string[], value: string): string[] {
    return list.includes(value)
      ? list.filter(v => v !== value)
      : [...list, value];
  }

  toggleRoom(value: string):      void { this.selectedRooms     = this.toggleItem(this.selectedRooms, value); }
  toggleAmenity(value: string):   void { this.selectedAmenities = this.toggleItem(this.selectedAmenities, value); }
  toggleEquipment(value: string): void { this.selectedEquipment = this.toggleItem(this.selectedEquipment, value); }

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private confirm: ConfirmationService,
    private toast: MessageService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      owner_id:    [null, Validators.required],
      name:        ['', Validators.required],
      type:        ['appartement', Validators.required],
      address:     ['', Validators.required],
      city:        ['Dakar', Validators.required],
      zone:        [''],
      status:      ['available', Validators.required],
      is_furnished:[false],
      description: [''],
    });
  }

  ngOnInit(): void {
    this.loadOwners();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.http.get<any>(`${this.api}/properties`).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.properties.set(list);
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les biens.' });
        this.loading.set(false);
      }
    });
  }

  loadOwners(): void {
    this.http.get<any>(`${this.api}/owners`).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        this.owners.set(list);
      }
    });
  }

  get ownerOptions() {
    return this.owners().map(o => ({ label: o.full_name, value: o.id }));
  }

  openCreate(): void {
    this.editingProp.set(null);
    this.selectedRooms     = [];
    this.selectedAmenities = [];
    this.selectedEquipment = [];
    this.currentPhotos.set([]);
    this.clearPhotoSelection();
    this.activeTab = 'info';
    this.form.reset({ type: 'appartement', status: 'available', city: 'Dakar', is_furnished: false });
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  openEdit(p: Property): void {
    this.editingProp.set(p);
    this.selectedRooms     = Array.isArray(p.rooms)     ? [...p.rooms]     : [];
    this.selectedAmenities = Array.isArray(p.amenities) ? [...p.amenities] : [];
    this.selectedEquipment = Array.isArray(p.equipment) ? [...p.equipment] : [];
    this.currentPhotos.set(Array.isArray(p.photos) ? [...p.photos] : []);
    this.clearPhotoSelection();
    this.activeTab = 'info';
    this.form.patchValue({ ...p, owner_id: p.owner?.id ?? p.owner_id });
    this.drawerOpen = true;
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    this.drawerOpen = false;
    this.editingProp.set(null);
    this.currentPhotos.set([]);
    this.clearPhotoSelection();
    this.activeTab = 'info';
    this.form.reset();
    this.cdr.detectChanges();
  }

  switchTab(tab: 'info' | 'photos'): void {
    // L'onglet photos n'est accessible qu'en mode édition (bien existant)
    if (tab === 'photos' && !this.editingProp()) {
      this.toast.add({ severity: 'info', summary: 'Info', detail: 'Enregistrez le bien d\'abord pour ajouter des photos.' });
      return;
    }
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    const payload = {
      ...this.form.value,
      rooms:     this.selectedRooms,
      amenities: this.selectedAmenities,
      equipment: this.selectedEquipment,
    };

    const editing = this.editingProp();
    const req$ = editing
      ? this.http.put<any>(`${this.api}/properties/${editing.id}`, payload)
      : this.http.post<any>(`${this.api}/properties`, payload);

    req$.subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Succès', detail: res.message });
        this.saving.set(false);
        this.closeDrawer();
        this.load();
      },
      error: (err: any) => {
        const msg = err.error?.message ?? 'Une erreur est survenue.';
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: msg });
        this.saving.set(false);
      }
    });
  }

  // ── GESTION PHOTOS ────────────────────────────────────────────

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

    const valid = files.filter(f => {
      if (!allowed.includes(f.type)) {
        this.toast.add({ severity: 'warn', summary: 'Format invalide', detail: `${f.name} : format non supporté (jpeg, png, webp)` });
        return false;
      }
      if (f.size > maxSize) {
        this.toast.add({ severity: 'warn', summary: 'Fichier trop lourd', detail: `${f.name} : max 5MB` });
        return false;
      }
      return true;
    });

    if (!valid.length) return;

    // Limiter à 10 photos total
    const remaining = 10 - this.currentPhotos().length;
    if (remaining <= 0) {
      this.toast.add({ severity: 'warn', summary: 'Limite atteinte', detail: 'Maximum 10 photos par bien.' });
      return;
    }

    this.selectedFiles = valid.slice(0, remaining);

    // Générer les prévisualisations
    this.previewUrls = [];
    this.selectedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrls.push(e.target?.result as string);
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    });

    // Réinitialiser l'input pour permettre re-sélection du même fichier
    input.value = '';
    this.cdr.detectChanges();
  }

  uploadPhotos(): void {
    if (!this.selectedFiles.length) return;
    const prop = this.editingProp();
    if (!prop) return;

    this.uploadingPhoto.set(true);
    const formData = new FormData();
    this.selectedFiles.forEach(f => formData.append('photos[]', f));

    this.http.post<any>(`${this.api}/properties/${prop.id}/photos`, formData).subscribe({
      next: (res: any) => {
        const allPhotos: PropertyPhoto[] = res?.data?.all ?? [];
        this.currentPhotos.set(allPhotos);

        // Mettre à jour le bien dans la liste locale
        this.properties.update(list =>
          list.map(p => p.id === prop.id ? { ...p, photos: allPhotos } : p)
        );

        this.clearPhotoSelection();
        this.uploadingPhoto.set(false);
        this.toast.add({ severity: 'success', summary: 'Succès', detail: res.message });
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        const msg = err.error?.message ?? 'Erreur lors de l\'upload.';
        this.toast.add({ severity: 'error', summary: 'Erreur', detail: msg });
        this.uploadingPhoto.set(false);
      }
    });
  }

  deletePhoto(photo: PropertyPhoto): void {
    const prop = this.editingProp();
    if (!prop) return;

    this.confirm.confirm({
      message: `Supprimer cette photo ?`,
      header: 'Confirmer',
      icon: 'pi pi-trash',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.http.delete<any>(`${this.api}/properties/${prop.id}/photos/${photo.id}`).subscribe({
          next: (res: any) => {
            const updated = this.currentPhotos().filter(p => p.id !== photo.id);
            this.currentPhotos.set(updated);
            this.properties.update(list =>
              list.map(p => p.id === prop.id ? { ...p, photos: updated } : p)
            );
            this.toast.add({ severity: 'success', summary: 'Supprimée', detail: res.message });
            this.cdr.detectChanges();
          },
          error: () => this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible.' })
        });
      }
    });
  }

  clearPhotoSelection(): void {
    this.selectedFiles = [];
    this.previewUrls = [];
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ── Utilitaires ───────────────────────────────────────────────

  confirmDelete(p: Property): void {
    this.confirm.confirm({
      message: `Supprimer le bien <strong>${p.name}</strong> (${p.reference}) ?`,
      header: 'Confirmer la suppression',
      icon: 'pi pi-trash',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(p.id),
    });
  }

  private delete(id: number): void {
    this.http.delete<any>(`${this.api}/properties/${id}`).subscribe({
      next: (res: any) => {
        this.toast.add({ severity: 'success', summary: 'Supprimé', detail: res.message });
        this.load();
      },
      error: () => this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible.' })
    });
  }

  onSearch(e: Event): void { this.search.set((e.target as HTMLInputElement).value); }
  onFilterStatus(value: string): void { this.filterStatus.set(value); }

  statusLabel(s: string): string {
    return ({ available: 'Disponible', occupied: 'Occupé', maintenance: 'Maintenance' } as any)[s] ?? s;
  }

  statusClass(s: string): string {
    return ({ available: 'badge-success', occupied: 'badge-info', maintenance: 'badge-warning' } as any)[s] ?? '';
  }

  typeIcon(t: string): string {
    return ({ villa: 'pi pi-home', bureau: 'pi pi-briefcase' } as any)[t] ?? 'pi pi-building';
  }

  ownerName(p: Property): string {
    return p.owner?.full_name ?? '—';
  }

  photoCount(p: Property): number {
  if (!Array.isArray(p.photos)) return 0;
    // photos peut être un tableau d'objets {id, url, ...} ou vide
    return p.photos.length;
  }
}