import { useState } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { PlatformKey } from '@/types/dashboard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, Copy, Archive, CheckCircle } from 'lucide-react';

const allPlatforms: { key: PlatformKey; label: string }[] = [
  { key: 'meta', label: 'Meta' },
  { key: 'google', label: 'Google Ads' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'snapchat', label: 'Snapchat' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'x', label: 'X' },
  { key: 'programmatic', label: 'Programmatic' },
];

export default function AdminPage() {
  const { client, updateClient, togglePlatform } = useDashboard();
  const [activeTab, setActiveTab] = useState('platforms');

  return (
    <div className="space-y-8">
      <SectionHeader title="Admin / Settings" subtitle="Configure client profile, platforms, and tracking" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
          <TabsTrigger value="platforms" className="text-xs">Platforms</TabsTrigger>
          <TabsTrigger value="client" className="text-xs">Client Profile</TabsTrigger>
          <TabsTrigger value="accounts" className="text-xs">Accounts</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="platforms" className="mt-6">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Platform Toggles</h3>
            <p className="text-xs text-muted-foreground mb-6">Enable or disable platforms to show/hide their pages in the sidebar.</p>
            <div className="space-y-4">
              {allPlatforms.map(p => (
                <div key={p.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{client.platforms[p.key].accountIds.length} account(s) configured</p>
                  </div>
                  <Switch checked={client.platforms[p.key].enabled} onCheckedChange={() => togglePlatform(p.key)} />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="client" className="mt-6">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-2">Client Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Client Name" value={client.name} onChange={v => updateClient({ name: v })} />
              <Field label="Internal Code" value={client.code} onChange={v => updateClient({ code: v })} />
              <div>
                <Label className="text-xs">Currency</Label>
                <Select value={client.currency} onValueChange={v => updateClient({ currency: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{['USD', 'EUR', 'GBP', 'AUD', 'CAD'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Field label="Timezone" value={client.timezone} onChange={v => updateClient({ timezone: v })} />
              <Field label="Website Domain" value={client.websiteDomain} onChange={v => updateClient({ websiteDomain: v })} />
              <div>
                <Label className="text-xs">Week Start</Label>
                <Select value={client.weekStartDay} onValueChange={v => updateClient({ weekStartDay: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{['Monday', 'Sunday', 'Saturday'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="mt-6">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-2">Platform Account IDs</h3>
            <div className="space-y-4">
              {allPlatforms.filter(p => client.platforms[p.key].enabled).map(p => (
                <div key={p.key}>
                  <Label className="text-xs">{p.label} Account ID(s)</Label>
                  <Input className="mt-1" value={client.platforms[p.key].accountIds.join(', ')} onChange={e => {
                    const ids = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                    updateClient({ platforms: { ...client.platforms, [p.key]: { ...client.platforms[p.key], accountIds: ids } } });
                  }} placeholder="Enter account IDs separated by commas" />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-2">Analytics & Measurement</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="GA4 Property ID" value={client.ga4PropertyId} onChange={v => updateClient({ ga4PropertyId: v })} />
              <Field label="GA4 Stream ID" value={client.ga4StreamId} onChange={v => updateClient({ ga4StreamId: v })} />
              <Field label="GTM Container ID" value={client.gtmContainerId} onChange={v => updateClient({ gtmContainerId: v })} />
              <Field label="Primary Conversion" value={client.primaryConversion} onChange={v => updateClient({ primaryConversion: v })} />
              <Field label="Secondary Conversion" value={client.secondaryConversion} onChange={v => updateClient({ secondaryConversion: v })} />
            </div>
            <div>
              <Label className="text-xs">Conversion Notes</Label>
              <textarea className="mt-1 w-full border border-input rounded-md p-2 text-sm bg-background text-foreground resize-none" rows={3} value={client.conversionNotes} onChange={e => updateClient({ conversionNotes: e.target.value })} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-2">Alert Thresholds</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ThresholdField label="CPA Spike Threshold (%)" value={client.alertThresholds.cpaSpike} onChange={v => updateClient({ alertThresholds: { ...client.alertThresholds, cpaSpike: v } })} />
              <ThresholdField label="CTR Drop Threshold (%)" value={client.alertThresholds.ctrDrop} onChange={v => updateClient({ alertThresholds: { ...client.alertThresholds, ctrDrop: v } })} />
              <ThresholdField label="Frequency Threshold" value={client.alertThresholds.frequencyThreshold} onChange={v => updateClient({ alertThresholds: { ...client.alertThresholds, frequencyThreshold: v } })} />
              <ThresholdField label="Zero-Conv Spend Threshold ($)" value={client.alertThresholds.zeroConversionSpend} onChange={v => updateClient({ alertThresholds: { ...client.alertThresholds, zeroConversionSpend: v } })} />
              <ThresholdField label="Viewability Threshold (%)" value={client.alertThresholds.viewabilityThreshold} onChange={v => updateClient({ alertThresholds: { ...client.alertThresholds, viewabilityThreshold: v } })} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Save actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => toast.success('Configuration saved')} className="gap-2"><Save size={14} /> Save Configuration</Button>
        <Button variant="outline" onClick={() => toast.info('Configuration duplicated')} className="gap-2"><Copy size={14} /> Duplicate</Button>
        <Button variant="outline" onClick={() => toast.info('Configuration archived')} className="gap-2"><Archive size={14} /> Archive</Button>
        <Button variant="outline" onClick={() => toast.success('Validation passed')} className="gap-2"><CheckCircle size={14} /> Validate</Button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input className="mt-1" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function ThresholdField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" className="mt-1" value={value} onChange={e => onChange(Number(e.target.value))} />
    </div>
  );
}
