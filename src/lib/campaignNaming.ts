/**
 * Campaign naming convention parser.
 *
 * Expected format (underscore-separated, 1-indexed positions):
 *   1:  Market
 *   2:  Client
 *   3:  Campaign
 *   4:  Phase / sub-campaign tag (e.g. Phase2, AO)
 *   5:  Start date
 *   6:  End date
 *   7:  Objective (CPm, CPL, CPC, etc.)
 *   8:  Channel (paidsocial, etc.)
 *   9:  Platform (Facebook, Instagram, etc.)
 *   10: BO#
 *
 * Non-conforming names (fewer than 10 segments) yield 'Unknown' for missing
 * positions, so they remain visible in filters and breakdowns under that label.
 */

export const UNKNOWN = 'Unknown';

export interface ParsedCampaignName {
  market: string;
  client: string;
  campaign: string;
  phase: string;
  startDate: string;
  endDate: string;
  objective: string;
  channel: string;
  platform: string;
  bo: string;
}

const POSITIONS = ['market', 'client', 'campaign', 'phase', 'startDate', 'endDate', 'objective', 'channel', 'platform', 'bo'] as const;

export function parseCampaignName(name: string | null | undefined): ParsedCampaignName {
  const empty: ParsedCampaignName = {
    market: UNKNOWN, client: UNKNOWN, campaign: UNKNOWN, phase: UNKNOWN,
    startDate: UNKNOWN, endDate: UNKNOWN, objective: UNKNOWN,
    channel: UNKNOWN, platform: UNKNOWN, bo: UNKNOWN,
  };
  if (!name) return empty;
  const parts = name.split('_').map(p => p.trim());
  const out: ParsedCampaignName = { ...empty };
  POSITIONS.forEach((key, i) => {
    const v = parts[i];
    if (v && v.length > 0) out[key] = v;
  });
  return out;
}

export function getCampaignMarket(name: string | null | undefined): string | null {
  // Skip rows with no campaign name entirely.
  if (!name || !name.trim()) return null;
  const trimmed = name.trim();
  // Explicit SA prefix takes precedence over any other parsing.
  if (/^sa[_\s-]/i.test(trimmed)) return 'SA';
  // Treat the placeholder "0000_" prefix as SA (Saudi Arabia).
  if (/^0000[_\s-]/i.test(trimmed)) return 'SA';
  const m = parseCampaignName(trimmed).market;
  if (m === UNKNOWN) return m;
  const lower = m.toLowerCase();
  // Treat a bare "0000" market segment as SA as well.
  if (lower === '0000') return 'SA';
  return lower.toUpperCase();
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
/**
 * Manual display overrides for specific campaigns. Matched against either the
 * raw campaign name or its parsed 3rd-segment label (case-insensitive substring).
 * Keep keys lowercase.
 */
const DISPLAY_OVERRIDES: Array<{ test: (raw: string, label: string) => boolean; display: string }> = [
  {
    // Google Ads BRANDED search campaign.
    test: (raw, label) => {
      const r = raw.toLowerCase();
      const l = label.toLowerCase();
      return l.includes('branded') || r.includes('branded');
    },
    display: 'Google Search Branded',
  },
  {
    // Google Ads GENERIC search campaign.
    test: (raw, label) => {
      const r = raw.toLowerCase();
      const l = label.toLowerCase();
      return l.includes('generic') || r.includes('generic');
    },
    display: 'Google Search Generic',
  },
];

/** Display label = the 3rd underscore segment (campaign), or full name if not parseable. */
export function getCampaignLabel(name: string | null | undefined): string {
  if (!name) return UNKNOWN;
  const parts = name.split('_').map(p => p.trim()).filter(Boolean);
  const baseLabel = parts.length >= 3 && parts[2] ? parts[2] : name;
  for (const override of DISPLAY_OVERRIDES) {
    if (override.test(name, baseLabel)) return override.display;
  }
  return baseLabel;
}
