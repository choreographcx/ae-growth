import sarIcon from '@/assets/currency/sar.svg';
import aedIcon from '@/assets/currency/aed.svg';

export function CurrencySymbol({ currency, size = 12, className = '' }: { currency: string; size?: number; className?: string }) {
  if (currency === 'SAR') return <img src={sarIcon} alt="SAR" width={size} height={size} className={`inline-block align-baseline ${className}`} />;
  if (currency === 'AED') return <img src={aedIcon} alt="AED" width={size} height={size} className={`inline-block align-baseline ${className}`} />;
  return <span className={className}>$</span>;
}

export function formatCurrency(amount: number, currency: string): string {
  // For rendering with the icon component, we just format the number
  return amount.toLocaleString();
}
