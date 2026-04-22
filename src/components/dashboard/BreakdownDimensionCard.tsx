import { useState } from 'react';
import { DimensionBreakdownTable } from './DimensionBreakdownTable';
import { DashboardDailyRow } from '@/hooks/useDashboardDaily';
import { getCampaignMarket, getCampaignChannel, getCampaignObjective } from '@/lib/campaignNaming';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Dim = 'market' | 'channel' | 'objective';

const PICKERS: Record<Dim, { label: string; pick: (r: DashboardDailyRow) => string | null | undefined; title: string }> = {
  market:    { label: 'By Market',    pick: r => getCampaignMarket(r.campaign_name),    title: 'By Market' },
  channel:   { label: 'By Channel',   pick: r => getCampaignChannel(r.campaign_name),   title: 'By Channel' },
  objective: { label: 'By Objective', pick: r => getCampaignObjective(r.campaign_name), title: 'By Objective' },
};

interface Props {
  rows: DashboardDailyRow[];
}

export function BreakdownDimensionCard({ rows }: Props) {
  const [dim, setDim] = useState<Dim>('channel');
  const cfg = PICKERS[dim];

  return (
    <div className="space-y-2.5 md:space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Breakdowns</h2>
        <Select value={dim} onValueChange={(v) => setDim(v as Dim)}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="channel">By Channel</SelectItem>
            <SelectItem value="objective">By Objective</SelectItem>
            <SelectItem value="market">By Market</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DimensionBreakdownTable rows={rows} pick={cfg.pick} title={cfg.title} />
    </div>
  );
}
