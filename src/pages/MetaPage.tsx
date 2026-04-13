import { PlatformPageTemplate } from '@/components/dashboard/PlatformPageTemplate';
import { SectionHeader } from '@/components/dashboard/SectionHeader';

const audienceData = [
  { name: 'Prospecting - Interest', spend: '$12,400', conv: 380, cpa: '$32.63' },
  { name: 'Prospecting - Lookalike', spend: '$15,200', conv: 420, cpa: '$36.19' },
  { name: 'Retargeting - Website', spend: '$8,600', conv: 340, cpa: '$25.29' },
  { name: 'Retargeting - Engagement', spend: '$6,200', conv: 180, cpa: '$34.44' },
  { name: 'Broad Targeting', spend: '$10,000', conv: 200, cpa: '$50.00' },
];

export default function MetaPage() {
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
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Spend</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Conv.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">CPA</th>
              </tr></thead>
              <tbody>
                {audienceData.map(a => (
                  <tr key={a.name} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-card-foreground">{a.name}</td>
                    <td className="px-4 py-3 text-card-foreground">{a.spend}</td>
                    <td className="px-4 py-3 text-card-foreground">{a.conv}</td>
                    <td className="px-4 py-3 text-card-foreground">{a.cpa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SectionHeader title="Placement Performance" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['Feed', 'Stories', 'Reels', 'Right Column'].map(p => (
              <div key={p} className="bg-card rounded-xl border border-border p-4 shadow-sm text-center">
                <p className="text-xs text-muted-foreground">{p}</p>
                <p className="text-lg font-bold text-card-foreground mt-1">${(Math.random() * 15000 + 2000).toFixed(0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{(Math.random() * 2 + 0.5).toFixed(1)}% CTR</p>
              </div>
            ))}
          </div>
        </>
      }
    />
  );
}
