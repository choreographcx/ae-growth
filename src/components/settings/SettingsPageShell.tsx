import { ReactNode } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { Button } from '@/components/ui/button';
import { Save, Clock } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Hide the global save bar (e.g. for pages that don't mutate client config). */
  hideSave?: boolean;
}

/**
 * Shared layout for every individual settings page. Provides a consistent
 * header with the global "Save" affordance so users don't have to hunt for
 * it on each split page.
 */
export function SettingsPageShell({ title, subtitle, children, hideSave }: Props) {
  const { saveConfig, isSaving, lastSavedAt } = useDashboard();
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <SectionHeader title={title} subtitle={subtitle} />
        {!hideSave && (
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock size={10} />
              <span>Last saved: {lastSavedAt ?? 'Never'}</span>
            </div>
            <Button size="sm" onClick={saveConfig} disabled={isSaving} className="gap-1.5 h-8 text-xs">
              <Save size={12} /> {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        )}
      </div>
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        {children}
      </div>
    </div>
  );
}
