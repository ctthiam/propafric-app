export interface RentSchedule {
  id: number;
  lease_id: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  balance: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  paid_at: string | null;
}

export interface RentPayment {
  id: number;
  agency_id: number;
  lease_id: number;
  schedule_id: number;
  amount: number;
  payment_date: string;
  payment_method: 'wave' | 'orange_money' | 'free_money' | 'virement' | 'cheque' | 'especes';
  reference: string | null;
  notes: string | null;
  status: 'confirmed' | 'cancelled';
  receipt_number: string;
}