import { PlatformSummary, PlatformKey, PLATFORM_ORDER } from '@/types/dashboard';
import { useDashboard } from '@/context/DashboardContext';
import { CurrencySymbol } from '@/lib/currency';
import { cn } from '@/lib/utils';

const PLATFORM_HUE: Record<PlatformKey, string> = {
  meta:         'hsl(214 89% 52%)',
  google:       'hsl(142 71% 45%)',
  tiktok:       'hsl(340 82% 52%)',
  snapchat:     'hsl(50 95% 50%)',
  x:            'hsl(222 12% 30%)',
  linkedin:     'hsl(199 89% 48%)',
  programmatic: 'hsl(262 80% 65%)',
};

interface Props {
  platforms: PlatformSummary[];
  className?: string;
}

function fmtCompact(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

/**
 * Two stacked horizontal bars: % of Spend by platform vs % of Lower-Funnel Conversions
 * by platform. Reveals over-invested platforms and key performance drivers.
 */
export function PlatformContributionCard({ platforms, className }: Props) {
  const { client } = useDashboard();
  const currency = client.currency;

  const totalSpend = platforms.reduce((s, p) => s + p.spend, 0);
  const totalLF    = platforms.reduce((s, p) => s + (p.conversionsLowerFunnel ?? 0), 0);

  // Sort by canonical platform order for stable visual identity
  const ordered = [...platforms].sort(
    (a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform)
  );

  const segments = (kind: 'spend' | 'lf') => ordered.map(p => {
    const value = kind === 'spend' ? p.spend : (p.conversionsLowerFunnel ?? 0);
    const total = kind === 'spend' ? totalSpend : totalLF;
    const pct = total > 0 ? (value / total) * 100 : 0;
    return { platform: p.platform, label: p.label, pct, value };
  });

  const spendSegs = segments('spend');
  const lfSegs    = segments('lf');

  return (
    <div className={cn('bg-card rounded-xl border border-border shadow-sm overflow-hidden', className)}>
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-card-foreground">Platform Contribution</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Where the budget goes vs where the lower-funnel conversions come from.</p>
      </div>

      <div className="px-5 py-4 space-y-5">
        <ContributionRow title="% of Spend"                 segs={spendSegs} totalIsZero={totalSpend === 0} />
        <ContributionRow title="% of Lower-Funnel Conv."     segs={lfSegs}    totalIsZero={totalLF === 0} />

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-border/50">
          {ordered.map(p => (
            <div key={p.platform} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PLATFORM_HUE[p.platform] }} />
              <span className="font-medium text-card-foreground">{p.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContributionRow({
  title, segs, totalIsZero,
}: { title: string; segs: { platform: PlatformKey; label: string; pct: number; value: number }[]; totalIsZero: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
      </div>
      {totalIsZero ? (
        <div className="h-7 rounded bg-muted/40 flex items-center justify-center text-[11px] text-muted-foreground">
          No data in this period
        </div>
      ) : (
        <>
          <div className="h-7 w-full flex rounded overflow-hidden bg-muted/40">
            {segs.map(s => s.pct > 0 ? (
              <div
                key={s.platform}
                className="h-full transition-all"
                style={{ width: `${s.pct}%`, background: PLATFORM_HUE[s.platform] }}
                title={`${s.label}: ${s.pct.toFixed(1)}%`}
              />
            ) : null)}
          </div>
          {/* % labels under bar (only show >= 6%) */}
          <div className="flex w-full mt-1">
            {segs.map(s => s.pct > 0 ? (
              <div
                key={s.platform}
                style={{ width: `${s.pct}%` }}
                className="text-[10px] text-muted-foreground tabular-nums px-0.5 truncate"
              >
                {s.pct >= 6 ? `${s.pct.toFixed(0)}%` : ''}
              </div>
            ) : null)}
          </div>
        </>
      )}
    </div>
  );
}
