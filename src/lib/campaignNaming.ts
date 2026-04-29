/**
 * Campaign naming convention parser (AMEX).
 *
 * Expected format (underscore-separated, 1-indexed positions):
 *   1: (ignored — usually the client/account prefix, e.g. "Amex")
 *   2: Campaign name           (e.g. "MGM")
 *   3: Platform                (e.g. "SC Direct")
 *   4: Market                  (e.g. "KSA")  — parsed but treated as low-priority filter
 *   5: Language                (e.g. "AR+EN")
 *   6: Objective               (e.g. "Leads")
 *   7+: free-form trailing segments (auction type, flight dates, status, etc.)
 *
 * Example:
 *   Amex_MGM_SC Direct_KSA_AR+EN_Leads__Auction_17 Feb - 9 March_Open
 *
 * Notes:
 * - "Channel" is no longer part of the naming convention but the field is kept
 *   on the parsed shape (always UNKNOWN) so existing consumers don't break.
 * - Empty segments (e.g. the "__" between Leads and Auction) are skipped, not
 *   shifted: each named field maps to a fixed index.
 */

export const UNKNOWN = 'Unknown';

export interface ParsedCampaignName {
  campaign: string;
  platform: string;
  market: string;
  language: string;
  objective: string;
  /** Kept for backwards compatibility with older consumers. Always UNKNOWN
   *  under the AMEX convention since channel is no longer encoded. */
  channel: string;
}

const empty = (): ParsedCampaignName => ({
  campaign: UNKNOWN,
  platform: UNKNOWN,
  market: UNKNOWN,
  language: UNKNOWN,
  objective: UNKNOWN,
  channel: UNKNOWN,
});

export function parseCampaignName(name: string | null | undefined): ParsedCampaignName {
  const out = empty();
  if (!name) return out;
  const parts = name.split('_').map(p => p.trim());
  // Positions are 1-indexed in the spec; arrays are 0-indexed.
  const at = (i: number) => (parts[i] && parts[i].length > 0 ? parts[i] : '');
  const campaign  = at(1); // position 2
  const platform  = at(2); // position 3
  const market    = at(3); // position 4
  const language  = at(4); // position 5
  const objective = at(5); // position 6
  if (campaign)  out.campaign  = campaign;
  if (platform)  out.platform  = platform;
  if (market)    out.market    = market;
  if (language)  out.language  = language;
  if (objective) out.objective = objective;
  return out;
}

export function getCampaignMarket(name: string | null | undefined): string | null {
  if (!name || !name.trim()) return null;
  const m = parseCampaignName(name).market;
  if (m === UNKNOWN) return m;
  return m.toUpperCase();
}
export function getCampaignObjective(name: string | null | undefined): string {
  return parseCampaignName(name).objective;
}
export function resolveCampaignObjective(
  campaignObjective: string | null | undefined,
  name: string | null | undefined,
): string {
  const normalizedObjective = campaignObjective?.trim();
  if (normalizedObjective && normalizedObjective.toLowerCase() !== UNKNOWN.toLowerCase()) {
    return normalizedObjective;
  }
  return getCampaignObjective(name);
}
export function getCampaignChannel(name: string | null | undefined): string {
  return parseCampaignName(name).channel;
}
export function getCampaignLanguage(name: string | null | undefined): string {
  return parseCampaignName(name).language;
}

/**
 * Manual display overrides for specific campaigns. Matched against either the
 * raw campaign name or its parsed campaign label (case-insensitive substring).
 */
const DISPLAY_OVERRIDES: Array<{ test: (raw: string, label: string) => boolean; display: string }> = [
  {
    test: (raw, label) => {
      const r = raw.toLowerCase();
      const l = label.toLowerCase();
      return l.includes('branded') || r.includes('branded');
    },
    display: 'Google Search Branded',
  },
  {
    test: (raw, label) => {
      const r = raw.toLowerCase();
      const l = label.toLowerCase();
      return l.includes('generic') || r.includes('generic');
    },
    display: 'Google Search Generic',
  },
];

/** Display label = the 2nd underscore segment (campaign), or full name if not parseable. */
export function getCampaignLabel(name: string | null | undefined): string {
  if (!name) return UNKNOWN;
  const parts = name.split('_').map(p => p.trim()).filter(Boolean);
  const baseLabel = parts.length >= 2 && parts[1] ? parts[1] : name;
  for (const override of DISPLAY_OVERRIDES) {
    if (override.test(name, baseLabel)) return override.display;
  }
  return baseLabel;
}
