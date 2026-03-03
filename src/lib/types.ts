export interface Contractor {
  id: string;
  microsoft_oid: string | null;
  email: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  customer_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

export interface TimeEntry {
  id: string;
  contractor_id: string;
  customer_id: string;
  project_id: string;
  entry_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  description: string;
  created_at: string;
  updated_at: string;
  contractor?: Contractor;
  customer?: Customer;
  project?: Project;
}

export interface Expense {
  id: string;
  contractor_id: string;
  customer_id: string;
  project_id: string;
  expense_date: string;
  amount: number;
  description: string;
  is_billable: boolean;
  created_at: string;
  updated_at: string;
  contractor?: Contractor;
  customer?: Customer;
  project?: Project;
}

export interface AuthUser {
  contractor_id: string;
  email: string;
  display_name: string;
  microsoft_oid: string;
}

export interface ApiError {
  error: string;
}
