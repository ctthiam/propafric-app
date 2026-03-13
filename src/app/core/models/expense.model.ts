export interface Expense {
  id: number;
  agency_id: number;
  property_id: number;
  contractor_id: number | null;
  category: 'travaux' | 'entretien' | 'charges_communes' | 'impots' | 'assurance' | 'honoraires' | 'frais_envoi' | 'divers';
  description: string;
  amount_ht: number;
  vat_rate: number;
  amount_ttc: number;
  expense_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  charged_to_owner: boolean;
  receipt_url: string | null;
  notes: string | null;
  property?: Property;
  contractor?: Contractor;
}

export interface Contractor {
  id: number;
  agency_id: number;
  name: string;
  specialty: 'plomberie' | 'electricite' | 'peinture' | 'maconnerie' | 'menuiserie' | 'climatisation' | 'jardinage' | 'nettoyage' | 'securite' | 'ascenseur' | 'piscine' | 'groupe_electrogene' | 'autre';
  phone: string | null;
  email: string | null;
  rating: number | null;
  notes: string | null;
}