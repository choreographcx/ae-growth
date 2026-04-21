/**
 * Admin → Platform Setup integrity warnings.
 *
 * Surfaces two BigQuery data-quality checks per enabled platform:
 *   1. cost vs cost_usd divergence (platform isn't really USD).
 *   2. Implied native currency ≠ configured per-platform Reporting Currency.
 *
 * Renders as a compact card above the platform grid. Silent when everything
 * checks out so admins aren't pestered with a green "OK" banner.
 */
import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { ClientProfile, PlatformKey, PLATFORM_ORDER } from '@/types/dashboard';
import { usePlatformCurrencyIntegrity, normalizePlatformKey, inferCurrency } from '@/hooks/usePlatformCurrencyIntegrity';
import { cn } from '@/lib/utils';

interface Issue {
  platformKey: PlatformKey;
  platformLabel: string;
  configuredCurrency: string;
  impliedCurrency: 'USD' | 'SAR' | 'AED' | 'UNKNOWN';
  impliedRate: number | null;
  totalCost: number;
  totalCostUsd: number;
  /** 'mismatch_vs_usd' = cost ≠ cost_usd. 'mismatch_vs_config' = implied currency ≠ configured. */
  kind: 'mismatch_vs_usd' | 'mismatch_vs_config';
}

const PLATFORM_LABELS: Record<PlatformKey, string> = {
  meta: 'Meta', google: 'Google Ads', tiktok: 'TikTok',
  snapchat: 'Snapchat', x: 'X', linkedin: 'LinkedIn', programmatic: 'Programmatic',
};

export function PlatformIntegrityPanel({ client }: { client: ClientProfile }) {
  const { rows, loading, error } = usePlatformCurrencyIntegrity(true);

  const issues = useMemo<Issue[]>(() => {
    if (!rows.length) return [];
    // Aggregate raw BQ rows by normalized platform key.
    const byKey = new Map<PlatformKey, { totalCost: number; totalCostUsd: number }>();
    for (const r of rows) {
      const k = normalizePlatformKey(r.platform);
      if (!k) continue;
      const cur = byKey.get(k) ?? { totalCost: 0, totalCostUsd: 0 };
      cur.totalCost   += r.totalCost;
      cur.totalCostUsd += r.totalCostUsd;
      byKey.set(k, cur);
    }

    const out: Issue[] = [];
    for (const k of PLATFORM_ORDER) {
      const cfg = client.platforms[k];
      if (!cfg?.enabled) continue;
      const stats = byKey.get(k);
      if (!stats || stats.totalCostUsd <= 0) continue;

      const impliedRate = stats.totalCost / stats.totalCostUsd;
      const implied = inferCurrency(impliedRate, Number(client.usdToSarRate) || 0, Number(client.usdToAedRate) || 0);
      const configured = (cfg.reportingCurrency || 'USD').toUpperCase();

      // Check 1: cost ≠ cost_usd (implied is NOT USD) → DB invariant is broken.
      const isUsdEqual = Math.abs(impliedRate - 1) <= 0.02;
      if (!isUsdEqual) {
        out.push({
          platformKey: k,
          platformLabel: PLATFORM_LABELS[k],
          configuredCurrency: configured,
          impliedCurrency: implied,
          impliedRate,
          totalCost: stats.totalCost,
          totalCostUsd: stats.totalCostUsd,
          kind: 'mismatch_vs_usd',
        });
      }

      // Check 2: implied native currency ≠ configured reporting currency.
      if (implied !== 'UNKNOWN' && implied !== configured) {
        out.push({
          platformKey: k,
          platformLabel: PLATFORM_LABELS[k],
          configuredCurrency: configured,
          impliedCurrency: implied,
          impliedRate,
          totalCost: stats.totalCost,
          totalCostUsd: stats.totalCostUsd,
          kind: 'mismatch_vs_config',
        });
      }
    }
    return out;
  }, [rows, client]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Info size={12} /> Checking BigQuery currency integrity…
      </div>
    );
  }

  if (error) {
    // Permission-denied is expected for non-admins; stay silent in that case.
    if (/Insufficient privileges|Not authenticated/i.test(error)) return null;
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
        <Info size={12} /> Currency integrity check unavailable: {error}
      </div>
    );
  }

  if (!issues.length) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
        <CheckCircle2 size={12} />
        <span>All enabled platforms report in USD and match their configured reporting currency (last 30 days).</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {issues.map((iss, i) => (
        <IssueRow key={`${iss.platformKey}-${iss.kind}-${i}`} issue={iss} />
      ))}
    </div>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  const ratePct = issue.impliedRate ? issue.impliedRate.toFixed(3) : 'n/a';
  const isCritical = issue.kind === 'mismatch_vs_usd';

  return (
    <div className={cn(
      'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs',
      isCritical
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-amber-200 bg-amber-50 text-amber-700',
    )}>
      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
      <div className="space-y-0.5">
        <div className="font-medium">
          {issue.platformLabel}: {isCritical
            ? 'cost and cost_usd do not match'
            : `implied currency (${issue.impliedCurrency}) ≠ configured (${issue.configuredCurrency})`}
        </div>
        <div className="opacity-80">
          implied USD→native rate ≈ <span className="tabular-nums font-mono">{ratePct}</span>{' · '}
          cost: <span className="tabular-nums font-mono">{issue.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>{' · '}
          cost_usd: <span className="tabular-nums font-mono">{issue.totalCostUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          {isCritical && (
            <> — dashboard currency conversion assumes the database is USD; values may be wrong for {issue.platformLabel}.</>
          )}
          {!isCritical && (
            <> — update the platform's Reporting Currency below to {issue.impliedCurrency} for accurate metadata.</>
          )}
        </div>
      </div>
    </div>
  );
}
