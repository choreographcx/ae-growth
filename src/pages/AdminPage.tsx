import { useState } from 'react';
import { CurrencySymbol } from '@/lib/currency';
import { useDashboard } from '@/context/DashboardContext';
import { supabase } from '@/integrations/supabase/client';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { PlatformKey, ClientProfile, BudgetType } from '@/types/dashboard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, Plus, X, Upload, Download, Building2, Clock, Users, Check, Palette, LayoutGrid, BarChart3, FileText, Bell, Package, ChevronDown, Settings2, Eye, Activity, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserManagement } from '@/components/admin/UserManagement';
import { useAuth } from '@/hooks/useAuth';
import { SetupStatusSummary, AdminSection, SectionPlaceholder } from '@/components/admin/AdminSections';
import { platformIconEntries } from '@/lib/platformIcons';
import { BrandingThemeSection } from '@/components/admin/BrandingThemeSection';
import { MeasurementSetupSection } from '@/components/admin/MeasurementSetupSection';
import { ReportingRulesSection } from '@/components/admin/ReportingRulesSection';
import { AlertRulesSection } from '@/components/admin/AlertRulesSection';
import { TemplatesPortabilitySection } from '@/components/admin/TemplatesPortabilitySection';

const allPlatforms: { key: PlatformKey; label: string; idLabel: string; placeholder: string }[] = [
  { key: 'meta', label: 'Meta', idLabel: 'Ad Account ID(s)', placeholder: 'act_123456789' },
  { key: 'google', label: 'Google Ads', idLabel: 'Customer ID(s)', placeholder: '123-456-7890' },
  { key: 'tiktok', label: 'TikTok', idLabel: 'Ad Account ID(s)', placeholder: 'tt_123456789' },
  { key: 'snapchat', label: 'Snapchat', idLabel: 'Ad Account ID(s)', placeholder: 'sc_123456789' },
  { key: 'x', label: 'X', idLabel: 'Account ID(s)', placeholder: 'x_123456789' },
  { key: 'linkedin', label: 'LinkedIn', idLabel: 'Account ID(s)', placeholder: 'li_123456789' },
  { key: 'programmatic', label: 'Programmatic', idLabel: 'Advertiser / Seat / Partner ID(s)', placeholder: 'prog_123456789' },
];

const standardMetrics = [
  'Primary Conversion', 'Secondary Conversion', 'Landing Page View',
  'Lead Form Submission', 'Phone Call Lead', 'WhatsApp Lead', 'Custom Conversion',
];

const KPI_OPTIONS = ['conversions', 'leads', 'clicks', 'impressions', 'reach', 'video_views', 'app_installs', 'landing_page_views'];
const CONVERSION_SOURCE_OPTIONS = ['pixel', 'tag', 'insight_tag', 'capi', 'offline', 'ga4', 'manual'];
const BUDGET_TYPE_OPTIONS: { value: BudgetType; label: string }[] = [
  { value: 'annual', label: 'Annual' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'custom', label: 'Custom' },
];

