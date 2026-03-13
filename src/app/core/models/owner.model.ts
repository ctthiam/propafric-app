export interface Owner {
  id: number;
  agency_id: number;
  user_id: number | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone_2: string | null;
  address: string | null;
  city: string | null;
  id_type: string | null;
  id_number: string | null;
  bank_name: string | null;
  bank_account: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  full_name?: string; // computed
}