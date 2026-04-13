import { PlatformPageTemplate } from '@/components/dashboard/PlatformPageTemplate';
import { SectionHeader } from '@/components/dashboard/SectionHeader';

export default function ProgrammaticPage() {
  return (
    <PlatformPageTemplate
      platformKey="programmatic"
      title="Programmatic"
      extraSections={
        <>
          <SectionHeader title="Media Type Split" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { type: 'Display', spend: '$2,100', pct: '32%' },
              { type: 'Video', spend: '$1,800', pct: '28%' },
              { type: 'CTV', spend: '$1,200', pct: '19%' },
              { type: 'Audio', spend: '$680', pct: '10%' },
              { type: 'Native', spend: '$700', pct: '11%' },
            ].map(m => (
              <div key={m.type} className="bg-card rounded-xl border border-border p-4 shadow-sm text-center">
                <p className="text-xs text-muted-foreground">{m.type}</p>
                <p className="text-lg font-bold text-card-foreground mt-1">{m.spend}</p>
                <p className="text-xs text-muted-foreground">{m.pct} of spend</p>
              </div>
            ))}
          </div>

          <SectionHeader title="Inventory Quality" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <p className="text-xs text-muted-foreground">Viewability Rate</p>
              <p className="text-2xl font-bold text-card-foreground">72.4%</p>
              <p className="text-xs text-success mt-1">Above threshold</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <p className="text-xs text-muted-foreground">Brand Safety Score</p>
              <p className="text-2xl font-bold text-card-foreground">96%</p>
              <p className="text-xs text-success mt-1">Excellent</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <p className="text-xs text-muted-foreground">Invalid Traffic</p>
              <p className="text-2xl font-bold text-card-foreground">1.2%</p>
              <p className="text-xs text-success mt-1">Low</p>
            </div>
          </div>
        </>
      }
    />
  );
}