export default function AdminPage() {
  const { client, updateClient, togglePlatform, saveConfig, isSaving, lastSavedAt } = useDashboard();
  const { isAdmin } = useAuth();

  const enabledCount = Object.values(client.platforms).filter(p => p.enabled).length;
  const totalAccounts = Object.values(client.platforms).reduce((sum, p) => sum + p.accountIds.filter(Boolean).length, 0);
  const needsSetup = Object.values(client.platforms).filter(p => p.enabled && p.accountIds.filter(Boolean).length === 0).length;

  const currency = client.currency;

  const formatBudgetNumber = (n: number) => n.toLocaleString();
  const parseBudgetString = (s: string) => Number(s.replace(/,/g, '')) || 0;

  const updatePlatform = (key: PlatformKey, updates: Partial<ClientProfile['platforms'][PlatformKey]>) => {
    updateClient({
      platforms: {
        ...client.platforms,
        [key]: { ...client.platforms[key], ...updates },
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <SectionHeader title="Admin / Settings" subtitle="Configure your paid media dashboard" />
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => toast.info('JSON exported to clipboard')} className="gap-1.5 h-8 text-xs text-muted-foreground"><Download size={12} /> Export</Button>
            <Button size="sm" variant="ghost" onClick={() => toast.info('Import dialog opened')} className="gap-1.5 h-8 text-xs text-muted-foreground"><Upload size={12} /> Import</Button>
          </div>
          <div className="hidden md:flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock size={10} />
            <span>Last saved: {lastSavedAt ?? 'Never'}</span>
          </div>
          <Button size="sm" onClick={saveConfig} disabled={isSaving} className="gap-1.5 h-8 text-xs"><Save size={12} /> {isSaving ? 'Saving…' : 'Save'}</Button>
        </div>
      </div>

      {/* Setup Status Summary */}
      <SetupStatusSummary />

      {/* Client Setup — kept exactly as-is */}
      <Accordion type="multiple" defaultValue={['client']} className="space-y-3">
        <AccordionItem value="client" className="bg-card rounded-xl border border-border shadow-sm px-6 data-[state=open]:shadow-md transition-shadow">
          <AccordionTrigger className="text-sm font-semibold text-card-foreground hover:no-underline py-5">
            <div className="flex items-center gap-2">Client Setup <Badge variant="secondary" className="text-[9px] font-normal ml-1">{client.name}</Badge></div>
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <Field label="Client Name" value={client.name} onChange={v => updateClient({ name: v })} required />
              <CurrencySelectField label="Reporting Currency" value={client.currency} onChange={v => updateClient({ currency: v })} />
              {client.currency === 'SAR' && (
                <RateField
                  label="USD → SAR Rate"
                  value={client.usdToSarRate}
                  onChange={v => updateClient({ usdToSarRate: v })}
                  helper="Applied to platforms reporting in USD."
                />
              )}
              {client.currency === 'AED' && (
                <RateField
                  label="USD → AED Rate"
                  value={client.usdToAedRate}
                  onChange={v => updateClient({ usdToAedRate: v })}
                  helper="Applied to platforms reporting in USD."
                />
              )}
              <SelectField label="Time Zone" value={client.timezone} options={['Asia/Dubai', 'Asia/Riyadh']} onChange={v => updateClient({ timezone: v })} />
              <SelectField label="Default Date Range" value={client.defaultDateRange} options={['last_7_days', 'last_14_days', 'last_30_days', 'this_month', 'last_month']} onChange={v => updateClient({ defaultDateRange: v })} />
              <SelectField label="Week Start Day" value={client.weekStartDay} options={['Monday', 'Sunday']} onChange={v => updateClient({ weekStartDay: v })} />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* New Section Layout */}
      <div className="space-y-3">

        {/* 1. Branding & Theme */}
        <AdminSection
          id="branding"
          icon={<Palette size={16} />}
          title="Branding & Theme"
          subtitle="Client logo, colors, and visual customization"
          badge={
            (client as any).branding?.primaryColor
              ? <Badge variant="secondary" className="text-[9px] font-normal border-emerald-200 text-emerald-600 bg-emerald-50">Configured</Badge>
              : <Badge variant="outline" className="text-[9px] font-normal border-amber-200 text-amber-600 bg-amber-50">Not Configured</Badge>
          }
        >
          <BrandingThemeSection
            branding={(client as any).branding}
            onChange={b => updateClient({ branding: b } as any)}
          />
        </AdminSection>

        {/* 2. Platform Setup — Full Modular Cards */}
        <AdminSection
          id="platforms"
          icon={<LayoutGrid size={16} />}
          title="Platform Setup"
          subtitle="Enable platforms, set budgets, and manage account connections"
          badge={<Badge variant="secondary" className="text-[9px] font-normal">{enabledCount} / {allPlatforms.length} platforms</Badge>}
        >
          {/* Platform summary strip */}
          <div className="flex flex-wrap items-center gap-4 py-3 mb-4 border-b border-border/50 text-xs text-muted-foreground">
            <span><strong className="text-card-foreground">{enabledCount}</strong> enabled</span>
            <span><strong className="text-card-foreground">{totalAccounts}</strong> connected accounts</span>
            <span>
              <strong className="text-card-foreground">
                <CurrencySymbol currency={currency} />
                {Object.values(client.platforms).filter(p => p.enabled).reduce((s, p) => s + (p.budget || 0), 0).toLocaleString()}
              </strong> total budget
            </span>
            {needsSetup > 0 && (
              <span className="text-amber-600">{needsSetup} need setup</span>
            )}
          </div>

          {/* Modular Platform Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {allPlatforms.map(p => (
              <ModularPlatformCard
                key={p.key}
                platform={p}
                cfg={client.platforms[p.key]}
                currency={currency}
                togglePlatform={togglePlatform}
                updatePlatform={updatePlatform}
                formatBudgetNumber={formatBudgetNumber}
                parseBudgetString={parseBudgetString}
              />
            ))}
          </div>
        </AdminSection>

        {/* 3. Measurement Setup */}
        <AdminSection
          id="measurement"
          icon={<BarChart3 size={16} />}
          title="Measurement Setup"
          subtitle="Analytics, tracking, and conversion configuration"
          badge={
            client.ga4PropertyId && client.primaryConversion
              ? <Badge variant="secondary" className="text-[9px] font-normal border-emerald-200 text-emerald-600 bg-emerald-50">Configured</Badge>
              : <Badge variant="outline" className="text-[9px] font-normal border-amber-200 text-amber-600 bg-amber-50">Incomplete</Badge>
          }
        >
          <MeasurementSetupSection client={client} updateClient={updateClient} />
        </AdminSection>

        {/* 4. Reporting Rules */}
        <AdminSection
          id="reporting"
          icon={<FileText size={16} />}
          title="Reporting Rules"
          subtitle="Metric mapping, naming normalization, aliases, and taxonomy"
          badge={<Badge variant="secondary" className="text-[9px] font-normal">{client.metricMappings.length} mappings</Badge>}
        >
          <ReportingRulesSection client={client} updateClient={updateClient} />
        </AdminSection>

        {/* 5. Alert Rules */}
        <AdminSection
          id="alerts"
          icon={<Bell size={16} />}
          title="Alert Rules"
          subtitle="Configure thresholds, severity levels, and alert policies"
          badge={
            <Badge variant="secondary" className="text-[9px] font-normal">
              {((client as any).alertRules ?? []).filter((r: any) => r?.active).length || Object.values(client.alertThresholds).filter(v => v > 0).length} active
            </Badge>
          }
        >
          <AlertRulesSection
            alertRules={(client as any).alertRules}
            onChange={rules => updateClient({ alertRules: rules } as any)}
          />
        </AdminSection>

        {/* 6. Users & Access */}
        <AdminSection
          id="users"
          icon={<Users size={16} />}
          title="Users & Access"
          subtitle="Manage team members, roles, and permissions"
          badge={isAdmin ? undefined : <Badge variant="outline" className="text-[9px] font-normal">Admin only</Badge>}
        >
          {isAdmin ? (
            <div className="pt-4">
              <UserManagement />
            </div>
          ) : (
            <SectionPlaceholder description="You need admin permissions to manage users." />
          )}
        </AdminSection>

        {/* 7. Templates & Portability */}
        <AdminSection
          id="templates"
          icon={<Package size={16} />}
          title="Templates & Portability"
          subtitle="Export, import, and reuse dashboard configurations across clients"
          badge={
            <Badge variant="secondary" className="text-[9px] font-normal">
              {Math.round((Object.entries({
                client_info: !!client.name,
                branding: !!(client as any).branding?.primaryColor,
                platforms: Object.values(client.platforms).some(p => p.enabled),
                measurement: !!(client.ga4PropertyId && client.primaryConversion),
                reporting: client.metricMappings.length > 0,
                alerts: ((client as any).alertRules ?? []).some((r: any) => r?.active),
              }).filter(([, v]) => v).length / 6) * 100)}% complete
            </Badge>
          }
        >
          <TemplatesPortabilitySection client={client} />
        </AdminSection>

      </div>
    </div>
  );
}

/* ─── Modular Platform Card ─── */
function ModularPlatformCard({
  platform: p,
  cfg,
  currency,
  togglePlatform,
  updatePlatform,
  formatBudgetNumber,
  parseBudgetString,
}: {
  platform: typeof allPlatforms[0];
  cfg: ClientProfile['platforms'][PlatformKey];
  currency: string;
  togglePlatform: (k: PlatformKey) => void;
  updatePlatform: (key: PlatformKey, updates: Partial<ClientProfile['platforms'][PlatformKey]>) => void;
  formatBudgetNumber: (n: number) => string;
  parseBudgetString: (s: string) => number;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const hasIds = cfg.accountIds.filter(Boolean).length > 0;

  const iconEntry = platformIconEntries[p.key];
  const PlatformIcon = iconEntry.type === 'custom'
    ? iconEntry.Component
    : ({ size, className }: { size?: number; className?: string }) => {
        const Icon = iconEntry.icon;
        return <Icon size={size} className={className} />;
      };

  const statusBadge = () => {
    if (!cfg.enabled) return <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border text-muted-foreground">Disabled</Badge>;
    if (!hasIds) return <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-300 text-amber-600 bg-amber-50">Missing ID</Badge>;
    return <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-300 text-emerald-600 bg-emerald-50">Connected</Badge>;
  };

  return (
    <div className={cn(
      'rounded-xl border-2 transition-all duration-200 overflow-hidden',
      cfg.enabled ? 'border-primary/20 bg-card shadow-sm' : 'border-border bg-muted/10 opacity-75'
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className={cn(
          'flex items-center justify-center w-9 h-9 rounded-lg shrink-0',
          cfg.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        )}>
          <PlatformIcon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-card-foreground">{p.label}</h4>
            {statusBadge()}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {cfg.accountIds.filter(Boolean).length} account{cfg.accountIds.filter(Boolean).length !== 1 ? 's' : ''}
            {cfg.enabled && cfg.budget > 0 && (
              <> · <CurrencySymbol currency={currency} />{formatBudgetNumber(cfg.budget)}</>
            )}
          </p>
        </div>
        <Switch checked={cfg.enabled} onCheckedChange={() => togglePlatform(p.key)} />
      </div>

      {/* Main Content — only when enabled */}
      {cfg.enabled && (
        <div className="px-5 pb-4 space-y-4 border-t border-border/40">
          {/* Budget row */}
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

          {/* KPI & Conversion Source row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Primary KPI</Label>
              <Select value={cfg.primaryKpi || 'conversions'} onValueChange={v => updatePlatform(p.key, { primaryKpi: v })}>
                <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KPI_OPTIONS.map(o => <SelectItem key={o} value={o}>{o.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Conversion Source</Label>
              <Select value={cfg.conversionSource || 'pixel'} onValueChange={v => updatePlatform(p.key, { conversionSource: v })}>
                <SelectTrigger className="mt-1.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONVERSION_SOURCE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Account IDs */}
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Account IDs</Label>
            <div className="mt-1.5 space-y-1.5">
              {cfg.accountIds.map((id, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Input
                    value={id}
                    onChange={e => {
                      const updated = [...cfg.accountIds];
                      updated[i] = e.target.value;
                      updatePlatform(p.key, { accountIds: updated });
                    }}
                    placeholder={p.placeholder}
                    className="flex-1 h-7 text-xs font-mono"
                  />
                  <button
                    onClick={() => updatePlatform(p.key, { accountIds: cfg.accountIds.filter((_, idx) => idx !== i) })}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => updatePlatform(p.key, { accountIds: [...cfg.accountIds, ''] })}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Plus size={10} /> Add Account ID
              </button>
            </div>
          </div>

          {/* Toggles row */}
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <Switch checked={cfg.includeInOverview ?? true} onCheckedChange={v => updatePlatform(p.key, { includeInOverview: v })} className="scale-75 origin-left" />
              <Eye size={12} /> Overview
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <Switch checked={cfg.includeInDiagnostics ?? true} onCheckedChange={v => updatePlatform(p.key, { includeInDiagnostics: v })} className="scale-75 origin-left" />
              <Activity size={12} /> Diagnostics
            </label>
          </div>

          {/* Footer status line */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {hasIds ? <Wifi size={10} className="text-emerald-500" /> : <WifiOff size={10} className="text-amber-500" />}
              <span>{hasIds ? 'Connected' : 'Not connected'}</span>
            </div>
            <button
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings2 size={10} />
              Advanced
              <ChevronDown size={10} className={cn('transition-transform duration-200', advancedOpen && 'rotate-180')} />
            </button>
          </div>

          {/* Advanced Settings */}
          {advancedOpen && (
            <div className="pt-3 border-t border-border/30 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Source Label Override</Label>
                  <Input
                    value={cfg.sourceLabel || ''}
                    onChange={e => updatePlatform(p.key, { sourceLabel: e.target.value })}
                    placeholder={p.label}
                    className="mt-1 h-7 text-xs"
                  />
                </div>
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
                  placeholder="Platform-specific notes, sync details, API info..."
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

/* ─── Form Components ─── */

function Field({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <div>
      {label && (
        <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">
          {label}{required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <Input className={cn(label ? "mt-1.5" : "", "h-9 text-sm")} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      {label && <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</Label>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(label ? "mt-1.5" : "", "h-9 text-sm")}><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

const CURRENCY_OPTIONS = ['USD', 'SAR', 'AED'];

function CurrencySelectField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      {label && <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</Label>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1.5 h-9 text-sm">
          <span className="inline-flex items-baseline">
            <CurrencySymbol currency={value} size={14} />&nbsp;{value}
          </span>
        </SelectTrigger>
        <SelectContent>
          {CURRENCY_OPTIONS.map(o => (
            <SelectItem key={o} value={o}>
              <span className="inline-flex items-baseline">
                <CurrencySymbol currency={o} size={14} />&nbsp;{o}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ThresholdField({ label, value, onChange, helper }: { label: string; value: number; onChange: (v: number) => void; helper?: string }) {
  return (
    <div>
      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</Label>
      <Input type="number" className="mt-1.5 h-9 text-sm" value={value} onChange={e => onChange(Number(e.target.value))} />
      {helper && <p className="text-[10px] text-muted-foreground mt-1">{helper}</p>}
    </div>
  );
}

function RateField({ label, value, onChange, helper }: { label: string; value: number; onChange: (v: number) => void; helper?: string }) {
  return (
    <div>
      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</Label>
      <Input
        type="number"
        step="0.0001"
        min="0"
        className="mt-1.5 h-9 text-sm tabular-nums"
        value={Number.isFinite(value) ? value : 0}
        onChange={e => onChange(Number(e.target.value) || 0)}
      />
      {helper && <p className="text-[10px] text-muted-foreground mt-1">{helper}</p>}
    </div>
  );
}