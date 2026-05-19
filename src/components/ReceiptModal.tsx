import React from 'react';
import { motion } from 'motion/react';
import { Receipt, X, Printer } from 'lucide-react';
import { Payment } from '../types';
import { Logo } from './Logo';

interface ReceiptModalProps {
  payment: Payment;
  onClose: () => void;
  onPrint: () => void;
}

export const ReceiptModal = ({ payment, onClose, onPrint }: ReceiptModalProps) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2 text-indigo-600">
            <Receipt size={20} />
            <h3 className="font-bold">Recibo de Pago</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div id="receipt-modal-content" className="p-8 space-y-6 font-mono print-only-content">
            <div className="text-center space-y-4">
              <Logo className="justify-center" size={28} />
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest text-center">Sucursal Matriz</p>
                <div className="w-12 h-0.5 bg-indigo-500 mx-auto mt-2 rounded-full opacity-30"></div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-dashed border-slate-200">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase">Folio:</span>
                <span className="font-bold text-slate-900">#{payment.id.toString().padStart(6, '0')}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase">Fecha:</span>
                <span className="font-bold text-slate-900">{new Date(payment.payment_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase">Recibió:</span>
                <span className="font-bold text-slate-900 uppercase">{payment.received_by}</span>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-dashed border-slate-200">
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-black">Cliente</div>
                <div className="text-sm font-black text-slate-900 uppercase">{payment.member_name}</div>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-black">Concepto</div>
                <div className="text-sm font-bold text-slate-900">
                   {payment.payment_type === 'monthly' ? 'PAGO DE MENSUALIDAD' : 'PAGO DE VISITA'} 
                   {payment.category && payment.category !== 'gym' && ` (${payment.category.toUpperCase()})`}
                </div>
                {payment.expiry_date && (
                  <div className="text-[10px] text-indigo-600 font-bold border border-indigo-100 bg-indigo-50 px-2 py-1 rounded inline-block mt-1">
                    VIGENCIA HASTA: {new Date(payment.expiry_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-dashed border-slate-200">
              <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
                <div className="text-left">
                  <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Total Pagado</span>
                  <div className="text-2xl font-black text-emerald-600">${(payment.amount || 0).toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Status</span>
                  <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">PAGADO</div>
                </div>
              </div>
            </div>

            <div className="text-center pt-6 space-y-4">
              <div className="space-y-1">
                <p className="text-[9px] text-slate-400 font-medium tracking-tight italic">"El esfuerzo de hoy es el éxito de mañana"</p>
                <p className="text-[10px] font-black text-slate-600 uppercase">KINETIX - TRANSFORMANDO VIDAS</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 no-print">
          <button 
            onClick={onPrint}
            className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Printer size={18} />
            Imprimir
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
