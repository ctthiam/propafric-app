export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: 'super_admin' | 'agency_admin' | 'agency_secretary' | 'agency_accountant' | 'owner' | 'tenant' | 'commercial';
  agency_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}