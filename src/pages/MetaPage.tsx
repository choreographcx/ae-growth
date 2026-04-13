import { PlatformPageTemplate } from '@/components/dashboard/PlatformPageTemplate';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { useDashboard } from '@/context/DashboardContext';
import { CurrencySymbol } from '@/lib/currency';
import { useMemo } from 'react';

const audienceData = [
  { name: 'Prospecting - Interest', spend: 12400, conv: 380, cpa: 32.63 },
  { name: 'Prospecting - Lookalike', spend: 15200, conv: 420, cpa: 36.19 },
  { name: 'Retargeting - Website', spend: 8600, conv: 340, cpa: 25.29 },
  { name: 'Retargeting - Engagement', spend: 6200, conv: 180, cpa: 34.44 },
  { name: 'Broad Targeting', spend: 10000, conv: 200, cpa: 50.00 },
];

function CurrencyValue({ amount, decimals = 0, currency }: { amount: number; decimals?: number; currency: string }) {
  const formatted = decimals > 0 ? amount.toFixed(decimals) : amount.toLocaleString();
  return (
    <span className="inline-flex items-baseline">
      <CurrencySymbol currency={currency} />
      {formatted}
    </span>
  );
}

const placementNames = ['Feed', 'Stories', 'Reels', 'Right Column'];

export default function MetaPage() {
  const { client } = useDashboard();
  const currency = client.currency;

  const placementData = useMemo(() =>
    placementNames.map(p => ({
      name: p,
      spend: Math.round(Math.random() * 15000 + 2000),
      ctr: (Math.random() * 2 + 0.5).toFixed(1),
    })),
    []
  );

  return (
    <PlatformPageTemplate
      platformKey="meta"
      title="Meta Ads"
      tabs={[
        { key: 'all', label: 'All' },
        { key: 'facebook', label: 'Facebook' },
        { key: 'instagram', label: 'Instagram' },
      ]}
      extraSections={
        <>
          <SectionHeader title="Audience Breakdown" />
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Audience</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Spend</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Conv.</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">CPA</th>
              </tr></thead>
              <tbody>
                {audienceData.map(a => (
                  <tr key={a.name} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-card-foreground">{a.name}</td>
                    <td className="px-4 py-3 text-right text-card-foreground tabular-nums"><CurrencyValue amount={a.spend} currency={currency} /></td>
                    <td className="px-4 py-3 text-right text-card-foreground tabular-nums">{a.conv.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-card-foreground tabular-nums"><CurrencyValue amount={a.cpa} decimals={2} currency={currency} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SectionHeader title="Placement Performance" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {placementData.map(p => (
              <div key={p.name} className="bg-card rounded-xl border border-border p-4 shadow-sm text-center">
                <p className="text-xs text-muted-foreground">{p.name}</p>
                <p className="text-lg font-bold text-card-foreground mt-1"><CurrencyValue amount={p.spend} currency={currency} /></p>
                <p className="text-xs text-muted-foreground mt-0.5">{p.ctr}% CTR</p>
              </div>
            ))}
          </div>
        </>
      }
    />
  );
}
