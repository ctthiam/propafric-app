export interface Property {
  id: number;
  agency_id: number;
  owner_id: number;
  reference: string;
  name: string;
  type: 'appartement' | 'villa' | 'bureau' | 'commerce' | 'immeuble' | 'terrain' | 'autre';
  address: string;
  city: string;
  district: string | null;
  description: string | null;
  status: 'available' | 'occupied' | 'maintenance';
  has_units: boolean;
  photos: string[];
  created_at: string;
  updated_at: string;
  owner?: Owner;
  units?: PropertyUnit[];
}

export interface PropertyUnit {
  id: number;
  property_id: number;
  name: string;
  type: string;
  floor: number | null;
  area: number | null;
  status: 'available' | 'occupied' | 'maintenance';
  description: string | null;
}