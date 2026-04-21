/**
 * Campaign naming convention parser.
 *
 * Expected format (underscore-separated, 1-indexed positions):
 *   1: Market
 *   2: Client
 *   3: Campaign
 *   4: Start date
 *   5: End date
 *   6: Objective
 *   7: Channel
 *   8: Platform
 *   9: BO#
 *
 * Non-conforming names (fewer than 9 segments) yield 'Unknown' for missing
 * positions, so they remain visible in filters and breakdowns under that label.
 */

export const UNKNOWN = 'Unknown';

export interface ParsedCampaignName {
  market: string;
  client: string;
  campaign: string;
  startDate: string;
  endDate: string;
  objective: string;
  channel: string;
  platform: string;
  bo: string;
}

const POSITIONS = ['market', 'client', 'campaign', 'startDate', 'endDate', 'objective', 'channel', 'platform', 'bo'] as const;

export function parseCampaignName(name: string | null | undefined): ParsedCampaignName {
  const empty: ParsedCampaignName = {
    market: UNKNOWN, client: UNKNOWN, campaign: UNKNOWN,
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

export function getCampaignMarket(name: string | null | undefined): string {
  return parseCampaignName(name).market;
}
export function getCampaignObjective(name: string | null | undefined): string {
  return parseCampaignName(name).objective;
}
export function getCampaignChannel(name: string | null | undefined): string {
  return parseCampaignName(name).channel;
}
