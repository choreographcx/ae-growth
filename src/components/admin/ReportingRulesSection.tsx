import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientProfile, PlatformKey } from '@/types/dashboard';
import { X, Plus, AlertTriangle, CheckCircle2, ArrowRight, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLATFORMS: { key: PlatformKey; label: string }[] = [
  { key: 'meta', label: 'Meta' },
  { key: 'google', label: 'Google Ads' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'snapchat', label: 'Snapchat' },
  { key: 'x', label: 'X' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'programmatic', label: 'Programmatic' },
];

const STANDARD_METRICS = [
  'Primary Conversion', 'Secondary Conversion', 'Landing Page View',
  'Lead Form Submission', 'Phone Call Lead', 'WhatsApp Lead', 'Custom Conversion',
];

const TAXONOMY_DIMENSIONS = [
  'Brand', 'Business Unit', 'Campaign', 'Year', 'Quarter', 'Market', 'Language',
  'Audience Type', 'Channel', 'Platform Group', 'Buying Type', 'Objective',
  'Destination', 'Bid Model', 'Funnel Stage', 'Creative Type', 'Audience',
  'Conversion Type', 'Product / Offer', 'Internal ID',
];

const DEMO_CAMPAIGN = 'Castrol|Castrol Retail|Castrol Master Brand|2025|Q4|UAE|ENG|B2C|Social|FB_IG|PR|COV|WC|CPM|Prospecting|Static|All|Conversion|RewardsProgramm|7772';

interface AliasEntry {
  rawName: string;
  friendlyName: string;
  shortName: string;
  type: 'Campaign' | 'Ad Set' | 'Ad' | 'Placement' | 'Audience';
  active: boolean;
  notes: string;
}

interface TaxonomyToken {
  token: string;
  dimension: string;
  meaning: string;
  friendlyLabel: string;
  status: 'active' | 'draft' | 'deprecated';
  notes: string;
}

interface LabelOverride {
  systemLabel: string;
  clientLabel: string;
  active: boolean;
}

const DEFAULT_TOKENS: TaxonomyToken[] = [
  { token: 'FB_IG', dimension: 'Platform Group', meaning: 'Facebook & Instagram', friendlyLabel: 'Meta', status: 'active', notes: '' },
  { token: 'COV', dimension: 'Objective', meaning: 'Conversions', friendlyLabel: 'Conversions', status: 'active', notes: '' },
  { token: 'WC', dimension: 'Destination', meaning: 'Website', friendlyLabel: 'Website Click', status: 'active', notes: '' },
  { token: 'PR', dimension: 'Funnel Stage', meaning: 'Prospecting', friendlyLabel: 'Prospecting', status: 'active', notes: '' },
  { token: 'CPM', dimension: 'Bid Model', meaning: 'Cost Per Mille', friendlyLabel: 'CPM', status: 'active', notes: '' },
];

const DEFAULT_LABEL_OVERRIDES: LabelOverride[] = [
  { systemLabel: 'Conversions', clientLabel: 'Leads', active: false },
  { systemLabel: 'CPA', clientLabel: 'Cost Per Lead', active: false },
  { systemLabel: 'Landing Page Views', clientLabel: 'Landing Page Visits', active: false },
  { systemLabel: 'Reach', clientLabel: 'Unique Reach', active: false },
];

const DEFAULT_ALIASES: AliasEntry[] = [];

interface Props {
  client: ClientProfile;
  updateClient: (u: Partial<ClientProfile>) => void;
}

type TabKey = 'mapping' | 'naming' | 'aliases' | 'taxonomy' | 'labels' | 'suppression';

/** Default Meta duplicate conversion event names to suppress out of the box. */
const DEFAULT_META_SUPPRESSION: string[] = [
  'omni_initiated_checkout',
  'offsite_conversion.fb_pixel_initiate_checkout',
  'onsite_web_initiate_checkout',
  'onsite_conversion.lead_grouped',
  'offsite_search_add_meta_leads',
  'offsite_content_view_add_meta_leads',
  'offsite_complete_registration_add_meta_leads',
  'onsite_web_app_purchase',
  'offsite_conversion.fb_pixel_purchase',
  'omni_purchase',
  'web_in_store_purchase',
  'onsite_web_purchase',
  'omni_landing_page_view',
  'offsite_conversion.fb_pixel_add_payment_info',
];

export const DEFAULT_CONVERSION_SUPPRESSION: Record<PlatformKey, string[]> = {
  meta: DEFAULT_META_SUPPRESSION,
  google: [], tiktok: [], snapchat: [], x: [], linkedin: [], programmatic: [],
};

export function ReportingRulesSection({ client, updateClient }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('mapping');
  const reporting = (client as any).reporting ?? {};
  const updateReporting = (updates: Record<string, any>) => {
    updateClient({ reporting: { ...reporting, ...updates } } as any);
  };

  const aliases: AliasEntry[] = reporting.aliases ?? DEFAULT_ALIASES;
  const tokens: TaxonomyToken[] = reporting.taxonomyTokens ?? DEFAULT_TOKENS;
  const labelOverrides: LabelOverride[] = reporting.labelOverrides ?? DEFAULT_LABEL_OVERRIDES;
  const delimiter = reporting.delimiter ?? '|';
  const dimensionOrder: string[] = reporting.dimensionOrder ?? TAXONOMY_DIMENSIONS;

  const suppression: Record<PlatformKey, string[]> = {
    ...DEFAULT_CONVERSION_SUPPRESSION,
    ...(reporting.conversionSuppression ?? {}),
  };
  const suppressionCount = Object.values(suppression).reduce((s, arr) => s + (arr?.length || 0), 0);

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'mapping', label: 'Metric Mapping', count: client.metricMappings.length },
    { key: 'naming', label: 'Naming Normalization' },
    { key: 'aliases', label: 'Alias Manager', count: aliases.length },
    { key: 'taxonomy', label: 'Taxonomy Dictionary', count: tokens.length },
    { key: 'labels', label: 'Label Overrides', count: labelOverrides.filter(l => l.active).length },
    { key: 'suppression', label: 'Conversion Suppression', count: suppressionCount },
  ];

  return (
    <div className="pt-4 space-y-4">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-0.5">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'px-3 py-2 text-xs font-medium rounded-t-md transition-colors border-b-2 -mb-[3px]',
              activeTab === t.key
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <Badge variant="secondary" className="ml-1.5 text-[9px] px-1.5 py-0">{t.count}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'mapping' && <MetricMappingPanel client={client} updateClient={updateClient} />}
      {activeTab === 'naming' && (
        <NamingNormalizationPanel
          client={client}
          updateClient={updateClient}
          delimiter={delimiter}
          dimensionOrder={dimensionOrder}
          onDelimiterChange={v => updateReporting({ delimiter: v })}
          onDimensionOrderChange={v => updateReporting({ dimensionOrder: v })}
        />
      )}
      {activeTab === 'aliases' && <AliasManagerPanel aliases={aliases} onChange={v => updateReporting({ aliases: v })} />}
      {activeTab === 'taxonomy' && <TaxonomyDictionaryPanel tokens={tokens} onChange={v => updateReporting({ taxonomyTokens: v })} />}
      {activeTab === 'labels' && <LabelOverridesPanel overrides={labelOverrides} onChange={v => updateReporting({ labelOverrides: v })} />}
      {activeTab === 'suppression' && (
        <ConversionSuppressionPanel
          suppression={suppression}
          onChange={v => updateReporting({ conversionSuppression: v })}
        />
      )}
    </div>
  );
}

