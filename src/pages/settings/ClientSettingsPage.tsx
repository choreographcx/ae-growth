import { useDashboard } from '@/context/DashboardContext';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencySymbol } from '@/lib/currency';
import { cn } from '@/lib/utils';

const CURRENCY_OPTIONS = ['USD', 'SAR', 'AED'];

export default function ClientSettingsPage() {
  const { isSuperAdmin } = useAuth();
  const { client, updateClient } = useDashboard();
  if (!isSuperAdmin) return <Navigate to="/" replace />;

  return (
    <SettingsPageShell title="Client Settings" subtitle="Core client identity, currency, and locale">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <Field label="Client Name" value={client.name} onChange={v => updateClient({ name: v })} required />
        <div>
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Reporting Currency</Label>
          <Select value={client.currency} onValueChange={v => updateClient({ currency: v })}>
            <SelectTrigger className="mt-1.5 h-9 text-sm">
              <span className="inline-flex items-baseline">
                <CurrencySymbol currency={client.currency} size={14} />&nbsp;{client.currency}
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
        {client.currency === 'SAR' && (
          <RateField label="USD → SAR Rate" value={client.usdToSarRate} onChange={v => updateClient({ usdToSarRate: v })} />
        )}
        {client.currency === 'AED' && (
          <RateField label="USD → AED Rate" value={client.usdToAedRate} onChange={v => updateClient({ usdToAedRate: v })} />
        )}
        <SelectField label="Time Zone" value={client.timezone} options={['Asia/Dubai', 'Asia/Riyadh']} onChange={v => updateClient({ timezone: v })} />
        <SelectField
          label="Default Date Range"
          value={client.defaultDateRange}
          options={['last_7_days', 'last_14_days', 'last_30_days', 'this_month', 'last_month']}
          optionLabels={{ last_7_days: 'Last 7 Days', last_14_days: 'Last 14 Days', last_30_days: 'Last 30 Days', this_month: 'This Month', last_month: 'Last Month' }}
          onChange={v => updateClient({ defaultDateRange: v })}
        />
        <SelectField label="Week Start Day" value={client.weekStartDay} options={['Monday', 'Sunday']} onChange={v => updateClient({ weekStartDay: v })} />
        <Field label="Primary Website Domain" value={client.websiteDomain} onChange={v => updateClient({ websiteDomain: v })} placeholder="https://www.example.com" />
      </div>
    </SettingsPageShell>
  );
}

function Field({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <Input className={cn("mt-1.5 h-9 text-sm")} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function SelectField({ label, value, options, optionLabels, onChange }: { label: string; value: string; options: string[]; optionLabels?: Record<string, string>; onChange: (v: string) => void }) {
  const renderLabel = (o: string) => optionLabels?.[o] ?? o;
  return (
    <div>
      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1.5 h-9 text-sm"><SelectValue>{renderLabel(value)}</SelectValue></SelectTrigger>
        <SelectContent>{options.map(o => <SelectItem key={o} value={o}>{renderLabel(o)}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function RateField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
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
      <p className="text-[10px] text-muted-foreground mt-1">Applied to platforms reporting in USD.</p>
    </div>
  );
}
