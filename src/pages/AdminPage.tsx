import { useState } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { PlatformKey } from '@/types/dashboard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, CheckCircle, Plus, X, Upload, Download, Building2, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from '@/components/admin/UserManagement';
import { useAuth } from '@/hooks/useAuth';

const allPlatforms: { key: PlatformKey; label: string; idLabel: string; placeholder: string }[] = [
  { key: 'meta', label: 'Meta', idLabel: 'Ad Account ID(s)', placeholder: 'act_123456789' },
  { key: 'google', label: 'Google Ads', idLabel: 'Customer ID(s)', placeholder: '123-456-7890' },
  { key: 'tiktok', label: 'TikTok', idLabel: 'Ad Account ID(s)', placeholder: 'tt_123456789' },
  { key: 'snapchat', label: 'Snapchat', idLabel: 'Ad Account ID(s)', placeholder: 'sc_123456789' },
  { key: 'linkedin', label: 'LinkedIn', idLabel: 'Account ID(s)', placeholder: 'li_123456789' },
  { key: 'x', label: 'X', idLabel: 'Account ID(s)', placeholder: 'x_123456789' },
  { key: 'programmatic', label: 'Programmatic', idLabel: 'Advertiser / Seat / Partner ID(s)', placeholder: 'prog_123456789' },
];

const standardMetrics = [
  'Primary Conversion', 'Secondary Conversion', 'Landing Page View',
  'Lead Form Submission', 'Phone Call Lead', 'WhatsApp Lead', 'Custom Conversion',
];