/* ─── Conversion Suppression ─── */
function ConversionSuppressionPanel({
  suppression, onChange,
}: { suppression: Record<PlatformKey, string[]>; onChange: (v: Record<PlatformKey, string[]>) => void }) {
  const [activePlatform, setActivePlatform] = useState<PlatformKey>('meta');
  const [draft, setDraft] = useState('');
  const list = suppression[activePlatform] ?? [];

  const update = (next: string[]) => {
    onChange({ ...suppression, [activePlatform]: next });
  };

  const addNames = (raw: string) => {
    const names = raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    if (!names.length) return;
    const set = new Set(list.map(s => s.toLowerCase()));
    const merged = [...list];
    for (const n of names) {
      if (!set.has(n.toLowerCase())) {
        merged.push(n);
        set.add(n.toLowerCase());
      }
    }
    update(merged);
    setDraft('');
  };

  const remove = (name: string) => update(list.filter(n => n !== name));
  const resetMeta = () => {
    if (activePlatform === 'meta') {
      onChange({ ...suppression, meta: [...DEFAULT_META_SUPPRESSION] });
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Conversion event names listed here are excluded from the Conversion Breakdown card on the matching platform page. Useful for hiding duplicate or platform-derived events. Case-insensitive.
      </p>

      {/* Platform tabs */}
      <div className="flex flex-wrap gap-1.5">
        {PLATFORMS.map(p => {
          const count = (suppression[p.key] ?? []).length;
          return (
            <button
              key={p.key}
              onClick={() => setActivePlatform(p.key)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-md border transition-colors',
                activePlatform === p.key
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              )}
            >
              {p.label}
              {count > 0 && <span className="ml-1.5 text-[9px] opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Add input */}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); addNames(draft); }
          }}
          placeholder="e.g. omni_purchase  (paste multiple separated by commas or newlines)"
          className="h-8 text-xs font-mono"
        />
        <Button size="sm" onClick={() => addNames(draft)} className="gap-1.5 text-xs shrink-0">
          <Plus size={12} /> Add
        </Button>
        {activePlatform === 'meta' && (
          <Button size="sm" variant="ghost" onClick={resetMeta} className="text-xs text-muted-foreground shrink-0">
            Reset defaults
          </Button>
        )}
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div className="text-xs text-muted-foreground italic px-3 py-6 border border-dashed border-border rounded-lg text-center">
          No suppressed conversion events for {PLATFORMS.find(p => p.key === activePlatform)?.label}.
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {list.map(name => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-md border border-border bg-muted/20 text-[11px] font-mono text-card-foreground"
            >
              {name}
              <button
                onClick={() => remove(name)}
                className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                aria-label={`Remove ${name}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Metric Mapping ─── */
function MetricMappingPanel({ client, updateClient }: Props) {
  return (
    <div className="space-y-2.5">
      <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_28px_28px] gap-3 px-3 text-[10px] text-muted-foreground uppercase tracking-wider">
        <span>Standard Label</span><span>Platform Metric</span><span>Platform</span><span /><span />
      </div>
      {client.metricMappings.map((mapping, i) => (
        <div key={i} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/10 hover:bg-muted/20 transition-colors">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <SmallSelect value={mapping.standardLabel} options={STANDARD_METRICS} onChange={v => {
              const u = [...client.metricMappings]; u[i] = { ...u[i], standardLabel: v }; updateClient({ metricMappings: u });
            }} />
            <Input className="h-8 text-xs" value={mapping.platformMetric} onChange={e => {
              const u = [...client.metricMappings]; u[i] = { ...u[i], platformMetric: e.target.value }; updateClient({ metricMappings: u });
            }} placeholder="e.g. purchase" />
            <SmallSelect value={mapping.platform} options={PLATFORMS.map(p => p.key)} onChange={v => {
              const u = [...client.metricMappings]; u[i] = { ...u[i], platform: v as PlatformKey }; updateClient({ metricMappings: u });
            }} />
          </div>
          <button onClick={() => updateClient({ metricMappings: client.metricMappings.filter((_, idx) => idx !== i) })} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
            <X size={13} />
          </button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => updateClient({ metricMappings: [...client.metricMappings, { standardLabel: 'Primary Conversion', platformMetric: '', platform: 'meta' }] })} className="gap-1.5 mt-1 text-xs">
        <Plus size={12} /> Add Mapping
      </Button>
    </div>
  );
}

/* ─── Naming Normalization ─── */
function NamingNormalizationPanel({ client, updateClient, delimiter, dimensionOrder, onDelimiterChange, onDimensionOrderChange }: Props & {
  delimiter: string;
  dimensionOrder: string[];
  onDelimiterChange: (v: string) => void;
  onDimensionOrderChange: (v: string[]) => void;
}) {
  const [parserInput, setParserInput] = useState(DEMO_CAMPAIGN);

  const parsedTokens = useMemo(() => {
    const parts = parserInput.split(delimiter);
    return dimensionOrder.map((dim, i) => ({
      dimension: dim,
      value: parts[i] ?? '',
      status: parts[i] ? 'matched' : 'missing',
    }));
  }, [parserInput, delimiter, dimensionOrder]);

  const friendlyPreview = useMemo(() => {
    const parts = parserInput.split(delimiter);
    const picks = [2, 5, 14, 15].map(i => parts[i]).filter(Boolean);
    return picks.join(' | ');
  }, [parserInput, delimiter]);

  const unknownCount = parsedTokens.filter(t => !t.value).length;

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const newOrder = [...dimensionOrder];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    onDimensionOrderChange(newOrder);
  };
  const moveDown = (idx: number) => {
    if (idx >= dimensionOrder.length - 1) return;
    const newOrder = [...dimensionOrder];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    onDimensionOrderChange(newOrder);
  };

  return (
    <div className="space-y-6">
      {/* Templates */}
      <div>
        <h4 className="text-xs font-semibold text-card-foreground uppercase tracking-wider mb-3">Naming Templates</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SmallField label="Delimiter" value={delimiter} onChange={onDelimiterChange} placeholder="|" />
          <SmallField label="Campaign" value={client.namingNormalization.campaign} onChange={v => updateClient({ namingNormalization: { ...client.namingNormalization, campaign: v } })} />
          <SmallField label="Ad Set / Ad Group" value={client.namingNormalization.adSetOrAdGroup} onChange={v => updateClient({ namingNormalization: { ...client.namingNormalization, adSetOrAdGroup: v } })} />
          <SmallField label="Ad / Creative" value={client.namingNormalization.adOrCreative} onChange={v => updateClient({ namingNormalization: { ...client.namingNormalization, adOrCreative: v } })} />
          <SmallField label="Placement" value={client.namingNormalization.placement} onChange={v => updateClient({ namingNormalization: { ...client.namingNormalization, placement: v } })} />
          <SmallField label="Audience" value={client.namingNormalization.audience} onChange={v => updateClient({ namingNormalization: { ...client.namingNormalization, audience: v } })} />
          <SmallField label="Objective" value={client.namingNormalization.objective} onChange={v => updateClient({ namingNormalization: { ...client.namingNormalization, objective: v } })} />
        </div>
      </div>

      {/* Dimension Order */}
      <div className="pt-4 border-t border-border/50">
        <h4 className="text-xs font-semibold text-card-foreground uppercase tracking-wider mb-3">Taxonomy Dimension Order</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
          {dimensionOrder.map((dim, i) => (
            <div key={dim} className="flex items-center gap-1 px-2 py-1.5 rounded-md border border-border bg-muted/10 text-xs">
              <span className="text-[9px] text-muted-foreground font-mono w-4 shrink-0">{i + 1}</span>
              <span className="flex-1 truncate text-card-foreground">{dim}</span>
              <div className="flex flex-col shrink-0">
                <button onClick={() => moveUp(i)} className="text-muted-foreground hover:text-foreground text-[8px] leading-none">▲</button>
                <button onClick={() => moveDown(i)} className="text-muted-foreground hover:text-foreground text-[8px] leading-none">▼</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Parser Preview */}
      <div className="pt-4 border-t border-border/50">
        <h4 className="text-xs font-semibold text-card-foreground uppercase tracking-wider mb-3">Naming Parser Preview</h4>
        <div className="space-y-3">
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Raw Campaign Name</Label>
            <textarea
              value={parserInput}
              onChange={e => setParserInput(e.target.value)}
              className="mt-1.5 w-full border border-input rounded-lg p-3 text-xs font-mono bg-background text-foreground resize-none focus:ring-1 focus:ring-ring focus:border-ring outline-none transition-colors"
              rows={2}
            />
          </div>

          {/* Parsed Result */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="bg-muted/30 px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="text-[10px] font-semibold text-card-foreground uppercase tracking-wider">Parsed Dimensions</span>
              <div className="flex items-center gap-2">
                {unknownCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-600">
                    <AlertTriangle size={10} /> {unknownCount} unmatched
                  </span>
                )}
                <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                  <CheckCircle2 size={10} /> {parsedTokens.filter(t => t.value).length} matched
                </span>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {parsedTokens.map((t, i) => (
                <div key={i} className={cn(
                  'grid grid-cols-[140px_1fr] gap-3 px-3 py-1.5 text-xs border-b border-border/30 last:border-0',
                  !t.value && 'opacity-40'
                )}>
                  <span className="text-muted-foreground truncate">{t.dimension}</span>
                  <span className={cn('font-mono', t.value ? 'text-card-foreground' : 'text-muted-foreground italic')}>
                    {t.value || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Friendly Preview */}
          {friendlyPreview && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Friendly Display Name</p>
              <p className="text-sm font-medium text-card-foreground">{friendlyPreview}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Alias Manager ─── */
function AliasManagerPanel({ aliases, onChange }: { aliases: AliasEntry[]; onChange: (v: AliasEntry[]) => void }) {
  const addAlias = () => onChange([...aliases, { rawName: '', friendlyName: '', shortName: '', type: 'Campaign', active: true, notes: '' }]);
  return (
    <div className="space-y-2.5">
      <div className="hidden sm:grid grid-cols-[1fr_1fr_80px_80px_36px_28px] gap-2 px-3 text-[10px] text-muted-foreground uppercase tracking-wider">
        <span>Raw Name</span><span>Friendly Name</span><span>Short</span><span>Type</span><span>Active</span><span />
      </div>
      {aliases.map((a, i) => (
        <div key={i} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/10 hover:bg-muted/20 transition-colors">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_1fr_80px_80px_36px] gap-2 items-center">
            <Input className="h-7 text-xs font-mono" value={a.rawName} onChange={e => { const u = [...aliases]; u[i] = { ...u[i], rawName: e.target.value }; onChange(u); }} placeholder="Raw name" />
            <Input className="h-7 text-xs" value={a.friendlyName} onChange={e => { const u = [...aliases]; u[i] = { ...u[i], friendlyName: e.target.value }; onChange(u); }} placeholder="Display name" />
            <Input className="h-7 text-xs" value={a.shortName} onChange={e => { const u = [...aliases]; u[i] = { ...u[i], shortName: e.target.value }; onChange(u); }} placeholder="Short" />
            <SmallSelect value={a.type} options={['Campaign', 'Ad Set', 'Ad', 'Placement', 'Audience']} onChange={v => { const u = [...aliases]; u[i] = { ...u[i], type: v as any }; onChange(u); }} />
            <div className="flex justify-center">
              <Switch checked={a.active} onCheckedChange={v => { const u = [...aliases]; u[i] = { ...u[i], active: v }; onChange(u); }} className="scale-75" />
            </div>
          </div>
          <button onClick={() => onChange(aliases.filter((_, idx) => idx !== i))} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
            <X size={13} />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={addAlias} className="gap-1.5 text-xs"><Plus size={12} /> Add Alias</Button>
        <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground" onClick={() => {}}><Plus size={12} /> Bulk Import</Button>
      </div>
    </div>
  );
}

/* ─── Taxonomy Dictionary ─── */
function TaxonomyDictionaryPanel({ tokens, onChange }: { tokens: TaxonomyToken[]; onChange: (v: TaxonomyToken[]) => void }) {
  const addToken = () => onChange([...tokens, { token: '', dimension: '', meaning: '', friendlyLabel: '', status: 'draft', notes: '' }]);
  return (
    <div className="space-y-2.5">
      <div className="hidden sm:grid grid-cols-[80px_120px_1fr_100px_70px_28px] gap-2 px-3 text-[10px] text-muted-foreground uppercase tracking-wider">
        <span>Token</span><span>Dimension</span><span>Meaning</span><span>Label</span><span>Status</span><span />
      </div>
      {tokens.map((t, i) => (
        <div key={i} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/10 hover:bg-muted/20 transition-colors">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-[80px_120px_1fr_100px_70px] gap-2 items-center">
            <Input className="h-7 text-xs font-mono font-bold" value={t.token} onChange={e => { const u = [...tokens]; u[i] = { ...u[i], token: e.target.value }; onChange(u); }} placeholder="Token" />
            <SmallSelect value={t.dimension} options={TAXONOMY_DIMENSIONS} onChange={v => { const u = [...tokens]; u[i] = { ...u[i], dimension: v }; onChange(u); }} />
            <Input className="h-7 text-xs" value={t.meaning} onChange={e => { const u = [...tokens]; u[i] = { ...u[i], meaning: e.target.value }; onChange(u); }} placeholder="Full meaning" />
            <Input className="h-7 text-xs" value={t.friendlyLabel} onChange={e => { const u = [...tokens]; u[i] = { ...u[i], friendlyLabel: e.target.value }; onChange(u); }} placeholder="Label" />
            <Badge variant="outline" className={cn('text-[9px] justify-center cursor-pointer', 
              t.status === 'active' ? 'border-emerald-300 text-emerald-600' :
              t.status === 'deprecated' ? 'border-red-300 text-red-600' : 'border-border text-muted-foreground'
            )} onClick={() => {
              const next = t.status === 'active' ? 'deprecated' : t.status === 'deprecated' ? 'draft' : 'active';
              const u = [...tokens]; u[i] = { ...u[i], status: next as any }; onChange(u);
            }}>
              {t.status}
            </Badge>
          </div>
          <button onClick={() => onChange(tokens.filter((_, idx) => idx !== i))} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
            <X size={13} />
          </button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={addToken} className="gap-1.5 text-xs"><Plus size={12} /> Add Token</Button>
    </div>
  );
}

/* ─── Label Overrides ─── */
function LabelOverridesPanel({ overrides, onChange }: { overrides: LabelOverride[]; onChange: (v: LabelOverride[]) => void }) {
  const addOverride = () => onChange([...overrides, { systemLabel: '', clientLabel: '', active: false }]);
  return (
    <div className="space-y-2.5">
      <p className="text-xs text-muted-foreground mb-3">Override default dashboard labels with client-specific terminology.</p>
      <div className="hidden sm:grid grid-cols-[1fr_24px_1fr_50px_28px] gap-2 px-3 text-[10px] text-muted-foreground uppercase tracking-wider items-center">
        <span>System Label</span><span /><span>Client Label</span><span>Active</span><span />
      </div>
      {overrides.map((o, i) => (
        <div key={i} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/10 hover:bg-muted/20 transition-colors">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_24px_1fr_50px] gap-2 items-center">
            <Input className="h-7 text-xs" value={o.systemLabel} onChange={e => { const u = [...overrides]; u[i] = { ...u[i], systemLabel: e.target.value }; onChange(u); }} placeholder="System label" />
            <ArrowRight size={12} className="text-muted-foreground hidden sm:block mx-auto" />
            <Input className="h-7 text-xs font-medium" value={o.clientLabel} onChange={e => { const u = [...overrides]; u[i] = { ...u[i], clientLabel: e.target.value }; onChange(u); }} placeholder="Client label" />
            <div className="flex justify-center">
              <Switch checked={o.active} onCheckedChange={v => { const u = [...overrides]; u[i] = { ...u[i], active: v }; onChange(u); }} className="scale-75" />
            </div>
          </div>
          <button onClick={() => onChange(overrides.filter((_, idx) => idx !== i))} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
            <X size={13} />
          </button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={addOverride} className="gap-1.5 text-xs"><Plus size={12} /> Add Override</Button>
    </div>
  );
}

/* ─── Helpers ─── */
function SmallField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</Label>
      <Input className="mt-1.5 h-8 text-xs" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function SmallSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}
