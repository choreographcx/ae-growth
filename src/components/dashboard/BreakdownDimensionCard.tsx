import { useState } from 'react';
import { DimensionBreakdownTable } from './DimensionBreakdownTable';
import { DashboardDailyRow } from '@/hooks/useDashboardDaily';
import { getCampaignMarket, getCampaignChannel, resolveCampaignObjective } from '@/lib/campaignNaming';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlatformKey } from '@/types/dashboard';

type Dim = 'market' | 'channel' | 'objective' | 'placement' | 'campaignType' | 'audienceType';

const PICKERS: Record<Dim, { label: string; pick: (r: DashboardDailyRow) => string | null | undefined; title: string }> = {
  market:    { label: 'By Market',    pick: r => getCampaignMarket(r.campaign_name),    title: 'By Market' },
  channel:   { label: 'By Channel',   pick: r => getCampaignChannel(r.campaign_name),   title: 'By Channel' },
  objective: { label: 'By Objective', pick: r => resolveCampaignObjective(r.campaign_objective, r.campaign_name), title: 'By Objective' },
  placement: {
    label: 'By Placement',
    title: 'By Placement',
    pick: r => {
      const v = (r.publisher_platform || '').toLowerCase();
      if (!v) return null;
      if (v.includes('facebook') || v === 'fb') return 'Facebook';
      if (v.includes('instagram') || v === 'ig') return 'Instagram';
      return null;
    },
  },
  campaignType: {
    label: 'By Campaign Type',
    title: 'By Campaign Type',
    pick: r => r.campaign_type,
  },
  audienceType: {
    label: 'By Audience Type',
    title: 'By Audience Type',
    pick: r => r.audience_type,
  },
};

interface Props {
  rows: DashboardDailyRow[];
  /** When provided, the dropdown options adapt to the platform.
   *  Meta swaps Channel → Placement. Google Ads adds Campaign Type.
   *  TikTok adds Audience Type. */
  platformKey?: PlatformKey;
}

export function BreakdownDimensionCard({ rows, platformKey }: Props) {
  const isMeta = platformKey === 'meta';
  const isGoogle = platformKey === 'google';
  const isTikTok = platformKey === 'tiktok';
  const initial: Dim = isMeta ? 'placement' : isGoogle ? 'campaignType' : isTikTok ? 'audienceType' : 'channel';
  const [dim, setDim] = useState<Dim>(initial);
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
            {isMeta ? (
              <SelectItem value="placement">By Placement</SelectItem>
            ) : (
              <SelectItem value="channel">By Channel</SelectItem>
            )}
            {isGoogle && (
              <SelectItem value="campaignType">By Campaign Type</SelectItem>
            )}
            <SelectItem value="objective">By Objective</SelectItem>
            <SelectItem value="market">By Market</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DimensionBreakdownTable rows={rows} pick={cfg.pick} title={cfg.title} />
    </div>
  );
}
