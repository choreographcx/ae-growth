import React from 'react';
import sarIcon from '@/assets/currency/sar.svg';
import aedIcon from '@/assets/currency/aed.svg';

export function CurrencySymbol({ currency, size = 12, className = '' }: { currency: string; size?: number; className?: string }) {
  // For SAR/AED SVG icons, apply a green filter when className contains a green/emerald color class
  const needsGreenFilter = className.includes('text-emerald') || className.includes('text-green');
  const imgStyle = needsGreenFilter
    ? { filter: 'invert(39%) sepia(80%) saturate(600%) hue-rotate(120deg) brightness(90%) contrast(90%)' }
    : undefined;

  if (currency === 'SAR') return <img src={sarIcon} alt="SAR" width={size} height={size} className={`inline-block align-baseline ${className}`} style={imgStyle} />;
  if (currency === 'AED') return <img src={aedIcon} alt="AED" width={size} height={size} className={`inline-block align-baseline ${className}`} style={imgStyle} />;
  return <span className={className}>$</span>;
}

export function formatCurrency(amount: number, currency: string): string {
  return amount.toLocaleString();
}

/** Returns a short text prefix for use in chart axes/tooltips where React components can't be used */
export function getCurrencyPrefix(currency: string): string {
  if (currency === 'SAR') return 'SAR ';
  if (currency === 'AED') return 'AED ';
  return '$';
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

/**
 * Process an array of KPIGroupData, replacing all "$" prefixed formattedValues
 * (in both primary and supporting) with the correct CurrencySymbol.
 */
export function applyCurrencyToKPIGroups(groups: import('@/types/dashboard').KPIGroupData[], currency: string): import('@/types/dashboard').KPIGroupData[] {
  return groups.map(g => ({
    ...g,
    primary: {
      ...g.primary,
      formattedValue: replaceDollarWithSymbol(g.primary.formattedValue, currency, 18),
    },
    supporting: g.supporting.map(s => ({
      ...s,
      formattedValue: replaceDollarWithSymbol(s.formattedValue, currency),
    })),
  }));
}
