/**
 * Ad group naming convention parser (AMEX).
 *
 * Expected format (underscore-separated, 1-indexed positions):
 *   1:  Platform       (e.g. "SC Direct")
 *   2:  Campaign Name  (e.g. "MGM")
 *   3:  Location       (e.g. "KSA")
 *   4:  Language       (e.g. "EN")
 *   5:  Optimization   (e.g. "Leads")
 *   6:  Flight Days    (e.g. "17 Feb - 9 March")
 *   7:  Gender         (e.g. "Male+Female")
 *   8:  Age Group      (e.g. "25+")
 *   9:  Targeting      (e.g. "All")
 *   10: Placement      (e.g. "All")
 *   11: Free Field     (e.g. "Open")
 *
 * Example:
 *   SC Direct_MGM_KSA_EN_Leads_17 Feb - 9 March_Male+Female_25+_All_All_Open
 *
 * This parser is independent from the campaign-name parser. The campaign-level
 * parser continues to operate on `campaign_name`; this one operates on the
 * adset / ad_group name field.
 */

export const UNKNOWN = 'Unknown';

export interface ParsedAdGroupName {
  platform: string;
  campaign: string;
  location: string;
  language: string;
  optimization: string;
  flightDays: string;
  gender: string;
  ageGroup: string;
  targeting: string;
  placement: string;
  freeField: string;
}

const empty = (): ParsedAdGroupName => ({
  platform: UNKNOWN,
  campaign: UNKNOWN,
  location: UNKNOWN,
  language: UNKNOWN,
  optimization: UNKNOWN,
  flightDays: UNKNOWN,
  gender: UNKNOWN,
  ageGroup: UNKNOWN,
  targeting: UNKNOWN,
  placement: UNKNOWN,
  freeField: UNKNOWN,
});

export function parseAdGroupName(name: string | null | undefined): ParsedAdGroupName {
  const out = empty();
  if (!name) return out;
  const parts = name.split('_').map(p => p.trim());
  const at = (i: number) => (parts[i] && parts[i].length > 0 ? parts[i] : '');
  const assign = (key: keyof ParsedAdGroupName, idx: number) => {
    const v = at(idx);
    if (v) out[key] = v;
  };
  assign('platform',     0);
  assign('campaign',     1);
  assign('location',     2);
  assign('language',     3);
  assign('optimization', 4);
  assign('flightDays',   5);
  assign('gender',       6);
  assign('ageGroup',     7);
  assign('targeting',    8);
  assign('placement',    9);
  assign('freeField',   10);
  return out;
}

export const getAdGroupGender      = (n?: string | null) => parseAdGroupName(n).gender;
export const getAdGroupAgeGroup    = (n?: string | null) => parseAdGroupName(n).ageGroup;
export const getAdGroupTargeting   = (n?: string | null) => parseAdGroupName(n).targeting;
export const getAdGroupPlacement   = (n?: string | null) => parseAdGroupName(n).placement;
export const getAdGroupLanguage    = (n?: string | null) => parseAdGroupName(n).language;
export const getAdGroupOptimization = (n?: string | null) => parseAdGroupName(n).optimization;
export const getAdGroupFlightDays  = (n?: string | null) => parseAdGroupName(n).flightDays;
