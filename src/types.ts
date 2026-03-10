export interface Member {
  id: number;
  name: string;
  phone: string;
  email: string;
  birth_date: string;
  created_at?: string;
  last_expiry?: string | null;
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
  stock: number;
  category: string;
}

export interface Sale {
  id: number;
  item_id: number;
  quantity: number;
  total_price: number;
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
