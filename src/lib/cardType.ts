/**
 * Card-type classifier for AMEX campaigns.
 *
 * Buckets every campaign into one of four product groups based on substring
 * matching against `campaign_name` (case-insensitive). The result is used both
 * as a global filter (Dashboard → Filter → Card Type) and as a breakdown
 * dimension in `PerformanceBreakdownCard`.
 *
 * Priority of rules (first match wins):
 *   1. Al Fursan Infinity   — must match BEFORE plain "Fursan" / "Platinum"
 *                             so a campaign called "Al Fursan Infinity Platinum"
 *                             is classified as Fursan Infinity.
 *   2. Platinum             — any standalone "Platinum" mention.
 *   3. Other                — known card tokens that aren't Platinum or
 *                             Al Fursan Infinity (Gold, Green, Centurion,
 *                             plain Fursan, Reserve, Cashback, Rewards, …).
 *   4. Unknown              — no card token detected.
 *
 * Rules live here in code (not in the DB) so changes are reviewable. When new
 * card products launch, add the keyword to `OTHER_TOKENS` (or a dedicated rule
 * if it deserves its own bucket).
 */

export type CardType = 'fursan_infinity' | 'platinum' | 'other' | 'unknown';

export const CARD_TYPE_ORDER: CardType[] = [
  'platinum',
  'fursan_infinity',
  'other',
  'unknown',
];

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  platinum: 'Platinum',
  fursan_infinity: 'Al Fursan Infinity',
  other: 'Other',
  unknown: 'Unknown',
};

/** Tailwind-friendly chart palette tokens (already defined in index.css). */
export const CARD_TYPE_COLORS: Record<CardType, string> = {
  platinum: 'hsl(var(--chart-1))',
  fursan_infinity: 'hsl(var(--chart-2))',
  other: 'hsl(var(--chart-3))',
  unknown: 'hsl(var(--muted-foreground))',
};

// Word-boundary helper that treats underscores, hyphens and whitespace as separators.
const WB = '(?:^|[\\s_\\-/])';
const WE = '(?:[\\s_\\-/]|$)';

const FURSAN_INFINITY_RE = new RegExp(
  `${WB}(?:al[\\s_\\-]?)?fursan[\\s_\\-]+infinity${WE}`,
  'i',
);

const PLATINUM_RE = new RegExp(`${WB}platinum${WE}`, 'i');

/**
 * Other recognised card tokens. Order doesn't matter — any match places the
 * row in the "Other" bucket. Add lower-cased tokens here as you discover them.
 */
const OTHER_TOKENS: string[] = [
  'gold',
  'green',
  'centurion',
  'reserve',
  'cashback',
  'cash back',
  'rewards',
  'fursan', // plain Al Fursan (not Infinity) — caught after the Infinity rule.
];

const OTHER_RE = new RegExp(
  `${WB}(?:${OTHER_TOKENS.map(t => t.replace(/\s+/g, '[\\s_\\-]+')).join('|')})${WE}`,
  'i',
);

export function classifyCardType(campaignName: string | null | undefined): CardType {
  if (!campaignName) return 'unknown';
  if (FURSAN_INFINITY_RE.test(campaignName)) return 'fursan_infinity';
  if (PLATINUM_RE.test(campaignName)) return 'platinum';
  if (OTHER_RE.test(campaignName)) return 'other';
  return 'unknown';
}

/** Convenience for filter-set construction. */
export const ALL_CARD_TYPES: CardType[] = [...CARD_TYPE_ORDER];
