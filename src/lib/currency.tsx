import React from 'react';
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

/**
 * Replace leading "$" in a string formattedValue with a CurrencySymbol component.
 * Returns a ReactNode (either the original string or a span with the icon).
 */
export function replaceDollarWithSymbol(formattedValue: React.ReactNode, currency: string, size = 11): React.ReactNode {
  if (typeof formattedValue !== 'string') return formattedValue;
  if (!formattedValue.startsWith('$')) return formattedValue;
  const rest = formattedValue.slice(1);
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <CurrencySymbol currency={currency} size={size} />
      {rest}
    </span>
  );
}
