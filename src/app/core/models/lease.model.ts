export interface BaseRentItem {
  label: string;
  amount: number;
}

export interface Lease {
  id: number;
  agency_id: number;
  property_id: number;
  unit_id: number | null;
  tenant_id: number;
  reference: string;
  start_date: string;
  end_date: string | null;
  base_rent_items: BaseRentItem[];
  base_rent: number;
  tom_rate: number;
  tom_amount: number;
  management_fee_ht: number;
  vat_rate: number;
  vat_amount: number;
  management_fee_ttc: number;
  total_rent: number;
  deposit: number;
  payment_day: number;
  status: 'active' | 'terminated' | 'expired';
  notes: string | null;
  next_revision_date: string | null;
  created_at: string;
  property?: Property;
  tenant?: Tenant;
}

export interface LeaseCalculateRequest {
  base_rent_items: BaseRentItem[];
  tom_rate: number;
  vat_rate: number;
}

export interface LeaseCalculateResponse {
  base_rent: number;
  tom_amount: number;
  management_fee_ht: number;
  vat_amount: number;
  management_fee_ttc: number;
  total_rent: number;
}