export interface PropertyPhoto {
  id: string;
  path: string;
  url: string;
  name: string;
  size: number;
  disk: string;
}

export interface Owner {
  id: number;
  full_name: string;
  phone: string;
}

export interface PropertyUnit {
  id: number;
  property_id: number;
  unit_number: string;
  type: string;
  floor: number | null;
  area: number | null;
  status: 'available' | 'occupied' | 'maintenance' | 'archived';
  is_furnished: boolean;
  rooms: string[] | null;
  amenities: string[] | null;
  active_lease?: any | null;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: number;
  agency_id?: number;
  owner_id?: number;
  reference: string;
  name: string;
  type: string;
  address: string;
  city: string;
  zone: string | null;
  area: string | null;
  description: string | null;
  status: 'available' | 'occupied' | 'maintenance' | 'archived';
  is_furnished: boolean;
  photos: PropertyPhoto[];   // ← corrigé : tableau d'objets, pas de strings
  rooms: string[] | null;
  amenities: string[] | null;
  equipment: string[] | null;
  units_count?: number;
  owner?: Owner;
  units?: PropertyUnit[];
  active_lease?: any | null;
  created_at?: string;
  updated_at?: string;
}