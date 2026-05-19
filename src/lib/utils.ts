export const isExpired = (dateStr: string | null) => {
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

export const getStatusColor = (expiry: string | null) => {
  if (!expiry) return 'bg-gray-100 text-gray-500';
  if (isExpired(expiry)) return 'bg-red-100 text-red-600';
  return 'bg-green-100 text-green-600';
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};
