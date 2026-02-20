
export const formatHTG = (amount: number): string => {
  return new Intl.NumberFormat('fr-HT', {
    style: 'currency',
    currency: 'HTG',
    minimumFractionDigits: 2
  }).format(amount);
};

// Specialized formatter for the green display box
export const formatGourdesShort = (amount: number): string => {
  return new Intl.NumberFormat('fr-HT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' G';
};

export const COLORS = {
  primary: '#0f172a', // Slate 900
  success: '#10b981', // Emerald 500
  danger: '#ef4444',  // Red 500
  chart: ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
};
