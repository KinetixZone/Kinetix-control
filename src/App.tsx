import React, { useState, useEffect } from 'react';
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
  Lock,
  Trash2,
  Edit,
  Info
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
import { supabase } from './lib/supabase';
import { encryptData, decryptData } from './lib/encryption';
import { Member, Payment, Expense, FinancialStats, InventoryItem } from './types';

type Role = 'Leslie' | 'Jorge' | 'Staff';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: 'Leslie', pin: '' });
  const [loginError, setLoginError] = useState('');

  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserForPin, setSelectedUserForPin] = useState<string | null>(null);
  const [paymentAlerts, setPaymentAlerts] = useState<any[]>([]);
  const [birthdayAlerts, setBirthdayAlerts] = useState<any[]>([]);
  const [financialStats, setFinancialStats] = useState<FinancialStats>({ total_income: 0, total_expenses: 0, profit: 0 });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'members' | 'payments' | 'expenses' | 'analytics' | 'attendance' | 'inventory' | 'users'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
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
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [currentRole, setCurrentRole] = useState<Role>('Leslie');
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [newMember, setNewMember] = useState({ name: '', phone: '', email: '', birth_date: '' });
  const [newPayment, setNewPayment] = useState({
    member_id: 0,
    amount: 500,
    payment_type: 'monthly' as 'monthly' | 'visit',
    discount_type: 'none' as 'birthday' | 'other' | 'none',
    discount_amount: 0,
    received_by: '',
    months: 1,
    notes: ''
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
  const [newUser, setNewUser] = useState({ username: '', pin: '', role: 'Staff' });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setNewUser({ username: '', pin: '', role: 'Staff' });
      fetchData();
    } catch (error: any) {
      addToast(error.message || 'Error al crear usuario', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Members with payments for last_expiry
      const { data: membersData } = await supabase
        .from('members')
        .select('*, payments(expiry_date)')
        .order('name');
      
      const transformedMembers = (membersData || []).map(m => {
        const expiries = (m.payments || [])
          .map((p: any) => p.expiry_date)
          .filter(Boolean)
          .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());
        return { ...m, last_expiry: expiries[0] || null };
      });
      setMembers(transformedMembers);

      // 2. Payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*, members(name)')
        .order('payment_date', { ascending: false });
      
      const decryptedPayments = (paymentsData || []).map((p: any) => ({
        ...p,
        member_name: (Array.isArray(p.members) ? p.members[0]?.name : p.members?.name) || 'Desconocido',
        notes: decryptData(p.notes)
      }));
      setPayments(decryptedPayments);

      // 3. Expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });
      
      const decryptedExpenses = (expensesData || []).map(e => ({
        ...e,
        description: decryptData(e.description)
      }));
      setExpenses(decryptedExpenses);

      // 4. Inventory
      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('*')
        .order('name');
      setInventory(inventoryData || []);

      // 5. Attendance (Today)
      const today = new Date().toISOString().split('T')[0];
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*, members(name)')
        .gte('check_in_time', `${today}T00:00:00`)
        .order('check_in_time', { ascending: false });
      
      setAttendance((attendanceData || []).map((a: any) => ({
        ...a,
        name: (Array.isArray(a.members) ? a.members[0]?.name : a.members?.name) || 'Desconocido'
      })));

      // 6. Financial Stats
      const { data: pData } = await supabase.from('payments').select('amount');
      const { data: sData } = await supabase.from('sales').select('total_price');
      const { data: eData } = await supabase.from('expenses').select('amount');

      const totalIncome = (pData?.reduce((acc, curr) => acc + curr.amount, 0) || 0) +
                          (sData?.reduce((acc, curr) => acc + curr.total_price, 0) || 0);
      const totalExpenses = eData?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
      setFinancialStats({
        total_income: totalIncome,
        total_expenses: totalExpenses,
        profit: totalIncome - totalExpenses
      });

      // 7. Alerts
      const now = new Date();
      const next3Days = new Date();
      next3Days.setDate(now.getDate() + 3);

      const birthdayAlerts = transformedMembers.filter(m => {
        if (!m.birth_date) return false;
        const bDay = new Date(m.birth_date);
        return bDay.getMonth() === now.getMonth() && bDay.getDate() === now.getDate();
      });
      setBirthdayAlerts(birthdayAlerts);

      const expiringAlerts = transformedMembers.filter(m => {
        if (!m.last_expiry) return false;
        const expiry = new Date(m.last_expiry);
        return expiry >= now && expiry <= next3Days;
      });
      setPaymentAlerts(expiringAlerts);
      
      // 8. Users (Admin only)
      if (currentRole === 'Leslie' || currentRole === 'Jorge') {
        const { data: usersData } = await supabase.from('users').select('username, role');
        setUsers(usersData || []);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsLoading(false);
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
        try {
          const { error } = await supabase.from('users').delete().eq('username', username);
          if (error) throw error;
          addToast(`Usuario ${username} eliminado`);
          fetchData();
        } catch (error) {
          addToast('Error al eliminar usuario', 'error');
        }
      }
    );
  };

  const handleDeleteMember = async (id: number) => {
    confirmAction(
      '¿Eliminar Miembro?',
      'Esta acción eliminará permanentemente al miembro y todo su historial de pagos y asistencias. ¿Deseas continuar?',
      async () => {
        try {
          const { error } = await supabase.from('members').delete().eq('id', id);
          if (error) throw error;
          addToast('Miembro eliminado correctamente');
          fetchData();
        } catch (error) {
          addToast('Error al eliminar miembro', 'error');
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
        } catch (error) {
          addToast('Error al eliminar pago', 'error');
        }
      }
    );
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
        } catch (error) {
          addToast('Error al eliminar gasto', 'error');
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

    const url = `https://wa.me/${member.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
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
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      let result;
      if (isEditing) {
        result = await supabase
          .from('members')
          .update(newMember)
          .eq('id', editingId);
      } else {
        result = await supabase
          .from('members')
          .insert([newMember]);
      }

      if (result.error) {
        if (result.error.code === '23505') {
          setErrorMsg('Este número de teléfono ya está registrado a otro miembro.');
        } else {
          setErrorMsg('Error al guardar miembro.');
        }
        setIsSubmitting(false);
        return;
      }

      setNewMember({ name: '', phone: '', email: '', birth_date: '' });
      setShowAddMember(false);
      setIsEditing(false);
      setEditingId(null);
      addToast(isEditing ? 'Miembro actualizado' : 'Miembro registrado con éxito');
      fetchData();
    } catch (error: any) {
      setErrorMsg(error.message || 'Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditMember = (member: Member) => {
    setNewMember({
      name: member.name,
      phone: member.phone || '',
      email: member.email || '',
      birth_date: member.birth_date || ''
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

    setIsSubmitting(true);
    try {
      const baseAmount = newPayment.amount;
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
      if (newPayment.payment_type === 'monthly') {
        const startDate = selectedMember?.last_expiry && new Date(selectedMember.last_expiry) > new Date()
          ? new Date(selectedMember.last_expiry)
          : new Date();
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + (newPayment.months || 1));
        expiry_date = d.toISOString();
      }

      const discountInfo = newPayment.discount_type !== 'none' 
        ? ` [Descuento: ${newPayment.discount_type === 'birthday' ? 'Cumpleaños (50%)' : 'Otro'} - $${discount.toFixed(2)}]`
        : '';

      const { error } = await supabase
        .from('payments')
        .insert([{
          member_id: newPayment.member_id,
          amount: finalAmount,
          payment_type: newPayment.payment_type,
          received_by: newPayment.received_by || currentRole,
          expiry_date,
          payment_date: new Date().toISOString(),
          notes: encryptData((newPayment.notes || '') + discountInfo)
        }]);

      if (error) throw error;

      setShowAddPayment(false);
      setSelectedMember(null);
      setNewPayment({
        member_id: 0,
        amount: 500,
        payment_type: 'monthly',
        discount_type: 'none',
        discount_amount: 0,
        received_by: '',
        months: 1,
        notes: ''
      });
      addToast('Pago registrado correctamente');
      fetchData();
    } catch (error: any) {
      console.error('Error adding payment:', error);
      addToast(error.message || 'Error al registrar el pago', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
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
      console.error('Error adding expense:', error);
      addToast(error.message || 'Error al registrar gasto', 'error');
    } finally {
      setIsSubmitting(false);
    }
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
      'Se borrará este producto del inventario. ¿Deseas continuar?',
      async () => {
        try {
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
      console.error('Error saving inventory item:', error);
      addToast(error.message || 'Error al guardar producto', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMakeSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
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

      setNewSale({ item_id: 0, quantity: 1, total_price: 0 });
      setShowMakeSale(false);
      addToast('Venta registrada con éxito');
      fetchData();
    } catch (error: any) {
      console.error('Error making sale:', error);
      addToast(error.message || 'Error al registrar venta', 'error');
    } finally {
      setIsSubmitting(false);
    }
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

  const filteredMembers = members.filter(m => 
    (m.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (m.phone || '').includes(searchTerm)
  );

  const isExpired = (dateStr: string | null) => {
    if (!dateStr) return true;
    return new Date(dateStr) < new Date();
  };

  const getStatusColor = (expiry: string | null) => {
    if (!expiry) return 'bg-gray-100 text-gray-500';
    if (isExpired(expiry)) return 'bg-red-100 text-red-600';
    return 'bg-green-100 text-green-600';
  };

  const filteredPayments = payments.filter(p => {
    const matchesSearch = (p.member_name?.toLowerCase() || '').includes(paymentSearchTerm.toLowerCase());
    const matchesMonth = paymentMonthFilter ? p.payment_date?.startsWith(paymentMonthFilter) : true;
    return matchesSearch && matchesMonth;
  });

  const Skeleton = ({ className, key }: { className?: string; key?: any }) => (
    <div key={key} className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />
  );

  if (!isLoggedIn) {
    return (
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
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-slate-100 p-4 sticky top-0 z-30 flex justify-between items-center">
        <button 
          onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <ShieldCheck size={16} />
          </div>
          <span className="font-bold text-sm">Kinetix</span>
        </button>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar - Desktop & Mobile Overlay */}
      <nav className={`
        fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-100 p-6 flex flex-col z-40 transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'payments' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'} ${currentRole === 'Staff' ? 'hidden' : ''}`}
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
      <main className="lg:ml-64 p-4 md:p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {activeTab === 'dashboard' && 'Resumen General'}
              {activeTab === 'members' && 'Gestión de Miembros'}
              {activeTab === 'payments' && 'Historial de Pagos'}
              {activeTab === 'expenses' && 'Control de Gastos'}
              {activeTab === 'analytics' && 'Análisis de Rentabilidad'}
              {activeTab === 'attendance' && 'Asistencia de Hoy'}
            </h2>
            <p className="text-slate-500 mt-1">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-3">
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
              onClick={() => setShowAddMember(true)}
              className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all font-medium"
            >
              <UserPlus size={18} />
              Nuevo Miembro
            </button>
            <button 
              onClick={() => setShowAddPayment(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all font-medium shadow-sm"
            >
              <Plus size={18} />
              Registrar Pago
            </button>
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
                              const msg = `¡Feliz cumpleaños ${m.name}! Te deseamos lo mejor desde Kinetix Functional Zone. Recuerda que tienes un 50% de descuento en tu próxima mensualidad. ¡Te esperamos!`;
                              window.open(`https://wa.me/${m.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
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
                        const daysLeft = Math.ceil((new Date(m.last_expiry!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        return (
                          <div key={m.id} className="bg-white p-4 rounded-2xl border border-rose-100 flex justify-between items-center shadow-sm">
                            <div>
                              <div className="font-bold text-slate-900">{m.name}</div>
                              <div className={`text-[10px] font-black uppercase tracking-wider ${daysLeft < 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                                {daysLeft < 0 ? `Vencido hace ${Math.abs(daysLeft)}d` : daysLeft === 0 ? 'Vence hoy' : `Vence en ${daysLeft}d`}
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
                        <DollarSign size={24} />
                      </div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Resumen Financiero</span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-slate-500 font-medium">Balance Total</div>
                      <div className="text-5xl font-black text-slate-900 tracking-tighter">
                        ${(financialStats.profit || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-50">
                    <div>
                      <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Ingresos</div>
                      <div className="text-xl font-bold text-slate-900">${(financialStats.total_income || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">Gastos</div>
                      <div className="text-xl font-bold text-slate-900">${(financialStats.total_expenses || 0).toFixed(2)}</div>
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
                        payments.slice(0, 5).map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-all group">
                            <td className="px-8 py-5 font-bold text-slate-700">{p.member_name}</td>
                            <td className="px-8 py-5 font-mono text-sm font-black text-emerald-600">${(p.amount || 0).toFixed(2)}</td>
                            <td className="px-8 py-5 text-slate-400 text-xs font-medium">{new Date(p.payment_date!).toLocaleDateString()}</td>
                          </tr>
                        ))
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
                    members
                      .filter(m => m.last_expiry && !isExpired(m.last_expiry))
                      .sort((a, b) => new Date(a.last_expiry!).getTime() - new Date(b.last_expiry!).getTime())
                      .slice(0, 4)
                      .map(m => {
                        const daysLeft = Math.ceil((new Date(m.last_expiry!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
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
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre o teléfono..." 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredMembers.map(m => (
                <div key={m.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900">{m.name}</h4>
                      <p className="text-xs text-slate-400">{m.phone}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusColor(m.last_expiry)}`}>
                      {m.last_expiry ? (isExpired(m.last_expiry) ? 'Vencido' : 'Activo') : 'Sin Pagos'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium uppercase tracking-wider">Vencimiento</span>
                    <span className="font-mono font-bold text-slate-700">
                      {m.last_expiry ? new Date(m.last_expiry).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={() => { setSelectedMember(m); setNewPayment({ ...newPayment, member_id: m.id }); setShowAddPayment(true); }}
                      className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-xl font-bold text-xs"
                    >
                      Pagar
                    </button>
                    <button 
                      onClick={() => handleEditMember(m)}
                      className="flex-1 bg-slate-50 text-slate-600 py-2 rounded-xl font-bold text-xs"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleCheckIn(m.id)}
                      disabled={isSubmitting}
                      className={`flex-1 bg-emerald-50 text-emerald-600 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isSubmitting ? (
                        <div className="w-3 h-3 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                      ) : null}
                      Check-in
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Nombre</th>
                      <th className="px-6 py-3 font-semibold">Contacto</th>
                      <th className="px-6 py-3 font-semibold">Cumpleaños</th>
                      <th className="px-6 py-3 font-semibold">Estado</th>
                      <th className="px-6 py-3 font-semibold">Vencimiento</th>
                      <th className="px-6 py-3 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredMembers.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50 transition-all">
                        <td className="px-6 py-4">
                          <div className="font-medium">{m.name}</div>
                          <div className="text-xs text-slate-400">{m.email}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{m.phone}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {m.birth_date ? new Date(m.birth_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '-'}
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
              <div className="flex gap-2">
                <input 
                  type="month" 
                  className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                  value={paymentMonthFilter}
                  onChange={(e) => setPaymentMonthFilter(e.target.value)}
                />
                {currentRole === 'Leslie' && (
                  <button 
                    onClick={() => exportPaymentsToCSV(filteredPayments)}
                    className="flex items-center gap-2 text-xs bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-all font-bold shadow-sm"
                  >
                    <DollarSign size={14} />
                    Exportar Filtrados
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-lg">Historial de Pagos</h3>
                <p className="text-sm text-slate-500">
                  {filteredPayments.length} transacciones encontradas
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Miembro</th>
                      <th className="px-6 py-3 font-semibold">Monto</th>
                      <th className="px-6 py-3 font-semibold">Tipo</th>
                      <th className="px-6 py-3 font-semibold">Fecha</th>
                      <th className="px-6 py-3 font-semibold">Notas</th>
                      <th className="px-6 py-3 font-semibold">Recibido por</th>
                      {(currentRole === 'Leslie' || currentRole === 'Jorge') && (
                        <th className="px-6 py-3 font-semibold text-right">Acciones</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                          No se encontraron pagos con los filtros aplicados
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-all">
                          <td className="px-6 py-4 font-medium">{p.member_name}</td>
                          <td className="px-6 py-4 font-mono text-sm font-bold text-emerald-600">${(p.amount || 0).toFixed(2)}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${p.payment_type === 'monthly' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                              {p.payment_type === 'monthly' ? 'Mensualidad' : 'Visita'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-sm">{new Date(p.payment_date!).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-xs text-slate-400 italic max-w-[150px] truncate" title={p.notes}>
                            {p.notes || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{p.received_by}</td>
                          {(currentRole === 'Leslie' || currentRole === 'Jorge') && (
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => handleDeletePayment(p.id)}
                                className="text-rose-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-all"
                                title="Eliminar Pago"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Descripción</th>
                    <th className="px-6 py-3 font-semibold">Categoría</th>
                    <th className="px-6 py-3 font-semibold">Monto</th>
                    <th className="px-6 py-3 font-semibold">Registrado por</th>
                    <th className="px-6 py-3 font-semibold">Fecha</th>
                    <th className="px-6 py-3 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {expenses.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50 transition-all">
                      <td className="px-6 py-4 font-medium">{e.description}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium uppercase tracking-wider">
                          {e.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm font-bold text-rose-600">-${(e.amount || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{e.created_by}</td>
                      <td className="px-6 py-4 text-slate-500 text-sm">{new Date(e.expense_date).toLocaleDateString()}</td>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (currentRole === 'Leslie' || currentRole === 'Jorge') && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-xl font-bold mb-6">Balance General</h3>
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
                          value: expenses.filter(e => e.category === cat).reduce((acc, curr) => acc + curr.amount, 0)
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
              <h3 className="text-xl font-bold mb-4">Resumen de Rentabilidad</h3>
              <p className="text-slate-500 mb-6">Análisis detallado de la salud financiera de Kinetix</p>
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
                  <button 
                    onClick={exportAttendanceToCSV}
                    className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-100 transition-all font-bold"
                  >
                    <DollarSign size={14} />
                    Exportar CSV
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
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
                            {new Date(a.check_in_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
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

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-lg">Control de Inventario</h3>
                <p className="text-sm text-slate-500">Gestión de productos y suplementos</p>
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
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  setNewInventory({
                                    name: item.name,
                                    price: item.price,
                                    stock: item.stock,
                                    category: item.category
                                  });
                                  setIsEditing(true);
                                  setEditingId(item.id);
                                  setShowAddInventory(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase"
                              >
                                Editar
                              </button>
                              <button 
                                onClick={() => handleDeleteInventory(item.id)}
                                className="text-rose-400 hover:text-rose-600 font-bold text-xs uppercase"
                              >
                                Eliminar
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
        {activeTab === 'users' && (currentRole === 'Leslie' || currentRole === 'Jorge') && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">Gestión de Usuarios</h3>
                  <p className="text-sm text-slate-500">Administra los accesos y PINs del personal</p>
                </div>
                <button 
                  onClick={() => setShowAddUser(true)}
                  className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-all font-bold text-sm"
                >
                  <Plus size={18} />
                  Nuevo Usuario
                </button>
              </div>
              <div className="overflow-x-auto">
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
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Teléfono</label>
                    <input 
                      type="tel" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={newMember.phone}
                      onChange={e => setNewMember({...newMember, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Cumpleaños</label>
                    <input 
                      type="date" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      value={newMember.birth_date}
                      onChange={e => setNewMember({...newMember, birth_date: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={newMember.email}
                    onChange={e => setNewMember({...newMember, email: e.target.value})}
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
              <h3 className="text-2xl font-bold mb-6">Registrar Pago</h3>
              <form onSubmit={handleAddPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Buscar Miembro</label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Escribe nombre o teléfono..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select 
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={newPayment.member_id}
                    onChange={e => {
                      const id = parseInt(e.target.value);
                      setNewPayment({...newPayment, member_id: id});
                      setSelectedMember(members.find(m => m.id === id) || null);
                    }}
                  >
                    <option value="">Seleccionar miembro...</option>
                    {members
                      .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.phone?.includes(searchTerm))
                      .map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>
                      ))}
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
                          const months = parseInt(e.target.value);
                          const suggestedAmount = 500 * months;
                          setNewPayment({...newPayment, months, amount: suggestedAmount});
                        }}
                      />
                    </div>
                  )}
                </div>

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

                <div className="bg-indigo-50 p-4 rounded-2xl">
                  <div className="flex justify-between text-sm text-indigo-600 font-medium">
                    <span>Subtotal:</span>
                    <span>${newPayment.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-indigo-900 mt-1">
                    <span>Total a pagar:</span>
                    <span>
                      ${(newPayment.amount - 
                        (newPayment.discount_type === 'birthday' ? newPayment.amount * 0.5 : (newPayment.discount_type === 'other' ? newPayment.discount_amount : 0))).toFixed(2)}
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
                      'Confirmar Pago'
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
                        {item.name} (${item.price.toFixed(2)}) - Stock: {item.stock}
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
                    <span>${newSale.total_price.toFixed(2)}</span>
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
                    onClick={() => setShowAddUser(false)}
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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
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
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
