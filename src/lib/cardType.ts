/**
 * Card-type classifier for AMEX campaigns.
 *
 * Buckets every campaign into one of four product groups based on substring
 * matching against `campaign_name` (case-insensitive). The result is used both
 * as a global filter (Dashboard → Filter → Card Type) and as a breakdown
 * dimension in `PerformanceBreakdownCard`.
 *
 * Real AMEX KSA product line (per americanexpress.com.sa):
 *   Platinum, Gold, AlFursan (co-brand), Marriott Bonvoy (co-brand),
 *   Green, Blue, Business, Centurion.
 *
 * Buckets (kept intentionally to four for dashboard simplicity):
 *   1. AlFursan  — co-brand 'AlFursan' / 'Al Fursan' / 'Al-Fursan'.
 *                  Matched FIRST so it isn't shadowed by other rules.
 *   2. Platinum  — any standalone 'Platinum' mention.
 *   3. Other     — any other recognised AMEX product token
 *                  (Gold, Green, Blue, Business, Marriott (Bonvoy), Centurion).
 *   4. Unknown   — no card token detected.
 *
 * Rules live here in code (not in the DB) so changes are reviewable. When new
 * card products launch, add the keyword to `OTHER_TOKENS` (or a dedicated rule
 * if it deserves its own bucket).
 */

export type CardType = 'alfursan' | 'platinum' | 'other' | 'unknown';

export const CARD_TYPE_ORDER: CardType[] = [
  'platinum',
  'alfursan',
  'other',
  'unknown',
];

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  platinum: 'Platinum',
  alfursan: 'AlFursan',
  other: 'Other',
  unknown: 'Unknown',
};

/** Tailwind-friendly chart palette tokens (already defined in index.css). */
export const CARD_TYPE_COLORS: Record<CardType, string> = {
  platinum: 'hsl(var(--chart-1))',
  alfursan: 'hsl(var(--chart-2))',
  other: 'hsl(var(--chart-3))',
  unknown: 'hsl(var(--muted-foreground))',
};

// Word-boundary helper that treats underscores, hyphens and whitespace as separators.
const WB = '(?:^|[\\s_\\-/])';
const WE = '(?:[\\s_\\-/]|$)';

/**
 * AlFursan co-brand. Tolerate spelling variants:
 *   'AlFursan' (canonical, one word) | 'Al Fursan' | 'Al-Fursan' | 'Al_Fursan'
 * Also still matches legacy 'Fursan Infinity' so older campaigns roll up here.
 */
const ALFURSAN_RE = new RegExp(
  `${WB}(?:al[\\s_\\-]?)?fursan${WE}`,
  'i',
);

const PLATINUM_RE = new RegExp(`${WB}platinum${WE}`, 'i');

/**
 * Other recognised AMEX product tokens. Order doesn't matter — any match places
 * the row in the "Other" bucket. Add lower-cased tokens here as new products
 * launch (or promote one to its own bucket above).
 */
const OTHER_TOKENS: string[] = [
  'gold',
  'green',
  'blue',
  'business',
  'centurion',
  'marriott',
  'bonvoy',
  'reserve',
  'cashback',
  'cash back',
  'rewards',
];

const OTHER_RE = new RegExp(
  `${WB}(?:${OTHER_TOKENS.map(t => t.replace(/\s+/g, '[\\s_\\-]+')).join('|')})${WE}`,
  'i',
);

export function classifyCardType(campaignName: string | null | undefined): CardType {
  if (!campaignName) return 'unknown';
  if (ALFURSAN_RE.test(campaignName)) return 'alfursan';
  if (PLATINUM_RE.test(campaignName)) return 'platinum';
  if (OTHER_RE.test(campaignName)) return 'other';
  return 'unknown';
}

/** Convenience for filter-set construction. */
export const ALL_CARD_TYPES: CardType[] = [...CARD_TYPE_ORDER];
