import { useState, useMemo } from 'react';
import { Menu, Download, Clock, CalendarIcon, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useDashboard } from '@/context/DashboardContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelectFilter } from '@/components/dashboard/MultiSelectFilter';
import { generateCampaigns } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  onMenuClick: () => void;
}

const presets = [
  { label: 'Last 7 Days', from: subDays(new Date(), 7), to: new Date() },
  { label: 'Last 14 Days', from: subDays(new Date(), 14), to: new Date() },
  { label: 'Last 30 Days', from: subDays(new Date(), 30), to: new Date() },
  { label: 'This Month', from: startOfMonth(new Date()), to: new Date() },
  { label: 'Last Month', from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) },
  { label: 'Last 90 Days', from: subDays(new Date(), 90), to: new Date() },
];

const objectives = ['Awareness', 'Traffic', 'Conversions', 'Lead Gen', 'Engagement'];

function DateRangePicker({ compact = false }: { compact?: boolean }) {
  const { dateRange, setDateRange, showPreviousPeriod, setShowPreviousPeriod } = useDashboard();
  const [open, setOpen] = useState(false);

  const activePreset = presets.find(p => p.label === dateRange);
  const [range, setRange] = useState<{ from: Date; to: Date }>(
    activePreset ? { from: activePreset.from, to: activePreset.to } : { from: subDays(new Date(), 30), to: new Date() }
  );
  const [draftRange, setDraftRange] = useState(range);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setDraftRange(range);
    setOpen(isOpen);
  };

  const handlePreset = (preset: typeof presets[0]) => {
    setRange({ from: preset.from, to: preset.to });
    setDateRange(preset.label);
    setOpen(false);
  };

  const handleApply = () => {
    setRange(draftRange);
    setDateRange(`${format(draftRange.from, 'MMM d')} – ${format(draftRange.to, 'MMM d, yyyy')}`);
    setOpen(false);
  };

  const displayText = `${format(range.from, 'MMM d, yyyy')} – ${format(range.to, 'MMM d, yyyy')}`;

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal gap-1.5",
            compact ? "h-7 text-[11px] px-2 flex-1 min-w-0" : "h-8 text-xs w-[240px]"
          )}
        >
          <CalendarIcon size={compact ? 12 : 12} className="shrink-0 text-muted-foreground" />
          <span className="truncate">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row">
          <div className="border-b sm:border-b-0 sm:border-r border-border p-2 min-w-[140px]">
            <div className="flex flex-col space-y-0.5">
              {presets.map(p => (
                <button
                  key={p.label}
                  onClick={() => handlePreset(p)}
                  className={cn(
                    "w-full text-left text-sm px-3 py-1.5 rounded-md transition-colors",
                    dateRange === p.label
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="border-t border-border mt-2 pt-2 px-3 flex items-center gap-2">
              <Checkbox
                id="prev-period"
                checked={showPreviousPeriod}
                onCheckedChange={(v) => setShowPreviousPeriod(!!v)}
              />
              <label htmlFor="prev-period" className="text-xs text-muted-foreground cursor-pointer select-none">
                Compare to previous period
              </label>
            </div>
          </div>
          <div className="p-2 flex flex-col">
            <Calendar
              mode="range"
              selected={{ from: draftRange.from, to: draftRange.to }}
              onSelect={(r) => {
                if (r?.from && r?.to) {
                  setDraftRange({ from: r.from, to: r.to });
                } else if (r?.from) {
                  setDraftRange(prev => ({ ...prev, from: r.from! }));
                }
              }}
              numberOfMonths={compact ? 1 : 2}
              className={cn("p-3 pointer-events-auto")}
            />
            <div className="border-t border-border px-3 py-2 flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" className="h-7 text-xs" onClick={handleApply}>Apply</Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const {
    lastRefresh, enabledPlatforms, client,
    selectedPlatforms, setSelectedPlatforms,
    selectedCampaigns, setSelectedCampaigns,
    selectedObjectives, setSelectedObjectives,
  } = useDashboard();
  const isMobile = useIsMobile();
  const { signOut, profile } = useAuth();

  const allCampaigns = useMemo(() => {
    return enabledPlatforms.flatMap(p => generateCampaigns(p));
  }, [enabledPlatforms]);

  const campaignNames = useMemo(() => [...new Set(allCampaigns.map(c => c.name))], [allCampaigns]);

  const platformOptions = useMemo(
    () => enabledPlatforms.map(k => client.platforms[k].label),
    [enabledPlatforms, client.platforms]
  );

  const hasFilters = selectedPlatforms.length > 0 || selectedCampaigns.length > 0 || selectedObjectives.length > 0;

  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border px-3 md:px-6">
      <div className={`flex items-center justify-between gap-2 ${isMobile ? 'h-12' : 'h-14'}`}>
        <div className="flex items-center gap-2 min-w-0">
          {isMobile && (
            <button onClick={onMenuClick} className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0">
              <Menu size={18} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {!isMobile && (
            <>
              <DateRangePicker />
              <div className="h-4 w-px bg-border mx-0.5" />
              <MultiSelectFilter label="Platforms" options={platformOptions} selected={selectedPlatforms} onChange={setSelectedPlatforms} />
              <MultiSelectFilter label="Campaigns" options={campaignNames} selected={selectedCampaigns} onChange={setSelectedCampaigns} />
              <MultiSelectFilter label="Objectives" options={objectives} selected={selectedObjectives} onChange={setSelectedObjectives} />
              {hasFilters && (
                <button
                  onClick={() => { setSelectedPlatforms([]); setSelectedCampaigns([]); setSelectedObjectives([]); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              )}
              <div className="h-4 w-px bg-border mx-0.5" />
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"><Download size={12} /> Export PDF</Button>
              <div className="h-4 w-px bg-border mx-0.5" />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={signOut} title="Sign out">
                <LogOut size={13} />
              </Button>
            </>
          )}
        </div>
      </div>
      {isMobile && (
        <div className="flex items-center gap-1.5 pb-2">
          <DateRangePicker compact />
        </div>
      )}
    </header>
  );
}
