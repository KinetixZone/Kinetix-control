export interface Member {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  created_at?: string;
  last_expiry?: string | null;
  service_type?: 'gym' | 'personalized' | 'nutrition' | 'personalized_nutrition' | 'gym_nutrition';
  has_signed_waiver?: boolean;
  has_image_use_consent?: boolean;
  internal_notes?: string;
}

export interface Payment {
  id: number;
  member_id: number;
  member_name?: string;
  amount: number;
  payment_type: 'monthly' | 'visit';
  discount_type: 'birthday' | 'other' | 'none';
  discount_amount: number;
  received_by: string;
  payment_date: string;
  expiry_date: string | null;
  notes?: string;
  category?: 'gym' | 'personalized' | 'nutrition' | 'personalized_nutrition' | 'gym_nutrition';
  nutritionist_commission?: number;
  commission_paid?: boolean;
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  created_by: string;
}

export interface FinancialStats {
  total_income: number;
  total_expenses: number;
  profit: number;
}

export interface InventoryItem {
  id: number;
  name: string;
  price: number;
  cost_price: number;
  stock: number;
  category: string;
}

export interface Sale {
  id: number;
  item_id: number;
  quantity: number;
  total_price: number;
  unit_cost: number;
  sale_date: string;
}

export interface Attendance {
  id: number;
  member_id: number;
  check_in_time: string;
  name?: string;
}

export interface UserProfile {
  id: number;
  username: string;
  pin: string;
  role: 'Leslie' | 'Jorge' | 'Staff';
}

export type Role = 'Leslie' | 'Jorge' | 'Staff';
