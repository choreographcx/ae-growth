import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientProfile } from '@/types/dashboard';
import { CheckCircle2, AlertCircle, X, Plus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Ga4PropertiesManager } from './Ga4PropertiesManager';

const LOOKBACK_OPTIONS = ['7 days', '14 days', '30 days', '60 days', '90 days'];
const COUNTING_OPTIONS = [
  { value: 'every', label: 'Every Conversion' },
  { value: 'one_per_click', label: 'One Per Click' },
  { value: 'one_per_session', label: 'One Per Session' },
  { value: 'unique', label: 'Unique Conversions' },
];
const ATTRIBUTION_OPTIONS = [
  { value: 'platform_first', label: 'Platform First' },
  { value: 'ga4_first', label: 'GA4 First' },
  { value: 'manual_blend', label: 'Manual Blend' },
  { value: 'last_click', label: 'Last Click' },
  { value: 'data_driven', label: 'Data-Driven' },
];

interface Props {
  client: ClientProfile;
  updateClient: (u: Partial<ClientProfile>) => void;
}

function TrackingStatusPill({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium',
      connected
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-muted text-muted-foreground border-border'
    )}>
      {connected ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
      {label}
    </div>
  );
}

export function MeasurementSetupSection({ client, updateClient }: Props) {
  const measurement = (client as any).measurement ?? {};
  const updateMeasurement = (updates: Record<string, any>) => {
    updateClient({ measurement: { ...measurement, ...updates } } as any);
  };

  const ga4Connected = !!client.ga4PropertyId;
  const gtmConnected = !!client.gtmContainerId;
  const primaryMapped = !!client.primaryConversion;
  const microCount = client.microConversions.length;

  return (
    <div className="pt-4 space-y-6">
      {/* Tracking Summary Widget */}
      <div>
        <h4 className="text-xs font-semibold text-card-foreground uppercase tracking-wider mb-3">Tracking Summary</h4>
        <div className="flex flex-wrap gap-2">
          <TrackingStatusPill label="GA4 Connected" connected={ga4Connected} />
          <TrackingStatusPill label="Primary Conversion" connected={primaryMapped} />
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium',
            microCount > 0
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-muted text-muted-foreground border-border'
          )}>
            {microCount > 0 ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
            {microCount} Micro Conversion{microCount !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[11px] font-medium text-muted-foreground">
            <Clock size={11} />
            Last checked: {measurement.lastValidationDate || 'Never'}
          </div>
        </div>
      </div>

      {/* GA4 Properties (1..N) */}
      <div className="pt-4 border-t border-border/50">
        <Ga4PropertiesManager />
      </div>

      {/* Other Tracking IDs */}
      <div className="pt-4 border-t border-border/50">
        <h4 className="text-xs font-semibold text-card-foreground uppercase tracking-wider mb-4">Other Tracking</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Field label="Tracking Owner" value={measurement.trackingOwner || ''} onChange={v => updateMeasurement({ trackingOwner: v })} placeholder="e.g. Media Team" />
          <Field label="Last Validation Date" value={measurement.lastValidationDate || ''} onChange={v => updateMeasurement({ lastValidationDate: v })} placeholder="e.g. 2025-04-01" />
        </div>
      </div>


      {/* Attribution & Counting */}
      <div className="pt-4 border-t border-border/50">
        <h4 className="text-xs font-semibold text-card-foreground uppercase tracking-wider mb-4">Attribution & Counting</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Attribution Source Priority</Label>
            <Select value={measurement.attributionSource || 'platform_first'} onValueChange={v => updateMeasurement({ attributionSource: v })}>
              <SelectTrigger className="mt-1.5 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ATTRIBUTION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">Which source takes priority for reporting</p>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Lookback Window</Label>
            <Select value={measurement.lookbackWindow || '30 days'} onValueChange={v => updateMeasurement({ lookbackWindow: v })}>
              <SelectTrigger className="mt-1.5 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOOKBACK_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">Click-through attribution window</p>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Conversion Counting</Label>
            <Select value={measurement.countingMethod || 'every'} onValueChange={v => updateMeasurement({ countingMethod: v })}>
              <SelectTrigger className="mt-1.5 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTING_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">How conversions are deduplicated</p>
          </div>
        </div>
      </div>

      {/* Conversion Events */}
      <div className="pt-4 border-t border-border/50">
        <h4 className="text-xs font-semibold text-card-foreground uppercase tracking-wider mb-4">Conversion Events</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Primary Conversion Event" value={client.primaryConversion} onChange={v => updateClient({ primaryConversion: v })} required />
          <Field label="Secondary Conversion Event" value={client.secondaryConversion} onChange={v => updateClient({ secondaryConversion: v })} />
        </div>

        <div className="mt-5">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Micro Conversions</Label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {client.microConversions.map((mc, i) => (
              <Badge key={i} variant="secondary" className="gap-1.5 text-xs pl-2.5 pr-1.5 py-1 text-primary-foreground">
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
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Conversion Notes</Label>
          <textarea
            className="mt-2 w-full border border-input rounded-lg p-3 text-sm bg-background text-foreground resize-none focus:ring-1 focus:ring-ring focus:border-ring outline-none transition-colors"
            rows={3}
            value={client.conversionNotes}
            onChange={e => updateClient({ conversionNotes: e.target.value })}
            placeholder="Document conversion setup, attribution notes, tracking methodology..."
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Field helper ─── */
function Field({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <div>
      {label && (
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {label}{required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      )}
      <Input className={cn(label ? "mt-1.5" : "", "h-9 text-sm")} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
