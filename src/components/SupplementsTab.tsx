import React, { useState, useEffect, useMemo } from 'react';
import { 
  Apple, 
  Sparkles, 
  Plus, 
  Search, 
  Calendar, 
  CheckCircle2, 
  Trash2, 
  DollarSign, 
  Settings, 
  Users, 
  ShoppingBag, 
  Database,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Clock,
  CupSoda,
  Undo
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { encryptData } from '../lib/encryption';
import { Member, Payment, InventoryItem } from '../types';

interface SupplementsTabProps {
  members: Member[];
  payments: Payment[];
  inventory: InventoryItem[];
  currentRole: string;
  onRefresh: () => Promise<void>;
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  confirmAction: (title: string, msg: string, onConfirm: () => void) => void;
}

// Structured metadata matching the user's active membership
export interface SupplementMetadata {
  type: 'protein' | 'creatine' | 'combo';
  start_date: string;
  expiry_date: string;
  total_paid: number;
  consumptions: string[]; // list of date strings: ["2026-05-29", "2026-05-30"]
}

export interface FlavorBag {
  id: string;
  type: 'protein' | 'creatine';
  flavor: string;
  servingsLeft: number;
  totalServings: number;
  totalConsumed: number;
  isOpened: boolean;
  createdAt: string;
}

// Helpers for reading/writing supplements metadata to the member's internal_notes field
export const parseSupplementMetadata = (notes: string | null): SupplementMetadata | null => {
  if (!notes) return null;
  const marker = '===SUPPLEMENTS_METADATA===';
  const idx = notes.indexOf(marker);
  if (idx === -1) return null;
  try {
    const jsonStr = notes.slice(idx + marker.length).trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Error parsing supplements metadata:', e);
    return null;
  }
};

export const getRawNotes = (notes: string | null): string => {
  if (!notes) return '';
  const marker = '===SUPPLEMENTS_METADATA===';
  const idx = notes.indexOf(marker);
  if (idx === -1) return notes;
  return notes.slice(0, idx).trim();
};

export const formatSupplementMetadata = (rawNotes: string, data: SupplementMetadata): string => {
  const marker = '===SUPPLEMENTS_METADATA===';
  const cleanRaw = rawNotes.trim();
  const separator = cleanRaw ? '\n\n' : '';
  return `${cleanRaw}${separator}${marker}\n${JSON.stringify(data, null, 2)}`;
};

export const SupplementsTab = ({
  members,
  payments,
  inventory,
  currentRole,
  onRefresh,
  addToast,
  confirmAction
}: SupplementsTabProps) => {
  const [subTab, setSubTab] = useState<'consumption' | 'management'>('consumption');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Supplements Local Settings (Configurable pricing, savings, etc.)
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('kinetix_supplements_settings_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use defaults
      }
    }
    return {
      proteinSinglePrice: 35,
      creatineSinglePrice: 15,
      comboSinglePrice: 45,
      proteinMonthlyPrice: 499,
      creatineMonthlyPrice: 199,
      comboMonthlyPrice: 649,
      servingsPerProteinBag: 30,
      servingsPerCreatineBag: 30
    };
  });

  // Save settings in local storage
  const saveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    localStorage.setItem('kinetix_supplements_settings_v3', JSON.stringify(newSettings));
    addToast('Precios y configuración actualizados correctamente');
  };

  // 2. Discover standard bags in database inventory
  const proteinItem = useMemo(() => inventory.find(i => i.name === 'Bolsa de Proteína'), [inventory]);
  const creatineItem = useMemo(() => inventory.find(i => i.name === 'Bolsa de Creatina'), [inventory]);

  // State to track multiple open bags of various flavors
  const [flavorBags, setFlavorBags] = useState<FlavorBag[]>(() => {
    const saved = localStorage.getItem('kinetix_supplements_flavor_bags_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    
    // Fallback/Migration: check if old openBags exists
    const oldBagsSaved = localStorage.getItem('kinetix_supplements_open_bags_v1');
    let oldBags = { proteinServingsLeft: 30, creatineServingsLeft: 30, totalProteinServingsConsumed: 0, totalCreatineServingsConsumed: 0 };
    if (oldBagsSaved) {
      try { oldBags = JSON.parse(oldBagsSaved); } catch (e) {}
    }

    return [
      {
        id: 'default_protein_choco',
        type: 'protein',
        flavor: 'Chocolate 🍫',
        servingsLeft: oldBags.proteinServingsLeft,
        totalServings: settings.servingsPerProteinBag || 30,
        totalConsumed: oldBags.totalProteinServingsConsumed || 0,
        isOpened: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'default_creatine_natural',
        type: 'creatine',
        flavor: 'Uva 🍇',
        servingsLeft: oldBags.creatineServingsLeft,
        totalServings: settings.servingsPerCreatineBag || 30,
        totalConsumed: oldBags.totalCreatineServingsConsumed || 0,
        isOpened: true,
        createdAt: new Date().toISOString()
      }
    ];
  });

  const saveFlavorBags = (newBags: FlavorBag[]) => {
    setFlavorBags(newBags);
    localStorage.setItem('kinetix_supplements_flavor_bags_v2', JSON.stringify(newBags));
  };

  const getDefaultBagId = (type: 'protein' | 'creatine'): string => {
    const openOfThisType = flavorBags.filter(b => b.type === type && b.isOpened && b.servingsLeft > 0);
    if (openOfThisType.length > 0) return openOfThisType[0].id;
    const anyOfThisType = flavorBags.filter(b => b.type === type);
    return anyOfThisType.length > 0 ? anyOfThisType[0].id : '';
  };

  // State to track flavor selection on the active consumer table
  const [selectedBagsForMembers, setSelectedBagsForMembers] = useState<Record<string, { protein?: string; creatine?: string }>>({});

  // Ensure items exist
  const handleInitializeBagsInDatabase = async () => {
    setIsSubmitting(true);
    try {
      if (!proteinItem) {
        await supabase.from('inventory').insert([{
          name: 'Bolsa de Proteína',
          price: 800,
          cost_price: 600,
          stock: 5,
          category: 'supplements'
        }]);
      }
      if (!creatineItem) {
        await supabase.from('inventory').insert([{
          name: 'Bolsa de Creatina',
          price: 400,
          cost_price: 250,
          stock: 5,
          category: 'supplements'
        }]);
      }
      await onRefresh();
      addToast('Bolsas de Proteína y Creatina detectadas o creadas en el inventario real');
    } catch (e) {
      addToast('Error al inicializar productos en Supabase', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deduct 1 scoop from specific flavor bag
  const deductPortionFromBag = async (bagId: string) => {
    const nextBags = flavorBags.map(bag => {
      if (bag.id === bagId) {
        const servingsLeft = Math.max(0, bag.servingsLeft - 1);
        const totalConsumed = bag.totalConsumed + 1;
        return { ...bag, servingsLeft, totalConsumed };
      }
      return bag;
    });

    const targetBag = flavorBags.find(b => b.id === bagId);
    if (targetBag) {
      const updatedBag = nextBags.find(b => b.id === bagId);
      if (updatedBag && updatedBag.servingsLeft <= 0) {
        addToast(`🥛 ¡Se ha terminado el suplemento de la bolsa de sabor "${targetBag.flavor}"!`);
        
        // Auto-deduct from stock if inventory has stock
        try {
          const itemInInventory = targetBag.type === 'protein' ? proteinItem : creatineItem;
          if (itemInInventory && itemInInventory.stock > 0) {
            await supabase.from('inventory').update({ stock: Math.max(0, itemInInventory.stock - 1) }).eq('id', itemInInventory.id);
            addToast(`⚡ Se descontó una nueva bolsa completa de ${targetBag.type === 'protein' ? 'Proteína' : 'Creatina'} de tu stock en Supabase.`);
            await onRefresh();
          } else {
            addToast(`⚠️ ¡Sin existencias de bolsas de ${targetBag.type === 'protein' ? 'Proteína' : 'Creatina'} en Supabase!`);
          }
        } catch (e) {
          console.error('Error updating stock on bag depletion:', e);
        }
      }
    }

    saveFlavorBags(nextBags);
  };

  // Deduct combo portions (1 protein scoop, 1 creatine scoop) from chosen bags
  const deductComboPortions = async (proteinBagId: string, creatineBagId: string) => {
    const nextBags = flavorBags.map(bag => {
      if (bag.id === proteinBagId) {
        return { ...bag, servingsLeft: Math.max(0, bag.servingsLeft - 1), totalConsumed: bag.totalConsumed + 1 };
      }
      if (bag.id === creatineBagId) {
        return { ...bag, servingsLeft: Math.max(0, bag.servingsLeft - 1), totalConsumed: bag.totalConsumed + 1 };
      }
      return bag;
    });

    const pBag = flavorBags.find(b => b.id === proteinBagId);
    if (pBag && pBag.servingsLeft - 1 <= 0) {
      addToast(`🥛 ¡Se ha terminado la proteína de sabor "${pBag.flavor}"!`);
      try {
        if (proteinItem && proteinItem.stock > 0) {
          await supabase.from('inventory').update({ stock: Math.max(0, proteinItem.stock - 1) }).eq('id', proteinItem.id);
          addToast('⚡ Se descontó una bolsa de Proteína de tu almacén.');
          await onRefresh();
        }
      } catch (e) {}
    }

    const cBag = flavorBags.find(b => b.id === creatineBagId);
    if (cBag && cBag.servingsLeft - 1 <= 0) {
      addToast(`⚡ ¡Se ha terminado la creatina de sabor "${cBag.flavor}"!`);
      try {
        if (creatineItem && creatineItem.stock > 0) {
          await supabase.from('inventory').update({ stock: Math.max(0, creatineItem.stock - 1) }).eq('id', creatineItem.id);
          addToast('⚡ Se descontó una bolsa de Creatina de tu almacén.');
          await onRefresh();
        }
      } catch (e) {}
    }

    saveFlavorBags(nextBags);
  };

  // Parse all members who have a supplement subscription (active or expired)
  const supplementMembers = useMemo(() => {
    const list: { member: Member; metadata: SupplementMetadata; isExpired: boolean; daysRemaining: number }[] = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTime = new Date(todayStr).getTime();

    members.forEach(m => {
      const meta = parseSupplementMetadata(m.internal_notes || null);
      if (meta) {
        const expTime = new Date(meta.expiry_date).getTime();
        const expired = expTime < todayTime;
        const diffDays = Math.ceil((expTime - todayTime) / (1000 * 60 * 60 * 24));
        list.push({
          member: m,
          metadata: meta,
          isExpired: expired,
          daysRemaining: diffDays < 0 ? 0 : diffDays
        });
      }
    });
    return list;
  }, [members]);

  // Form states
  const [membershipForm, setMembershipForm] = useState({
    member_id: '',
    type: 'protein' as 'protein' | 'creatine' | 'combo',
    start_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    amount: 499,
    notes: ''
  });

  // Keep price updated based on selected type
  useEffect(() => {
    let price = settings.proteinMonthlyPrice;
    if (membershipForm.type === 'creatine') price = settings.creatineMonthlyPrice;
    if (membershipForm.type === 'combo') price = settings.comboMonthlyPrice;
    
    // Auto-calculate expiry: 1 month from start_date
    let dateObj = new Date();
    try {
      const parts = membershipForm.start_date.split('-');
      if (parts.length === 3) {
        dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    } catch(e){}
    dateObj.setMonth(dateObj.getMonth() + 1);
    const expiryStr = dateObj.toISOString().split('T')[0];

    setMembershipForm(prev => ({
      ...prev,
      amount: price,
      expiry_date: expiryStr
    }));
  }, [membershipForm.type, membershipForm.start_date, settings]);

  const openProteinBags = useMemo(() => flavorBags.filter(b => b.type === 'protein' && b.isOpened && b.servingsLeft > 0), [flavorBags]);
  const openCreatineBags = useMemo(() => flavorBags.filter(b => b.type === 'creatine' && b.isOpened && b.servingsLeft > 0), [flavorBags]);

  // Single Serving Form State
  const [singleForm, setSingleForm] = useState({
    member_id: 'non_member', // can be assigned to a registered member or quick guest
    type: 'protein' as 'protein' | 'creatine' | 'combo',
    price: 35
  });

  const [singleSaleFlavors, setSingleSaleFlavors] = useState({
    proteinBagId: '',
    creatineBagId: ''
  });

  useEffect(() => {
    setSingleSaleFlavors({
      proteinBagId: getDefaultBagId('protein'),
      creatineBagId: getDefaultBagId('creatine')
    });
  }, [flavorBags]);

  useEffect(() => {
    let p = settings.proteinSinglePrice;
    if (singleForm.type === 'creatine') p = settings.creatineSinglePrice;
    if (singleForm.type === 'combo') p = settings.comboSinglePrice;
    setSingleForm(prev => ({ ...prev, price: p }));
  }, [singleForm.type, settings]);

  // Handle registering a monthly supplement membership
  const handleRegisterMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membershipForm.member_id) {
      addToast('Por favor selecciona un miembro', 'error');
      return;
    }

    const selectedM = members.find(m => String(m.id) === String(membershipForm.member_id));
    if (!selectedM) return;

    confirmAction(
      '¿Registrar Membresía de Suplemento?',
      `Se registrará la membresía para ${selectedM.name} por $${membershipForm.amount}. Esto descontará stock de porciones y registrará el cobro. ¿Deseas continuar?`,
      async () => {
        setIsSubmitting(true);
        try {
          // 1. Create a payment record in Supabase (fully compliant with accounting cashflow!)
          const paymentNotePlain = `[MEMBRESIA_SUPLEMENTOS] Membresía Mensual de ${
            membershipForm.type === 'protein' ? 'Proteína' : 
            membershipForm.type === 'creatine' ? 'Creatina' : 'Combo Ambas'
          }`;
          
          const startDateParts = membershipForm.start_date.split('-');
          const startObj = new Date(parseInt(startDateParts[0]), parseInt(startDateParts[1]) - 1, parseInt(startDateParts[2]), 12, 0, 0);
          
          const expiryDateParts = membershipForm.expiry_date.split('-');
          const expiryObj = new Date(parseInt(expiryDateParts[0]), parseInt(expiryDateParts[1]) - 1, parseInt(expiryDateParts[2]), 23, 59, 59);

          const { error: paymentError } = await supabase.from('payments').insert([{
            member_id: parseInt(membershipForm.member_id),
            amount: membershipForm.amount,
            payment_type: 'monthly',
            discount_type: 'none',
            discount_amount: 0,
            received_by: currentRole,
            payment_date: startObj.toISOString(),
            expiry_date: expiryObj.toISOString(),
            notes: encryptData(paymentNotePlain),
            category: 'nutrition' // associate standard nutrition category for financial bookkeeping
          }]);

          if (paymentError) throw paymentError;

          // 2. Update the member's internal_notes metadata
          const prevRawNotes = getRawNotes(selectedM.internal_notes || null);
          const newMeta: SupplementMetadata = {
            type: membershipForm.type,
            start_date: membershipForm.start_date,
            expiry_date: membershipForm.expiry_date,
            total_paid: membershipForm.amount,
            consumptions: [] // start empty
          };

          const encryptedNotesString = formatSupplementMetadata(prevRawNotes, newMeta);

          const { error: memberUpdateError } = await supabase
            .from('members')
            .update({ internal_notes: encryptedNotesString })
            .eq('id', selectedM.id);

          if (memberUpdateError) throw memberUpdateError;

          addToast(`Membresía registrada con éxito para ${selectedM.name}`);
          setMembershipForm(prev => ({ ...prev, member_id: '', notes: '' }));
          await onRefresh();
        } catch (err: any) {
          addToast(`Error al crear membresía: ${err.message || err}`, 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  // Handle registering a Single Portion scoop sale
  const handleRegisterSingleSale = async (e: React.FormEvent) => {
    e.preventDefault();

    const chosenPBagId = singleSaleFlavors.proteinBagId || getDefaultBagId('protein');
    const chosenCBagId = singleSaleFlavors.creatineBagId || getDefaultBagId('creatine');

    if ((singleForm.type === 'protein' || singleForm.type === 'combo') && !chosenPBagId) {
      addToast('No hay ninguna bolsa de proteínas abierta para realizar la venta individual en este momento', 'error');
      return;
    }
    if ((singleForm.type === 'creatine' || singleForm.type === 'combo') && !chosenCBagId) {
      addToast('No hay ninguna bolsa de creatina abierta para realizar la venta individual en este momento', 'error');
      return;
    }

    const pFlavor = flavorBags.find(b => b.id === chosenPBagId)?.flavor || '';
    const cFlavor = flavorBags.find(b => b.id === chosenCBagId)?.flavor || '';
    let confirmDetail = '';
    if (singleForm.type === 'protein') confirmDetail = `sabor "${pFlavor}"`;
    else if (singleForm.type === 'creatine') confirmDetail = `sabor "${cFlavor}"`;
    else confirmDetail = `Proteína "${pFlavor}" + Creatina "${cFlavor}"`;

    confirmAction(
      '¿Registrar Venta de Porción?',
      `Se registrará la venta de scoop individual de ${confirmDetail} por $${singleForm.price} y se descontará de la respectiva bolsa activa. ¿Proceder?`,
      async () => {
        setIsSubmitting(true);
        try {
          // 1. If it was sold to a real member, let's create a payment or expense/sales link
          const finalNoteText = `[VENTA_SCOOP_${singleForm.type.toUpperCase()}] Porción Individual Suplemento (${confirmDetail})`;

          // Let's create a standard receipt payment if linked to member, or general sale!
          if (singleForm.member_id !== 'non_member') {
            const mId = parseInt(singleForm.member_id);
            await supabase.from('payments').insert([{
              member_id: mId,
              amount: singleForm.price,
              payment_type: 'visit',
              discount_type: 'none',
              discount_amount: 0,
              received_by: currentRole,
              payment_date: new Date().toISOString(),
              expiry_date: null,
              notes: encryptData(finalNoteText),
              category: 'nutrition'
            }]);
          } else {
            const placeholderMemberId = members[0]?.id || 1;
            await supabase.from('payments').insert([{
              member_id: placeholderMemberId,
              amount: singleForm.price,
              payment_type: 'visit',
              discount_type: 'none',
              discount_amount: 0,
              received_by: currentRole,
              payment_date: new Date().toISOString(),
              expiry_date: null,
              notes: encryptData(`[VENTA_SCOOP_GUEST_${singleForm.type.toUpperCase()}] Porción vendida a Cliente General (${confirmDetail})`),
              category: 'nutrition'
            }]);
          }

          // 2. Deduct from bag stock
          if (singleForm.type === 'protein') {
            await deductPortionFromBag(chosenPBagId);
          } else if (singleForm.type === 'creatine') {
            await deductPortionFromBag(chosenCBagId);
          } else if (singleForm.type === 'combo') {
            await deductComboPortions(chosenPBagId, chosenCBagId);
          }

          addToast('Venta de porción registrada correctamente. Porciones descontadas.');
          await onRefresh();
        } catch (err: any) {
          addToast(`Error al procesar venta: ${err.message || err}`, 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  // Perform daily check-in (Monday to Friday only)
  const handleDailyCheckIn = async (mItem: typeof supplementMembers[0]) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Check if weekday
    const dayOfWeek = new Date().getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    if (!isWeekday) {
      addToast('⚠️ De acuerdo a las políticas definidas, estas membresías solo van de Lunes a Viernes.', 'error');
      return;
    }

    if (mItem.metadata.consumptions.includes(todayStr)) {
      addToast('Este alumno ya recibió su porción diaria el día de hoy', 'info');
      return;
    }

    // Resolve which bag(s) to deduct
    const chosenPBagId = selectedBagsForMembers[mItem.member.id]?.protein || openProteinBags[0]?.id;
    const chosenCBagId = selectedBagsForMembers[mItem.member.id]?.creatine || openCreatineBags[0]?.id;

    if ((mItem.metadata.type === 'protein' || mItem.metadata.type === 'combo') && !chosenPBagId) {
      addToast('No hay ninguna bolsa de proteínas abierta con porciones restantes en este momento', 'error');
      return;
    }
    if ((mItem.metadata.type === 'creatine' || mItem.metadata.type === 'combo') && !chosenCBagId) {
      addToast('No hay ninguna bolsa de creatina abierta con porciones restantes en este momento', 'error');
      return;
    }

    const pFlavor = flavorBags.find(b => b.id === chosenPBagId)?.flavor || '';
    const cFlavor = flavorBags.find(b => b.id === chosenCBagId)?.flavor || '';
    let confirmDetail = '';
    if (mItem.metadata.type === 'protein') confirmDetail = `sabor "${pFlavor}"`;
    else if (mItem.metadata.type === 'creatine') confirmDetail = `sabor "${cFlavor}"`;
    else confirmDetail = `Proteína "${pFlavor}" + Creatina "${cFlavor}"`;

    confirmAction(
      '¿Entregar Porción de Hoy?',
      `¿Registrar la entrega del scoop de suplemento diario (${confirmDetail}) para ${mItem.member.name}? Se descontará de la bolsa activa.`,
      async () => {
        setIsSubmitting(true);
        try {
          const nextConsumptions = [...mItem.metadata.consumptions, todayStr];
          const rawNotes = getRawNotes(mItem.member.internal_notes || null);
          const updatedMeta: SupplementMetadata = {
            ...mItem.metadata,
            consumptions: nextConsumptions
          };

          const encryptedNotes = formatSupplementMetadata(rawNotes, updatedMeta);

          // Update member in Supabase
          const { error } = await supabase
            .from('members')
            .update({ internal_notes: encryptedNotes })
            .eq('id', mItem.member.id);

          if (error) throw error;

          // Deduct from flavor bag(s)
          if (mItem.metadata.type === 'protein') {
            await deductPortionFromBag(chosenPBagId!);
          } else if (mItem.metadata.type === 'creatine') {
            await deductPortionFromBag(chosenCBagId!);
          } else if (mItem.metadata.type === 'combo') {
            await deductComboPortions(chosenPBagId!, chosenCBagId!);
          }

          addToast(`¡Scoop registrado para ${mItem.member.name}! Disfruta tu licuado.`);
          await onRefresh();
        } catch (err: any) {
          addToast(`Error al registrar consumo: ${err.message || err}`, 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  // Undo last check-in if made in error
  const handleUndoCheckIn = async (mItem: typeof supplementMembers[0]) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (!mItem.metadata.consumptions.includes(todayStr)) return;

    confirmAction(
      '¿Revertir Entrega de Hoy?',
      `¿Deseas cancelar la entrega de suplemento de hoy de ${mItem.member.name} y devolver la porción al stock de la bolsa abierta?`,
      async () => {
        setIsSubmitting(true);
        try {
          const nextConsumptions = mItem.metadata.consumptions.filter(c => c !== todayStr);
          const rawNotes = getRawNotes(mItem.member.internal_notes || null);
          const updatedMeta: SupplementMetadata = {
            ...mItem.metadata,
            consumptions: nextConsumptions
          };

          const encryptedNotes = formatSupplementMetadata(rawNotes, updatedMeta);

          const { error } = await supabase
            .from('members')
            .update({ internal_notes: encryptedNotes })
            .eq('id', mItem.member.id);

          if (error) throw error;

          // Refund scoop to selected/default flavor bag
          const nextBags = [...flavorBags];
          if (mItem.metadata.type === 'protein' || mItem.metadata.type === 'combo') {
            const pBagId = selectedBagsForMembers[mItem.member.id]?.protein || getDefaultBagId('protein');
            const target = nextBags.find(b => b.id === pBagId);
            if (target) {
              target.servingsLeft = Math.min(target.totalServings, target.servingsLeft + 1);
              target.totalConsumed = Math.max(0, target.totalConsumed - 1);
            }
          }
          if (mItem.metadata.type === 'creatine' || mItem.metadata.type === 'combo') {
            const cBagId = selectedBagsForMembers[mItem.member.id]?.creatine || getDefaultBagId('creatine');
            const target = nextBags.find(b => b.id === cBagId);
            if (target) {
              target.servingsLeft = Math.min(target.totalServings, target.servingsLeft + 1);
              target.totalConsumed = Math.max(0, target.totalConsumed - 1);
            }
          }
          saveFlavorBags(nextBags);

          addToast('Entrega revertida y porción devuelta al stock de la bolsa.');
          await onRefresh();
        } catch (err: any) {
          addToast(`Error: ${err.message || err}`, 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  const handleCancelSupplementMembership = async (mItem: typeof supplementMembers[0]) => {
    confirmAction(
      '¿Eliminar Membresía de Suplementos?',
      `¿Deseas desvincular por completo la membresía de suplementos de ${mItem.member.name}? Las notas del alumno se conservarán, pero no podrá reclamar consumos diarios.`,
      async () => {
        setIsSubmitting(true);
        try {
          const rawNotes = getRawNotes(mItem.member.internal_notes || null);
          const { error } = await supabase
            .from('members')
            .update({ internal_notes: rawNotes }) // wipes the JSON block
            .eq('id', mItem.member.id);

          if (error) throw error;

          addToast(`Membresía de suplemento desvinculada para ${mItem.member.name}`);
          await onRefresh();
        } catch (err: any) {
          addToast(`Error: ${err.message || err}`, 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  // Filter list by search query
  const filteredSuppList = useMemo(() => {
    return supplementMembers.filter(item => 
      item.member.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [supplementMembers, searchQuery]);

  // Settings forms
  const [editedSettings, setEditedSettings] = useState({ ...settings });
  const [showConfigCard, setShowConfigCard] = useState(false);

  useEffect(() => {
    setEditedSettings({ ...settings });
  }, [settings]);

  // Manage flavor bags forms & actions
  const [editingBagId, setEditingBagId] = useState<string | null>(null);
  const [editingBagState, setEditingBagState] = useState<{
    flavor: string;
    servingsLeft: number;
    totalServings: number;
    isOpened: boolean;
  } | null>(null);

  const [newBagState, setNewBagState] = useState({
    type: 'protein' as 'protein' | 'creatine',
    flavor: '',
    totalServings: 30,
    isOpened: true
  });
  const [showAddBagForm, setShowAddBagForm] = useState(false);

  const handleCreateBag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBagState.flavor.trim()) {
      addToast('Por favor escribe el sabor de la bolsa', 'error');
      return;
    }
    const newBag: FlavorBag = {
      id: `bag_${Date.now()}`,
      type: newBagState.type,
      flavor: newBagState.flavor.trim(),
      servingsLeft: newBagState.totalServings,
      totalServings: newBagState.totalServings,
      totalConsumed: 0,
      isOpened: newBagState.isOpened,
      createdAt: new Date().toISOString()
    };
    saveFlavorBags([...flavorBags, newBag]);
    setNewBagState({ type: 'protein', flavor: '', totalServings: 30, isOpened: true });
    setShowAddBagForm(false);
    addToast(`Bolsa de ${newBagState.type === 'protein' ? 'Proteína' : 'Creatina'} sabor "${newBag.flavor}" creada y lista.`);
  };

  const handleUpdateBag = (bagId: string) => {
    if (!editingBagState) return;
    const nextBags = flavorBags.map(b => {
      if (b.id === bagId) {
        return {
          ...b,
          flavor: editingBagState.flavor.trim() || b.flavor,
          servingsLeft: Math.min(editingBagState.totalServings, Math.max(0, editingBagState.servingsLeft)),
          totalServings: Math.max(1, editingBagState.totalServings),
          isOpened: editingBagState.isOpened
        };
      }
      return b;
    });
    saveFlavorBags(nextBags);
    setEditingBagId(null);
    setEditingBagState(null);
    addToast('Bolsa de sabor actualizada correctamente.');
  };

  const handleDeleteBag = (bagId: string) => {
    const target = flavorBags.find(b => b.id === bagId);
    if (!target) return;
    confirmAction(
      '¿Eliminar Bolsa de Sabor?',
      `¿Deseas eliminar permanentemente la bolsa de ${target.type === 'protein' ? 'Proteína' : 'Creatina'} sabor "${target.flavor}"? Se perderán las porciones registradas de esta bolsa.`,
      () => {
        saveFlavorBags(flavorBags.filter(b => b.id !== bagId));
        addToast('Bolsa eliminada correctamente.', 'info');
      }
    );
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().getDay();
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Dynamic Header */}
      <div className="bg-gradient-to-br from-indigo-700 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-900/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32 blur-3xl animate-pulse" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-white/10 rounded-2xl border border-white/10 text-emerald-400">
                <Sparkles size={28} />
              </span>
              <div>
                <h3 className="text-3xl font-black tracking-tight leading-tight flex items-center gap-2">
                  Bar de Proteínas y Creatinas
                </h3>
                <p className="text-indigo-100/75 text-sm font-medium">
                  Gestión integral de bolsas en stock, ventas individuales de scoop y membresías de consumo diario.
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setSubTab('consumption')}
              className={`px-5 py-3 rounded-2xl font-bold text-sm transition-all ${subTab === 'consumption' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            >
              Control de Consumos
            </button>
            <button 
              onClick={() => setSubTab('management')}
              className={`px-5 py-3 rounded-2xl font-bold text-sm transition-all ${subTab === 'management' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/10 hover:bg-white/20 text-white'}`}
            >
              Ventas y Membresías
            </button>
          </div>
        </div>
      </div>

      {/* Database Warning indicator if bag items are missing */}
      {(!proteinItem || !creatineItem) && (
        <div className="p-5 bg-amber-50 border border-amber-100 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex gap-3">
            <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-bold text-amber-900 text-sm">¿Deseas sincronizar las bolsas con inventario real?</h4>
              <p className="text-xs text-amber-700 mt-1">
                La base de datos de Supabase no tiene productos con nombre exacto &quot;Bolsa de Proteína&quot; o &quot;Bolsa de Creatina&quot;. Inicialízalas con 1 clic para tener stock durable en la nube.
              </p>
            </div>
          </div>
          <button
            onClick={handleInitializeBagsInDatabase}
            className="px-4 py-2 bg-amber-600 text-white font-bold text-xs rounded-xl hover:bg-amber-700 transition"
          >
            Sincronizar Supabase
          </button>
        </div>
      )}

      {/* Tab content 1: Consumption check-in and active portions */}
      {subTab === 'consumption' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Main List Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                    <Users size={20} className="text-indigo-600" />
                    Socios con Membresía de Suplementos
                  </h4>
                  <p className="text-xs text-slate-400">Total de alumnos inscritos en porción diaria</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar alumno..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Socio</th>
                      <th className="px-6 py-4 font-semibold">Suplemento</th>
                      <th className="px-6 py-4 font-semibold">Vencimiento</th>
                      <th className="px-6 py-4 font-semibold text-center">Consumo de hoy</th>
                      <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredSuppList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                          {searchQuery ? 'No se encontraron alumnos con ese nombre' : 'No hay membresías de suplementos activas.'}
                        </td>
                      </tr>
                    ) : (
                      filteredSuppList.map(item => {
                        const hasClaimedToday = item.metadata.consumptions.includes(todayStr);
                        
                        return (
                          <tr key={item.member.id} className="hover:bg-slate-50/50 transition-all">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900">{item.member.name}</div>
                              <div className="text-xs text-slate-400 font-mono">{item.member.phone || 'S/N Teléfono'}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider block w-fit ${
                                item.metadata.type === 'protein' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                item.metadata.type === 'creatine' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                'bg-indigo-50 text-indigo-600 border border-indigo-100'
                              }`}>
                                {item.metadata.type === 'protein' ? '🥤 Proteína' : 
                                 item.metadata.type === 'creatine' ? '⚡ Creatina' : '🥛 Combo Ambas'}
                              </span>

                              {/* Flavor Selector Selection Block */}
                              {!hasClaimedToday && !item.isExpired && (
                                <div className="mt-2 space-y-1.5 bg-slate-50/70 p-1.5 rounded-lg border border-slate-100 max-w-[155px]">
                                  {(item.metadata.type === 'protein' || item.metadata.type === 'combo') && (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Sabor Prot:</span>
                                      {openProteinBags.length > 0 ? (
                                        <select
                                          className="text-[10px] font-bold p-0.5 w-full bg-white border border-slate-200 rounded text-slate-700"
                                          value={selectedBagsForMembers[item.member.id]?.protein || openProteinBags[0]?.id || ''}
                                          onChange={e => setSelectedBagsForMembers(prev => ({
                                            ...prev,
                                            [item.member.id]: { ...prev[item.member.id], protein: e.target.value }
                                          }))}
                                        >
                                          {openProteinBags.map(b => (
                                            <option key={b.id} value={b.id}>{b.flavor} ({b.servingsLeft} scps)</option>
                                          ))}
                                        </select>
                                      ) : (
                                        <span className="text-[10px] text-rose-500 font-bold block">⚠️ Sin bolsa abierta</span>
                                      )}
                                    </div>
                                  )}

                                  {(item.metadata.type === 'creatine' || item.metadata.type === 'combo') && (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Sabor Crea:</span>
                                      {openCreatineBags.length > 0 ? (
                                        <select
                                          className="text-[10px] font-bold p-0.5 w-full bg-white border border-slate-200 rounded text-slate-700"
                                          value={selectedBagsForMembers[item.member.id]?.creatine || openCreatineBags[0]?.id || ''}
                                          onChange={e => setSelectedBagsForMembers(prev => ({
                                            ...prev,
                                            [item.member.id]: { ...prev[item.member.id], creatine: e.target.value }
                                          }))}
                                        >
                                          {openCreatineBags.map(b => (
                                            <option key={b.id} value={b.id}>{b.flavor} ({b.servingsLeft} scps)</option>
                                          ))}
                                        </select>
                                      ) : (
                                        <span className="text-[10px] text-rose-500 font-bold block">⚠️ Sin bolsa abierta</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className={`text-sm font-bold ${item.isExpired ? 'text-rose-500' : 'text-slate-600'}`}>
                                {item.metadata.expiry_date}
                              </div>
                              <div className="text-[10px] font-medium text-slate-400">
                                {item.isExpired ? (
                                  <span className="text-rose-600 font-bold">VENCIDO Hace poco</span>
                                ) : (
                                  <span>Quedan {item.daysRemaining} días</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {hasClaimedToday ? (
                                <div className="inline-flex flex-col items-center justify-center animate-in zoom-in-75 duration-200">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg border border-emerald-100">
                                    <CheckCircle2 size={14} /> Recibido
                                  </span>
                                  <button
                                    onClick={() => handleUndoCheckIn(item)}
                                    className="text-[9px] hover:underline text-rose-500 font-bold mt-1.5 uppercase tracking-wider flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Undo size={10} /> Deshacer
                                  </button>
                                </div>
                              ) : (
                                <button
                                  disabled={item.isExpired || !isWeekday || isSubmitting}
                                  onClick={() => handleDailyCheckIn(item)}
                                  className={`px-4 py-2 font-black text-xs rounded-xl transition shadow-sm ${
                                    item.isExpired 
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                                      : !isWeekday 
                                      ? 'bg-slate-50 text-slate-500 cursor-not-allowed border border-slate-200'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-[1.03] active:scale-[0.98]'
                                  }`}
                                >
                                  {!isWeekday ? 'Fin de Semana' : 'Entregar Scoop'}
                                </button>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleCancelSupplementMembership(item)}
                                className="p-2 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-xl transition"
                                title="Eliminar membresía de suplementos"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Weekday Policy Banner */}
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl flex items-start gap-4">
              <Clock size={20} className="text-slate-500 mt-0.5 shrink-0" />
              <div>
                <h5 className="font-bold text-slate-700 text-sm">Políticas del Bar de Suplementos</h5>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Las membresías de suplementos están diseñadas para el consumo regular de lunes a viernes (1 porción por día). El sistema bloqueará los registros los sábados y domingos para concordar con la regla de &quot;lunes a viernes&quot; del club deportivo. Cada entrega descuenta automáticamente el stock de la bolsa abierta.
                </p>
              </div>
            </div>
                    {/* Portions in Open Bags Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-base leading-tight">Inventario de Sabores</h4>
                  <p className="text-xs text-slate-400 mt-1">Bolsas abiertas y scoops por bolsa editables</p>
                </div>
                <button
                  onClick={() => setShowAddBagForm(!showAddBagForm)}
                  className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} /> Nueva Bolsa
                </button>
              </div>

              {/* Add Sabor Bag Form inline block */}
              {showAddBagForm && (
                <form onSubmit={handleCreateBag} className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-3.5 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-extrabold text-slate-600 uppercase tracking-widest">Nueva Bolsa de Sabor</span>
                    <button 
                      type="button" 
                      onClick={() => setShowAddBagForm(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      Cerrar
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Tipo</label>
                      <select
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        value={newBagState.type}
                        onChange={e => setNewBagState({ ...newBagState, type: e.target.value as any })}
                      >
                        <option value="protein font-semibold">Proteína 🥤</option>
                        <option value="creatine font-semibold">Creatina ⚡</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Scoops Totales</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                        value={newBagState.totalServings}
                        onChange={e => setNewBagState({ ...newBagState, totalServings: Math.max(1, parseInt(e.target.value) || 30) })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Sabor / Notas</label>
                    <input
                      type="text"
                      placeholder="Ej: Chocolate Suizo, Fresa, etc."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold placeholder:text-slate-300 text-slate-700"
                      value={newBagState.flavor}
                      onChange={e => setNewBagState({ ...newBagState, flavor: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isOpenedCheckbox"
                      className="rounded text-indigo-600 border-slate-300"
                      checked={newBagState.isOpened}
                      onChange={e => setNewBagState({ ...newBagState, isOpened: e.target.checked })}
                    />
                    <label htmlFor="isOpenedCheckbox" className="text-xs text-slate-600 font-medium">Empieza Abierta (Activa)</label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition"
                  >
                    Guardar Nueva Bolsa
                  </button>
                </form>
              )}

              {/* Render of flavorBags list */}
              <div className="space-y-4">
                {flavorBags.map(bag => {
                  const isEditing = editingBagId === bag.id;
                  const pct = Math.min(100, Math.max(0, (bag.servingsLeft / bag.totalServings) * 100));
                  
                  return (
                    <div key={bag.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3.5 transition">
                      {isEditing && editingBagState ? (
                        <div className="space-y-3 animate-in fade-in duration-200">
                          <span className="text-[10px] font-black uppercase text-indigo-600">Ajustar Atributos</span>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Scoops Actuales</label>
                              <input
                                type="number"
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                                value={editingBagState.servingsLeft}
                                onChange={e => setEditingBagState({ ...editingBagState, servingsLeft: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Scoops por Bolsa (Capacidad)</label>
                              <input
                                type="number"
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                                value={editingBagState.totalServings}
                                onChange={e => setEditingBagState({ ...editingBagState, totalServings: parseInt(e.target.value) || 30 })}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Nombre Sabor</label>
                            <input
                              type="text"
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold"
                              value={editingBagState.flavor}
                              onChange={e => setEditingBagState({ ...editingBagState, flavor: e.target.value })}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`isOpenedEdit_${bag.id}`}
                              className="rounded text-indigo-600 border-slate-300"
                              checked={editingBagState.isOpened}
                              onChange={e => setEditingBagState({ ...editingBagState, isOpened: e.target.checked })}
                            />
                            <label htmlFor={`isOpenedEdit_${bag.id}`} className="text-xs text-slate-600 font-bold">Activa (Disponible para entrega)</label>
                          </div>

                          <div className="flex gap-2.5 pt-1.5 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBagId(null);
                                setEditingBagState(null);
                              }}
                              className="flex-1 py-1.5 text-xs text-slate-500 bg-white border border-slate-200 rounded font-semibold"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateBag(bag.id)}
                              className="flex-1 py-1.5 text-xs bg-indigo-600 text-white rounded font-bold"
                            >
                              Guardar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`w-2.5 h-2.5 rounded-full ${bag.type === 'protein' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                <span className="text-xs font-extrabold text-slate-700">
                                  {bag.type === 'protein' ? 'Proteína 🥤' : 'Creatina ⚡'}
                                </span>
                              </div>
                              <span className="text-sm font-bold text-slate-800 ml-4 inline-block">{bag.flavor}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${bag.isOpened ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-450'}`}>
                                {bag.isOpened ? 'Abierta' : 'Cerrada'}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingBagId(bag.id);
                                  setEditingBagState({
                                    flavor: bag.flavor,
                                    servingsLeft: bag.servingsLeft,
                                    totalServings: bag.totalServings,
                                    isOpened: bag.isOpened
                                  });
                                }}
                                className="p-1 hover:bg-slate-200 text-slate-500 rounded transition cursor-pointer"
                                title="Editar"
                              >
                                <Settings size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteBag(bag.id)}
                                className="p-1 hover:bg-rose-100 text-rose-500 rounded transition cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Progress slider indicators */}
                          <div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                              <div
                                className={`${bag.type === 'protein' ? 'bg-emerald-500' : 'bg-blue-500'} h-full transition-all duration-300`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-450 font-bold mt-1">
                              <span>{bag.servingsLeft} de {bag.totalServings} scoops cap.</span>
                              <span>Consumidos: {bag.totalConsumed}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {flavorBags.length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400 font-bold">
                    No has agregado ninguna bolsa saborizada. Haz clic en &quot;Nueva Bolsa&quot; arriba.
                  </div>
                )}
              </div>
            </div>

            {/* Warehouse Stock Status */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h4 className="font-extrabold text-slate-800 text-md flex items-center gap-2">
                <Database size={18} className="text-slate-500" /> Stock Certificado en Almacén
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Bolsas de Proteína</span>
                    <span className="text-[10px] text-slate-400">En bodega general</span>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-sm font-black ${proteinItem && proteinItem.stock > 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                    {proteinItem ? `${proteinItem.stock} bolsas` : '0 bolsas'}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Bolsas de Creatina</span>
                    <span className="text-[10px] text-slate-400">En bodega general</span>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-sm font-black ${creatineItem && creatineItem.stock > 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                    {creatineItem ? `${creatineItem.stock} bolsas` : '0 bolsas'}
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 leading-relaxed italic block pt-1">
                📌 Para agregar bolsas al inventario o modificar su costo, ve a la sección de <strong className="text-slate-600 underline">Inventario</strong> o a la pestaña de &quot;Configuración de Precios&quot;.
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Tab content 2: Register & Pricing Configurations */}
      {subTab === 'management' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column Forms Container */}
          <div className="space-y-8">
            
            {/* Form: Register a Monthly Supplementary Membership */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <div>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-black uppercase tracking-widest rounded-lg">Membresía Mensual</span>
                <h4 className="font-extrabold text-slate-800 text-xl mt-3 flex items-center gap-2">
                  Asignar Membresía Mensual
                </h4>
                <p className="text-xs text-slate-400 mt-1">Vincula un socio de Kinetix al consumo de licuados/scoops diarios de lunes a viernes.</p>
              </div>

              <form onSubmit={handleRegisterMembership} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Seleccionar Socio Kinetix</label>
                  <select 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold"
                    value={membershipForm.member_id}
                    onChange={e => setMembershipForm({...membershipForm, member_id: e.target.value})}
                  >
                    <option value="">-- Elige un Alumno --</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Esquema Suplementos</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold"
                      value={membershipForm.type}
                      onChange={e => setMembershipForm({...membershipForm, type: e.target.value as any})}
                    >
                      <option value="protein">Sólo Proteína (${settings.proteinMonthlyPrice}/mes)</option>
                      <option value="creatine">Sólo Creatina (${settings.creatineMonthlyPrice}/mes)</option>
                      <option value="combo">Combo Ambas (${settings.comboMonthlyPrice}/mes)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Costo Editable ($)</label>
                    <input 
                      required
                      type="number" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-sm font-black"
                      value={membershipForm.amount}
                      onChange={e => setMembershipForm({...membershipForm, amount: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha de Inicio</label>
                    <input 
                      required
                      type="date" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold"
                      value={membershipForm.start_date}
                      onChange={e => setMembershipForm({...membershipForm, start_date: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha de Fin</label>
                    <input 
                      required
                      type="date" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold"
                      value={membershipForm.expiry_date}
                      onChange={e => setMembershipForm({...membershipForm, expiry_date: e.target.value})}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-indigo-600/10 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <ArrowRight size={18} /> Registrar Membresía y Pago
                </button>
              </form>
            </div>

            {/* Form: Register a Single Scoop Serving Sale */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase tracking-widest rounded-lg">Venta Rápida</span>
                <h4 className="font-extrabold text-slate-800 text-xl mt-3 flex items-center gap-2">
                  Cobrar Scoop Individual
                </h4>
                <p className="text-xs text-slate-400 mt-1">Registra la venta rápida de un licuado o scoop de proteína/creatina al momento.</p>
              </div>

              <form onSubmit={handleRegisterSingleSale} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Socio (Opcional)</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold"
                      value={singleForm.member_id}
                      onChange={e => setSingleForm({...singleForm, member_id: e.target.value})}
                    >
                      <option value="non_member">Cliente General / Huésped</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Porción</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold"
                      value={singleForm.type}
                      onChange={e => setSingleForm({...singleForm, type: e.target.value as any})}
                    >
                      <option value="protein">Scoop Proteína (${settings.proteinSinglePrice})</option>
                      <option value="creatine">Scoop Creatina (${settings.creatineSinglePrice})</option>
                      <option value="combo">Combo Ambas (${settings.comboSinglePrice})</option>
                    </select>
                  </div>
                </div>

                {/* Sabor select fields for Quick Sale */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(singleForm.type === 'protein' || singleForm.type === 'combo') && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Caja Sabor Proteína</label>
                      {openProteinBags.length > 0 ? (
                        <select
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold text-slate-700"
                          value={singleSaleFlavors.proteinBagId}
                          onChange={e => setSingleSaleFlavors(prev => ({ ...prev, proteinBagId: e.target.value }))}
                        >
                          {openProteinBags.map(b => (
                            <option key={b.id} value={b.id}>{b.flavor} ({b.servingsLeft} scoops)</option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-3 text-xs bg-rose-50 text-rose-600 rounded-xl border border-rose-100 font-bold">
                          ⚠️ Sin bolsas de proteína activas
                        </div>
                      )}
                    </div>
                  )}

                  {(singleForm.type === 'creatine' || singleForm.type === 'combo') && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Caja Sabor Creatina</label>
                      {openCreatineBags.length > 0 ? (
                        <select
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold text-slate-700"
                          value={singleSaleFlavors.creatineBagId}
                          onChange={e => setSingleSaleFlavors(prev => ({ ...prev, creatineBagId: e.target.value }))}
                        >
                          {openCreatineBags.map(b => (
                            <option key={b.id} value={b.id}>{b.flavor} ({b.servingsLeft} scoops)</option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-3 text-xs bg-rose-50 text-rose-600 rounded-xl border border-rose-100 font-bold">
                          ⚠️ Sin bolsas de creatina activas
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <span className="text-xs font-bold text-emerald-800">Monto total a cobrar en caja</span>
                  <span className="text-lg font-black text-emerald-950 font-mono">${singleForm.price}</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-emerald-600/10 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={18} /> Procesar Venta Scoop
                </button>
              </form>
            </div>

          </div>

          {/* Right Column: Pricing Configuration Card */}
          <div className="space-y-8">
            
            {/* Supplement Pricing Management Settings Panel */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                    <Settings className="text-slate-500" size={20} /> Configurador de Costos
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Controla las tarifas oficiales para licuados y membresías mensuales.</p>
                </div>
                <button
                  onClick={() => setShowConfigCard(!showConfigCard)}
                  className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-250 text-slate-600 font-bold text-xs rounded-xl transition flex items-center gap-1"
                >
                  {showConfigCard ? 'Ver Tarifario' : 'Editar Precios'}
                </button>
              </div>

              {!showConfigCard ? (
                <div className="space-y-4">
                  
                  {/* Monthly Pricing Catalog */}
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl space-y-3">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tarifas Mensuales (de Lunes a Viernes)</span>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-500">Membresía Mensual Proteína</span>
                      <strong className="text-slate-900 font-mono text-sm">${settings.proteinMonthlyPrice} / mes</strong>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-500">Membresía Mensual Creatina</span>
                      <strong className="text-slate-900 font-mono text-sm">${settings.creatineMonthlyPrice} / mes</strong>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-500">Membresía Combo Ambas</span>
                      <strong className="text-slate-900 font-mono text-sm">${settings.comboMonthlyPrice} / mes</strong>
                    </div>
                  </div>

                  {/* Individual Scoop Catalog */}
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl space-y-3">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Porciones Individuales (Vasos del Día)</span>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-500">Scoop Proteína individual</span>
                      <strong className="text-slate-900 font-mono text-sm">${settings.proteinSinglePrice}</strong>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-500">Scoop Creatina individual</span>
                      <strong className="text-slate-900 font-mono text-sm">${settings.creatineSinglePrice}</strong>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-500">Scoop Combo Ambas juntas</span>
                      <strong className="text-slate-900 font-mono text-sm">${settings.comboSinglePrice}</strong>
                    </div>
                  </div>

                  {/* Bags settings */}
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl space-y-3">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Capacidad de las Bolsas</span>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-500">Servicios por Bolsa Proteína</span>
                      <strong className="text-slate-900 font-mono text-sm">{settings.servingsPerProteinBag} scoops</strong>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-500">Servicios por Bolsa Creatina</span>
                      <strong className="text-slate-900 font-mono text-sm">{settings.servingsPerCreatineBag} scoops</strong>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="space-y-4 p-5 bg-slate-50 border border-slate-100 rounded-3xl animate-in fade-in duration-200">
                  <h5 className="font-black text-xs uppercase text-slate-400 tracking-wider mb-4">Editar Catálogo de Costos</h5>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Membresía Proteína ($)</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-sm"
                        value={editedSettings.proteinMonthlyPrice}
                        onChange={e => setEditedSettings({...editedSettings, proteinMonthlyPrice: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Membresía Creatina ($)</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-sm"
                        value={editedSettings.creatineMonthlyPrice}
                        onChange={e => setEditedSettings({...editedSettings, creatineMonthlyPrice: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Membresía Combo Ambas ($)</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-sm"
                        value={editedSettings.comboMonthlyPrice}
                        onChange={e => setEditedSettings({...editedSettings, comboMonthlyPrice: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Venta Scoop Prot ($)</label>
                      <input 
                        type="number" 
                        className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl font-mono text-sm"
                        value={editedSettings.proteinSinglePrice}
                        onChange={e => setEditedSettings({...editedSettings, proteinSinglePrice: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Venta Scoop Crea ($)</label>
                      <input 
                        type="number" 
                        className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl font-mono text-sm"
                        value={editedSettings.creatineSinglePrice}
                        onChange={e => setEditedSettings({...editedSettings, creatineSinglePrice: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Scoops Combo Ambas ($)</label>
                      <input 
                        type="number" 
                        className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl font-mono text-sm"
                        value={editedSettings.comboSinglePrice}
                        onChange={e => setEditedSettings({...editedSettings, comboSinglePrice: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Porciones x Bolsa Proteína</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-sm"
                        value={editedSettings.servingsPerProteinBag}
                        onChange={e => setEditedSettings({...editedSettings, servingsPerProteinBag: parseInt(e.target.value) || 30})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Porciones x Bolsa Creatina</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-sm"
                        value={editedSettings.servingsPerCreatineBag}
                        onChange={e => setEditedSettings({...editedSettings, servingsPerCreatineBag: parseInt(e.target.value) || 30})}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button 
                      onClick={() => setShowConfigCard(false)}
                      className="flex-1 py-2.5 text-xs border border-slate-250 bg-white font-bold rounded-xl text-slate-600"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={() => {
                        saveSettings(editedSettings);
                        setShowConfigCard(false);
                      }}
                      className="flex-1 py-2.5 text-xs bg-emerald-600 text-white font-bold rounded-xl"
                    >
                      Guardar Precios
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Income Recap banner */}
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-6 rounded-3xl border border-emerald-500/20 text-emerald-950">
              <h5 className="font-extrabold text-sm flex items-center gap-1.5"><TrendingUp size={16} className="text-emerald-600" /> Historial de Caja & Contabilidad</h5>
              <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                Cada vez que activas una membresía mensual o cobras porciones de scoops, se ingresa la transacción automáticamente bajo la categoría <strong className="text-emerald-700">Nutrición</strong>. Esto garantiza que todos tus cobros se incorporen en las estadísticas anuales de tus Reportes Financieros en Kinetix.
              </p>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
