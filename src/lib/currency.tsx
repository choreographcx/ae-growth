import React from 'react';
import aedIcon from '@/assets/currency/aed.svg';
import { DirhamSymbol } from 'dirham/react';
import { SaudiRiyal } from 'saudi-riyal/react';

export function CurrencySymbol({ currency, size, className = '' }: { currency: string; size?: number; className?: string }) {
  if (currency === 'SAR') return <SaudiRiyal className={className} style={{ fontSize: size ? `${size}px` : '1em', display: 'inline', verticalAlign: 'baseline' }} />;
  if (currency === 'AED') return <DirhamSymbol size={size ?? '1em'} color="currentColor" className={className} style={{ display: 'inline-block', verticalAlign: 'baseline' }} />;
  return <span className={className}>$</span>;
}

export function getCurrencyIconSrc(currency: string): string | null {
  if (currency === 'SAR') return sarIcon;
  if (currency === 'AED') return aedIcon;
  return null;
}

export function formatCurrency(amount: number, currency: string): string {
  return amount.toLocaleString();
}

/** Returns a short text prefix for use in chart axes/tooltips where React components can't be used */
export function getCurrencyPrefix(currency: string): string {
  if (currency === 'SAR') return '﷼';
  if (currency === 'AED') return 'د.إ';
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
    <span className="inline-flex items-baseline">
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
