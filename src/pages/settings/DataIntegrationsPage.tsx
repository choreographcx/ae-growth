import { useDashboard } from '@/context/DashboardContext';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Database, Webhook, KeyRound, Plug, Activity, ArrowUpRight } from 'lucide-react';

export default function DataIntegrationsPage() {
  const { isSuperAdmin } = useAuth();
  const { client, updateClient } = useDashboard();
  if (!isSuperAdmin) return <Navigate to="/" replace />;

  return (
    <SettingsPageShell
      title="Data & Integrations"
      subtitle="Technical, high-risk: BigQuery, CRM, CAPI and analytics connections"
    >
      <div className="space-y-8">
        {/* BigQuery */}
        <Section icon={<Database size={14} />} title="BigQuery Source" description="Where the dashboard reads ad-platform performance data from.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">BigQuery Project</Label>
              <Input className="mt-1.5 h-9 text-sm" value={client.bigqueryProject} onChange={e => updateClient({ bigqueryProject: e.target.value })} placeholder="e.g. acme-analytics-prod" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">BigQuery Dataset</Label>
              <Input className="mt-1.5 h-9 text-sm" value={client.bigqueryDataset} onChange={e => updateClient({ bigqueryDataset: e.target.value })} placeholder="e.g. marketing_unified" />
            </div>
          </div>
        </Section>

        {/* Web analytics */}
        <Section icon={<Activity size={14} />} title="Web Analytics" description="GA4 properties powering the Web Analytics page.">
          <p className="text-xs text-muted-foreground">
            Manage GA4 properties from <Link to="/settings/measurement" className="text-primary hover:underline inline-flex items-center gap-0.5">Measurement Settings <ArrowUpRight size={11} /></Link>.
          </p>
        </Section>

        {/* Placeholders */}
        <Section icon={<Plug size={14} />} title="CRM Integration" description="Push offline conversions and audiences to your CRM.">
          <Placeholder text="Not connected" />
        </Section>
        <Section icon={<Webhook size={14} />} title="CAPI Connections" description="Server-side conversion API endpoints (Meta CAPI, Google EC, etc).">
          <Placeholder text="No CAPI endpoints configured" />
        </Section>
        <Section icon={<KeyRound size={14} />} title="API Keys & Tokens" description="Service-account credentials and rotated tokens.">
          <p className="text-xs text-muted-foreground">Secrets are managed via Lovable Cloud and never displayed here.</p>
        </Section>
        <Section icon={<Database size={14} />} title="Data Freshness" description="Sync status and last-updated timestamps across all sources.">
          <Placeholder text="Live freshness checks coming soon" />
        </Section>
      </div>
    </SettingsPageShell>
  );
}

function Section({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-primary">{icon}</span>
        <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">{description}</p>
      {children}
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
      {text} <Badge variant="outline" className="ml-2 text-[10px]">Coming soon</Badge>
    </div>
  );
}