export default function AdminPage() {
  const { client, updateClient, togglePlatform } = useDashboard();
  const { isAdmin } = useAuth();

  const enabledCount = Object.values(client.platforms).filter(p => p.enabled).length;
  const totalAccounts = Object.values(client.platforms).reduce((sum, p) => sum + p.accountIds.filter(Boolean).length, 0);

  return (
    <div className="space-y-8">
      <SectionHeader title="Admin / Settings" subtitle="Configure client profile, platforms, and tracking" />

      <Tabs defaultValue="configuration" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="configuration" className="gap-1.5"><Building2 size={14} /> Configuration</TabsTrigger>
          {isAdmin && <TabsTrigger value="users" className="gap-1.5"><Users size={14} /> User Management</TabsTrigger>}
        </TabsList>

        <TabsContent value="users">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <UserManagement />
          </div>
        </TabsContent>

        <TabsContent value="configuration">

      {/* Action bar */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Building2 size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-card-foreground">Configuration</h3>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock size={10} />
            <span>Last saved: Today, 2:45 PM</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => toast.success('Configuration saved')} className="gap-1.5 h-8 text-xs"><Save size={12} /> Save</Button>
          <Button size="sm" variant="outline" onClick={() => {
            if (!client.name || !client.code) {
              toast.error('Missing required fields: Client Name, Code');
            } else {
              toast.success('All required fields valid');
            }
          }} className="gap-1.5 h-8 text-xs"><CheckCircle size={12} /> Validate</Button>
          <div className="hidden sm:flex items-center gap-2 ml-auto">
            <Button size="sm" variant="ghost" onClick={() => toast.info('JSON exported to clipboard')} className="gap-1.5 h-8 text-xs text-muted-foreground"><Download size={12} /> Export</Button>
            <Button size="sm" variant="ghost" onClick={() => toast.info('Import dialog opened')} className="gap-1.5 h-8 text-xs text-muted-foreground"><Upload size={12} /> Import</Button>
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-4 px-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full bg-success" />
          <span>{enabledCount} platform{enabledCount !== 1 ? 's' : ''} enabled</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full bg-primary" />
          <span>{totalAccounts} account ID{totalAccounts !== 1 ? 's' : ''} configured</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full bg-chart-4" />
          <span>{client.metricMappings.length} metric mapping{client.metricMappings.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={['client', 'platforms']} className="space-y-3">
        {/* Client Profile */}
        <AccordionItem value="client" className="bg-card rounded-xl border border-border shadow-sm px-6 data-[state=open]:shadow-md transition-shadow">
          <AccordionTrigger className="text-sm font-semibold text-card-foreground hover:no-underline py-5">
            <div className="flex items-center gap-2">Client Profile <Badge variant="secondary" className="text-[9px] font-normal ml-1">{client.name}</Badge></div>
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <Field label="Client Name" value={client.name} onChange={v => updateClient({ name: v })} required />
              <SelectField label="Reporting Currency" value={client.currency} options={['USD', 'SAR', 'AED']} onChange={v => updateClient({ currency: v })} />
              <SelectField label="Time Zone" value={client.timezone} options={['Asia/Dubai', 'Asia/Riyadh']} onChange={v => updateClient({ timezone: v })} />
              <SelectField label="Default Date Range" value={client.defaultDateRange} options={['last_7_days', 'last_14_days', 'last_30_days', 'this_month', 'last_month']} onChange={v => updateClient({ defaultDateRange: v })} />
              <SelectField label="Week Start Day" value={client.weekStartDay} options={['Monday', 'Sunday']} onChange={v => updateClient({ weekStartDay: v })} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Platform Toggles */}
        <AccordionItem value="platforms" className="bg-card rounded-xl border border-border shadow-sm px-6 data-[state=open]:shadow-md transition-shadow">
          <AccordionTrigger className="text-sm font-semibold text-card-foreground hover:no-underline py-5">
            <div className="flex items-center gap-2">Platform Toggles <Badge variant="secondary" className="text-[9px] font-normal ml-1">{enabledCount} / {allPlatforms.length}</Badge></div>
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <p className="text-xs text-muted-foreground mb-4">Enable platforms to show them in the sidebar. Disabled platforms are hidden from navigation.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allPlatforms.map(p => {
                const cfg = client.platforms[p.key];
                const hasIds = cfg.accountIds.filter(Boolean).length > 0;
                return (
                  <div key={p.key} className={cn(
                    "flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200",
                    cfg.enabled ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"
                  )}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-card-foreground">{p.label}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">{cfg.accountIds.filter(Boolean).length} account(s)</span>
                        {cfg.enabled && !hasIds && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-warning/40 text-warning bg-warning/5">No IDs</Badge>
                        )}
                      </div>
                    </div>
                    <Switch checked={cfg.enabled} onCheckedChange={() => togglePlatform(p.key)} />
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Ad Account IDs */}
        <AccordionItem value="accounts" className="bg-card rounded-xl border border-border shadow-sm px-6 data-[state=open]:shadow-md transition-shadow">
          <AccordionTrigger className="text-sm font-semibold text-card-foreground hover:no-underline py-5">
            <div className="flex items-center gap-2">Ad Account Configuration <Badge variant="secondary" className="text-[9px] font-normal ml-1">{totalAccounts} IDs</Badge></div>
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <p className="text-xs text-muted-foreground mb-5">Add account IDs for each enabled platform. Multiple IDs are supported per platform.</p>
            <div className="space-y-6">
              {allPlatforms.filter(p => client.platforms[p.key].enabled).map(p => (
                <AccountIdRepeater
                  key={p.key}
                  label={p.label}
                  idLabel={p.idLabel}
                  placeholder={p.placeholder}
                  values={client.platforms[p.key].accountIds}
                  onChange={ids => updateClient({ platforms: { ...client.platforms, [p.key]: { ...client.platforms[p.key], accountIds: ids } } })}
                />
              ))}
              {allPlatforms.filter(p => !client.platforms[p.key].enabled).length > 0 && (
                <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                  <span className="text-[10px] text-muted-foreground italic">Disabled: {allPlatforms.filter(p => !client.platforms[p.key].enabled).map(p => p.label).join(', ')}</span>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Analytics & Measurement */}
        <AccordionItem value="analytics" className="bg-card rounded-xl border border-border shadow-sm px-6 data-[state=open]:shadow-md transition-shadow">
          <AccordionTrigger className="text-sm font-semibold text-card-foreground hover:no-underline py-5">
            Analytics & Measurement
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <Field label="GA4 Property ID" value={client.ga4PropertyId} onChange={v => updateClient({ ga4PropertyId: v })} placeholder="123456789" />
              <Field label="GA4 Stream ID" value={client.ga4StreamId} onChange={v => updateClient({ ga4StreamId: v })} placeholder="987654321" />
              <Field label="GTM Container ID" value={client.gtmContainerId} onChange={v => updateClient({ gtmContainerId: v })} placeholder="GTM-XXXXX" />
              <Field label="Primary Website Domain" value={client.websiteDomain} onChange={v => updateClient({ websiteDomain: v })} />
              <Field label="Primary Conversion Event" value={client.primaryConversion} onChange={v => updateClient({ primaryConversion: v })} required />
              <Field label="Secondary Conversion Event" value={client.secondaryConversion} onChange={v => updateClient({ secondaryConversion: v })} />
            </div>
            <div className="mt-5">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Micro Conversions</Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {client.microConversions.map((mc, i) => (
                  <Badge key={i} variant="secondary" className="gap-1.5 text-xs pl-2.5 pr-1.5 py-1">
                    {mc}
                    <button onClick={() => updateClient({ microConversions: client.microConversions.filter((_, idx) => idx !== i) })} className="hover:text-destructive transition-colors">
                      <X size={10} />
                    </button>
                  </Badge>
                ))}
                <button
                  onClick={() => {
                    const val = prompt('Enter micro conversion name');
                    if (val) updateClient({ microConversions: [...client.microConversions, val] });
                  }}
                  className="px-2.5 py-1 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  + Add
                </button>
              </div>
            </div>
            <div className="mt-5">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Conversion Notes</Label>
              <textarea className="mt-2 w-full border border-input rounded-lg p-3 text-sm bg-background text-foreground resize-none focus:ring-1 focus:ring-ring focus:border-ring outline-none transition-colors" rows={3} value={client.conversionNotes} onChange={e => updateClient({ conversionNotes: e.target.value })} placeholder="Document conversion setup, attribution notes, tracking methodology..." />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Metric Mapping */}
        <AccordionItem value="metrics" className="bg-card rounded-xl border border-border shadow-sm px-6 data-[state=open]:shadow-md transition-shadow">
          <AccordionTrigger className="text-sm font-semibold text-card-foreground hover:no-underline py-5">
            <div className="flex items-center gap-2">Metric Mapping <Badge variant="secondary" className="text-[9px] font-normal ml-1">{client.metricMappings.length}</Badge></div>
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <p className="text-xs text-muted-foreground mb-5">Map platform-native metrics to standardized dashboard labels.</p>
            <div className="space-y-2.5">
              {/* Column headers */}
              <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_36px] gap-3 px-3 text-[10px] text-muted-foreground uppercase tracking-wider">
                <span>Standard Label</span>
                <span>Platform Metric</span>
                <span>Platform</span>
                <span />
              </div>
              {client.metricMappings.map((mapping, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10 hover:bg-muted/20 transition-colors">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <SelectField label="" value={mapping.standardLabel} options={standardMetrics} onChange={v => {
                      const updated = [...client.metricMappings];
                      updated[i] = { ...updated[i], standardLabel: v };
                      updateClient({ metricMappings: updated });
                    }} />
                    <Field label="" value={mapping.platformMetric} onChange={v => {
                      const updated = [...client.metricMappings];
                      updated[i] = { ...updated[i], platformMetric: v };
                      updateClient({ metricMappings: updated });
                    }} placeholder="e.g. purchase, lead_form_submit" />
                    <SelectField label="" value={mapping.platform} options={allPlatforms.map(p => p.key)} onChange={v => {
                      const updated = [...client.metricMappings];
                      updated[i] = { ...updated[i], platform: v as PlatformKey };
                      updateClient({ metricMappings: updated });
                    }} />
                  </div>
                  <button onClick={() => updateClient({ metricMappings: client.metricMappings.filter((_, idx) => idx !== i) })} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => updateClient({ metricMappings: [...client.metricMappings, { standardLabel: 'Primary Conversion', platformMetric: '', platform: 'meta' }] })} className="gap-1.5 mt-1">
                <Plus size={12} /> Add Mapping
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Naming Normalization */}
        <AccordionItem value="naming" className="bg-card rounded-xl border border-border shadow-sm px-6 data-[state=open]:shadow-md transition-shadow">
          <AccordionTrigger className="text-sm font-semibold text-card-foreground hover:no-underline py-5">
            Naming Normalization
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <p className="text-xs text-muted-foreground mb-5">Standardize entity naming conventions across platforms.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <Field label="Campaign" value={client.namingNormalization.campaign} onChange={v => updateClient({ namingNormalization: { ...client.namingNormalization, campaign: v } })} />
              <Field label="Ad Set / Ad Group" value={client.namingNormalization.adSetOrAdGroup} onChange={v => updateClient({ namingNormalization: { ...client.namingNormalization, adSetOrAdGroup: v } })} />
              <Field label="Ad / Creative" value={client.namingNormalization.adOrCreative} onChange={v => updateClient({ namingNormalization: { ...client.namingNormalization, adOrCreative: v } })} />
              <Field label="Placement" value={client.namingNormalization.placement} onChange={v => updateClient({ namingNormalization: { ...client.namingNormalization, placement: v } })} />
              <Field label="Audience" value={client.namingNormalization.audience} onChange={v => updateClient({ namingNormalization: { ...client.namingNormalization, audience: v } })} />
              <Field label="Objective" value={client.namingNormalization.objective} onChange={v => updateClient({ namingNormalization: { ...client.namingNormalization, objective: v } })} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Alert Thresholds */}
        <AccordionItem value="alerts" className="bg-card rounded-xl border border-border shadow-sm px-6 data-[state=open]:shadow-md transition-shadow">
          <AccordionTrigger className="text-sm font-semibold text-card-foreground hover:no-underline py-5">
            Alert Thresholds
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <p className="text-xs text-muted-foreground mb-5">Set thresholds to trigger diagnostic alerts.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <ThresholdField label="CPA Spike Threshold (%)" value={client.alertThresholds.cpaSpike} onChange={v => updateClient({ alertThresholds: { ...client.alertThresholds, cpaSpike: v } })} helper="Alert when CPA rises above this %" />
              <ThresholdField label="CTR Drop Threshold (%)" value={client.alertThresholds.ctrDrop} onChange={v => updateClient({ alertThresholds: { ...client.alertThresholds, ctrDrop: v } })} helper="Alert when CTR falls below this %" />
              <ThresholdField label="Frequency Threshold" value={client.alertThresholds.frequencyThreshold} onChange={v => updateClient({ alertThresholds: { ...client.alertThresholds, frequencyThreshold: v } })} helper="Alert when frequency exceeds this" />
              <ThresholdField label="Zero-Conv Spend Threshold ($)" value={client.alertThresholds.zeroConversionSpend} onChange={v => updateClient({ alertThresholds: { ...client.alertThresholds, zeroConversionSpend: v } })} helper="Alert when spend exceeds this with 0 conv." />
              <ThresholdField label="Viewability Threshold (%)" value={client.alertThresholds.viewabilityThreshold} onChange={v => updateClient({ alertThresholds: { ...client.alertThresholds, viewabilityThreshold: v } })} helper="Alert when viewability drops below this %" />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
        </TabsContent>
      </Tabs>
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

