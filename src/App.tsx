import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  CreditCard, 
  Plus, 
  Search, 
  Calendar, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Gift,
  User,
  TrendingDown,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  BarChart3,
  Menu,
  X,
  ChevronRight,
  LogOut,
  MessageCircle,
  Fingerprint,
  ShoppingBag,
  Box,
  Lock,
  Trash2,
  Edit,
  Info,
  FileText,
  Receipt,
  Wallet,
  Apple,
  Check as CheckIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import * as XLSX from 'xlsx';
import { supabase } from './lib/supabase';
import { encryptData, decryptData } from './lib/encryption';
import { Member, Payment, Expense, FinancialStats, InventoryItem } from './types';

type Role = 'Leslie' | 'Jorge' | 'Staff';

// Error Boundary for mobile safety
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  state = { hasError: false };

  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) { console.error("Kinetix App Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center text-slate-900">
          <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
            <AlertCircle size={40} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Algo salió mal</h1>
          <p className="text-slate-500 mb-8 max-w-sm">La aplicación se detuvo inesperadamente. Por favor intenta recargar la página.</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg"
          >
            Recargar Aplicación
          </button>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: 'Leslie', pin: '' });
  const [loginError, setLoginError] = useState('');

  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserForPin, setSelectedUserForPin] = useState<string | null>(null);
  const [paymentAlerts, setPaymentAlerts] = useState<any[]>([]);
  const [birthdayAlerts, setBirthdayAlerts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'members' | 'payments' | 'expenses' | 'analytics' | 'attendance' | 'inventory' | 'users' | 'sales' | 'personalized' | 'nutrition'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddInventory, setShowAddInventory] = useState(false);
  const [showMakeSale, setShowMakeSale] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });
  const [pinStatus, setPinStatus] = useState({ message: '', type: '' });
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  const [confirmation, setConfirmation] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentSearchTerm, setPaymentSearchTerm] = useState('');
  const [paymentMonthFilter, setPaymentMonthFilter] = useState('');
  const [paymentUserFilter, setPaymentUserFilter] = useState('');
  const [paymentYearFilter, setPaymentYearFilter] = useState('');
  const [expenseMonthFilter, setExpenseMonthFilter] = useState('');
  const [expenseUserFilter, setExpenseUserFilter] = useState('');
  const [expenseYearFilter, setExpenseYearFilter] = useState('');
  const [memberMonthFilter, setMemberMonthFilter] = useState('');
  const [saleMonthFilter, setSaleMonthFilter] = useState('');
  const [saleYearFilter, setSaleYearFilter] = useState('');
  const [analyticsMonthFilter, setAnalyticsMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // Default to current month
  const [analyticsYearFilter, setAnalyticsYearFilter] = useState(new Date().getFullYear().toString());
  const [memberFilterTab, setMemberFilterTab] = useState<'all' | 'new' | 'active' | 'expired'>('all');
  const [memberServiceFilter, setMemberServiceFilter] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [currentRole, setCurrentRole] = useState<Role>('Leslie');
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [newMember, setNewMember] = useState({ 
    name: '', 
    phone: '', 
    email: '', 
    birth_date: '', 
    service_type: 'gym' as 'gym' | 'personalized' | 'nutrition' | 'personalized_nutrition' | 'gym_nutrition',
    has_signed_waiver: false,
    has_image_use_consent: false,
    internal_notes: ''
  });
  const [newPayment, setNewPayment] = useState({
    member_id: '' as any,
    amount: 500,
    payment_type: 'monthly' as 'monthly' | 'visit',
    discount_type: 'none' as 'birthday' | 'other' | 'none',
    discount_amount: 0,
    received_by: '',
    months: 1,
    notes: '',
    start_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    category: 'gym' as 'gym' | 'personalized' | 'nutrition' | 'personalized_nutrition' | 'gym_nutrition',
    nutritionist_commission: 0,
    commission_paid: false
  });
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: 0,
    category: 'other',
    created_by: ''
  });
  const [newInventory, setNewInventory] = useState({ name: '', price: 0, stock: 0, category: 'drinks' });
  const [newSale, setNewSale] = useState({ item_id: 0, quantity: 1, total_price: 0 });

  useEffect(() => {
    const savedUser = localStorage.getItem('kinetix_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        if (user && user.role) {
          setCurrentRole(user.role);
          setIsLoggedIn(true);
          fetchData();
        }
      } catch (e) {
        console.error('Error parsing saved user:', e);
        localStorage.removeItem('kinetix_user');
      }
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      const channel = supabase
        .channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          fetchData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isLoggedIn]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoginError('');
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', loginForm.username)
        .eq('pin', loginForm.pin)
        .single();

      if (error || !data) {
        setLoginError('PIN incorrecto');
        setIsSubmitting(false);
        return;
      }

      localStorage.setItem('kinetix_user', JSON.stringify({ username: data.username, role: data.role }));
      setCurrentRole(data.role);
      setIsLoggedIn(true);
      setLoginError('');
      fetchData();
    } catch (error) {
      setLoginError('Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('kinetix_user');
    setIsLoggedIn(false);
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    setConfirmation({ isOpen: true, title, message, onConfirm });
  };

  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', pin: '', role: 'Coach' });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    confirmAction(
      '¿Crear Usuario?',
      `Se creará una nueva cuenta para ${newUser.username}. ¿Deseas continuar?`,
      async () => {
        setIsSubmitting(true);
        try {
          // Check if user already exists
          const { data: existingUser } = await supabase.from('users').select('username').eq('username', newUser.username).single();
          if (existingUser) {
            addToast('El usuario ya existe', 'error');
            setIsSubmitting(false);
            return;
          }

          const { error } = await supabase.from('users').insert([newUser]);
          if (error) throw error;
          addToast(`Usuario ${newUser.username} creado correctamente`);
          setShowAddUser(false);
          setNewUser({ username: '', pin: '', role: 'Coach' });
          fetchData();
        } catch (error: any) {
          addToast(error.message || 'Error al crear usuario', 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  useEffect(() => {
    if (showAddPayment) {
      setPaymentSearchTerm('');
    }
  }, [showAddPayment]);

  // Financial Stats Calculation using current filters
  const financialStats = useMemo(() => {
    const validPayments = (payments || []).filter(p => {
      const dateStr = String(p.payment_date || '');
      const matchMonth = analyticsMonthFilter ? dateStr.startsWith(analyticsMonthFilter) : true;
      const matchYear = analyticsYearFilter ? dateStr.startsWith(analyticsYearFilter) : true;
      return matchMonth && matchYear;
    });

    const validSales = (sales || []).filter(s => {
      const dateStr = String(s.sale_date || '');
      const matchMonth = analyticsMonthFilter ? dateStr.startsWith(analyticsMonthFilter) : true;
      const matchYear = analyticsYearFilter ? dateStr.startsWith(analyticsYearFilter) : true;
      return matchMonth && matchYear;
    });

    const validExpenses = (expenses || []).filter(e => {
      const dateStr = String(e.expense_date || '');
      const matchMonth = analyticsMonthFilter ? dateStr.startsWith(analyticsMonthFilter) : true;
      const matchYear = analyticsYearFilter ? dateStr.startsWith(analyticsYearFilter) : true;
      return matchMonth && matchYear;
    });

    const income = (validPayments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)) +
                   (validSales.reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0));
    const cost = validExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    return {
      total_income: income,
      total_expenses: cost,
      profit: income - cost,
      filteredExpenses: validExpenses
    };
  }, [payments, sales, expenses, analyticsMonthFilter, analyticsYearFilter]);

  const personalizedStats = useMemo(() => {
    const pPayments = (payments || []).filter(p => p.category === 'personalized' || p.category === 'personalized_nutrition');
    const pExpenses = (expenses || []).filter(e => e.category === 'personalized');
    
    const income = pPayments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const nutritionistCut = pPayments.reduce((acc, curr) => acc + (Number(curr.nutritionist_commission) || 0), 0);
    const nutritionistCutPaid = pPayments.filter(p => p.commission_paid).reduce((acc, curr) => acc + (Number(curr.nutritionist_commission) || 0), 0);
    const cost = pExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    return {
      income,
      nutritionistCut,
      nutritionistCutPaid,
      nutritionistCutPending: nutritionistCut - nutritionistCutPaid,
      expenses: cost,
      profit: income - cost - nutritionistCut,
      payments: pPayments,
      expensesList: pExpenses,
      memberCount: members.filter(m => m.service_type === 'personalized' || m.service_type === 'personalized_nutrition').length
    };
  }, [payments, expenses, members]);

  const nutritionStats = useMemo(() => {
    const nPayments = (payments || []).filter(p => p.category === 'nutrition' || p.category === 'personalized_nutrition' || p.category === 'gym_nutrition');
    const nExpenses = (expenses || []).filter(e => e.category === 'nutrition');
    
    const income = nPayments.reduce((acc, curr) => {
      if (curr.category === 'personalized_nutrition' || curr.category === 'gym_nutrition') {
        return acc + (Number(curr.nutritionist_commission) || 0);
      }
      return acc + (Number(curr.amount) || 0);
    }, 0);

    const paidIncome = nPayments.reduce((acc, curr) => {
      if (curr.category === 'personalized_nutrition' || curr.category === 'gym_nutrition') {
        return curr.commission_paid ? acc + (Number(curr.nutritionist_commission) || 0) : acc;
      }
      return curr.commission_paid ? acc + (Number(curr.amount) || 0) : acc;
    }, 0);

    const cost = nExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    return {
      income,
      paidIncome,
      pendingIncome: income - paidIncome,
      expenses: cost,
      profit: income - cost,
      payments: nPayments,
      memberCount: members.filter(m => m.service_type === 'nutrition' || m.service_type === 'personalized_nutrition' || m.service_type === 'gym_nutrition').length
    };
  }, [payments, expenses, members]);

  const fetchData = async () => {
    setIsLoading(true);
    setDatabaseStatus('checking');
    try {
      // 1. Members with payments for last_expiry
      const { data: membersData, error: mError } = await supabase
        .from('members')
        .select('*')
        .order('name');
      
      if (mError) throw mError;

      // Also get all payments to calculate expiry in memory to avoid query join issues
      const { data: allPayments } = await supabase.from('payments').select('member_id, expiry_date');

      const transformedMembers = (membersData || []).map(m => {
        const memberPayments = (allPayments || []).filter(p => String(p.member_id) === String(m.id));
        const expiries = memberPayments
          .map((p: any) => p.expiry_date)
          .filter(Boolean)
          .sort((a: string, b: string) => {
            const dateA = new Date(a).getTime();
            const dateB = new Date(b).getTime();
            return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
          });
        return { ...m, last_expiry: expiries[0] || null };
      });
      setMembers(transformedMembers);

      // 2. Payments
      const { data: paymentsData, error: pError } = await supabase
        .from('payments')
        .select('*, members(name)')
        .order('payment_date', { ascending: false });
      
      if (pError) throw pError;

      const transformedPayments = (paymentsData || []).map((p: any) => ({
        ...p,
        member_name: (Array.isArray(p.members) ? p.members[0]?.name : p.members?.name) || 'Desconocido',
        notes: p.notes ? decryptData(p.notes) : ''
      }));
      setPayments(transformedPayments);

      // 3. Expenses
      const { data: expensesData, error: eError } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });
      
      if (eError) throw eError;

      const decryptedExpenses = (expensesData || []).map(e => ({
        ...e,
        description: decryptData(e.description)
      }));
      setExpenses(decryptedExpenses);

      // 4. Inventory
      const { data: inventoryData, error: iError } = await supabase
        .from('inventory')
        .select('*')
        .order('name');
      if (iError) throw iError;
      setInventory(inventoryData || []);

      // 5. Attendance (Today)
      const today = new Date().toISOString().split('T')[0];
      const { data: attendanceData, error: aError } = await supabase
        .from('attendance')
        .select('*, members(name)')
        .gte('check_in_time', `${today}T00:00:00`)
        .order('check_in_time', { ascending: false });
      
      if (aError) throw aError;

      setAttendance((attendanceData || []).map((a: any) => ({
        ...a,
        name: (Array.isArray(a.members) ? a.members[0]?.name : a.members?.name) || 'Desconocido'
      })));

      // 6. Sales and Stats
      const { data: sData } = await supabase.from('sales').select('*, inventory(name)');
      setSales((sData || []).map((s: any) => ({
        ...s,
        item_name: (Array.isArray(s.inventory) ? s.inventory[0]?.name : s.inventory?.name) || 'Producto Desconocido'
      })));

      // 7. Alerts
      const now = new Date();
      const next3Days = new Date();
      next3Days.setDate(now.getDate() + 3);

      const birthdayAlerts = transformedMembers.filter(m => {
        if (!m.birth_date) return false;
        try {
          const bDay = new Date(m.birth_date);
          if (isNaN(bDay.getTime())) return false;
          return bDay.getMonth() === now.getMonth() && bDay.getDate() === now.getDate();
        } catch (e) {
          return false;
        }
      });
      setBirthdayAlerts(birthdayAlerts);

      const expiringAlerts = transformedMembers.filter(m => {
        if (!m.last_expiry) return false;
        try {
          const expiry = new Date(m.last_expiry);
          if (isNaN(expiry.getTime())) return false;
          return expiry >= now && expiry <= next3Days;
        } catch (e) {
          return false;
        }
      });
      setPaymentAlerts(expiringAlerts);
      
      // 8. Users (Admin only)
      if (currentRole === 'Leslie' || currentRole === 'Jorge') {
        const { data: usersData, error: uError } = await supabase.from('users').select('username, role');
        if (!uError) setUsers(usersData || []);
      }

      setDatabaseStatus('online');
      setIsLoading(false);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setIsLoading(false);
      setDatabaseStatus('offline');
      if (error.message === 'Failed to fetch' || (error.message && error.message.includes('fetch'))) {
        addToast('Error de conexión. Revisa tu internet o si Supabase está pausado.', 'error');
      }
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (username === 'Leslie' || username === 'Jorge') {
      addToast('No se pueden eliminar las cuentas principales', 'error');
      return;
    }

    confirmAction(
      '¿Eliminar Usuario?',
      `Se borrará permanentemente el acceso para ${username}. ¿Deseas continuar?`,
      async () => {
        setIsSubmitting(true);
        try {
          const { error } = await supabase.from('users').delete().eq('username', username);
          if (error) throw error;
          addToast(`Usuario ${username} eliminado`);
          fetchData();
        } catch (error: any) {
          console.error('Error deleting user:', error);
          addToast(error.message || 'Error al eliminar usuario', 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  const handleDeleteMember = async (id: number) => {
    const memberToDelete = members.find(m => m.id === id);
    
    confirmAction(
      '¿Eliminar Miembro?',
      `Esta acción eliminará permanentemente a ${memberToDelete?.name || 'este miembro'} y todo su historial. Esta acción no se puede deshacer.`,
      async () => {
        setIsSubmitting(true);
        try {
          // 1. Delete attendance
          const { error: attError } = await supabase.from('attendance').delete().eq('member_id', id);
          if (attError) {
            console.error('Error deleting attendance:', attError);
            // We continue even if there's an error here, unless it's a critical one
          }
          
          // 2. Delete payments
          const { error: payError } = await supabase.from('payments').delete().eq('member_id', id);
          if (payError) {
            console.error('Error deleting payments:', payError);
          }
          
          // 3. Delete member
          const { error } = await supabase.from('members').delete().eq('id', id);
          if (error) throw error;
          
          addToast('Miembro eliminado correctamente');
          fetchData();
        } catch (error: any) {
          console.error('Error deleting member:', error);
          addToast(`Error: ${error.message || 'No se pudo eliminar'}`, 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  const handleDeletePayment = async (id: number) => {
    confirmAction(
      '¿Eliminar Pago?',
      'Se borrará el registro de este pago. ¿Deseas continuar?',
      async () => {
        try {
          const { error } = await supabase.from('payments').delete().eq('id', id);
          if (error) throw error;
          addToast('Pago eliminado');
          fetchData();
        } catch (error: any) {
          console.error('Error deleting payment:', error);
          addToast(error.message || 'Error al eliminar pago', 'error');
        }
      }
    );
  };

  const handleEditPayment = (payment: Payment) => {
    setSelectedMember(members.find(m => m.id === payment.member_id) || null);
    setNewPayment({
      member_id: payment.member_id,
      amount: payment.amount,
      payment_type: payment.payment_type,
      discount_type: payment.discount_type,
      discount_amount: payment.discount_amount,
      received_by: payment.received_by,
      notes: payment.notes || '',
      start_date: payment.payment_date ? payment.payment_date.split('T')[0] : new Date().toISOString().split('T')[0],
      months: 1,
      expiry_date: payment.expiry_date ? payment.expiry_date.split('T')[0] : '',
      category: payment.category || 'gym',
      nutritionist_commission: payment.nutritionist_commission || 0,
      commission_paid: payment.commission_paid || false
    });
    setIsEditing(true);
    setEditingId(payment.id);
    setShowAddPayment(true);
  };

  const handleToggleCommissionPaid = async (id: number, status: boolean) => {
    if (currentRole !== 'Leslie' && currentRole !== 'Jorge') return;
    try {
      const { error } = await supabase
        .from('payments')
        .update({ commission_paid: status })
        .eq('id', id);
      if (error) throw error;
      fetchData();
      addToast(status ? 'Comisión marcada como pagada' : 'Comisión marcada como pendiente');
    } catch (err) {
      console.error('Error toggling commission:', err);
    }
  };

  const handleDeleteSale = async (id: number) => {
    confirmAction(
      '¿Eliminar Venta?',
      'Se borrará permanentemente este registro de venta. ¿Deseas continuar?',
      async () => {
        try {
          // Antes de eliminar, recuperamos la venta para devolver el stock
          const { data: saleData } = await supabase.from('sales').select('*').eq('id', id).single();
          
          const { error } = await supabase.from('sales').delete().eq('id', id);
          if (error) throw error;
          
          // Intentamos restaurar el stock si es posible
          if (saleData) {
            try {
              const { data: invData } = await supabase.from('inventory').select('stock').eq('id', saleData.item_id).single();
              if (invData) {
                await supabase.from('inventory').update({ stock: invData.stock + saleData.quantity }).eq('id', saleData.item_id);
              }
            } catch (stockErr) {
              console.error('Error restoring stock:', stockErr);
            }
          }

          addToast('Venta eliminada y stock restaurado');
          fetchData();
        } catch (error: any) {
          console.error('Error deleting sale:', error);
          addToast(error.message || 'Error al eliminar venta', 'error');
        }
      }
    );
  };

  const handleEditSale = (sale: any) => {
    setNewSale({
      item_id: sale.item_id,
      quantity: sale.quantity,
      total_price: sale.total_price
    });
    setIsEditing(true);
    setEditingId(sale.id);
    setShowMakeSale(true);
  };

  const handleDeleteExpense = async (id: number) => {
    confirmAction(
      '¿Eliminar Gasto?',
      'Se borrará el registro de este gasto. ¿Deseas continuar?',
      async () => {
        try {
          const { error } = await supabase.from('expenses').delete().eq('id', id);
          if (error) throw error;
          addToast('Gasto eliminado');
          fetchData();
        } catch (error: any) {
          console.error('Error deleting expense:', error);
          addToast(error.message || 'Error al eliminar gasto', 'error');
        }
      }
    );
  };

  const handleCheckIn = async (memberId: number) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('attendance')
        .insert([{ 
          member_id: memberId,
          check_in_time: new Date().toISOString()
        }]);
      if (error) throw error;
      addToast('Check-in registrado correctamente');
      fetchData();
    } catch (error: any) {
      console.error('Error during check-in:', error);
      addToast(error.message || 'Error al registrar check-in', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendWhatsAppReminder = (member: Member) => {
    const daysLeft = member.last_expiry 
      ? Math.ceil((new Date(member.last_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    let message = `Hola ${member.name}, te saludamos de Kinetix Functional Zone. `;
    if (daysLeft < 0) {
      message += `Te recordamos que tu mensualidad venció hace ${Math.abs(daysLeft)} días. ¡Te esperamos para renovar!`;
    } else if (daysLeft === 0) {
      message += `Hoy vence tu mensualidad. ¡Te esperamos para entrenar!`;
    } else {
      message += `Te recordamos que tu mensualidad vence en ${daysLeft} días.`;
    }

    if (!member.phone) {
      addToast('Este miembro no tiene un número de teléfono registrado', 'error');
      return;
    }

    const url = `https://wa.me/${member.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const exportAttendanceToCSV = () => {
    const headers = ['ID', 'Miembro', 'Hora de Entrada'];
    const rows = attendance.map(a => [
      a.id,
      a.name,
      new Date(a.check_in_time).toLocaleTimeString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `asistencia_kinetix_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportMembersToExcel = () => {
    const dataToExport = filteredMembers.map(m => ({
      Nombre: m.name,
      Telefono: m.phone || '-',
      Email: m.email || '-',
      'Fecha Nacimiento': m.birth_date || '-',
      Estado: m.last_expiry ? (isExpired(m.last_expiry) ? 'Vencido' : 'Activo') : 'Sin Pagos',
      Vencimiento: m.last_expiry ? new Date(m.last_expiry).toLocaleDateString() : '-'
    }));
    handleExportExcel(dataToExport, 'miembros_kinetix');
  };

  const exportPaymentsToExcel = (paymentsList: Payment[]) => {
    const dataToExport = paymentsList.map(p => ({
      Miembro: p.member_name,
      Monto: p.amount,
      Tipo: p.payment_type === 'monthly' ? 'Mensualidad' : 'Visita',
      Fecha: p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '-',
      Notas: p.notes || '-',
      'Recibido por': p.received_by
    }));
    handleExportExcel(dataToExport, 'pagos_kinetix');
  };

  const exportExpensesToExcel = () => {
    const dataToExport = filteredExpenses.map(e => ({
      Descripcion: e.description,
      Monto: e.amount,
      Categoria: e.category,
      Fecha: e.expense_date ? new Date(e.expense_date).toLocaleDateString() : '-',
      RegistradoPor: e.created_by
    }));
    handleExportExcel(dataToExport, 'gastos_kinetix');
  };

  const exportToXML = (data: any[], filename: string, rootName: string, itemName: string) => {
    let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>\n`;
    
    data.forEach(item => {
      xmlContent += `  <${itemName}>\n`;
      Object.entries(item).forEach(([key, value]) => {
        const cleanValue = value === null || value === undefined ? '' : String(value).replace(/[<>&"']/g, (c) => {
          switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '"': return '&quot;';
            case "'": return '&apos;';
            default: return c;
          }
        });
        xmlContent += `    <${key}>${cleanValue}</${key}>\n`;
      });
      xmlContent += `  </${itemName}>\n`;
    });
    
    xmlContent += `</${rootName}>`;

    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.xml`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPaymentsToCSV = (filteredData?: Payment[]) => {
    const dataToExport = filteredData || payments;
    const headers = ['ID', 'Miembro', 'Monto', 'Tipo', 'Fecha', 'Recibido Por'];
    const rows = dataToExport.map(p => [
      p.id,
      p.member_name,
      p.amount,
      p.payment_type,
      new Date(p.payment_date!).toLocaleDateString(),
      p.received_by
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pagos_kinetix_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMember.name.trim()) {
      addToast('El nombre es obligatorio', 'error');
      return;
    }

    confirmAction(
      isEditing ? '¿Guardar Cambios?' : '¿Registrar Miembro?',
      isEditing ? 'Se actualizará la información del miembro. ¿Deseas continuar?' : 'Se creará un nuevo registro de miembro. ¿Deseas continuar?',
      async () => {
        setErrorMsg('');
        setIsSubmitting(true);
        try {
          // Prepare data: handle optional fields correctly
          const memberData: any = {
            name: newMember.name.trim(),
            phone: newMember.phone?.trim() || null,
            email: newMember.email?.trim() || null,
            birth_date: newMember.birth_date || null,
            service_type: newMember.service_type || 'gym',
            has_signed_waiver: newMember.has_signed_waiver,
            has_image_use_consent: newMember.has_image_use_consent,
            internal_notes: newMember.internal_notes?.trim() || null
          };

          let result;
          if (isEditing) {
            result = await supabase
              .from('members')
              .update(memberData)
              .eq('id', editingId);
          } else {
            result = await supabase
              .from('members')
              .insert([memberData]);
          }

          if (result.error) {
            console.error('Supabase error saving member:', result.error);
            if (result.error?.code === '23505') {
              setErrorMsg('Este dato (teléfono o email) ya está registrado a otro miembro.');
              addToast('Dato duplicado', 'error');
            } else if (result.error?.message?.includes('Failed to fetch')) {
              setErrorMsg('Error de conexión: No se pudo contactar con Supabase. Verifica si tu proyecto está pausado.');
              addToast('Error de conexión', 'error');
            } else {
              setErrorMsg('Error de base de datos: ' + result.error.message);
              addToast('Error en el servidor', 'error');
            }
            setIsSubmitting(false);
            return;
          }

          setNewMember({ 
            name: '', 
            phone: '', 
            email: '', 
            birth_date: '', 
            service_type: 'gym',
            has_signed_waiver: false,
            has_image_use_consent: false,
            internal_notes: ''
          });
          setShowAddMember(false);
          setIsEditing(false);
          setEditingId(null);
          addToast(isEditing ? 'Miembro actualizado' : 'Miembro registrado con éxito');
          fetchData();
        } catch (error: any) {
          console.error('Network or Runtime error saving member:', error);
          const detail = (error.message === 'Failed to fetch' || error.message?.includes('fetch'))
            ? 'Error de conexión. Verifica si tu proyecto de Supabase está PAUSADO o si no tienes internet.'
            : error.message;
          setErrorMsg('Error al guardar: ' + detail);
          addToast('Error de conexión', 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  const handleEditMember = (member: Member) => {
    setNewMember({
      name: member.name,
      phone: member.phone || '',
      email: member.email || '',
      birth_date: member.birth_date || '',
      service_type: member.service_type || 'gym',
      has_signed_waiver: member.has_signed_waiver || false,
      has_image_use_consent: member.has_image_use_consent || false,
      internal_notes: member.internal_notes || ''
    });
    setIsEditing(true);
    setEditingId(member.id);
    setShowAddMember(true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.member_id) {
      addToast('Por favor selecciona un miembro', 'error');
      return;
    }

    if (newPayment.amount <= 0) {
      addToast('El monto debe ser mayor a 0', 'error');
      return;
    }

    confirmAction(
      isEditing ? '¿Actualizar Pago?' : '¿Registrar Pago?',
      isEditing ? 'Se modificarán los datos del pago. ¿Deseas continuar?' : 'Se registrará un nuevo pago para este miembro. ¿Deseas continuar?',
      async () => {
        setIsSubmitting(true);
        try {
          const baseAmount = Number(newPayment.amount);
          let discount = 0;
          
          if (newPayment.discount_type === 'birthday') {
            discount = baseAmount * 0.5;
          } else if (newPayment.discount_type === 'other') {
            discount = Number(newPayment.discount_amount) || 0;
          }

          const finalAmount = baseAmount - discount;

          if (isNaN(finalAmount) || finalAmount < 0) {
            addToast('Monto de pago inválido', 'error');
            setIsSubmitting(false);
            return;
          }

          let expiry_date = null;
          let finalPaymentDate = new Date().toISOString();

          if (newPayment.start_date) {
            try {
              const parts = newPayment.start_date.split('-');
              if (parts.length === 3) {
                const y = parseInt(parts[0]);
                const m = parseInt(parts[1]);
                const d = parseInt(parts[2]);
                const parsedDate = new Date(y, m - 1, d, 12, 0, 0);
                
                if (!isNaN(parsedDate.getTime())) {
                  finalPaymentDate = parsedDate.toISOString();
                  
                  if (newPayment.payment_type === 'monthly') {
                    if (newPayment.expiry_date) {
                      const expParts = newPayment.expiry_date.split('-');
                      if (expParts.length === 3) {
                        expiry_date = new Date(parseInt(expParts[0]), parseInt(expParts[1]) - 1, parseInt(expParts[2]), 23, 59, 59).toISOString();
                      }
                    } else {
                      const expDate = new Date(parsedDate);
                      expDate.setMonth(expDate.getMonth() + (Number(newPayment.months) || 1));
                      expiry_date = expDate.toISOString();
                    }
                  }
                }
              }
            } catch (dateErr) {
              console.error('Error parsing date:', dateErr);
              finalPaymentDate = new Date().toISOString();
            }
          }

          if (isEditing && editingId) {
            const { error } = await supabase
              .from('payments')
              .update({
                member_id: newPayment.member_id,
                amount: finalAmount,
                payment_type: newPayment.payment_type,
                discount_type: newPayment.discount_type,
                discount_amount: discount,
                received_by: newPayment.received_by || currentRole,
                expiry_date,
                payment_date: finalPaymentDate,
                notes: encryptData(newPayment.notes || ''),
                category: newPayment.category || 'gym',
                nutritionist_commission: newPayment.category === 'personalized_nutrition' ? newPayment.nutritionist_commission : 0,
                commission_paid: newPayment.commission_paid || false
              })
              .eq('id', editingId);
            if (error) throw error;
            addToast('Pago actualizado correctamente');
          } else {
            const { error } = await supabase
              .from('payments')
              .insert([{
                member_id: newPayment.member_id,
                amount: finalAmount,
                payment_type: newPayment.payment_type,
                discount_type: newPayment.discount_type,
                discount_amount: discount,
                received_by: newPayment.received_by || currentRole,
                expiry_date,
                payment_date: finalPaymentDate,
                notes: encryptData(newPayment.notes || ''),
                category: newPayment.category || 'gym',
                nutritionist_commission: newPayment.category === 'personalized_nutrition' ? newPayment.nutritionist_commission : 0,
                commission_paid: newPayment.commission_paid || false
              }]);
            if (error) throw error;
            addToast('Pago registrado correctamente');
          }

          setShowAddPayment(false);
          setSelectedMember(null);
          setNewPayment({
            member_id: '' as any,
            amount: 0,
            payment_type: 'monthly',
            discount_type: 'none',
            discount_amount: 0,
            received_by: '',
            months: 1,
            notes: '',
            start_date: new Date().toISOString().split('T')[0],
            expiry_date: '',
            category: 'gym' as any,
            nutritionist_commission: 0,
            commission_paid: false
          });
          setPaymentSearchTerm('');
          setIsEditing(false);
          setEditingId(null);
          fetchData();
        } catch (error: any) {
          console.error('Network error adding payment:', error);
          const detail = error.message === 'Failed to fetch' 
            ? 'Error de conexión. Verifica tu internet o si la base de datos está activa.'
            : error.message;
          addToast(`Error: ${detail}`, 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    confirmAction(
      isEditing ? '¿Actualizar Gasto?' : '¿Registrar Gasto?',
      isEditing ? 'Se modificarán los datos del gasto. ¿Deseas continuar?' : 'Se registrará un nuevo gasto. ¿Deseas continuar?',
      async () => {
        setIsSubmitting(true);
        try {
          let result;
          if (isEditing) {
            result = await supabase
              .from('expenses')
              .update({
                description: encryptData(newExpense.description),
                amount: newExpense.amount,
                category: newExpense.category
              })
              .eq('id', editingId);
          } else {
            result = await supabase
              .from('expenses')
              .insert([{
                ...newExpense,
                description: encryptData(newExpense.description),
                created_by: currentRole,
                expense_date: new Date().toISOString()
              }]);
          }

          if (result.error) throw result.error;

          setNewExpense({ description: '', amount: 0, category: 'other', created_by: '' });
          setShowAddExpense(false);
          setIsEditing(false);
          setEditingId(null);
          addToast(isEditing ? 'Gasto actualizado' : 'Gasto registrado');
          fetchData();
        } catch (error: any) {
          console.error('Network error saving expense:', error);
          const detail = error.message === 'Failed to fetch' 
            ? 'Error de conexión. Revisa tu internet o si la base de datos está pausada.'
            : error.message;
          addToast(`Error: ${detail}`, 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  const handleEditExpense = (expense: Expense) => {
    setNewExpense({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      created_by: expense.created_by
    });
    setIsEditing(true);
    setEditingId(expense.id);
    setShowAddExpense(true);
  };

  const handleDeleteInventory = async (id: number) => {
    confirmAction(
      '¿Eliminar Producto?',
      'Se borrará este producto del inventario y su historial de ventas. ¿Deseas continuar?',
      async () => {
        try {
          // Primero eliminamos las ventas asociadas
          await supabase.from('sales').delete().eq('item_id', id);
          
          // Ahora eliminamos el producto
          const { error } = await supabase.from('inventory').delete().eq('id', id);
          if (error) throw error;
          addToast('Producto eliminado');
          fetchData();
        } catch (error) {
          addToast('Error al eliminar producto', 'error');
        }
      }
    );
  };

  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    confirmAction(
      isEditing ? '¿Actualizar Producto?' : '¿Registrar Producto?',
      isEditing ? 'Se modificarán los datos del producto. ¿Deseas continuar?' : 'Se añadirá un nuevo producto al inventario. ¿Deseas continuar?',
      async () => {
        setIsSubmitting(true);
        try {
          let result;
          if (isEditing) {
            result = await supabase
              .from('inventory')
              .update(newInventory)
              .eq('id', editingId);
          } else {
            result = await supabase
              .from('inventory')
              .insert([newInventory]);
          }

          if (result.error) throw result.error;

          setNewInventory({ name: '', price: 0, stock: 0, category: 'drinks' });
          setShowAddInventory(false);
          setIsEditing(false);
          setEditingId(null);
          addToast(isEditing ? 'Producto actualizado' : 'Producto registrado');
          fetchData();
        } catch (error: any) {
          console.error('Network error saving inventory item:', error);
          const detail = error.message === 'Failed to fetch' 
            ? 'Error de conexión con el inventario.'
            : error.message;
          addToast(`Error: ${detail}`, 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  const handleEditInventory = (item: InventoryItem) => {
    setNewInventory({
      name: item.name,
      price: item.price,
      stock: item.stock,
      category: item.category
    });
    setIsEditing(true);
    setEditingId(item.id);
    setShowAddInventory(true);
  };

  const handleMakeSale = async (e: React.FormEvent) => {
    e.preventDefault();
    
    confirmAction(
      isEditing ? '¿Actualizar Venta?' : '¿Procesar Venta?',
      isEditing ? 'Se modificarán los datos de la venta. ¿Deseas continuar?' : 'Se registrará la venta y se descontará del stock. ¿Deseas continuar?',
      async () => {
        setIsSubmitting(true);
        try {
          if (isEditing && editingId) {
            // 1. Get old sale to adjust stock
            const { data: oldSale } = await supabase.from('sales').select('*').eq('id', editingId).single();
            
            // 2. Update sale
            const { error: saleError } = await supabase
              .from('sales')
              .update({
                item_id: newSale.item_id,
                quantity: newSale.quantity,
                total_price: newSale.total_price
              })
              .eq('id', editingId);
            if (saleError) throw saleError;

            // 3. Adjust stock
            if (oldSale && oldSale.quantity !== undefined) {
              const item = inventory.find(i => i.id === newSale.item_id);
              if (item) {
                const stockDiff = oldSale.quantity - newSale.quantity;
                await supabase
                  .from('inventory')
                  .update({ stock: item.stock + stockDiff })
                  .eq('id', newSale.item_id);
              }
            }
            addToast('Venta actualizada');
          } else {
            // 1. Register sale
            const { error: saleError } = await supabase
              .from('sales')
              .insert([{
                ...newSale,
                sale_date: new Date().toISOString()
              }]);
            if (saleError) throw saleError;

            // 2. Update stock
            const item = inventory.find(i => i.id === newSale.item_id);
            if (item) {
              await supabase
                .from('inventory')
                .update({ stock: item.stock - newSale.quantity })
                .eq('id', newSale.item_id);
            }
            addToast('Venta registrada con éxito');
          }

          setNewSale({ item_id: 0, quantity: 1, total_price: 0 });
          setShowMakeSale(false);
          setIsEditing(false);
          setEditingId(null);
          fetchData();
        } catch (error: any) {
          console.error('Network error making sale:', error);
          const detail = error.message === 'Failed to fetch' 
            ? 'Error de conexión al procesar venta.'
            : error.message;
          addToast(`Error: ${detail}`, 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinStatus({ message: '', type: '' });

    if (pinForm.newPin !== pinForm.confirmPin) {
      setPinStatus({ message: 'Los PINs nuevos no coinciden', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const userData = JSON.parse(localStorage.getItem('kinetix_user') || '{}');
      const targetUsername = selectedUserForPin || userData.username;
      const isAdminReset = !!selectedUserForPin && selectedUserForPin !== userData.username;

      if (!isAdminReset) {
        const { data: user, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('username', userData.username)
          .eq('pin', pinForm.currentPin)
          .single();

        if (fetchError || !user) {
          setPinStatus({ message: 'PIN actual incorrecto', type: 'error' });
          setIsSubmitting(false);
          return;
        }
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ pin: pinForm.newPin })
        .eq('username', targetUsername);

      if (updateError) throw updateError;

      addToast(`PIN de ${targetUsername} actualizado`);
      setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
      setTimeout(() => {
        setShowChangePin(false);
        setSelectedUserForPin(null);
        setPinStatus({ message: '', type: '' });
      }, 2000);
    } catch (error: any) {
      setPinStatus({ message: error.message || 'Error al actualizar PIN', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isExpired = (dateStr: string | null) => {
    if (!dateStr) return true;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return true;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const expiry = new Date(d);
      expiry.setHours(0, 0, 0, 0);
      
      return expiry.getTime() < today.getTime();
    } catch (e) {
      return true;
    }
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = (m.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (m.phone || '').includes(searchTerm);
    
    const matchesService = memberServiceFilter ? m.service_type === memberServiceFilter : true;
    
    let matchesTab = true;

    if (memberFilterTab === 'new') {
      const monthToMatch = memberMonthFilter || new Date().toISOString().slice(0, 7);
      matchesTab = !!m.created_at && m.created_at.startsWith(monthToMatch);
    } else if (memberFilterTab === 'active') {
      matchesTab = !!m.last_expiry && !isExpired(m.last_expiry);
    } else if (memberFilterTab === 'expired') {
      matchesTab = isExpired(m.last_expiry || null);
    }
    // Tab 'all' implies matchesTab = true

    // Only apply memberMonthFilter as a general filter if NOT in 'new' tab (where it's already used) or 'all' tab
    // Actually, let's make memberMonthFilter match created_at generally unless specifically in a tab that specifies its own rules
    const matchesMonth = (memberMonthFilter && (memberFilterTab === 'all' || memberFilterTab === 'new'))
      ? m.created_at?.startsWith(memberMonthFilter) || false 
      : true;

    return matchesSearch && matchesMonth && matchesTab && matchesService;
  });

  const memberStats = useMemo(() => {
    const monthToMatch = memberMonthFilter || new Date().toISOString().slice(0, 7);
    return {
      all: members.length,
      new: members.filter(m => m.created_at?.startsWith(monthToMatch)).length,
      active: members.filter(m => m.last_expiry && !isExpired(m.last_expiry)).length,
      expired: members.filter(m => isExpired(m.last_expiry || null)).length
    };
  }, [members, memberMonthFilter]);

  const getStatusColor = (expiry: string | null) => {
    if (!expiry) return 'bg-gray-100 text-gray-500';
    if (isExpired(expiry)) return 'bg-red-100 text-red-600';
    return 'bg-green-100 text-green-600';
  };

  const filteredPayments = payments.filter(p => {
    const matchesSearch = (p.member_name?.toLowerCase() || '').includes(paymentSearchTerm.toLowerCase());
    const matchesMonth = paymentMonthFilter ? p.payment_date?.startsWith(paymentMonthFilter) : true;
    const matchesYear = paymentYearFilter ? p.payment_date?.startsWith(paymentYearFilter) : true;
    const matchesUser = paymentUserFilter ? p.received_by === paymentUserFilter : true;
    return matchesSearch && matchesMonth && matchesYear && matchesUser;
  });

  const filteredExpenses = expenses.filter(e => {
    const matchesMonth = expenseMonthFilter ? e.expense_date?.startsWith(expenseMonthFilter) : true;
    const matchesYear = expenseYearFilter ? e.expense_date?.startsWith(expenseYearFilter) : true;
    const matchesUser = expenseUserFilter ? e.created_by === expenseUserFilter : true;
    return matchesMonth && matchesYear && matchesUser;
  });

  const filteredSales = sales.filter(s => {
    const matchesMonth = saleMonthFilter ? s.sale_date?.startsWith(saleMonthFilter) : true;
    const matchesYear = saleYearFilter ? s.sale_date?.startsWith(saleYearFilter) : true;
    return matchesMonth && matchesYear;
  });

  const Skeleton = ({ className, key }: { className?: string; key?: any }) => (
    <div key={key} className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />
  );

  if (!isLoggedIn) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 w-full max-w-md"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-200">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Kinetix Functional Zone</h1>
            <p className="text-slate-500 text-sm">Acceso Administrativo</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Usuario</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              >
                <option value="Leslie">Leslie (Super Admin)</option>
                <option value="Jorge">Jorge (Admin)</option>
                <option value="Staff">Profe (Staff)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">PIN de Acceso</label>
              <input 
                type="password"
                maxLength={4}
                placeholder="••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-center text-2xl tracking-[1em] focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={loginForm.pin}
                onChange={(e) => setLoginForm({ ...loginForm, pin: e.target.value })}
                required
              />
            </div>

            {loginError && (
              <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {loginError}
              </div>
            )}

            <button 
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar al Sistema'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Control de Pagos v2.0</p>
          </div>
        </motion.div>
      </div>
    </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-slate-100 p-4 sticky top-0 z-30 flex justify-between items-center h-16">
        <button 
          onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <ShieldCheck size={16} />
          </div>
          <span className="font-bold text-sm tracking-tight">Kinetix Zone</span>
        </button>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors active:scale-95"
          aria-label="Toggle Menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[35] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop & Mobile Overlay */}
      <nav className={`
        fixed left-0 top-0 h-[100dvh] w-64 bg-white border-r border-slate-100 p-6 flex flex-col z-40 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between mb-10">
          <button 
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <ShieldCheck size={20} />
            </div>
            <div className="text-left">
              <h1 className="font-bold text-lg leading-tight text-slate-900">Kinetix</h1>
              <p className="text-[10px] text-blue-600 uppercase tracking-wider font-black">Functional Zone</p>
            </div>
          </button>
          <button className="lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="space-y-2 flex-1">
          <button 
            onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Clock size={20} />
            <span className="font-medium">Dashboard</span>
            {birthdayAlerts.length > 0 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full shadow-sm shadow-blue-200 animate-pulse"></span>
            )}
          </button>
          <button 
            onClick={() => { setActiveTab('members'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative ${activeTab === 'members' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Users size={20} />
            <span className="font-medium">Miembros</span>
            {paymentAlerts.length > 0 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-rose-600 rounded-full shadow-sm shadow-rose-200"></span>
            )}
          </button>
          <button 
            onClick={() => { setActiveTab('payments'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'payments' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <CreditCard size={20} />
            <span className="font-medium">Pagos</span>
          </button>
          
          {(currentRole === 'Leslie' || currentRole === 'Jorge') && (
            <>
              <button 
                onClick={() => { setActiveTab('expenses'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'expenses' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <TrendingDown size={20} />
                <span className="font-medium">Gastos</span>
              </button>
              <button 
                onClick={() => { setActiveTab('analytics'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'analytics' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <BarChart3 size={20} />
                <span className="font-medium">Reportes</span>
              </button>
            </>
          )}

          <button 
            onClick={() => { setActiveTab('attendance'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'attendance' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Fingerprint size={20} />
            <span className="font-medium">Asistencia</span>
          </button>

          <button 
            onClick={() => { setActiveTab('personalized'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'personalized' ? 'bg-amber-50 text-amber-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <ShieldCheck size={20} className={activeTab === 'personalized' ? 'text-amber-500' : ''} />
            <span className="font-medium">Personalizados</span>
          </button>

          <button 
            onClick={() => { setActiveTab('nutrition'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'nutrition' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Apple size={20} className={activeTab === 'nutrition' ? 'text-emerald-500' : ''} />
            <span className="font-medium">Nutrición</span>
          </button>
          <button 
            onClick={() => { setActiveTab('sales'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'sales' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <ShoppingBag size={20} />
            <span className="font-medium">Ventas</span>
          </button>
          <button 
            onClick={() => { setActiveTab('inventory'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Box size={20} />
            <span className="font-medium">Inventario</span>
          </button>
          
          {(currentRole === 'Leslie' || currentRole === 'Jorge') && (
            <button 
              onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <User size={20} />
              <span className="font-medium">Usuarios</span>
            </button>
          )}

          <button 
            onClick={() => { setActiveTab('inventory'); setIsMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <ShoppingBag size={20} />
            <span className="font-medium">Inventario</span>
          </button>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-100">
          {(currentRole === 'Leslie' || currentRole === 'Jorge') && (
            <button 
              onClick={() => { setShowChangePin(true); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 transition-all mb-2"
            >
              <Lock size={20} />
              <span className="font-medium">Cambiar PIN</span>
            </button>
          )}
          <div className="p-4 bg-slate-50 rounded-2xl">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className={`w-2 h-2 rounded-full ${databaseStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : databaseStatus === 'offline' ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-amber-500 animate-pulse'}`}></div>
              <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">
                DB: {databaseStatus === 'online' ? 'Conectada' : databaseStatus === 'offline' ? 'PAUSADA/DESCONECTADA' : 'Verificando...'}
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600">
                <User size={16} />
              </div>
              <div>
                <div className="text-sm font-bold">{currentRole}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  {currentRole === 'Leslie' ? 'Super Admin' : currentRole === 'Jorge' ? 'Admin' : 'Staff'}
                </div>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-xs bg-white border border-slate-200 rounded-lg p-2 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all font-bold"
            >
              <LogOut size={14} />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="lg:ml-64 p-4 md:p-8 min-h-[calc(100dvh-64px)] lg:min-h-screen relative">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 uppercase">
              {activeTab === 'dashboard' && 'Resumen'}
              {activeTab === 'members' && 'Miembros'}
              {activeTab === 'payments' && 'Pagos'}
              {activeTab === 'expenses' && 'Gastos'}
              {activeTab === 'analytics' && 'Reportes'}
              {activeTab === 'attendance' && 'Asistencia'}
              {activeTab === 'sales' && 'Ventas'}
              {activeTab === 'inventory' && 'Inventario'}
              {activeTab === 'users' && 'Personal'}
              {activeTab === 'personalized' && 'Entrenamientos Personalizados'}
              {activeTab === 'nutrition' && 'Servicio de Nutrición'}
            </h2>
            <div className="h-6 mt-1 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                {(() => {
                  try {
                    return new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
                  } catch (e) {
                    return new Date().toLocaleDateString();
                  }
                })()}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-3">
            {currentRole === 'Leslie' && activeTab === 'expenses' && (
              <button 
                onClick={() => setShowAddExpense(true)}
                className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-xl hover:bg-rose-700 transition-all font-medium shadow-sm"
              >
                <Plus size={18} />
                Registrar Gasto
              </button>
            )}
            <button 
              onClick={() => {
                setNewMember({ name: '', phone: '', email: '', birth_date: '', service_type: 'gym' });
                setIsEditing(false);
                setEditingId(null);
                setShowAddMember(true);
              }}
              className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all font-medium"
            >
              <UserPlus size={18} />
              Nuevo Miembro
            </button>
            <button 
              onClick={() => {
                setNewPayment({
                  member_id: '' as any,
                  amount: 0,
                  discount_amount: 0,
                  discount_type: 'none',
                  payment_type: 'monthly',
                  received_by: currentRole || '',
                  months: 1,
                  notes: '',
                  start_date: new Date().toISOString().split('T')[0],
                  expiry_date: '',
                  category: 'gym' as any
                });
                setPaymentSearchTerm('');
                setSelectedMember(null);
                setIsEditing(false);
                setEditingId(null);
                setShowAddPayment(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all font-medium shadow-sm"
            >
              <Plus size={18} />
              Registrar Pago
            </button>
            {(activeTab === 'sales' || activeTab === 'inventory') && (
              <button 
                onClick={() => setShowMakeSale(true)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-all font-medium shadow-sm"
              >
                <ShoppingBag size={18} />
                Registrar Venta
              </button>
            )}
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Birthday & Payment Alerts */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-48 rounded-3xl" />
                <Skeleton className="h-48 rounded-3xl" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {birthdayAlerts.length > 0 && (
                  <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-6">
                    <div className="flex items-center gap-2 mb-4 text-blue-600">
                      <Gift size={20} />
                      <h3 className="font-bold">¡Hoy es su Cumpleaños!</h3>
                    </div>
                    <div className="space-y-3">
                      {birthdayAlerts.map(m => (
                        <div key={m.id} className="bg-white p-4 rounded-2xl border border-blue-100 flex justify-between items-center shadow-sm">
                          <div>
                            <div className="font-bold text-slate-900">{m.name}</div>
                            <div className="text-[10px] font-black uppercase text-blue-500 tracking-wider">¡Felicítalo hoy! (50% desc)</div>
                          </div>
                          <button 
                            onClick={() => {
                              if (!m.phone) {
                                addToast('Este miembro no tiene un número registrado', 'error');
                                return;
                              }
                              const msg = `¡Feliz cumpleaños ${m.name}! Te deseamos lo mejor desde Kinetix Functional Zone. Recuerda que tienes un 50% de descuento en tu próxima mensualidad. ¡Te esperamos!`;
                              window.open(`https://wa.me/${m.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                          >
                            <MessageCircle size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {paymentAlerts.length > 0 && (
                  <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-6">
                    <div className="flex items-center gap-2 mb-4 text-rose-600">
                      <AlertCircle size={20} />
                      <h3 className="font-bold">Alertas de Pago</h3>
                    </div>
                    <div className="space-y-3">
                      {paymentAlerts.map(m => {
                        const expiryDate = m.last_expiry ? new Date(m.last_expiry) : null;
                        let daysLeft: number | null = null;
                        
                        if (expiryDate && !isNaN(expiryDate.getTime())) {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const expCompare = new Date(expiryDate);
                          expCompare.setHours(0, 0, 0, 0);
                          daysLeft = Math.ceil((expCompare.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        }
                        
                        return (
                          <div key={m.id} className="bg-white p-4 rounded-2xl border border-rose-100 flex justify-between items-center shadow-sm hover:border-rose-200 transition-colors">
                            <div className="overflow-hidden">
                              <div className="font-bold text-slate-900 truncate">{m.name}</div>
                              <div className={`text-[10px] font-black uppercase tracking-wider ${daysLeft !== null && daysLeft < 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                                {daysLeft === null ? 'Fecha pendiente' : daysLeft < 0 ? `Vencido hace ${Math.abs(daysLeft)}d` : daysLeft === 0 ? 'Vence hoy' : `Vence en ${daysLeft}d`}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => sendWhatsAppReminder(m)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                              >
                                <MessageCircle size={18} />
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedMember(m);
                                  setNewPayment({ ...newPayment, member_id: m.id });
                                  setShowAddPayment(true);
                                }}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                              >
                                <CreditCard size={18} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Bento Grid Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {/* Financial Stats - Large Card */}
              {(currentRole === 'Leslie' || currentRole === 'Jorge') && (
                <div className="md:col-span-4 lg:col-span-3 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between min-h-[300px]">
                  <div>
                    <div className="flex items-center justify-between mb-8">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <BarChart3 size={24} />
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Resumen del Mes</span>
                        <span className="text-xs font-bold text-indigo-600 uppercase">
                          {new Date(analyticsMonthFilter + '-02').toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-slate-500 font-medium">Ganancia Neta</div>
                      <div className={`text-5xl font-black tracking-tighter ${financialStats.profit >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                        ${(financialStats.profit || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-50">
                    <div>
                      <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <TrendingUp size={10} /> Ingresos
                      </div>
                      <div className="text-xl font-bold text-slate-900 font-mono">${(financialStats.total_income || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <TrendingDown size={10} /> Gastos
                      </div>
                      <div className="text-xl font-bold text-slate-900 font-mono">${(financialStats.total_expenses || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Members Stats - Bento Style */}
              <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl w-fit mb-4">
                    <Users size={20} />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-slate-900">{members.length}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Miembros</div>
                  </div>
                </div>
                <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 flex flex-col justify-between">
                  <div className="p-2 bg-white text-emerald-600 rounded-xl w-fit mb-4">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-emerald-900">
                      {members.filter(m => !isExpired(m.last_expiry)).length}
                    </div>
                    <div className="text-xs font-bold text-emerald-600/60 uppercase tracking-wider">Activos</div>
                  </div>
                </div>
                <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 flex flex-col justify-between">
                  <div className="p-2 bg-white text-rose-600 rounded-xl w-fit mb-4">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-rose-900">
                      {members.filter(m => isExpired(m.last_expiry) && m.last_expiry).length}
                    </div>
                    <div className="text-xs font-bold text-rose-600/60 uppercase tracking-wider">Vencidos</div>
                  </div>
                </div>
                <div className="bg-slate-900 p-6 rounded-[2rem] text-white flex flex-col justify-between">
                  <div className="p-2 bg-white/10 text-white rounded-xl w-fit mb-4">
                    <Fingerprint size={20} />
                  </div>
                  <div>
                    <div className="text-3xl font-black">{attendance.length}</div>
                    <div className="text-xs font-bold text-white/40 uppercase tracking-wider">Asistencias Hoy</div>
                  </div>
                </div>
              </div>

              {/* Recent Payments Table - Large Bento Item */}
              <div className="md:col-span-4 lg:col-span-4 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-xl">Pagos Recientes</h3>
                    <p className="text-sm text-slate-500">Últimas 5 transacciones</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('payments')} 
                    className="px-4 py-2 bg-slate-50 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition-all uppercase tracking-wider"
                  >
                    Ver todos
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-widest">
                      <tr>
                        <th className="px-8 py-4 font-bold">Miembro</th>
                        <th className="px-8 py-4 font-bold">Monto</th>
                        <th className="px-8 py-4 font-bold">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {isLoading ? (
                        [1, 2, 3, 4, 5].map(i => (
                          <tr key={i}>
                            <td className="px-8 py-4"><Skeleton className="h-4 w-32" /></td>
                            <td className="px-8 py-4"><Skeleton className="h-4 w-16" /></td>
                            <td className="px-8 py-4"><Skeleton className="h-4 w-24" /></td>
                          </tr>
                        ))
                      ) : (
                      (payments || []).slice(0, 5).map(p => {
                        const pDate = p.payment_date ? new Date(p.payment_date) : null;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-all group">
                            <td className="px-8 py-5 font-bold text-slate-700">{p.member_name}</td>
                            <td className="px-8 py-5 font-mono text-sm font-black text-emerald-600">${(p.amount || 0).toFixed(2)}</td>
                            <td className="px-8 py-5 text-slate-400 text-xs font-medium">
                              {pDate && !isNaN(pDate.getTime()) ? pDate.toLocaleDateString() : 'Fecha inválida'}
                            </td>
                          </tr>
                        );
                      })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Expiry Alerts - Bento Item */}
              <div className="md:col-span-2 lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
                <h3 className="font-bold text-xl mb-6">Próximos Vencimientos</h3>
                <div className="space-y-4">
                  {isLoading ? (
                    [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)
                  ) : (
                    (members || [])
                      .filter(m => m.last_expiry && !isExpired(m.last_expiry))
                      .sort((a, b) => {
                        const dateA = new Date(a.last_expiry || 0).getTime();
                        const dateB = new Date(b.last_expiry || 0).getTime();
                        return (isNaN(dateA) ? 0 : dateA) - (isNaN(dateB) ? 0 : dateB);
                      })
                      .slice(0, 4)
                      .map(m => {
                        const expiryDate = m.last_expiry ? new Date(m.last_expiry) : null;
                        const daysLeft = expiryDate && !isNaN(expiryDate.getTime())
                          ? Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                          : 0;
                        return (
                          <div key={m.id} className={`flex items-center justify-between p-4 rounded-2xl ${daysLeft <= 3 ? 'bg-rose-50 border border-rose-100' : 'bg-slate-50'}`}>
                            <div>
                              <div className="font-bold text-sm text-slate-900">{m.name}</div>
                              <div className={`text-[10px] font-black uppercase tracking-wider ${daysLeft <= 3 ? 'text-rose-600' : 'text-slate-400'}`}>
                                {daysLeft === 0 ? 'Vence hoy' : `Vence en ${daysLeft} días`}
                              </div>
                            </div>
                            <ChevronRight size={16} className={daysLeft <= 3 ? 'text-rose-300' : 'text-slate-300'} />
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Documentation Alerts (Leslie's internal management focus) */}
              <div className="md:col-span-4 lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-xl">Gestión Legal</h3>
                  <div className="px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-tighter">Control Interno</div>
                </div>
                <div className="space-y-4 flex-1">
                  {members.filter(m => !m.has_signed_waiver).length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-emerald-50/50 rounded-3xl h-full border border-emerald-100/50">
                      <div className="w-12 h-12 bg-white text-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm shadow-emerald-200/50">
                        <CheckCircle2 size={24} />
                      </div>
                      <p className="text-sm font-bold text-emerald-700">Documentación al día</p>
                      <p className="text-[10px] text-emerald-600/60 mt-1 uppercase font-black">Firma responsiva completa</p>
                    </div>
                  ) : (
                    members.filter(m => !m.has_signed_waiver).slice(0, 5).map(m => (
                      <div key={m.id} className="flex items-center justify-between p-4 bg-rose-50/50 border border-rose-100/50 rounded-2xl group hover:bg-rose-50 transition-all cursor-default">
                        <div>
                          <div className="font-bold text-sm text-slate-900 leading-tight">{m.name}</div>
                          <div className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-1 italic">Falta firma responsiva</div>
                        </div>
                        <AlertCircle size={16} className="text-rose-300 group-hover:animate-pulse" />
                      </div>
                    ))
                  )}
                  {members.filter(m => !m.has_signed_waiver).length > 5 && (
                    <p className="text-[10px] text-slate-400 text-center uppercase font-black py-2 tracking-widest">+ {members.filter(m => !m.has_signed_waiver).length - 5} más con firma pendiente</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-2 p-1 bg-slate-100 rounded-2xl w-fit">
              {[
                { id: 'all', label: 'Todos', icon: Users, count: memberStats.all },
                { id: 'new', label: 'Nuevos (Mes)', icon: UserPlus, count: memberStats.new },
                { id: 'active', label: 'Activos', icon: ShieldCheck, count: memberStats.active },
                { id: 'expired', label: 'Vencidos', icon: AlertCircle, count: memberStats.expired }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setMemberFilterTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    memberFilterTab === tab.id 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-lg text-[9px] ${
                    memberFilterTab === tab.id ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 mb-2 p-1 bg-slate-100 rounded-2xl w-fit">
               <label className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200">Filtrar por Servicio:</label>
               {[
                 { id: '', label: 'Cualquiera' },
                 { id: 'gym', label: 'Kinetix' },
                 { id: 'personalized', label: 'Personalizado' },
                 { id: 'nutrition', label: 'Solo Nutri' },
                 { id: 'personalized_nutrition', label: 'Pack Pers.' },
                 { id: 'gym_nutrition', label: 'Pack Kinetix' }
               ].map(service => (
                 <button
                   key={service.id}
                   onClick={() => setMemberServiceFilter(service.id)}
                   className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                     memberServiceFilter === service.id
                     ? 'bg-white text-blue-600 shadow-sm' 
                     : 'text-slate-500 hover:text-slate-700'
                   }`}
                 >
                   {service.label}
                 </button>
               ))}
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row gap-6 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre o teléfono..." 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <input 
                  type="month" 
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
                  value={memberMonthFilter}
                  onChange={(e) => setMemberMonthFilter(e.target.value)}
                />
                <button 
                  onClick={exportMembersToExcel}
                  className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-6 py-3 rounded-xl hover:bg-emerald-100 transition-all font-bold text-sm border border-emerald-100 whitespace-nowrap"
                >
                  <ShoppingBag size={18} />
                  Excel
                </button>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredMembers.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3">
                  <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto">
                    <Users size={32} />
                  </div>
                  <p className="text-slate-400 font-medium">No se encontraron miembros</p>
                </div>
              ) : (
                filteredMembers.map((m, idx) => {
                  const isExp = isExpired(m.last_expiry);
                  return (
                    <div key={m.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4 active:scale-[0.98] transition-transform relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-10"></div>
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                          <div className="text-[10px] font-black text-slate-200 mt-1 font-mono">
                            {(filteredMembers.length - idx).toString().padStart(3, '0')}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-lg leading-tight">{m.name}</h4>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs text-slate-400 font-medium">{m.phone || 'Sin teléfono'}</p>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {m.has_signed_waiver ? (
                                  <span className="bg-emerald-50 text-emerald-600 text-[6px] font-black px-1 rounded flex items-center gap-0.5" title="Carta Responsiva OK">
                                    <ShieldCheck size={6} /> RESP.
                                  </span>
                                ) : (
                                  <span className="bg-rose-50 text-rose-600 text-[6px] font-black px-1 rounded flex items-center gap-0.5" title="Pendiente Carta Responsiva">
                                    <AlertCircle size={6} /> RESP.
                                  </span>
                                )}
                                {m.has_image_use_consent ? (
                                  <span className="bg-emerald-50 text-emerald-600 text-[6px] font-black px-1 rounded flex items-center gap-0.5" title="Uso Imagen OK">
                                    <Receipt size={6} /> IMG.
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-400 text-[6px] font-black px-1 rounded flex items-center gap-0.5" title="Sin Consentimiento Imagen">
                                    <Receipt size={6} /> IMG.
                                  </span>
                                )}
                                {m.internal_notes && (
                                  <span className="bg-amber-50 text-amber-600 text-[6px] font-black px-1 rounded flex items-center gap-0.5" title="Tiene notas internas">
                                    <FileText size={6} /> NOTAS
                                  </span>
                                )}
                              </div>
                              {m.service_type && (
                                <span className={`text-[8px] font-black uppercase tracking-tighter px-1 rounded ${
                                  m.service_type === 'personalized' ? 'bg-amber-50 text-amber-600' : 
                                  m.service_type === 'nutrition' ? 'bg-emerald-50 text-emerald-600' :
                                  m.service_type === 'personalized_nutrition' || m.service_type === 'gym_nutrition' ? 'bg-indigo-50 text-indigo-600' :
                                  'bg-blue-50 text-blue-600'
                                }`}>
                                  {m.service_type === 'gym' ? 'Kinetix' : 
                                   m.service_type === 'personalized' ? 'Pers.' : 
                                   m.service_type === 'nutrition' ? 'Nutri' : 'Pack'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isExp ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {m.last_expiry ? (isExp ? 'Vencido' : 'Activo') : 'Nuevo'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs bg-slate-50 p-3 rounded-2xl">
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Vencimiento</span>
                        <span className={`font-mono font-bold ${isExp ? 'text-rose-600' : 'text-slate-700'}`}>
                          {(() => {
                            if (!m.last_expiry) return 'PENDIENTE';
                            const d = new Date(m.last_expiry);
                            return isNaN(d.getTime()) ? 'ERROR' : d.toLocaleDateString();
                          })()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button 
                          onClick={() => { setSelectedMember(m); setNewPayment({ ...newPayment, member_id: m.id }); setShowAddPayment(true); }}
                          className="bg-indigo-600 text-white py-3 rounded-2xl font-bold text-xs shadow-lg shadow-indigo-100"
                        >
                          Registrar Pago
                        </button>
                        <button 
                          onClick={() => handleEditMember(m)}
                          className="bg-slate-900 text-white py-3 rounded-2xl font-bold text-xs"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleCheckIn(m.id)}
                          disabled={isSubmitting}
                          className={`bg-emerald-50 text-emerald-600 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isSubmitting ? <div className="w-3 h-3 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" /> : <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                          Check-in
                        </button>
                        {(currentRole === 'Leslie' || currentRole === 'Jorge') && (
                          <button 
                            onClick={() => handleDeleteMember(m.id)}
                            className="bg-rose-50 text-rose-600 py-3 rounded-2xl font-bold text-xs"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3 font-bold w-12 text-center">#</th>
                      <th className="px-6 py-3 font-semibold">Nombre</th>
                      <th className="px-6 py-3 font-semibold">Contacto</th>
                      <th className="px-6 py-3 font-semibold">Cumpleaños</th>
                      <th className="px-6 py-3 font-semibold">Estado</th>
                      <th className="px-6 py-3 font-semibold">Vencimiento</th>
                      <th className="px-6 py-3 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredMembers.map((m, idx) => (
                      <tr key={m.id} className="hover:bg-slate-50 transition-all">
                        <td className="px-6 py-4 text-[10px] font-mono font-bold text-slate-300 text-center">
                          {(filteredMembers.length - idx).toString().padStart(3, '0')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-slate-900">{m.name}</div>
                            {m.service_type && m.service_type !== 'gym' && (
                              <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${
                                m.service_type === 'personalized' ? 'bg-amber-50 text-amber-600' : 
                                m.service_type === 'nutrition' ? 'bg-emerald-50 text-emerald-600' :
                                'bg-indigo-50 text-indigo-600'
                              }`}>
                                {m.service_type === 'personalized' ? 'Personalizado' : 
                                 m.service_type === 'nutrition' ? 'Nutri' : 'Personalizado + Nutri'}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">{m.email || 'Sin correo registrado'}</div>
                          <div className="flex items-center gap-1 mt-1">
                            {m.has_signed_waiver ? (
                                <span className="bg-emerald-50 text-emerald-600 text-[7px] font-black px-1 rounded flex items-center gap-0.5" title="Carta Responsiva OK">
                                  <ShieldCheck size={8} /> RESP.
                                </span>
                              ) : (
                                <span className="bg-rose-50 text-rose-600 text-[7px] font-black px-1 rounded flex items-center gap-0.5" title="Pendiente Carta Responsiva">
                                  <AlertCircle size={8} /> RESP.
                                </span>
                              )}
                              {m.has_image_use_consent ? (
                                <span className="bg-emerald-50 text-emerald-600 text-[7px] font-black px-1 rounded flex items-center gap-0.5" title="Uso Imagen OK">
                                  <Receipt size={8} /> IMG.
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-400 text-[7px] font-black px-1 rounded flex items-center gap-0.5" title="Sin Consentimiento Imagen">
                                  <Receipt size={8} /> IMG.
                                </span>
                              )}
                              {m.internal_notes && (
                                <span className="bg-amber-50 text-amber-600 text-[7px] font-black px-1 rounded flex items-center gap-0.5" title="Tiene notas internas">
                                  <FileText size={8} /> NOTAS
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{m.phone}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {(() => {
                            if (!m.birth_date) return '-';
                            const d = new Date(m.birth_date);
                            return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(m.last_expiry)}`}>
                            {m.last_expiry ? (isExpired(m.last_expiry) ? 'Vencido' : 'Activo') : 'Sin Pagos'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono">
                          {m.last_expiry ? new Date(m.last_expiry).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-3">
                            <button 
                              onClick={() => {
                                setSelectedMember(m);
                                setNewPayment({ ...newPayment, member_id: m.id });
                                setShowAddPayment(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase"
                            >
                              Pagar
                            </button>
                            <button 
                              onClick={() => handleEditMember(m)}
                              className="text-slate-400 hover:text-slate-600 font-bold text-xs uppercase"
                            >
                              Editar
                            </button>
                            <button 
                              onClick={() => handleCheckIn(m.id)}
                              disabled={isSubmitting}
                              className={`text-emerald-600 hover:text-emerald-800 font-bold text-xs uppercase flex items-center gap-1 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {isSubmitting ? (
                                <div className="w-3 h-3 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                              ) : null}
                              Check-in
                            </button>
                            {(currentRole === 'Leslie' || currentRole === 'Jorge') && (
                              <button 
                                onClick={() => handleDeleteMember(m.id)}
                                className="text-rose-400 hover:text-rose-600 font-bold text-xs uppercase"
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar por cliente..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  value={paymentSearchTerm}
                  onChange={(e) => setPaymentSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <input 
                  type="month" 
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                  value={paymentMonthFilter}
                  onChange={(e) => {
                    setPaymentMonthFilter(e.target.value);
                    if (e.target.value) setPaymentYearFilter('');
                  }}
                />
                <select
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                  value={paymentYearFilter}
                  onChange={(e) => {
                    setPaymentYearFilter(e.target.value);
                    if (e.target.value) setPaymentMonthFilter('');
                  }}
                >
                  <option value="">Año (Todos)</option>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y.toString()}>{y}</option>
                  ))}
                </select>
                <select
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                  value={paymentUserFilter}
                  onChange={(e) => setPaymentUserFilter(e.target.value)}
                >
                  <option value="">Todos los usuarios</option>
                  {users.map(u => (
                    <option key={u.username} value={u.username}>{u.username}</option>
                  ))}
                </select>
                {true && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setNewPayment({
                          member_id: '' as any,
                          amount: 0,
                          discount_amount: 0,
                          discount_type: 'none',
                          payment_type: 'monthly',
                          received_by: currentRole || '',
                          months: 1,
                          notes: '',
                          start_date: new Date().toISOString().split('T')[0],
                          expiry_date: '',
                          category: 'gym'
                        });
                        setPaymentSearchTerm('');
                        setSelectedMember(null);
                        setIsEditing(false);
                        setEditingId(null);
                        setShowAddPayment(true);
                      }}
                      className="flex items-center gap-2 text-xs bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-md shadow-indigo-100"
                    >
                      <Plus size={14} />
                      Nuevo Pago
                    </button>
                    <button 
                      onClick={() => exportPaymentsToExcel(filteredPayments)}
                      className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-all font-bold shadow-sm"
                      title="Exportar a Excel"
                    >
                      <ShoppingBag size={14} />
                      Excel
                    </button>
                    <button 
                      onClick={() => exportPaymentsToCSV(filteredPayments)}
                      className="flex items-center gap-2 text-xs bg-slate-50 text-slate-600 border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-100 transition-all font-bold shadow-sm"
                      title="Exportar a CSV"
                    >
                      <DollarSign size={14} />
                      CSV
                    </button>
                    <button 
                      onClick={() => exportToXML(filteredPayments, 'pagos_kinetix', 'Pagos', 'Pago')}
                      className="flex items-center gap-2 text-xs bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-sm"
                      title="Exportar a XML"
                    >
                      <FileText size={14} />
                      XML
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredPayments.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-400">
                  No se encontraron pagos con los filtros aplicados
                </div>
              ) : (
                filteredPayments.map((p, idx) => (
                  <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="text-[10px] font-black text-slate-200 mt-1 font-mono">
                          {(filteredPayments.length - idx).toString().padStart(3, '0')}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{p.member_name}</h4>
                              {p.category && p.category !== 'gym' && (
                                <div className="flex gap-1 mb-1">
                                  <span className={`text-[8px] font-black uppercase tracking-tighter px-1 rounded ${
                                    p.category === 'personalized' ? 'bg-amber-50 text-amber-600' : 
                                    p.category === 'nutrition' ? 'bg-emerald-50 text-emerald-600' :
                                    p.category === 'personalized_nutrition' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'
                                  }`}>
                                    {p.category === 'personalized' ? 'Personalizado' : 
                                     p.category === 'nutrition' ? 'Sólo Nutri' : 
                                     p.category === 'personalized_nutrition' ? 'Jorge + Nutri' : 'Kinetix + Nutri'}
                                  </span>
                                </div>
                              )}
                          <p className="text-xs text-slate-400">
                            {(() => {
                              if (!p.payment_date) return 'Fecha desconocida';
                              const d = new Date(p.payment_date);
                              return isNaN(d.getTime()) ? 'Fecha inválida' : d.toLocaleDateString();
                            })()}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${p.payment_type === 'monthly' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                        {p.payment_type === 'monthly' ? 'Mensualidad' : 'Visita'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-black text-emerald-600">${(p.amount || 0).toFixed(2)}</span>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Recibido por</div>
                        <div className="text-xs font-bold text-slate-600">{p.received_by}</div>
                      </div>
                    </div>
                    {p.notes && (
                      <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 italic">
                        {p.notes}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => handleEditPayment(p)}
                        className="flex-1 bg-slate-50 text-slate-600 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                      >
                        <Edit size={14} />
                        Editar
                      </button>
                      {(currentRole === 'Leslie' || currentRole === 'Jorge') && (
                        <button 
                          onClick={() => handleDeletePayment(p.id)}
                          className="flex-1 bg-rose-50 text-rose-600 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                <div>
                  <h3 className="font-bold text-lg">Historial de Pagos</h3>
                  <p className="text-sm text-slate-500">
                    {filteredPayments.length} transacciones encontradas
                  </p>
                </div>
                <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm text-right">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Recaudación Total</div>
                  <div className="text-2xl font-black text-emerald-600 font-mono">
                    ${filteredPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0).toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3 font-bold w-12 text-center">#</th>
                      <th className="px-6 py-3 font-semibold">Miembro</th>
                      <th className="px-6 py-3 font-semibold">Monto</th>
                      <th className="px-6 py-3 font-semibold">Tipo</th>
                      <th className="px-6 py-3 font-semibold">Fecha</th>
                      <th className="px-6 py-3 font-semibold">Notas</th>
                      <th className="px-6 py-3 font-semibold">Recibido por</th>
                      <th className="px-6 py-3 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                          No se encontraron pagos con los filtros aplicados
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-all">
                          <td className="px-6 py-4 text-[10px] font-mono font-bold text-slate-300 text-center">
                            {(filteredPayments.length - idx).toString().padStart(3, '0')}
                          </td>
                          <td className="px-6 py-4 font-medium">
                            <div>{p.member_name}</div>
                            {p.category && p.category !== 'gym' && (
                              <div className={`text-[9px] font-black uppercase tracking-tighter inline-block px-1.5 py-0.5 rounded ${
                                p.category === 'personalized' ? 'bg-amber-50 text-amber-600' : 
                                p.category === 'nutrition' ? 'bg-emerald-50 text-emerald-600' :
                                p.category === 'personalized_nutrition' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'
                              }`}>
                                {p.category === 'personalized' ? 'Personalizado' : 
                                 p.category === 'nutrition' ? 'Solo Nutri' : 
                                 p.category === 'personalized_nutrition' ? 'Jorge + Nutri' : 'Kinetix + Nutri'}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono text-sm font-bold text-emerald-600">${(p.amount || 0).toFixed(2)}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${p.payment_type === 'monthly' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                              {p.payment_type === 'monthly' ? 'Mensualidad' : 'Visita'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-sm">
                            {(() => {
                              if (!p.payment_date) return 'N/A';
                              const d = new Date(p.payment_date);
                              return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
                            })()}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400 italic max-w-[150px] truncate" title={p.notes}>
                            {p.notes || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{p.received_by}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <button 
                                onClick={() => handleEditPayment(p)}
                                className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-50 transition-all"
                                title="Editar Pago"
                              >
                                <Edit size={16} />
                              </button>
                              {(currentRole === 'Leslie' || currentRole === 'Jorge') && (
                                <button 
                                  onClick={() => handleDeletePayment(p.id)}
                                  className="text-rose-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-all"
                                  title="Eliminar Pago"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (currentRole === 'Leslie' || currentRole === 'Jorge') && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col md:flex-row gap-4 items-center">
              <div className="flex flex-wrap gap-2 flex-1">
                <input 
                  type="month" 
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                  value={expenseMonthFilter}
                  onChange={(e) => {
                    setExpenseMonthFilter(e.target.value);
                    if (e.target.value) setExpenseYearFilter('');
                  }}
                />
                <select
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                  value={expenseYearFilter}
                  onChange={(e) => {
                    setExpenseYearFilter(e.target.value);
                    if (e.target.value) setExpenseMonthFilter('');
                  }}
                >
                  <option value="">Año (Todos)</option>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y.toString()}>{y}</option>
                  ))}
                </select>
                <select
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                  value={expenseUserFilter}
                  onChange={(e) => setExpenseUserFilter(e.target.value)}
                >
                  <option value="">Todos los usuarios</option>
                  {users.map(u => (
                    <option key={u.username} value={u.username}>{u.username}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button 
                  onClick={() => {
                    setNewExpense({ description: '', amount: 0, category: 'other', created_by: currentRole || '' });
                    setIsEditing(false);
                    setEditingId(null);
                    setShowAddExpense(true);
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-rose-600 text-white px-6 py-2.5 rounded-xl hover:bg-rose-700 transition-all font-bold text-sm shadow-md shadow-rose-100"
                >
                  <Plus size={18} />
                  Nuevo Gasto
                </button>
                <button 
                  onClick={exportExpensesToExcel}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 px-6 py-2.5 rounded-xl hover:bg-emerald-100 transition-all font-bold text-sm"
                >
                  <ShoppingBag size={18} />
                  Excel
                </button>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredExpenses.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-400">
                  No hay gastos registrados
                </div>
              ) : (
                filteredExpenses.map((e, idx) => (
                  <div key={e.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 opacity-20"></div>
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="text-[10px] font-black text-slate-200 mt-1 font-mono">
                          {(filteredExpenses.length - idx).toString().padStart(3, '0')}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{e.description}</h4>
                          <p className="text-xs text-slate-400">
                            {(() => {
                              if (!e.expense_date) return 'Fecha desconocida';
                              const d = new Date(e.expense_date);
                              return isNaN(d.getTime()) ? 'Fecha inválida' : d.toLocaleDateString();
                            })()}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {e.category}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-black text-rose-600">-${(e.amount || 0).toFixed(2)}</span>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Por</div>
                        <div className="text-xs font-bold text-slate-600">{e.created_by}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button 
                         onClick={() => handleEditExpense(e)}
                         className="flex-1 bg-slate-50 text-slate-600 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-slate-200"
                      >
                         <Edit size={14} />
                         Editar
                      </button>
                      <button 
                         onClick={() => handleDeleteExpense(e.id)}
                         className="flex-1 bg-rose-50 text-rose-600 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-rose-100"
                      >
                         <Trash2 size={14} />
                         Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 font-bold w-12 text-center">#</th>
                    <th className="px-6 py-3 font-semibold">Descripción</th>
                    <th className="px-6 py-3 font-semibold">Categoría</th>
                    <th className="px-6 py-3 font-semibold">Monto</th>
                    <th className="px-6 py-3 font-semibold">Registrado por</th>
                    <th className="px-6 py-3 font-semibold">Fecha</th>
                    <th className="px-6 py-3 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                        No se encontraron gastos con los filtros aplicados
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((e, idx) => (
                      <tr key={e.id} className="hover:bg-slate-50 transition-all">
                        <td className="px-6 py-4 text-[10px] font-mono font-bold text-slate-300 text-center">
                          {(filteredExpenses.length - idx).toString().padStart(3, '0')}
                        </td>
                        <td className="px-6 py-4 font-medium">{e.description}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium uppercase tracking-wider">
                            {e.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm font-bold text-rose-600">-${(e.amount || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{e.created_by}</td>
                        <td className="px-6 py-4 text-slate-500 text-sm">
                          {(() => {
                            if (!e.expense_date) return 'N/A';
                            const d = new Date(e.expense_date);
                            return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
                          })()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleEditExpense(e)}
                              className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-50 transition-all"
                              title="Editar Gasto"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteExpense(e.id)}
                              className="text-rose-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-all"
                              title="Eliminar Gasto"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

        {activeTab === 'analytics' && (currentRole === 'Leslie' || currentRole === 'Jorge') && (
          <div className="space-y-8">
            {/* Filtros de Reporte */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Año</label>
                <select 
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                  value={analyticsYearFilter}
                  onChange={e => {
                    setAnalyticsYearFilter(e.target.value);
                    setAnalyticsMonthFilter(''); 
                  }}
                >
                  <option value="">Todos los años</option>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => (
                    <option key={y} value={y.toString()}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Mes</label>
                <select 
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                  value={analyticsMonthFilter}
                  onChange={e => setAnalyticsMonthFilter(e.target.value)}
                >
                  <option value="">Todos los meses</option>
                  {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => {
                    const year = analyticsYearFilter || new Date().getFullYear().toString();
                    return (
                      <option key={m} value={`${year}-${m}`}>
                        {new Date(parseInt(year), parseInt(m)-1).toLocaleString('es-ES', { month: 'long' })}
                      </option>
                    );
                  })}
                </select>
              </div>
              <button 
                onClick={() => {
                  setAnalyticsMonthFilter(new Date().toISOString().slice(0, 7));
                  setAnalyticsYearFilter(new Date().getFullYear().toString());
                }}
                className="text-xs text-indigo-600 font-bold hover:underline mb-2.5"
              >
                Mes Actual
              </button>
              <button 
                onClick={() => {
                  setAnalyticsMonthFilter('');
                  setAnalyticsYearFilter('');
                }}
                className="text-xs text-slate-400 font-bold hover:underline mb-2.5 ml-auto"
              >
                Limpiar Filtros
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-xl font-bold mb-6 flex items-center justify-between">
                  <span>Balance General</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">
                    {(() => {
                      if (!analyticsMonthFilter) return analyticsYearFilter || 'Todo el tiempo';
                      try {
                        const [y, m] = analyticsMonthFilter.split('-');
                        if (!y || !m) return analyticsMonthFilter;
                        return new Date(parseInt(y), parseInt(m)-1).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
                      } catch (e) {
                        return analyticsMonthFilter;
                      }
                    })()}
                  </span>
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Ingresos', valor: financialStats.total_income, color: '#2563eb' },
                        { name: 'Gastos', valor: financialStats.total_expenses, color: '#e11d48' },
                        { name: 'Utilidad', valor: financialStats.profit, color: '#059669' }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                        {[0, 1, 2].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : index === 1 ? '#e11d48' : '#059669'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-xl font-bold mb-6">Gastos por Categoría</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={['rent', 'utilities', 'equipment', 'salary', 'other'].map(cat => ({
                          name: cat.toUpperCase(),
                          value: financialStats.filteredExpenses.filter(e => e.category === cat).reduce((acc, curr) => acc + curr.amount, 0)
                        })).filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {['#6366f1', '#f59e0b', '#ec4899', '#10b981', '#64748b'].map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <h3 className="text-xl font-bold">Resumen de Rentabilidad</h3>
                  <p className="text-slate-500">Análisis detallado de la salud financiera de Kinetix</p>
                </div>
                <div className="bg-indigo-50 px-6 py-3 rounded-2xl border border-indigo-100">
                  <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5 text-center">Ganancia Total Periodo</div>
                  <div className="text-3xl font-black text-indigo-700 font-mono text-center">
                    ${financialStats.profit.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-blue-50 rounded-2xl">
                  <div className="text-blue-600 text-sm font-bold uppercase mb-1">Margen de Utilidad</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {financialStats.total_income > 0 
                      ? ((financialStats.profit / financialStats.total_income) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>
                <div className="p-6 bg-emerald-50 rounded-2xl">
                  <div className="text-emerald-600 text-sm font-bold uppercase mb-1">Ingreso Promedio</div>
                  <div className="text-2xl font-bold text-emerald-900">
                    ${members.length > 0 ? (financialStats.total_income / members.length).toFixed(2) : 0}
                  </div>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl">
                  <div className="text-slate-600 text-sm font-bold uppercase mb-1">Total Miembros</div>
                  <div className="text-2xl font-bold text-slate-900">{members.length}</div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Asistencias Hoy</div>
                <div className="text-3xl font-bold text-blue-600">{attendance.length}</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">Check-ins de Hoy</h3>
                  <p className="text-sm text-slate-500">Lista de miembros que han asistido hoy</p>
                </div>
                {attendance.length > 0 && (
                  <div className="flex gap-2">
                    <button 
                      onClick={exportAttendanceToCSV}
                      className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-100 transition-all font-bold"
                    >
                      <DollarSign size={14} />
                      CSV
                    </button>
                    <button 
                      onClick={() => exportToXML(attendance, 'asistencia_kinetix', 'Asistencias', 'Asistencia')}
                      className="flex items-center gap-2 text-xs bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-all font-bold shadow-sm"
                    >
                      <FileText size={14} />
                      XML
                    </button>
                  </div>
                )}
              </div>
              {/* Mobile Cards View */}
              <div className="grid grid-cols-1 gap-4 lg:hidden p-4">
                {attendance.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-400">
                    No hay asistencias registradas hoy
                  </div>
                ) : (
                  attendance.map(a => (
                    <div key={a.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                      <div className="font-bold text-slate-900">{a.name}</div>
                      <div className="text-sm text-slate-500 font-mono">
                        {(() => {
                          if (!a.check_in_time) return '-';
                          const d = new Date(a.check_in_time);
                          return isNaN(d.getTime()) ? '-' : d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                        })()}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Miembro</th>
                      <th className="px-6 py-3 font-semibold">Hora de Entrada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {attendance.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-2 text-slate-400">
                            <Fingerprint size={48} className="opacity-20" />
                            <p className="font-medium">No hay asistencias registradas hoy</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      attendance.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50 transition-all">
                          <td className="px-6 py-4 font-medium">{a.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {(() => {
                              if (!a.check_in_time) return '-';
                              const d = new Date(a.check_in_time);
                              return isNaN(d.getTime()) ? '-' : d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                            })()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'sales' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col md:flex-row gap-4">
              <div className="flex flex-wrap gap-2">
                <input 
                  type="month" 
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                  value={saleMonthFilter}
                  onChange={(e) => {
                    setSaleMonthFilter(e.target.value);
                    if (e.target.value) setSaleYearFilter('');
                  }}
                />
                <select
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                  value={saleYearFilter}
                  onChange={(e) => {
                    setSaleYearFilter(e.target.value);
                    if (e.target.value) setSaleMonthFilter('');
                  }}
                >
                  <option value="">Año (Todos)</option>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y.toString()}>{y}</option>
                  ))}
                </select>
                {currentRole === 'Leslie' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowMakeSale(true)}
                      className="flex items-center gap-2 text-xs bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-all font-bold shadow-sm"
                    >
                      <Plus size={14} />
                      Nueva Venta
                    </button>
                    <button 
                      onClick={() => exportToXML(filteredSales, 'ventas_kinetix', 'Ventas', 'Venta')}
                      className="flex items-center gap-2 text-xs bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-sm"
                      title="Exportar a XML"
                    >
                      <FileText size={14} />
                      XML
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredSales.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-400">
                  No hay ventas registradas
                </div>
              ) : (
                filteredSales.map(s => (
                  <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900">{s.item_name}</h4>
                        <p className="text-xs text-slate-400">
                          {(() => {
                            if (!s.sale_date) return 'N/A';
                            const d = new Date(s.sale_date);
                            if (isNaN(d.getTime())) return 'N/A';
                            return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                          })()}
                        </p>
                      </div>
                      <span className="text-xl font-black text-emerald-600">${(s.total_price || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <span className="text-xs font-bold text-slate-400 uppercase">Cantidad</span>
                      <span className="font-black text-slate-900">{s.quantity} unidades</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => handleEditSale(s)}
                        className="flex-1 bg-slate-50 text-slate-600 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                      >
                        <Edit size={14} />
                        Editar
                      </button>
                      {(currentRole === 'Leslie' || currentRole === 'Jorge') && (
                        <button 
                          onClick={() => handleDeleteSale(s.id)}
                          className="flex-1 bg-rose-50 text-rose-600 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">Historial de Ventas</h3>
                  <p className="text-sm text-slate-500">Registro de todos los productos vendidos</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Producto</th>
                      <th className="px-6 py-3 font-semibold">Cantidad</th>
                      <th className="px-6 py-3 font-semibold">Total</th>
                      <th className="px-6 py-3 font-semibold">Fecha</th>
                      <th className="px-6 py-3 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center gap-2 text-slate-400">
                            <ShoppingBag size={48} className="opacity-20" />
                            <p className="font-medium">No hay ventas registradas</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredSales.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-all">
                          <td className="px-6 py-4 font-medium">{s.item_name}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{s.quantity}</td>
                          <td className="px-6 py-4 font-mono text-sm font-bold text-emerald-600">${(s.total_price || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {(() => {
                              if (!s.sale_date) return 'N/A';
                              const d = new Date(s.sale_date);
                              if (isNaN(d.getTime())) return 'N/A';
                              return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                            })()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <button 
                                onClick={() => handleEditSale(s)}
                                className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-50 transition-all"
                                title="Editar Venta"
                              >
                                <Edit size={16} />
                              </button>
                              {(currentRole === 'Leslie' || currentRole === 'Jorge') && (
                                <button 
                                  onClick={() => handleDeleteSale(s.id)}
                                  className="text-rose-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-all"
                                  title="Eliminar Venta"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Valor de Inventario</div>
                <div className="text-3xl font-bold text-blue-600">
                  ${inventory.reduce((acc, curr) => acc + ((curr.price || 0) * (curr.stock || 0)), 0).toFixed(2)}
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Productos en Stock</div>
                <div className="text-3xl font-bold text-emerald-600">
                  {inventory.reduce((acc, curr) => acc + curr.stock, 0)}
                </div>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {inventory.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-400">
                  No hay productos en inventario
                </div>
              ) : (
                inventory.map(item => (
                  <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900">{item.name}</h4>
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          {item.category}
                        </span>
                      </div>
                      <span className="text-xl font-black text-blue-600">${(item.price || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <span className="text-xs font-bold text-slate-400 uppercase">Stock Disponible</span>
                      <span className={`font-black ${item.stock < 5 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {item.stock} unidades
                      </span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => {
                          setNewSale({ ...newSale, item_id: item.id, total_price: item.price * newSale.quantity });
                          setShowMakeSale(true);
                        }}
                        className="flex-1 bg-emerald-50 text-emerald-600 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                      >
                        <ShoppingBag size={14} />
                        Vender
                      </button>
                      <button 
                        onClick={() => handleEditInventory(item)}
                        className="flex-1 bg-slate-50 text-slate-600 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                      >
                        <Edit size={14} />
                        Editar
                      </button>
                      {(currentRole === 'Leslie' || currentRole === 'Jorge') && (
                        <button 
                          onClick={() => handleDeleteInventory(item.id)}
                          className="flex-1 bg-rose-50 text-rose-600 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">Control de Inventario</h3>
                  <p className="text-sm text-slate-500">Gestión de productos y suplementos</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowAddInventory(true)}
                    className="flex items-center gap-2 text-xs bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition-all font-bold shadow-sm"
                  >
                    <Plus size={14} />
                    Añadir Producto
                  </button>
                  {inventory.length > 0 && currentRole === 'Leslie' && (
                    <button 
                      onClick={() => exportToXML(inventory, 'inventario_kinetix', 'Inventario', 'Producto')}
                      className="flex items-center gap-2 text-xs bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-all font-bold shadow-sm"
                    >
                      <FileText size={14} />
                      XML
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Producto</th>
                      <th className="px-6 py-3 font-semibold">Categoría</th>
                      <th className="px-6 py-3 font-semibold">Precio</th>
                      <th className="px-6 py-3 font-semibold">Stock</th>
                      <th className="px-6 py-3 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {inventory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                          No hay productos en el inventario
                        </td>
                      </tr>
                    ) : (
                      inventory.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-all">
                          <td className="px-6 py-4 font-medium">{item.name}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-sm font-bold text-blue-600">${(item.price || 0).toFixed(2)}</td>
                          <td className="px-6 py-4">
                            <span className={`font-bold ${item.stock < 5 ? 'text-rose-600' : 'text-slate-600'}`}>
                              {item.stock} unidades
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-3">
                              <button 
                                onClick={() => {
                                  setNewSale({ ...newSale, item_id: item.id, total_price: item.price * newSale.quantity });
                                  setShowMakeSale(true);
                                }}
                                className="text-emerald-600 hover:text-emerald-800 font-bold text-xs uppercase flex items-center gap-1"
                              >
                                <ShoppingBag size={12} />
                                Vender
                              </button>
                              <button 
                                onClick={() => handleEditInventory(item)}
                                className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase"
                              >
                                Editar
                              </button>
                              {(currentRole === 'Leslie' || currentRole === 'Jorge') && (
                                <button 
                                  onClick={() => handleDeleteInventory(item.id)}
                                  className="text-rose-400 hover:text-rose-600 font-bold text-xs uppercase"
                                >
                                  Eliminar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'users' && (currentRole === 'Leslie' || currentRole === 'Jorge') && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">Gestión de Usuarios</h3>
                  <p className="text-sm text-slate-500">Administra los accesos y PINs del personal</p>
                </div>
                <button 
                  onClick={() => {
                    setNewUser({ username: '', pin: '', role: 'Coach' });
                    setShowAddUser(true);
                  }}
                  className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-all font-bold text-sm"
                >
                  <Plus size={18} />
                  Nuevo Usuario
                </button>
              </div>
              {/* Mobile Cards View */}
              <div className="grid grid-cols-1 gap-4 lg:hidden p-4">
                {users.map(u => (
                  <div key={u.username} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-900">{u.username}</h4>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.role === 'Leslie' ? 'bg-indigo-50 text-indigo-600' : u.role === 'Jorge' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                        {u.role}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => {
                          setSelectedUserForPin(u.username);
                          setShowChangePin(true);
                        }}
                        className="flex-1 bg-indigo-50 text-indigo-600 py-2 rounded-xl font-bold text-xs"
                      >
                        Cambiar PIN
                      </button>
                      {u.username !== 'Leslie' && u.username !== 'Jorge' && (
                        <button 
                          onClick={() => handleDeleteUser(u.username)}
                          className="flex-1 bg-rose-50 text-rose-600 py-2 rounded-xl font-bold text-xs"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Usuario</th>
                      <th className="px-6 py-3 font-semibold">Rol</th>
                      <th className="px-6 py-3 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {users.map(u => (
                      <tr key={u.username} className="hover:bg-slate-50 transition-all">
                        <td className="px-6 py-4 font-medium">{u.username}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.role === 'Leslie' ? 'bg-indigo-50 text-indigo-600' : u.role === 'Jorge' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-3">
                            <button 
                              onClick={() => {
                                setSelectedUserForPin(u.username);
                                setShowChangePin(true);
                              }}
                              className="text-indigo-600 hover:text-indigo-800 font-bold text-xs uppercase"
                            >
                              Cambiar PIN
                            </button>
                            {u.username !== 'Leslie' && u.username !== 'Jorge' && (
                              <button 
                                onClick={() => handleDeleteUser(u.username)}
                                className="text-rose-400 hover:text-rose-600 font-bold text-xs uppercase"
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'personalized' && (
          <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Context Header */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-amber-500/20 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-3xl font-black mb-2 flex items-center gap-3">
                    <ShieldCheck size={32} />
                    Entrenamientos Personalizados de Jorge <span className="text-amber-200">(Team JG)</span>
                  </h3>
                  <p className="text-amber-50/80 font-medium max-w-md">
                    Gestiona los alumnos personalizados y la contabilidad exclusiva de este servicio.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                   <button 
                    onClick={() => {
                        setNewMember({ ...newMember, service_type: 'personalized' });
                        setShowAddMember(true);
                    }}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 border border-white/20"
                   >
                     <Plus size={20} />
                     Nuevo Alumno
                   </button>
                   <button 
                    onClick={() => {
                        setNewPayment({ ...newPayment, category: 'personalized' });
                        setShowAddPayment(true);
                    }}
                    className="bg-white text-amber-600 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg hover:bg-amber-50 flex items-center gap-2"
                   >
                     <Receipt size={20} />
                     Registrar Pago
                   </button>
                </div>
               </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm col-span-1">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                    <Users size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Alumnos</p>
                  <h4 className="text-3xl font-black text-slate-900 mt-1">{personalizedStats.memberCount}</h4>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm col-span-1">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                    <TrendingUp size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ingresos</p>
                  <h4 className="text-3xl font-black text-slate-900 mt-1">${personalizedStats.income.toFixed(2)}</h4>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm col-span-1">
                  <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
                    <TrendingDown size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Gastos</p>
                  <h4 className="text-3xl font-black text-slate-900 mt-1">${personalizedStats.expenses.toFixed(2)}</h4>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm col-span-1 relative">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                    <Apple size={24} />
                  </div>
                  <p className="text-sm font-bold text-emerald-400 uppercase tracking-wider">A Nutrióloga</p>
                  <h4 className="text-3xl font-black text-emerald-900 mt-1">${personalizedStats.nutritionistCut.toFixed(2)}</h4>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] font-bold text-blue-600">Pagado: ${personalizedStats.nutritionistCutPaid.toFixed(2)}</span>
                    <span className="text-[10px] font-bold text-rose-600 underline">Deuda: ${personalizedStats.nutritionistCutPending.toFixed(2)}</span>
                  </div>
               </div>
               <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-3xl text-white shadow-lg col-span-1 sm:col-span-2 lg:col-span-1">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                    <Wallet size={24} />
                  </div>
                  <p className="text-sm font-bold text-indigo-100 uppercase tracking-wider">Utilidad Jorge</p>
                  <h4 className="text-3xl font-black mt-1">${personalizedStats.profit.toFixed(2)}</h4>
               </div>
            </div>

            {/* List Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {/* Last Payments */}
               <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-900">Últimos Pagos Personalizados</h3>
                    <Receipt className="text-slate-400" size={20} />
                  </div>
                  <div className="overflow-y-auto max-h-[400px]">
                    <div className="divide-y divide-slate-50">
                      {personalizedStats.payments.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 italic">No hay pagos registrados aún.</div>
                      ) : (
                        personalizedStats.payments.slice(0, 10).map(p => (
                          <div key={p.id} className="p-4 hover:bg-slate-50 flex items-center justify-between transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                                $
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{members.find(m => m.id === p.member_id)?.name || 'Miembro'}</p>
                                <p className="text-xs text-slate-500">{new Date(p.payment_date).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-slate-900">${(Number(p.amount) || 0).toFixed(2)}</p>
                              <div className="flex flex-col items-end gap-1">
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{p.payment_type}</p>
                                {p.nutritionist_commission && p.nutritionist_commission > 0 && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                      Nutri: ${p.nutritionist_commission}
                                    </span>
                                    <button 
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (currentRole !== 'Leslie' && currentRole !== 'Jorge') return;
                                        try {
                                          const { error } = await supabase
                                            .from('payments')
                                            .update({ commission_paid: !p.commission_paid })
                                            .eq('id', p.id);
                                          if (error) throw error;
                                          fetchData();
                                        } catch (err) {
                                          console.error('Error toggling commission:', err);
                                        }
                                      }}
                                      className={`text-[8px] font-black uppercase px-1 rounded transition-all hover:scale-110 active:scale-95 ${p.commission_paid ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'}`}
                                      title={p.commission_paid ? 'Marcar como pendiente' : 'Marcar como pagado'}
                                    >
                                      {p.commission_paid ? 'PAGADO' : 'PEND.'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
               </div>

               {/* Alumnos List */}
               <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-900">Alumnos en Personalizado</h3>
                    <Users className="text-slate-400" size={20} />
                  </div>
                  <div className="overflow-y-auto max-h-[400px]">
                    <div className="divide-y divide-slate-50">
                      {members.filter(m => m.service_type === 'personalized' || m.service_type === 'personalized_nutrition').length === 0 ? (
                        <div className="p-12 text-center text-slate-400 italic">No hay alumnos registrados.</div>
                      ) : (
                        members.filter(m => m.service_type === 'personalized' || m.service_type === 'personalized_nutrition').map(m => (
                          <div key={m.id} className="p-4 hover:bg-slate-50 flex items-center justify-between transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                                {m.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{m.name}</p>
                                <p className="text-xs text-slate-500">{m.phone || 'Sin teléfono'}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                                    Vence: {m.last_expiry ? new Date(m.last_expiry).toLocaleDateString() : 'N/A'}
                                </span>
                                {m.service_type === 'personalized_nutrition' && (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 rounded-md font-bold">+ NUTRICIÓN</span>
                                )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
               </div>
            </div>

            {/* Expenses List */}
            {personalizedStats.expensesList.length > 0 && (
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900">Gastos de Entrenamiento Personalizado</h3>
                  <TrendingDown className="text-rose-400" size={20} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Concepto</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {personalizedStats.expensesList.map(e => (
                        <tr key={e.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-bold text-slate-700">{e.description}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{new Date(e.expense_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 font-mono font-bold text-rose-600">${(e.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'nutrition' && (
          <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Context Header */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-3xl font-black mb-2 flex items-center gap-3">
                    <Apple size={32} />
                    Servicios de Nutrición
                  </h3>
                  <p className="text-emerald-50/80 font-medium max-w-md">
                    Control de consultas, alumnos y contabilidad del servicio de nutrición.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                   <button 
                    onClick={() => {
                        setNewMember({ ...newMember, service_type: 'nutrition' });
                        setShowAddMember(true);
                    }}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 border border-white/20"
                   >
                     <Plus size={20} />
                     Nuevo Paciente
                   </button>
                   <button 
                    onClick={() => {
                        setNewPayment({ ...newPayment, category: 'nutrition' });
                        setShowAddPayment(true);
                    }}
                    className="bg-white text-emerald-600 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg hover:bg-emerald-50 flex items-center gap-2"
                   >
                     <Receipt size={20} />
                     Registrar Consulta
                   </button>
                </div>
               </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                    <Users size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pacientes Totales</p>
                  <h4 className="text-3xl font-black text-slate-900 mt-1">{nutritionStats.memberCount}</h4>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                    <TrendingUp size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ingresos</p>
                  <h4 className="text-3xl font-black text-slate-900 mt-1">${nutritionStats.income.toFixed(2)}</h4>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] font-bold text-blue-600">Cobrado: ${nutritionStats.paidIncome.toFixed(2)}</span>
                    <span className="text-[10px] font-bold text-rose-600">Pend.: ${nutritionStats.pendingIncome.toFixed(2)}</span>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
                    <TrendingDown size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Gastos</p>
                  <h4 className="text-3xl font-black text-slate-900 mt-1">${nutritionStats.expenses.toFixed(2)}</h4>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                    <DollarSign size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Utilidad</p>
                  <h4 className="text-3xl font-black text-slate-900 mt-1">${nutritionStats.profit.toFixed(2)}</h4>
               </div>
            </div>

            {/* List Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {/* Last Payments */}
               <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-900">Últimas Consultas / Pagos</h3>
                    <Receipt className="text-slate-400" size={20} />
                  </div>
                  <div className="overflow-y-auto max-h-[400px]">
                    <div className="divide-y divide-slate-50">
                      {nutritionStats.payments.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 italic">No hay pagos registrados aún.</div>
                      ) : (
                        nutritionStats.payments.slice(0, 10).map(p => (
                          <div key={p.id} className="p-4 hover:bg-slate-50 flex items-center justify-between transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                                $
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{members.find(m => m.id === p.member_id)?.name || 'Paciente'}</p>
                                <p className="text-xs text-slate-500">{new Date(p.payment_date).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className="text-right">
                                <p className="font-black text-slate-900">
                                  ${(p.category === 'personalized_nutrition' || p.category === 'gym_nutrition') ? (Number(p.nutritionist_commission) || 0).toFixed(2) : (Number(p.amount) || 0).toFixed(2)}
                                </p>
                                <div className="flex flex-col items-end">
                                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest text-[9px]">{p.payment_type}</p>
                                  {(p.category === 'personalized_nutrition' || p.category === 'gym_nutrition') && (
                                    <span className="text-[8px] font-bold text-blue-500 italic">De paquete combinado</span>
                                  )}
                                </div>
                              </div>
                              {(p.category === 'personalized_nutrition' || p.category === 'gym_nutrition') && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleCommissionPaid(p.id, !p.commission_paid);
                                  }}
                                  className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all flex items-center gap-1 ${
                                    p.commission_paid ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                  }`}
                                >
                                  {p.commission_paid ? <CheckIcon size={8} /> : null}
                                  {p.commission_paid ? 'Pagado' : 'Marcar Pago'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
               </div>

               {/* Pacientes List */}
               <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-900">Pacientes Activos</h3>
                    <Users className="text-slate-400" size={20} />
                  </div>
                  <div className="overflow-y-auto max-h-[400px]">
                    <div className="divide-y divide-slate-50">
                      {members.filter(m => m.service_type === 'nutrition' || m.service_type === 'personalized_nutrition' || m.service_type === 'gym_nutrition').length === 0 ? (
                        <div className="p-12 text-center text-slate-400 italic">No hay pacientes registrados.</div>
                      ) : (
                        members.filter(m => m.service_type === 'nutrition' || m.service_type === 'personalized_nutrition' || m.service_type === 'gym_nutrition').map(m => (
                          <div key={m.id} className="p-4 hover:bg-slate-50 flex items-center justify-between transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                                {m.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{m.name}</p>
                                <p className="text-xs text-slate-500">{m.phone || 'Sin teléfono'}</p>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                                  m.service_type === 'nutrition' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'
                                }`}>
                                    {m.service_type === 'personalized_nutrition' ? 'PACK JORGE + NUTRI' : 
                                     m.service_type === 'gym_nutrition' ? 'PACK KINETIX + NUTRI' : 'SOLO NUTRICIÓN'}
                                </span>
                                {(m.service_type === 'personalized_nutrition' || m.service_type === 'gym_nutrition') && (
                                  <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 rounded-md font-bold">
                                    {m.service_type === 'personalized_nutrition' ? '+ PERSONALIZADO' : '+ KINETIX'}
                                  </span>
                                )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showAddMember && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 md:p-8 shadow-2xl relative overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => { setShowAddMember(false); setIsEditing(false); setEditingId(null); }}
                className="absolute right-6 top-6 text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
              <h3 className="text-2xl font-bold mb-6">{isEditing ? 'Editar Miembro' : 'Nuevo Miembro'}</h3>
              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre Completo</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={newMember.name}
                    onChange={e => setNewMember({...newMember, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Teléfono (Opcional)</label>
                    <input 
                      type="tel" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={newMember.phone}
                      onChange={e => setNewMember({...newMember, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Cumpleaños (Opcional)</label>
                    <input 
                      type="date" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={newMember.birth_date}
                      onChange={e => setNewMember({...newMember, birth_date: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email (Opcional)</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={newMember.email}
                    onChange={e => setNewMember({...newMember, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Servicio</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={newMember.service_type}
                    onChange={e => setNewMember({...newMember, service_type: e.target.value as any})}
                  >
                    <option value="gym">Solo Gimnasio</option>
                    <option value="personalized">Entrenamiento Personalizado</option>
                    <option value="nutrition">Nutrición</option>
                    <option value="personalized_nutrition">Personalizado + Nutrición</option>
                    <option value="gym_nutrition">Kinetix + Nutrición</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-xs font-black text-rose-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ShieldCheck size={14} />
                    Checklist Legal (Documentación Interna)
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded-lg border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                        checked={newMember.has_signed_waiver}
                        onChange={e => setNewMember({...newMember, has_signed_waiver: e.target.checked})}
                      />
                      <span className="text-sm font-bold text-slate-700">Carta Responsiva Firmada</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded-lg border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                        checked={newMember.has_image_use_consent}
                        onChange={e => setNewMember({...newMember, has_image_use_consent: e.target.checked})}
                      />
                      <span className="text-sm font-bold text-slate-700">Consentimiento de Uso de Imagen</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Notas Internas / Médicas</label>
                  <textarea 
                    placeholder="Ej: Lesión en rodilla, requiere atención especial..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/10 outline-none text-sm min-h-[80px] resize-none"
                    value={newMember.internal_notes}
                    onChange={e => setNewMember({...newMember, internal_notes: e.target.value})}
                  />
                </div>

                {errorMsg && (
                  <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    {errorMsg}
                  </div>
                )}
                <div className="flex gap-3 mt-8">
                  <button 
                    type="button"
                    onClick={() => { setShowAddMember(false); setIsEditing(false); setEditingId(null); }}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl font-medium hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 shadow-sm transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      isEditing ? 'Guardar Cambios' : 'Registrar Miembro'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showAddPayment && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 md:p-8 shadow-2xl relative overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => setShowAddPayment(false)}
                className="absolute right-6 top-6 text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
                <div className="p-8 border-b border-slate-50">
                  <h3 className="text-2xl font-black text-slate-900">{isEditing ? 'Editar Pago' : 'Registrar Pago'}</h3>
                  <p className="text-sm text-slate-500">
                    {isEditing ? 'Corrige los datos de la transacción' : 'Registra una nueva entrada de dinero'}
                  </p>
                </div>
                <form onSubmit={handleAddPayment} className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Buscar Miembro</label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Escribe nombre o teléfono..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                      value={paymentSearchTerm}
                      onChange={(e) => setPaymentSearchTerm(e.target.value)}
                    />
                  </div>
                    <select 
                      required
                      className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm font-medium ${members.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}
                      value={newPayment.member_id}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === "") {
                          setNewPayment({...newPayment, member_id: '' as any});
                          setSelectedMember(null);
                          return;
                        }
                        const id = val;
                        const member = members.find(m => String(m.id) === String(id));
                        const suggestedStart = member?.last_expiry && new Date(member.last_expiry) > new Date()
                          ? new Date(member.last_expiry).toISOString().split('T')[0]
                          : new Date().toISOString().split('T')[0];
                        setNewPayment({...newPayment, member_id: id as any, start_date: suggestedStart});
                        setSelectedMember(member || null);
                      }}
                    >
                      <option value="">{members.length === 0 ? 'Cargando miembros...' : '— Seleccionar Miembro —'}</option>
                      {members
                        .filter(m => {
                          const s = paymentSearchTerm.toLowerCase();
                          return (m.name || '').toLowerCase().includes(s) || 
                                 (m.phone || '').includes(s);
                        })
                        .map(m => (
                          <option key={m.id} value={m.id}>{m.name} {m.phone ? `(${m.phone})` : ''}</option>
                        ))}
                      {paymentSearchTerm && members.filter(m => {
                        const s = paymentSearchTerm.toLowerCase();
                        return (m.name || '').toLowerCase().includes(s) || 
                               (m.phone || '').includes(s);
                      }).length === 0 && (
                        <option disabled>No se encontró "{paymentSearchTerm}"</option>
                      )}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Pago</label>
                    <select 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={newPayment.payment_type}
                      onChange={e => {
                        const type = e.target.value as any;
                        const suggestedAmount = type === 'visit' ? 50 : 500 * newPayment.months;
                        setNewPayment({...newPayment, payment_type: type, amount: suggestedAmount});
                      }}
                    >
                      <option value="monthly">Mensualidad</option>
                      <option value="visit">Visita</option>
                    </select>
                  </div>
                  {newPayment.payment_type === 'monthly' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Meses</label>
                      <input 
                        type="number" 
                        min="1"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        value={newPayment.months}
                        onChange={e => {
                          const months = parseInt(e.target.value) || 1;
                          const suggestedAmount = 500 * months;
                          
                          let newExp = newPayment.expiry_date;
                          if (newPayment.start_date) {
                            const parts = newPayment.start_date.split('-');
                            if (parts.length === 3) {
                              const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                              d.setMonth(d.getMonth() + months);
                              newExp = d.toISOString().split('T')[0];
                            }
                          }
                          
                          setNewPayment({...newPayment, months, amount: suggestedAmount, expiry_date: newExp});
                        }}
                      />
                    </div>
                  )}
                </div>

                {newPayment.payment_type === 'monthly' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha Inicio Vigencia</label>
                      <input 
                        required
                        type="date" 
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        value={newPayment.start_date}
                        onChange={e => {
                          const newStart = e.target.value;
                          const parts = newStart.split('-');
                          let newExp = '';
                          if (parts.length === 3) {
                            const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                            d.setMonth(d.getMonth() + (Number(newPayment.months) || 1));
                            newExp = d.toISOString().split('T')[0];
                          }
                          setNewPayment({...newPayment, start_date: newStart, expiry_date: newExp});
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1 font-bold text-indigo-600">Fecha de Vencimiento</label>
                      <input 
                        type="date" 
                        className="w-full px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                        value={newPayment.expiry_date}
                        onChange={e => setNewPayment({...newPayment, expiry_date: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Monto Base ($)</label>
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono"
                    value={newPayment.amount || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setNewPayment({...newPayment, amount: val === '' ? 0 : parseFloat(val)});
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Descuento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={newPayment.discount_type}
                      onChange={e => {
                        const type = e.target.value as any;
                        setNewPayment({
                          ...newPayment, 
                          discount_type: type,
                          discount_amount: type === 'other' ? newPayment.discount_amount : 0
                        });
                      }}
                    >
                      <option value="none">Ninguno</option>
                      <option value="birthday">Cumpleaños (50%)</option>
                      <option value="other">Otro</option>
                    </select>
                    {newPayment.discount_type === 'other' && (
                      <input 
                        type="number" 
                        placeholder="Monto $"
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        value={newPayment.discount_amount || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setNewPayment({...newPayment, discount_amount: val === '' ? 0 : parseFloat(val)});
                        }}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Recibido por (Staff)</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Nombre del recepcionista"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={newPayment.received_by}
                    onChange={e => setNewPayment({...newPayment, received_by: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Notas (Confidencial)</label>
                  <textarea 
                    placeholder="Notas adicionales sobre el pago..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                    rows={2}
                    value={newPayment.notes}
                    onChange={e => setNewPayment({...newPayment, notes: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1 font-bold text-emerald-600 underline">Categoría de Servicio</label>
                    <select 
                      className="w-full px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold text-emerald-900"
                      value={newPayment.category}
                      onChange={e => setNewPayment({...newPayment, category: e.target.value as any})}
                    >
                      <option value="gym">Gimnasio</option>
                      <option value="personalized">Entrenamiento Personalizado (Jorge)</option>
                      <option value="nutrition">Nutrición</option>
                      <option value="personalized_nutrition">Personalizado + Nutrición</option>
                      <option value="gym_nutrition">Kinetix + Nutrición</option>
                    </select>
                </div>

                {(newPayment.category === 'personalized_nutrition' || newPayment.category === 'gym_nutrition') && (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 animate-in fade-in zoom-in duration-300">
                    <label className="block text-sm font-bold text-emerald-700 mb-2 flex items-center gap-2">
                       <Apple size={16} />
                       Comisión para Nutrióloga ($)
                    </label>
                    <input 
                      type="number" 
                      placeholder="Ej: 200"
                      className="w-full px-4 py-2 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold text-emerald-900"
                      value={newPayment.nutritionist_commission || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setNewPayment({...newPayment, nutritionist_commission: val === '' ? 0 : parseFloat(val)});
                      }}
                    />
                    <p className="text-[10px] text-emerald-600 mt-2 font-medium">
                      Este monto se descontará de la utilidad de Jorge en sus reportes personalizados.
                    </p>
                  </div>
                )}

                <div className="bg-indigo-50 p-4 rounded-2xl">
                  <div className="flex justify-between text-sm text-indigo-600 font-medium">
                    <span>Subtotal:</span>
                    <span>${(Number(newPayment.amount) || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-indigo-900 mt-1">
                    <span>Total a pagar:</span>
                    <span>
                      ${( (Number(newPayment.amount) || 0) - 
                        (newPayment.discount_type === 'birthday' ? (Number(newPayment.amount) || 0) * 0.5 : (newPayment.discount_type === 'other' ? (Number(newPayment.discount_amount) || 0) : 0))).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowAddPayment(false);
                      setSelectedMember(null);
                    }}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl font-medium hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 shadow-sm transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      isEditing ? 'Guardar Cambios' : 'Confirmar Pago'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {showAddExpense && (currentRole === 'Leslie' || currentRole === 'Jorge') && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => { setShowAddExpense(false); setIsEditing(false); setEditingId(null); }}
                className="absolute right-6 top-6 text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
              <h3 className="text-2xl font-bold mb-6">{isEditing ? 'Editar Gasto' : 'Registrar Gasto'}</h3>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Descripción</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ej: Pago de renta, Luz, Equipo..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={newExpense.description}
                    onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Monto ($)</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none font-mono"
                      value={newExpense.amount}
                      onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Categoría</label>
                    <select 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={newExpense.category}
                      onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                    >
                      <option value="rent">Renta</option>
                      <option value="utilities">Servicios (Luz/Agua)</option>
                      <option value="equipment">Equipo</option>
                      <option value="salary">Sueldos</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <button 
                    type="button"
                    onClick={() => { setShowAddExpense(false); setIsEditing(false); setEditingId(null); }}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl font-medium hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 shadow-sm transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      isEditing ? 'Guardar Cambios' : 'Registrar Gasto'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {showAddInventory && (currentRole === 'Leslie' || currentRole === 'Jorge') && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => { setShowAddInventory(false); setIsEditing(false); setEditingId(null); }}
                className="absolute right-6 top-6 text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
              <h3 className="text-2xl font-bold mb-6">{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <form onSubmit={handleAddInventory} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del Producto</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={newInventory.name}
                    onChange={e => setNewInventory({...newInventory, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Precio ($)</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-mono"
                      value={newInventory.price}
                      onChange={e => setNewInventory({...newInventory, price: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Stock Inicial</label>
                    <input 
                      required
                      type="number" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                      value={newInventory.stock}
                      onChange={e => setNewInventory({...newInventory, stock: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Categoría</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={newInventory.category}
                    onChange={e => setNewInventory({...newInventory, category: e.target.value})}
                  >
                    <option value="drinks">Bebidas</option>
                    <option value="supplements">Suplementos</option>
                    <option value="clothing">Ropa/Accesorios</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div className="flex gap-3 mt-8">
                  <button 
                    type="button"
                    onClick={() => { setShowAddInventory(false); setIsEditing(false); setEditingId(null); }}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl font-medium hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 shadow-sm transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      isEditing ? 'Guardar Cambios' : 'Registrar Producto'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showMakeSale && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowMakeSale(false)}
                className="absolute right-6 top-6 text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
              <h3 className="text-2xl font-bold mb-6">Venta Rápida</h3>
              <form onSubmit={handleMakeSale} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Seleccionar Producto</label>
                  <select 
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={newSale.item_id}
                    onChange={e => {
                      const item = inventory.find(i => i.id === parseInt(e.target.value));
                      setNewSale({
                        ...newSale,
                        item_id: parseInt(e.target.value),
                        total_price: item ? item.price * newSale.quantity : 0
                      });
                    }}
                  >
                    <option value="">Seleccionar...</option>
                    {inventory.map(item => (
                      <option key={item.id} value={item.id} disabled={item.stock <= 0}>
                        {item.name} (${(Number(item.price) || 0).toFixed(2)}) - Stock: {item.stock}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Cantidad</label>
                  <input 
                    required
                    type="number" 
                    min="1"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
                    value={newSale.quantity}
                    onChange={e => {
                      const qty = parseInt(e.target.value);
                      const item = inventory.find(i => i.id === newSale.item_id);
                      setNewSale({
                        ...newSale,
                        quantity: qty,
                        total_price: item ? item.price * qty : 0
                      });
                    }}
                  />
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl">
                  <div className="flex justify-between text-lg font-bold text-blue-900">
                    <span>Total a cobrar:</span>
                    <span>${(Number(newSale.total_price) || 0).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button 
                    type="button"
                    onClick={() => setShowMakeSale(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl font-medium hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 shadow-sm transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      'Confirmar Venta'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50">
                <h3 className="text-2xl font-black text-slate-900">Nuevo Usuario</h3>
                <p className="text-sm text-slate-500">Crea una cuenta para el personal</p>
              </div>
              <form onSubmit={handleAddUser} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre de Usuario</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold"
                    placeholder="Ej: jorge_coach"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">PIN de Acceso</label>
                  <input 
                    type="password" 
                    required
                    maxLength={4}
                    pattern="\d{4}"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono text-2xl tracking-[1em] text-center"
                    placeholder="0000"
                    value={newUser.pin}
                    onChange={(e) => setNewUser({ ...newUser, pin: e.target.value })}
                  />
                  <p className="text-[10px] text-slate-400 text-center">Debe ser de 4 dígitos</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Rol</label>
                  <select 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold appearance-none"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    <option value="Coach">Coach</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowAddUser(false);
                      setNewUser({ username: '', pin: '', role: 'Coach' });
                    }}
                    className="flex-1 px-6 py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creando...
                      </>
                    ) : (
                      'Crear Usuario'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showChangePin && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => { setShowChangePin(false); setSelectedUserForPin(null); }}
                className="absolute right-6 top-6 text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
              <h3 className="text-2xl font-bold mb-2">Cambiar PIN</h3>
              <p className="text-sm text-slate-500 mb-6">
                {selectedUserForPin ? `Estás cambiando el PIN de: ${selectedUserForPin}` : 'Actualiza tu PIN de acceso personal'}
              </p>
              <form onSubmit={handleChangePin} className="space-y-4">
                {!selectedUserForPin && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">PIN Actual</label>
                    <input 
                      required
                      type="password"
                      maxLength={4}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-center text-2xl tracking-widest"
                      value={pinForm.currentPin}
                      onChange={e => setPinForm({ ...pinForm, currentPin: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nuevo PIN (4 dígitos)</label>
                  <input 
                    required
                    type="password"
                    maxLength={4}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-center text-2xl tracking-widest"
                    value={pinForm.newPin}
                    onChange={e => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Confirmar Nuevo PIN</label>
                  <input 
                    required
                    type="password"
                    maxLength={4}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-center text-2xl tracking-widest"
                    value={pinForm.confirmPin}
                    onChange={e => setPinForm({ ...pinForm, confirmPin: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                
                {pinStatus.message && (
                  <div className={`p-3 rounded-xl text-sm font-medium ${pinStatus.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {pinStatus.message}
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button 
                    type="button"
                    onClick={() => { setShowChangePin(false); setSelectedUserForPin(null); }}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl font-medium hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 shadow-sm transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Actualizando...
                      </>
                    ) : (
                      'Actualizar PIN'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px] border backdrop-blur-md ${
                toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-100 text-emerald-800' :
                toast.type === 'error' ? 'bg-rose-50/90 border-rose-100 text-rose-800' :
                'bg-blue-50/90 border-blue-100 text-blue-800'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                toast.type === 'error' ? 'bg-rose-100 text-rose-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {toast.type === 'success' ? <ShieldCheck size={18} /> : 
                 toast.type === 'error' ? <AlertCircle size={18} /> : 
                 <Info size={18} />}
              </div>
              <span className="font-bold text-sm">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmation?.isOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl"
            >
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-2">{confirmation.title}</h3>
              <p className="text-slate-500 mb-8">{confirmation.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmation(null)}
                  className="flex-1 px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    confirmation.onConfirm();
                    setConfirmation(null);
                  }}
                  disabled={isSubmitting}
                  className={`flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Confirmar'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}
