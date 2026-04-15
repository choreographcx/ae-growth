import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { AlertTriangle, Info, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  threshold: number;
  unit: string;
  severity: 'info' | 'warning' | 'critical';
  scope: 'global' | 'platform' | 'campaign_type';
  active: boolean;
  isDefault: boolean;
}

const DEFAULT_ALERT_RULES: AlertRule[] = [
  { id: 'cpa_spike', name: 'CPA Spike', description: 'Alert when CPA rises above threshold', threshold: 25, unit: '%', severity: 'critical', scope: 'global', active: true, isDefault: true },
  { id: 'ctr_drop', name: 'CTR Drop', description: 'Alert when CTR falls below threshold', threshold: 20, unit: '%', severity: 'warning', scope: 'global', active: true, isDefault: true },
  { id: 'frequency', name: 'Frequency Threshold', description: 'Alert when ad frequency exceeds limit', threshold: 4, unit: 'x', severity: 'warning', scope: 'platform', active: true, isDefault: true },
  { id: 'zero_conv_spend', name: 'Zero-Conversion Spend', description: 'Alert when spend exceeds threshold with zero conversions', threshold: 500, unit: '$', severity: 'critical', scope: 'global', active: true, isDefault: true },
  { id: 'viewability', name: 'Viewability Threshold', description: 'Alert when viewability drops below threshold', threshold: 50, unit: '%', severity: 'warning', scope: 'platform', active: true, isDefault: true },
  { id: 'underpacing', name: 'Underpacing', description: 'Alert when spend pacing falls below expected', threshold: 15, unit: '%', severity: 'warning', scope: 'platform', active: false, isDefault: false },
  { id: 'overspend', name: 'Overspend', description: 'Alert when spend exceeds budget threshold', threshold: 10, unit: '%', severity: 'critical', scope: 'global', active: false, isDefault: false },
  { id: 'conv_drop', name: 'Conversion Drop', description: 'Alert when conversions drop significantly', threshold: 30, unit: '%', severity: 'critical', scope: 'global', active: false, isDefault: false },
  { id: 'tracking_latency', name: 'Tracking Latency', description: 'Alert when data sync exceeds time threshold', threshold: 24, unit: 'hrs', severity: 'info', scope: 'platform', active: false, isDefault: false },
  { id: 'data_freshness', name: 'Data Freshness', description: 'Alert when platform data is stale', threshold: 48, unit: 'hrs', severity: 'warning', scope: 'platform', active: false, isDefault: false },
  { id: 'no_click_spend', name: 'No-Click Spend', description: 'Alert when impressions served with zero clicks', threshold: 200, unit: '$', severity: 'info', scope: 'campaign_type', active: false, isDefault: false },
  { id: 'low_conv_rate', name: 'Low Conversion Rate', description: 'Alert when conversion rate drops below threshold', threshold: 1, unit: '%', severity: 'warning', scope: 'global', active: false, isDefault: false },
  { id: 'high_cpm', name: 'High CPM', description: 'Alert when CPM exceeds expected range', threshold: 50, unit: '$', severity: 'info', scope: 'platform', active: false, isDefault: false },
];

const SEVERITY_OPTIONS: { value: string; label: string; color: string; icon: typeof Info }[] = [
  { value: 'info', label: 'Info', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Info },
  { value: 'warning', label: 'Warning', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: AlertTriangle },
  { value: 'critical', label: 'Critical', color: 'text-red-600 bg-red-50 border-red-200', icon: AlertCircle },
];

const SCOPE_OPTIONS = [
  { value: 'global', label: 'Global' },
  { value: 'platform', label: 'Platform-specific' },
  { value: 'campaign_type', label: 'Campaign-type' },
];

interface Props {
  alertRules: AlertRule[] | undefined;
  onChange: (rules: AlertRule[]) => void;
}

export function AlertRulesSection({ alertRules: rulesProp, onChange }: Props) {
  const rules = rulesProp ?? DEFAULT_ALERT_RULES;

  const activeCount = rules.filter(r => r.active).length;
  const defaultCount = rules.filter(r => r.isDefault && r.active).length;
  const customCount = activeCount - defaultCount;

  const updateRule = (id: string, updates: Partial<AlertRule>) => {
    onChange(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  return (
    <div className="pt-4 space-y-4">
      {/* Summary Strip */}
      <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-border/50 text-xs text-muted-foreground">
        <span><strong className="text-card-foreground">{activeCount}</strong> active rules</span>
        <span className="text-border">·</span>
        <span><strong className="text-card-foreground">{defaultCount}</strong> using defaults</span>
        {customCount > 0 && (
          <>
            <span className="text-border">·</span>
            <span><strong className="text-primary">{customCount}</strong> custom</span>
          </>
        )}
        <span className="text-border">·</span>
        <span>{rules.length - activeCount} inactive</span>
      </div>

      {/* Rule Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {rules.map(rule => {
          const sevOption = SEVERITY_OPTIONS.find(s => s.value === rule.severity) ?? SEVERITY_OPTIONS[0];
          const SevIcon = sevOption.icon;

          return (
            <div
              key={rule.id}
              className={cn(
                'rounded-xl border p-4 transition-all duration-200',
                rule.active
                  ? 'border-border bg-card shadow-sm'
                  : 'border-border/50 bg-muted/10 opacity-60'
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-card-foreground">{rule.name}</h4>
                    <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 border', sevOption.color)}>
                      <SevIcon size={9} className="mr-0.5" />
                      {sevOption.label}
                    </Badge>
                    {rule.isDefault && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Default</Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{rule.description}</p>
                </div>
                <Switch
                  checked={rule.active}
                  onCheckedChange={v => updateRule(rule.id, { active: v })}
                  className="shrink-0"
                />
              </div>

              {/* Controls */}
              {rule.active && (
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/40">
                  <div>
                    <Label className="text-[9px] text-muted-foreground uppercase tracking-wider">Threshold</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        type="number"
                        value={rule.threshold}
                        onChange={e => updateRule(rule.id, { threshold: Number(e.target.value), isDefault: false })}
                        className="h-7 text-xs tabular-nums flex-1"
                      />
                      <span className="text-[10px] text-muted-foreground shrink-0">{rule.unit}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground uppercase tracking-wider">Severity</Label>
                    <Select value={rule.severity} onValueChange={v => updateRule(rule.id, { severity: v as any })}>
                      <SelectTrigger className="mt-1 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SEVERITY_OPTIONS.map(s => (
                          <SelectItem key={s.value} value={s.value}>
                            <span className="flex items-center gap-1">
                              <s.icon size={10} /> {s.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[9px] text-muted-foreground uppercase tracking-wider">Scope</Label>
                    <Select value={rule.scope} onValueChange={v => updateRule(rule.id, { scope: v as any })}>
                      <SelectTrigger className="mt-1 h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SCOPE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { DEFAULT_ALERT_RULES };
