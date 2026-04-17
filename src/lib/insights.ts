import { DashboardTotals } from '@/hooks/useDashboardDaily';
import { PlatformKey, PlatformSummary, AlertItem } from '@/types/dashboard';

/**
 * Rule-based insight engine — derives executive-friendly diagnostics from
 * aggregated totals and platform breakdowns. Insights are ranked by severity.
 *
 * IMPORTANT: All thresholds are in USD because totals are sourced from cost_usd.
 */

const PLATFORM_LABELS: Record<PlatformKey, string> = {
  meta: 'Meta', google: 'Google Ads', tiktok: 'TikTok', snapchat: 'Snapchat',
  x: 'X', linkedin: 'LinkedIn', programmatic: 'Programmatic',
};

interface InsightContext {
  totals: DashboardTotals;
  previousTotals?: DashboardTotals | null;
  platforms: PlatformSummary[];
  /** Min spend (USD) to consider a platform "meaningful". */
  minSpendUSD?: number;
}

const DEFAULTS = {
  minSpendUSD: 1000,
  highFrequency: 4,
  weakLpvRate: 30, // %
  strongCtr: 1.5,  // %
  strongRoas: 2,
  contributionGap: 1.5, // platform's spend share / conv share > 1.5 = inefficient
};

function ts(): string {
  return 'Right now';
}

export function generateInsights({
  totals,
  previousTotals,
  platforms,
  minSpendUSD = DEFAULTS.minSpendUSD,
}: InsightContext): AlertItem[] {
  const out: AlertItem[] = [];
  let id = 0;
  const next = () => `ins-${++id}`;

  // 1. Per-platform: wasted spend (high spend, no lower-funnel conversions)
  for (const p of platforms) {
    if (p.spend >= minSpendUSD && (p.conversionsLowerFunnel ?? 0) === 0) {
      out.push({
        id: next(), type: 'error', platform: p.platform, timestamp: ts(),
        title: `${p.label}: significant spend with no lower-funnel conversions`,
        description: `Spent $${Math.round(p.spend).toLocaleString()} with zero lower-funnel actions. Review tracking, bidding, or pause.`,
      });
    }
  }

  // 2. Contribution gap — over-investment vs lower-funnel output
  const totalSpend = platforms.reduce((s, p) => s + p.spend, 0);
  const totalLF    = platforms.reduce((s, p) => s + (p.conversionsLowerFunnel ?? 0), 0);
  for (const p of platforms) {
    if (p.spend < minSpendUSD || totalSpend === 0 || totalLF === 0) continue;
    const spendShare = p.spend / totalSpend;
    const lfShare    = (p.conversionsLowerFunnel ?? 0) / totalLF;
    if (lfShare === 0) continue; // covered by rule #1
    const gap = spendShare / lfShare;
    if (gap >= DEFAULTS.contributionGap) {
      out.push({
        id: next(), type: 'warning', platform: p.platform, timestamp: ts(),
        title: `${p.label}: over-invested vs conversion contribution`,
        description: `Receives ${(spendShare * 100).toFixed(0)}% of spend but drives only ${(lfShare * 100).toFixed(0)}% of lower-funnel conversions.`,
      });
    }
  }

  // 3. CTR strong but LPV/CVR weak — landing page issue
  if (totals.ctr >= DEFAULTS.strongCtr && totals.lpvRate > 0 && totals.lpvRate < DEFAULTS.weakLpvRate) {
    out.push({
      id: next(), type: 'warning', timestamp: ts(),
      title: 'Strong CTR but weak landing page view rate',
      description: `Users click but do not load the page (LPV rate ${totals.lpvRate.toFixed(1)}%). Check page speed, redirects, or tracking.`,
    });
  }

  // 4. Frequency fatigue — high frequency + falling CTR vs prev period
  if (totals.frequency >= DEFAULTS.highFrequency && previousTotals && previousTotals.ctr > 0) {
    const ctrDelta = totals.ctr - previousTotals.ctr;
    if (ctrDelta < 0) {
      out.push({
        id: next(), type: 'warning', timestamp: ts(),
        title: 'Possible audience fatigue',
        description: `Frequency is ${totals.frequency.toFixed(1)} and CTR fell ${Math.abs(ctrDelta).toFixed(2)} pts. Refresh creative or expand reach.`,
      });
    }
  }

  // 5. Strong ROAS — efficiency win
  if (totals.roas >= DEFAULTS.strongRoas) {
    out.push({
      id: next(), type: 'success', timestamp: ts(),
      title: 'Healthy return on ad spend',
      description: `Blended ROAS is ${totals.roas.toFixed(2)}x. Consider scaling top performers.`,
    });
  }

  // 6. Lead platform — single platform driving majority of lower-funnel conversions
  if (totalLF > 0) {
    const leader = [...platforms].sort((a, b) => (b.conversionsLowerFunnel ?? 0) - (a.conversionsLowerFunnel ?? 0))[0];
    if (leader && (leader.conversionsLowerFunnel ?? 0) / totalLF >= 0.5 && leader.spend >= minSpendUSD) {
      out.push({
        id: next(), type: 'info', platform: leader.platform, timestamp: ts(),
        title: `${leader.label} is the primary performance driver`,
        description: `Generates ${(((leader.conversionsLowerFunnel ?? 0) / totalLF) * 100).toFixed(0)}% of lower-funnel conversions.`,
      });
    }
  }

  // 7. CPA spike vs previous period
  if (previousTotals && previousTotals.cpaLowerFunnel > 0 && totals.cpaLowerFunnel > 0) {
    const delta = (totals.cpaLowerFunnel - previousTotals.cpaLowerFunnel) / previousTotals.cpaLowerFunnel;
    if (delta >= 0.25) {
      out.push({
        id: next(), type: 'warning', timestamp: ts(),
        title: 'Lower-funnel CPA rising',
        description: `CPA is up ${(delta * 100).toFixed(0)}% vs prior period ($${totals.cpaLowerFunnel.toFixed(2)}). Investigate creative or audience drift.`,
      });
    } else if (delta <= -0.15) {
      out.push({
        id: next(), type: 'success', timestamp: ts(),
        title: 'Lower-funnel CPA improving',
        description: `CPA improved ${Math.abs(delta * 100).toFixed(0)}% vs prior period (now $${totals.cpaLowerFunnel.toFixed(2)}).`,
      });
    }
  }

  return out;
}

const SEV: Record<AlertItem['type'], number> = { error: 0, warning: 1, success: 2, info: 3 };
export function sortInsights(items: AlertItem[]): AlertItem[] {
  return [...items].sort((a, b) => SEV[a.type] - SEV[b.type]);
}

export const PLATFORM_LABEL = PLATFORM_LABELS;
