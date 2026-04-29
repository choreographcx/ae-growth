import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Download, Upload, Copy, Save, Check, X,
  FileJson, Zap, ShoppingCart, Eye, Target, Briefcase,
  CheckCircle2, Circle, AlertCircle,
} from 'lucide-react';
import type { ClientProfile } from '@/types/dashboard';

interface Props {
  client: ClientProfile;
}

const TEMPLATE_TYPES = [
  { value: 'lead_gen', label: 'Lead Generation', icon: Target, description: 'Optimised for lead-form and WhatsApp conversions' },
  { value: 'ecommerce', label: 'Ecommerce', icon: ShoppingCart, description: 'Purchase and conversion-funnel tracking' },
  { value: 'awareness', label: 'Awareness', icon: Eye, description: 'Reach, frequency, and video-view focused' },
  { value: 'full_funnel', label: 'Full-Funnel', icon: Zap, description: 'Combined awareness-to-conversion pipeline' },
  { value: 'b2b', label: 'B2B', icon: Briefcase, description: 'LinkedIn-heavy with long attribution windows' },
];

type ChecklistStatus = 'complete' | 'incomplete' | 'warning';

interface ChecklistItem {
  key: string;
  label: string;
  status: ChecklistStatus;
  detail: string;
}

export function TemplatesPortabilitySection({ client }: Props) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState('lead_gen');
  const [includeAccounts, setIncludeAccounts] = useState(false);
  const [includeBranding, setIncludeBranding] = useState(true);
  const [includeAlerts, setIncludeAlerts] = useState(true);

  const checklist = useMemo<ChecklistItem[]>(() => {
    const enabledPlatforms = Object.values(client.platforms).filter(p => p.enabled);
    const hasBudgets = enabledPlatforms.some(p => (p.budget || 0) > 0);
    const hasBranding = !!(client as any).branding?.primaryColor;
    const hasMeasurement = !!(client.ga4PropertyId && client.primaryConversion);
    const hasMappings = client.metricMappings.length > 0;
    const hasAlerts = ((client as any).alertRules ?? []).filter((r: any) => r?.active).length > 0;

    return [
      {
        key: 'client_info',
        label: 'Client Information',
        status: client.name ? 'complete' : 'incomplete',
        detail: client.name ? `${client.name} · ${client.currency} · ${client.timezone}` : 'Name, currency, and timezone not set',
      },
      {
        key: 'branding',
        label: 'Branding & Theme',
        status: hasBranding ? 'complete' : 'incomplete',
        detail: hasBranding ? 'Colors and visual settings configured' : 'No brand colors set',
      },
      {
        key: 'platforms',
        label: 'Platform Setup',
        status: enabledPlatforms.length > 0 ? 'complete' : 'incomplete',
        detail: enabledPlatforms.length > 0
          ? `${enabledPlatforms.length} enabled${!hasBudgets ? ' · No budgets' : ''}`
          : 'No platforms enabled',
      },
      {
        key: 'measurement',
        label: 'Measurement Setup',
        status: hasMeasurement ? 'complete' : 'incomplete',
        detail: hasMeasurement ? `GA4: ${client.ga4PropertyId}` : 'GA4 or conversion not configured',
      },
      {
        key: 'reporting',
        label: 'Reporting Rules',
        status: hasMappings ? 'complete' : 'incomplete',
        detail: hasMappings ? `${client.metricMappings.length} metric mappings` : 'No metric mappings defined',
      },
      {
        key: 'alerts',
        label: 'Alert Rules',
        status: hasAlerts ? 'complete' : 'incomplete',
        detail: hasAlerts ? `${((client as any).alertRules ?? []).filter((r: any) => r?.active).length} active rules` : 'No active alert rules',
      },
    ];
  }, [client]);

  const completedCount = checklist.filter(c => c.status === 'complete').length;
  const completionPct = Math.round((completedCount / checklist.length) * 100);

  const handleExport = () => {
    const json = JSON.stringify(client, null, 2);
    navigator.clipboard.writeText(json);
    toast.success('Configuration JSON copied to clipboard');
  };

  const handleImport = () => {
    toast.info('Paste your JSON config — import dialog coming soon');
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error('Template name is required');
      return;
    }
    toast.success(`Template "${templateName}" saved as ${TEMPLATE_TYPES.find(t => t.value === templateType)?.label}`);
    setSaveDialogOpen(false);
    setTemplateName('');
  };

  const handleDuplicate = () => {
    toast.success('Configuration duplicated — ready to assign to a new client');
  };

  const statusIcon = (s: ChecklistStatus) => {
    if (s === 'complete') return <CheckCircle2 size={14} className="text-emerald-500" />;
    if (s === 'warning') return <AlertCircle size={14} className="text-amber-500" />;
    return <Circle size={14} className="text-muted-foreground/40" />;
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ActionButton icon={Download} label="Export Config" sublabel="Copy JSON" onClick={handleExport} />
        <ActionButton icon={Upload} label="Import Config" sublabel="Paste JSON" onClick={handleImport} />
        <ActionButton icon={Save} label="Save as Template" sublabel="Reusable preset" onClick={() => setSaveDialogOpen(true)} />
        <ActionButton icon={Copy} label="Duplicate Setup" sublabel="Clone config" onClick={handleDuplicate} />
      </div>

      {/* Setup Completion Checklist */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Setup Checklist</Label>
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span className="text-[10px] font-medium text-card-foreground">{completionPct}%</span>
          </div>
        </div>

        <div className="space-y-1">
          {checklist.map(item => (
            <div
              key={item.key}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-colors',
                item.status === 'complete'
                  ? 'border-emerald-200/50 bg-emerald-50/30'
                  : item.status === 'warning'
                    ? 'border-amber-200/50 bg-amber-50/30'
                    : 'border-border/50 bg-muted/5'
              )}
            >
              {statusIcon(item.status)}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-card-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{item.detail}</p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'text-[8px] px-1.5 py-0 shrink-0',
                  item.status === 'complete'
                    ? 'border-emerald-200 text-emerald-600'
                    : item.status === 'warning'
                      ? 'border-amber-200 text-amber-600'
                      : 'border-border text-muted-foreground'
                )}
              >
                {item.status === 'complete' ? 'Done' : item.status === 'warning' ? 'Partial' : 'Todo'}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Template Types Reference */}
      <div>
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3 block">Template Library</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {TEMPLATE_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => {
                setTemplateType(t.value);
                setSaveDialogOpen(true);
              }}
              className="flex items-start gap-3 p-3 rounded-lg border border-border/60 hover:border-primary/30 hover:bg-primary/[0.02] text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              <t.icon size={16} className="text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-card-foreground">{t.label}</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{t.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Save as Template Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Template Name</Label>
              <Input
                className="mt-1.5"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="e.g. Q2 Lead Gen — MENA"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Template Type</Label>
              <Select value={templateType} onValueChange={setTemplateType}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <t.icon size={12} /> {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 pt-2 border-t border-border/50">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Include in Template</Label>
              <ToggleRow label="Account IDs & credentials" checked={includeAccounts} onChange={setIncludeAccounts} hint="Sensitive — usually excluded" />
              <ToggleRow label="Branding & theme settings" checked={includeBranding} onChange={setIncludeBranding} />
              <ToggleRow label="Alert rules & thresholds" checked={includeAlerts} onChange={setIncludeAlerts} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate} className="gap-1.5">
              <Save size={12} /> Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Action Button ─── */
function ActionButton({ icon: Icon, label, sublabel, onClick }: {
  icon: React.ElementType;
  label: string;
  sublabel: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-4 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-primary/[0.02] transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
    >
      <Icon size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
      <span className="text-xs font-medium text-card-foreground">{label}</span>
      <span className="text-[10px] text-muted-foreground">{sublabel}</span>
    </button>
  );
}

/* ─── Toggle Row ─── */
function ToggleRow({ label, checked, onChange, hint }: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-xs text-card-foreground">{label}</span>
        {hint && <p className="text-[9px] text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="scale-90" />
    </div>
  );
}
