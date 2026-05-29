import React from 'react';
import { 
  BarChart3, 
  Users, 
  CreditCard, 
  TrendingDown, 
  Clock, 
  Fingerprint, 
  Apple, 
  ShoppingBag, 
  Box, 
  Lock, 
  LogOut,
  Sparkles
} from 'lucide-react';
import { Logo } from './Logo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  currentRole: string;
  onLogout: () => void;
  birthdayAlertsCount: number;
  paymentAlertsCount: number;
  databaseStatus: 'online' | 'offline' | 'checking';
  onChangePin: () => void;
}

export const Sidebar = ({ 
  activeTab, 
  setActiveTab, 
  isMobileMenuOpen, 
  setIsMobileMenuOpen, 
  currentRole, 
  onLogout,
  birthdayAlertsCount,
  paymentAlertsCount,
  databaseStatus,
  onChangePin
}: SidebarProps) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'analytics', label: 'Reportes', icon: TrendingDown, role: ['Leslie', 'Jorge'] },
    { id: 'members', label: 'Miembros', icon: Users },
    { id: 'payments', label: 'Pagos', icon: CreditCard },
    { id: 'expenses', label: 'Gastos', icon: TrendingDown, role: ['Leslie', 'Jorge'] },
    { id: 'attendance', label: 'Asistencia', icon: Clock },
    { id: 'personalized', label: 'Personalizados', icon: Fingerprint, role: ['Leslie', 'Jorge'] },
    { id: 'nutrition', label: 'Nutrición', icon: Apple, role: ['Leslie', 'Jorge'] },
    { id: 'supplements', label: 'Suplementos', icon: Sparkles },
    { id: 'sales', label: 'Ventas', icon: ShoppingBag },
    { id: 'inventory', label: 'Inventario', icon: Box },
    { id: 'users', label: 'Usuarios', icon: Lock, role: ['Leslie'] },
  ];

  return (
    <nav className={`
      fixed left-0 top-0 h-[100dvh] w-64 bg-white border-r border-slate-100 p-6 flex flex-col z-40 transition-transform duration-300 ease-in-out no-print
      ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
    `}>
      <div className="flex items-center justify-between mb-10">
        <button 
          onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Logo size={24} />
        </button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
        {menuItems.map((item) => {
          if (item.role && !item.role.includes(currentRole)) return null;
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
              className={`
                w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group relative
                ${isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 font-bold' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}
              `}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="font-medium">{item.label}</span>
              {item.id === 'dashboard' && birthdayAlertsCount > 0 && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-amber-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.5)]"></span>
              )}
              {item.id === 'members' && paymentAlertsCount > 0 && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span>
              )}
              {isActive && !((item.id === 'dashboard' && birthdayAlertsCount > 0) || (item.id === 'members' && paymentAlertsCount > 0)) && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full opacity-50"></span>
              )}
            </button>
          );
        })}
      </div>

      <div className="pt-6 mt-6 border-t border-slate-100 space-y-4">
        {(currentRole === 'Leslie' || currentRole === 'Jorge') && (
          <button 
            onClick={onChangePin}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-slate-500 hover:bg-slate-50 transition-all font-medium text-sm"
          >
            <Lock size={18} />
            Cambiar PIN
          </button>
        )}

        <div className="px-4 py-3 bg-slate-50 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className={`w-2 h-2 rounded-full ${databaseStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : databaseStatus === 'offline' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-amber-500 animate-pulse'}`}></div>
            <span className="text-[10px] uppercase tracking-widest font-black text-slate-400">
              {databaseStatus === 'online' ? 'Online' : databaseStatus === 'offline' ? 'Offline' : 'Checking'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">
              {currentRole?.slice(0, 2)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-black text-slate-900 truncate uppercase mt-0.5">{currentRole}</p>
            </div>
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all font-bold text-sm"
        >
          <LogOut size={18} />
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
};
