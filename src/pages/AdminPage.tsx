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
import { Save, Copy, Archive, CheckCircle, Plus, X, Upload, Download, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const { client, updateClient, togglePlatform, clients, setClient } = useDashboard();
  const [selectedProfile, setSelectedProfile] = useState(client.id);

  const handleLoadProfile = (id: string) => {
    const found = clients.find(c => c.id === id);
    if (found) {
      setClient(found);
      setSelectedProfile(id);
      toast.success(`Loaded: ${found.name}`);
    }
  };

  return (
    <div className="space-y-10">
      <SectionHeader title="Admin / Settings" subtitle="Configure client profile, platforms, and tracking" />

      {/* Saved Profiles Quick Switcher */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Users size={18} className="text-primary" />
          <h3 className="text-sm font-semibold text-card-foreground">Saved Client Profiles</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {clients.map(c => (
            <button
              key={c.id}
              onClick={() => handleLoadProfile(c.id)}
              className={cn(
                "px-4 py-2.5 rounded-lg text-sm font-medium transition-all border",
                c.id === client.id
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-card-foreground border-border hover:bg-muted"
              )}
            >
              <span>{c.name}</span>
              <span className="text-xs opacity-70 ml-1.5">({c.code})</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => toast.success('Configuration saved')} className="gap-1.5"><Save size={13} /> Save</Button>
          <Button size="sm" variant="outline" onClick={() => toast.info('Configuration duplicated')} className="gap-1.5"><Copy size={13} /> Duplicate</Button>
          <Button size="sm" variant="outline" onClick={() => toast.info('Configuration archived')} className="gap-1.5"><Archive size={13} /> Archive</Button>
          <Button size="sm" variant="outline" onClick={() => toast.success('All required fields valid')} className="gap-1.5"><CheckCircle size={13} /> Validate</Button>
          <Button size="sm" variant="outline" onClick={() => toast.info('Exported')} className="gap-1.5"><Download size={13} /> Export</Button>
          <Button size="sm" variant="outline" onClick={() => toast.info('Import dialog opened')} className="gap-1.5"><Upload size={13} /> Import</Button>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={['platforms', 'client']} className="space-y-3">
        {/* 1. Client Profile */}
        <AccordionItem value="client" className="bg-card rounded-xl border border-border shadow-sm px-6">
          <AccordionTrigger className="text-sm font-semibold text-card-foreground hover:no-underline py-5">
            Client Profile
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Client Name" value={client.name} onChange={v => updateClient({ name: v })} required />
              <Field label="Internal Client Code" value={client.code} onChange={v => updateClient({ code: v })} required />
              <SelectField label="Reporting Currency" value={client.currency} options={['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'AED', 'SAR', 'SGD']} onChange={v => updateClient({ currency: v })} />
              <Field label="Time Zone" value={client.timezone} onChange={v => updateClient({ timezone: v })} />
              <Field label="Website Domain" value={client.websiteDomain} onChange={v => updateClient({ websiteDomain: v })} />
              <SelectField label="Default Date Range" value={client.defaultDateRange} options={['last_7_days', 'last_14_days', 'last_30_days', 'this_month', 'last_month']} onChange={v => updateClient({ defaultDateRange: v })} />
              <SelectField label="Week Start Day" value={client.weekStartDay} options={['Monday', 'Sunday', 'Saturday']} onChange={v => updateClient({ weekStartDay: v })} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 2. Platform Toggles */}
        <AccordionItem value="platforms" className="bg-card rounded-xl border border-border shadow-sm px-6">
          <AccordionTrigger className="text-sm font-semibold text-card-foreground hover:no-underline py-5">
            Platform Toggles
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <p className="text-xs text-muted-foreground mb-4">Enable or disable platforms to show/hide their pages in the sidebar.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allPlatforms.map(p => (
                <div key={p.key} className={cn(
                  "flex items-center justify-between p-4 rounded-lg border transition-colors",
                  client.platforms[p.key].enabled ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"
                )}>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{client.platforms[p.key].accountIds.length} account(s)</p>
                  </div>
                  <Switch checked={client.platforms[p.key].enabled} onCheckedChange={() => togglePlatform(p.key)} />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 3. Ad Account IDs */}
        <AccordionItem value="accounts" className="bg-card rounded-xl border border-border shadow-sm px-6">
          <AccordionTrigger className="text-sm font-semibold text-card-foreground hover:no-underline py-5">
            Ad Account Configuration
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <p className="text-xs text-muted-foreground mb-4">Add account IDs for each enabled platform. You can add multiple IDs per platform.</p>
            <div className="space-y-5">
              {allPlatforms.filter(p => client.platforms[p.key].enabled).map(p => (
                <AccountIdRepeater
                  key={p.key}
                  label={`${p.label} — ${p.idLabel}`}
                  placeholder={p.placeholder}
                  values={client.platforms[p.key].accountIds}
                  onChange={ids => updateClient({ platforms: { ...client.platforms, [p.key]: { ...client.platforms[p.key], accountIds: ids } } })}
                />
              ))}
              {allPlatforms.filter(p => !client.platforms[p.key].enabled).length > 0 && (
                <p className="text-xs text-muted-foreground italic">Disabled platforms: {allPlatforms.filter(p => !client.platforms[p.key].enabled).map(p => p.label).join(', ')}</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 4. Analytics & Measurement */}
        <AccordionItem value="analytics" className="bg-card rounded-xl border border-border shadow-sm px-6">
          <AccordionTrigger className="text-sm font-semibold text-card-foreground hover:no-underline py-5">
            Analytics & Measurement
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="GA4 Property ID" value={client.ga4PropertyId} onChange={v => updateClient({ ga4PropertyId: v })} placeholder="123456789" />
              <Field label="GA4 Stream ID" value={client.ga4StreamId} onChange={v => updateClient({ ga4StreamId: v })} placeholder="987654321" />
              <Field label="GTM Container ID" value={client.gtmContainerId} onChange={v => updateClient({ gtmContainerId: v })} placeholder="GTM-XXXXX" />
              <Field label="Primary Website Domain" value={client.websiteDomain} onChange={v => updateClient({ websiteDomain: v })} />
              <Field label="Primary Conversion Event" value={client.primaryConversion} onChange={v => updateClient({ primaryConversion: v })} required />
              <Field label="Secondary Conversion Event" value={client.secondaryConversion} onChange={v => updateClient({ secondaryConversion: v })} />
            </div>
            <div className="mt-4">
              <Label className="text-xs text-muted-foreground">Micro Conversions</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {client.microConversions.map((mc, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 text-xs">
                    {mc}
                    <button onClick={() => updateClient({ microConversions: client.microConversions.filter((_, idx) => idx !== i) })} className="hover:text-destructive">
                      <X size={10} />
                    </button>
                  </Badge>
                ))}
                <button
                  onClick={() => {
                    const val = prompt('Enter micro conversion name');
                    if (val) updateClient({ microConversions: [...client.microConversions, val] });
                  }}
                  className="px-2 py-0.5 rounded border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                >
                  + Add
                </button>
              </div>
            </div>
            <div className="mt-4">
              <Label className="text-xs text-muted-foreground">Conversion Notes</Label>
              <textarea className="mt-1 w-full border border-input rounded-lg p-3 text-sm bg-background text-foreground resize-none focus:ring-1 focus:ring-ring focus:border-ring outline-none" rows={3} value={client.conversionNotes} onChange={e => updateClient({ conversionNotes: e.target.value })} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 5. Metric Mapping */}
        <AccordionItem value="metrics" className="bg-card rounded-xl border border-border shadow-sm px-6">
          <AccordionTrigger className="text-sm font-semibold text-card-foreground hover:no-underline py-5">
            Metric Mapping
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <p className="text-xs text-muted-foreground mb-4">Map platform-native metrics into standardized dashboard metrics.</p>
            <div className="space-y-3">
              {client.metricMappings.map((mapping, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <SelectField
                      label=""
                      value={mapping.standardLabel}
                      options={standardMetrics}
                      onChange={v => {
                        const updated = [...client.metricMappings];
                        updated[i] = { ...updated[i], standardLabel: v };
                        updateClient({ metricMappings: updated });
                      }}
                    />
                    <Field label="" value={mapping.platformMetric} onChange={v => {
                      const updated = [...client.metricMappings];
                      updated[i] = { ...updated[i], platformMetric: v };
                      updateClient({ metricMappings: updated });
                    }} placeholder="Platform metric name" />
                    <SelectField
                      label=""
                      value={mapping.platform}
                      options={allPlatforms.map(p => p.key)}
                      onChange={v => {
                        const updated = [...client.metricMappings];
                        updated[i] = { ...updated[i], platform: v as PlatformKey };
                        updateClient({ metricMappings: updated });
                      }}
                    />
                  </div>
                  <button onClick={() => updateClient({ metricMappings: client.metricMappings.filter((_, idx) => idx !== i) })} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => updateClient({ metricMappings: [...client.metricMappings, { standardLabel: 'Primary Conversion', platformMetric: '', platform: 'meta' }] })} className="gap-1.5">
                <Plus size={13} /> Add Mapping
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 6. Naming Normalization */}
        <AccordionItem value="naming" className="bg-card rounded-xl border border-border shadow-sm px-6">
          <AccordionTrigger className="text-sm font-semibold text-card-foreground hover:no-underline py-5">
            Naming Normalization
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <p className="text-xs text-muted-foreground mb-4">Standardize entity names across platforms.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Campaign" value={client.namingNormalization.campaign} onChange={v => updateClient({ namingNormalization: { ...client.namingNormalization, campaign: v } })} />
              <Field label="Ad Set / Ad Group" value={client.namingNormalization.adSetOrAdGroup} onChange={v => updateClient({ namingNormalization: { ...client.namingNormalization, adSetOrAdGroup: v } })} />
              <Field label="Ad / Creative" value={client.namingNormalization.adOrCreative} onChange={v => updateClient({ namingNormalization: { ...client.namingNormalization, adOrCreative: v } })} />
              <Field label="Placement" value={client.namingNormalization.placement} onChange={v => updateClient({ namingNormalization: { ...client.namingNormalization, placement: v } })} />
              <Field label="Audience" value={client.namingNormalization.audience} onChange={v => updateClient({ namingNormalization: { ...client.namingNormalization, audience: v } })} />
              <Field label="Objective" value={client.namingNormalization.objective} onChange={v => updateClient({ namingNormalization: { ...client.namingNormalization, objective: v } })} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 7. Alert Thresholds */}
        <AccordionItem value="alerts" className="bg-card rounded-xl border border-border shadow-sm px-6">
          <AccordionTrigger className="text-sm font-semibold text-card-foreground hover:no-underline py-5">
            Alert Thresholds
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <p className="text-xs text-muted-foreground mb-4">Configure when alerts should fire based on metric thresholds.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ThresholdField label="CPA Spike Threshold (%)" value={client.alertThresholds.cpaSpike} onChange={v => updateClient({ alertThresholds: { ...client.alertThresholds, cpaSpike: v } })} />
              <ThresholdField label="CTR Drop Threshold (%)" value={client.alertThresholds.ctrDrop} onChange={v => updateClient({ alertThresholds: { ...client.alertThresholds, ctrDrop: v } })} />
              <ThresholdField label="Frequency Threshold" value={client.alertThresholds.frequencyThreshold} onChange={v => updateClient({ alertThresholds: { ...client.alertThresholds, frequencyThreshold: v } })} />
              <ThresholdField label="Zero-Conv Spend Threshold ($)" value={client.alertThresholds.zeroConversionSpend} onChange={v => updateClient({ alertThresholds: { ...client.alertThresholds, zeroConversionSpend: v } })} />
              <ThresholdField label="Viewability Threshold (%)" value={client.alertThresholds.viewabilityThreshold} onChange={v => updateClient({ alertThresholds: { ...client.alertThresholds, viewabilityThreshold: v } })} />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

// Reusable Field Component
function Field({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <div>
      {label && (
        <Label className="text-xs text-muted-foreground">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <Input className={cn(label ? "mt-1" : "")} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(label ? "mt-1" : "")}><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function ThresholdField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type="number" className="mt-1" value={value} onChange={e => onChange(Number(e.target.value))} />
    </div>
  );
}

// Account ID Repeater
function AccountIdRepeater({ label, placeholder, values, onChange }: { label: string; placeholder: string; values: string[]; onChange: (ids: string[]) => void }) {
  return (
    <div>
      <Label className="text-xs font-medium text-card-foreground">{label}</Label>
      <div className="mt-1.5 space-y-2">
        {values.map((id, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={id}
              onChange={e => {
                const updated = [...values];
                updated[i] = e.target.value;
                onChange(updated);
              }}
              placeholder={placeholder}
              className="flex-1"
            />
            <button
              onClick={() => onChange(values.filter((_, idx) => idx !== i))}
              className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => onChange([...values, ''])} className="gap-1.5 text-xs">
          <Plus size={12} /> Add Account ID
        </Button>
      </div>
    </div>
  );
}
