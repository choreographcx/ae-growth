import { useState } from 'react';
import { CurrencySymbol } from '@/lib/currency';
import { useDashboard } from '@/context/DashboardContext';
import { PlatformKey, ClientProfile, BudgetType } from '@/types/dashboard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { platformIconEntries } from '@/lib/platformIcons';

const allPlatforms: { key: PlatformKey; label: string }[] = [
  { key: 'meta', label: 'Meta' },
  { key: 'google', label: 'Google Ads' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'snapchat', label: 'Snapchat' },
  { key: 'x', label: 'X' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'programmatic', label: 'Programmatic' },
];

const KPI_OPTIONS = ['conversions', 'leads', 'clicks', 'impressions', 'reach', 'video_views', 'app_installs', 'landing_page_views'];
const BUDGET_TYPE_OPTIONS: { value: BudgetType; label: string }[] = [
  { value: 'annual', label: 'Annual' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'custom', label: 'Custom' },
];

const formatBudgetNumber = (n: number) => n.toLocaleString();
const parseBudgetString = (s: string) => Number(s.replace(/,/g, '')) || 0;

export function PlatformSetupSection() {
  const { client, updateClient, togglePlatform } = useDashboard();
  const currency = client.currency;
  const enabledCount = Object.values(client.platforms).filter(p => p.enabled).length;

  const updatePlatform = (key: PlatformKey, updates: Partial<ClientProfile['platforms'][PlatformKey]>) => {
    updateClient({
      platforms: { ...client.platforms, [key]: { ...client.platforms[key], ...updates } },
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 py-3 mb-4 border-b border-border/50 text-xs text-muted-foreground">
        <span><strong className="text-card-foreground">{enabledCount}</strong> enabled</span>
        <span>
          <strong className="text-card-foreground">
            <CurrencySymbol currency={currency} />
            {Object.values(client.platforms).filter(p => p.enabled).reduce((s, p) => s + (p.budget || 0), 0).toLocaleString()}
          </strong> total budget
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {allPlatforms.map(p => (
          <ModularPlatformCard
            key={p.key}
            platform={p}
            cfg={client.platforms[p.key]}
            currency={currency}
            togglePlatform={togglePlatform}
            updatePlatform={updatePlatform}
          />
        ))}
      </div>
    </div>
  );
}

function ModularPlatformCard({
  platform: p,
  cfg,
  currency,
  togglePlatform,
  updatePlatform,
}: {
  platform: typeof allPlatforms[0];
  cfg: ClientProfile['platforms'][PlatformKey];
  currency: string;
  togglePlatform: (k: PlatformKey) => void;
  updatePlatform: (key: PlatformKey, updates: Partial<ClientProfile['platforms'][PlatformKey]>) => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const iconEntry = platformIconEntries[p.key];
  const PlatformIcon = iconEntry.type === 'custom'
    ? iconEntry.Component
    : ({ size, className }: { size?: number; className?: string }) => {
        const Icon = iconEntry.icon;
        return <Icon size={size} className={className} />;
      };

  const statusBadge = () => cfg.enabled
    ? <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-300 text-emerald-600 bg-emerald-50">Enabled</Badge>
    : <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border text-muted-foreground">Disabled</Badge>;

  return (
    <div className={cn(
      'rounded-xl border-2 transition-all duration-200 overflow-hidden',
      cfg.enabled ? 'border-primary/20 bg-card shadow-sm' : 'border-border bg-muted/10 opacity-75'
    )}>
      <div className="flex items-center gap-3 px-5 py-4">
        <div className={cn('flex items-center justify-center w-9 h-9 rounded-lg shrink-0',
          cfg.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
          <PlatformIcon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-card-foreground">{p.label}</h4>
            {statusBadge()}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {cfg.enabled && cfg.budget > 0
              ? <><CurrencySymbol currency={currency} />{formatBudgetNumber(cfg.budget)}</>
              : (cfg.enabled ? 'No budget set' : 'Disabled')}
          </p>
        </div>
        <Switch checked={cfg.enabled} onCheckedChange={() => togglePlatform(p.key)} />
      </div>

      {cfg.enabled && (
        <div className="px-5 pb-4 space-y-4 border-t border-border/40">
          <div className="grid grid-cols-2 gap-3 pt-4">
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Budget</Label>
              <div className="flex items-center gap-1 mt-1.5">
                <span className="text-xs text-muted-foreground shrink-0"><CurrencySymbol currency={currency} /></span>
                <Input
                  value={cfg.budget ? formatBudgetNumber(cfg.budget) : ''}
                  onChange={e => {
                    const clean = e.target.value.replace(/[^0-9,]/g, '');
                    updatePlatform(p.key, { budget: parseBudgetString(clean) });
                  }}
                  className="h-8 text-xs tabular-nums"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Budget Type</Label>
              <Select value={cfg.budgetType || 'annual'} onValueChange={v => updatePlatform(p.key, { budgetType: v as BudgetType })}>
                <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUDGET_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Reporting Currency</Label>
            <Select value={cfg.reportingCurrency || 'USD'} onValueChange={v => updatePlatform(p.key, { reportingCurrency: v })}>
              <SelectTrigger className="mt-1.5 h-8 text-xs">
                <span className="inline-flex items-baseline">
                  <CurrencySymbol currency={cfg.reportingCurrency || 'USD'} size={11} />&nbsp;{cfg.reportingCurrency || 'USD'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {['USD', 'SAR', 'AED'].map(o => (
                  <SelectItem key={o} value={o}>
                    <span className="inline-flex items-baseline">
                      <CurrencySymbol currency={o} size={11} />&nbsp;{o}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Conversion to {currency} is applied automatically when different.
            </p>
          </div>

          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Primary KPI</Label>
            <Select value={cfg.primaryKpi || 'conversions'} onValueChange={v => updatePlatform(p.key, { primaryKpi: v })}>
              <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {KPI_OPTIONS.map(o => <SelectItem key={o} value={o}>{o.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-border/30">
            <button
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings2 size={10} /> Advanced
              <ChevronDown size={10} className={cn('transition-transform duration-200', advancedOpen && 'rotate-180')} />
            </button>
          </div>

          {advancedOpen && (
            <div className="pt-3 border-t border-border/30 space-y-3">
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Naming Convention</Label>
                <Select value={cfg.namingConvention || ''} onValueChange={v => updatePlatform(p.key, { namingConvention: v })}>
                  <SelectTrigger className="mt-1 h-7 text-xs"><SelectValue placeholder="Default" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pipe_delimited">Pipe Delimited</SelectItem>
                    <SelectItem value="underscore">Underscore</SelectItem>
                    <SelectItem value="dash">Dash</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Excluded Campaign Filter</Label>
                <Input
                  value={cfg.excludedCampaignFilter || ''}
                  onChange={e => updatePlatform(p.key, { excludedCampaignFilter: e.target.value })}
                  placeholder="e.g. test_, internal_, _draft"
                  className="mt-1 h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Notes</Label>
                <textarea
                  value={cfg.notes || ''}
                  onChange={e => updatePlatform(p.key, { notes: e.target.value })}
                  placeholder="Platform-specific notes…"
                  className="mt-1 w-full border border-input rounded-lg p-2 text-xs bg-background text-foreground resize-none focus:ring-1 focus:ring-ring focus:border-ring outline-none transition-colors"
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
