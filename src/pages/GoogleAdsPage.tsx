import { PlatformPageTemplate } from '@/components/dashboard/PlatformPageTemplate';
import { SectionHeader } from '@/components/dashboard/SectionHeader';

export default function GoogleAdsPage() {
  return (
    <PlatformPageTemplate
      platformKey="google"
      title="Google Ads"
      tabs={[
        { key: 'all', label: 'All' },
        { key: 'search', label: 'Search' },
        { key: 'pmax', label: 'Performance Max' },
      ]}
      extraSections={
        <>
          <SectionHeader title="Search vs Performance Max" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { type: 'Search', spend: '$24,800', conv: 720, cpa: '$34.44', ctr: '3.8%', impShare: '68%' },
              { type: 'Performance Max', spend: '$16,400', conv: 460, cpa: '$35.65', ctr: '0.9%', impShare: 'N/A' },
            ].map(c => (
              <div key={c.type} className="bg-card rounded-xl border border-border p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-card-foreground mb-3">{c.type}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-muted-foreground">Spend</p><p className="text-base font-bold text-card-foreground">{c.spend}</p></div>
                  <div><p className="text-xs text-muted-foreground">Conversions</p><p className="text-base font-bold text-card-foreground">{c.conv}</p></div>
                  <div><p className="text-xs text-muted-foreground">CPA</p><p className="text-base font-bold text-card-foreground">{c.cpa}</p></div>
                  <div><p className="text-xs text-muted-foreground">CTR</p><p className="text-base font-bold text-card-foreground">{c.ctr}</p></div>
                  <div><p className="text-xs text-muted-foreground">Imp. Share</p><p className="text-base font-bold text-card-foreground">{c.impShare}</p></div>
                </div>
              </div>
            ))}
          </div>

          <SectionHeader title="Device Breakdown" />
          <div className="grid grid-cols-3 gap-3">
            {[
              { device: 'Mobile', spend: '$21,200', conv: 580 },
              { device: 'Desktop', spend: '$15,800', conv: 480 },
              { device: 'Tablet', spend: '$4,200', conv: 120 },
            ].map(d => (
              <div key={d.device} className="bg-card rounded-xl border border-border p-4 shadow-sm text-center">
                <p className="text-xs text-muted-foreground">{d.device}</p>
                <p className="text-lg font-bold text-card-foreground mt-1">{d.spend}</p>
                <p className="text-xs text-muted-foreground">{d.conv} conv.</p>
              </div>
            ))}
          </div>
        </>
      }
    />
  );
}