function ThresholdField({ label, value, onChange, helper }: { label: string; value: number; onChange: (v: number) => void; helper?: string }) {
  return (
    <div>
      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</Label>
      <Input type="number" className="mt-1.5 h-9 text-sm" value={value} onChange={e => onChange(Number(e.target.value))} />
      {helper && <p className="text-[10px] text-muted-foreground mt-1">{helper}</p>}
    </div>
  );
}

function AccountIdRepeater({ label, idLabel, placeholder, values, onChange }: { label: string; idLabel: string; placeholder: string; values: string[]; onChange: (ids: string[]) => void }) {
  return (
    <div className="p-4 rounded-xl border border-border/60 bg-muted/10">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-card-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground">{idLabel}</p>
        </div>
        <Badge variant="secondary" className="text-[9px]">{values.filter(Boolean).length} ID{values.filter(Boolean).length !== 1 ? 's' : ''}</Badge>
      </div>
      <div className="space-y-2">
        {values.map((id, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={id}
              onChange={e => { const u = [...values]; u[i] = e.target.value; onChange(u); }}
              placeholder={placeholder}
              className="flex-1 h-8 text-sm font-mono"
            />
            <button
              onClick={() => onChange(values.filter((_, idx) => idx !== i))}
              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              <X size={13} />
            </button>
          </div>
        ))}
        <Button size="sm" variant="ghost" onClick={() => onChange([...values, ''])} className="gap-1 text-xs text-muted-foreground hover:text-foreground h-7">
          <Plus size={11} /> Add ID
        </Button>
      </div>
    </div>
  );
}
