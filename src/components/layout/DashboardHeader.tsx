import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Download, CalendarIcon, LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, subYears, endOfYear } from 'date-fns';
import { useDashboard } from '@/context/DashboardContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelectFilter } from '@/components/dashboard/MultiSelectFilter';
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
  { label: 'This Year', from: startOfYear(new Date()), to: new Date() },
  { label: 'Last Year', from: startOfYear(subYears(new Date(), 1)), to: endOfYear(subYears(new Date(), 1)) },
];



export function DateRangePicker({ compact = false }: { compact?: boolean }) {
  const { dateRange, setDateRange, showPreviousPeriod, setShowPreviousPeriod } = useDashboard();
  const [open, setOpen] = useState(false);

  const activePreset = presets.find(p => p.label === dateRange);
  const [range, setRange] = useState<{ from: Date; to: Date }>(
    activePreset ? { from: activePreset.from, to: activePreset.to } : { from: subDays(new Date(), 30), to: new Date() }
  );
  const [draftRange, setDraftRange] = useState(range);
  const [calendarMonth, setCalendarMonth] = useState(draftRange.from);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setDraftRange(range);
      setCalendarMonth(range.from);
    }
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

  const fromFormat = range.from.getFullYear() === range.to.getFullYear() ? 'MMM d' : 'MMM d, yyyy';
  const displayText = `${format(range.from, fromFormat)} – ${format(range.to, 'MMM d, yyyy')}`;

  const [activeField, setActiveField] = useState<'from' | 'to'>('from');

  if (compact) {
    // Mobile-styled picker: pill tabs at top, two-month vertical calendar, Cancel/Set at bottom.
    return (
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="justify-start text-left font-normal gap-1.5 h-9 text-sm px-2.5 flex-1 min-w-0"
          >
            <CalendarIcon size={14} className="shrink-0 text-muted-foreground" />
            <span className="truncate">{displayText}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[92vw] max-w-[380px] p-0 rounded-2xl overflow-hidden bg-card"
          align="end"
          sideOffset={8}
        >
          {/* Pill tabs: Start / End */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex rounded-full border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => { setActiveField('from'); setCalendarMonth(draftRange.from); }}
                className={cn(
                  "flex-1 py-2 px-3 text-center transition-colors",
                  activeField === 'from' ? "bg-primary/10" : "bg-transparent"
                )}
              >
                <div className={cn(
                  "text-sm font-medium",
                  activeField === 'from' ? "text-primary" : "text-foreground"
                )}>Start</div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  {format(draftRange.from, 'MMM d, yyyy')}
                </div>
              </button>
              <button
                type="button"
                onClick={() => { setActiveField('to'); setCalendarMonth(draftRange.to); }}
                className={cn(
                  "flex-1 py-2 px-3 text-center border-l border-border transition-colors",
                  activeField === 'to' ? "bg-primary/10" : "bg-transparent"
                )}
              >
                <div className={cn(
                  "text-sm font-medium",
                  activeField === 'to' ? "text-primary" : "text-foreground"
                )}>End</div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  {format(draftRange.to, 'MMM d, yyyy')}
                </div>
              </button>
            </div>
          </div>

          {/* Calendar */}
          <div className="px-2">
            <Calendar
              mode="range"
              selected={{ from: draftRange.from, to: draftRange.to }}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              onSelect={(r) => {
                if (!r) return;
                if (activeField === 'from' && r.from) {
                  // Picking the start: keep end if still after, else reset end to from.
                  const newFrom = r.from;
                  const newTo = draftRange.to >= newFrom ? draftRange.to : newFrom;
                  setDraftRange({ from: newFrom, to: newTo });
                  setActiveField('to');
                } else if (activeField === 'to' && (r.to || r.from)) {
                  const candidate = r.to ?? r.from!;
                  if (candidate >= draftRange.from) {
                    setDraftRange(prev => ({ ...prev, to: candidate }));
                  } else {
                    setDraftRange({ from: candidate, to: draftRange.from });
                  }
                }
              }}
              numberOfMonths={1}
              className="p-2 pointer-events-auto"
            />
          </div>

          {/* Compare to previous period */}
          <div className="px-4 pb-2 flex items-center gap-2">
            <Checkbox
              id="prev-period-mobile"
              checked={showPreviousPeriod}
              onCheckedChange={(v) => setShowPreviousPeriod(!!v)}
            />
            <label htmlFor="prev-period-mobile" className="text-sm text-muted-foreground cursor-pointer select-none">
              Compare to previous period
            </label>
          </div>

          {/* Footer actions */}
          <div className="border-t border-border px-4 py-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-muted-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="text-sm font-semibold text-primary"
            >
              Set
            </button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="justify-start text-left font-normal gap-1.5 h-8 text-xs w-[240px]"
        >
          <CalendarIcon size={12} className="shrink-0 text-muted-foreground" />
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
            <div className="flex items-center gap-2 px-3 pb-2">
              <div className="flex-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Start Date</label>
                <input
                  type="date"
                  value={format(draftRange.from, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const d = new Date(e.target.value + 'T00:00:00');
                    if (!isNaN(d.getTime())) {
                      setDraftRange(prev => ({ ...prev, from: d }));
                      setCalendarMonth(d);
                    }
                  }}
                  className="w-full h-7 text-xs border border-border rounded-md px-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">End Date</label>
                <input
                  type="date"
                  value={format(draftRange.to, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const d = new Date(e.target.value + 'T00:00:00');
                    if (!isNaN(d.getTime())) {
                      setDraftRange(prev => ({ ...prev, to: d }));
                      setCalendarMonth(subMonths(d, 1));
                    }
                  }}
                  className="w-full h-7 text-xs border border-border rounded-md px-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <Calendar
              mode="range"
              selected={{ from: draftRange.from, to: draftRange.to }}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              onSelect={(r) => {
                if (r?.from && r?.to) {
                  setDraftRange({ from: r.from, to: r.to });
                } else if (r?.from) {
                  setDraftRange(prev => ({ ...prev, from: r.from! }));
                }
              }}
              numberOfMonths={2}
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
    client, data,
    selectedPlatforms, setSelectedPlatforms,
    selectedCampaigns, setSelectedCampaigns,
  } = useDashboard();
  const { signOut } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  // Filter options come from the live BigQuery data so they reflect what's actually available.
  const platformOptions = useMemo(() => data.availablePlatforms.map(p => p.label), [data.availablePlatforms]);
  const campaignNames = useMemo(() => data.availableCampaigns, [data.availableCampaigns]);

  const hasFilters = selectedPlatforms.length > 0 || selectedCampaigns.length > 0;

  const handleExportPDF = useCallback(async () => {
    setIsExporting(true);
    try {
      toast.info('PDF export is temporarily unavailable. We are working on restoring this feature.');
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('PDF export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, []);

  return (
    <header data-print-hide className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border px-3 md:px-5">
      {/* Mobile: single row with menu + centered logo */}
      <div className="relative flex h-12 items-center gap-2 lg:hidden">
        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={onMenuClick}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
        >
          <Menu size={18} />
        </button>
        {(client as any).branding?.logoUrl && (
          <Link
            to="/"
            aria-label="Go to Overview"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <img
              src={(client as any).branding.logoUrl}
              alt={client.name}
              className="h-7 w-auto object-contain"
            />
          </Link>
        )}
      </div>

      {/* Desktop: logo on its own row, filters below */}
      <div className="hidden lg:block">
        {(client as any).branding?.logoUrl && (
          <div className="flex h-14 items-center justify-center">
            <Link
              to="/"
              aria-label="Go to Overview"
              className="shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <img
                src={(client as any).branding.logoUrl}
                alt={client.name}
                className="h-8 w-auto object-contain"
              />
            </Link>
          </div>
        )}
        <div className="flex h-12 items-center justify-end gap-1.5 border-t border-border">
          <DateRangePicker />
          <div className="h-3.5 w-px bg-border mx-1" />
          <MultiSelectFilter label="Platforms" options={platformOptions} selected={selectedPlatforms} onChange={setSelectedPlatforms} />
          <MultiSelectFilter label="Campaigns" options={campaignNames} selected={selectedCampaigns} onChange={setSelectedCampaigns} />
          {hasFilters && (
            <button
              type="button"
              onClick={() => { setSelectedPlatforms([]); setSelectedCampaigns([]); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors ml-0.5"
            >
              Clear
            </button>
          )}
          <div className="h-3.5 w-px bg-border mx-1" />
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-sm" onClick={handleExportPDF} disabled={isExporting}>
            {isExporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            {isExporting ? 'Exporting…' : 'Export PDF'}
          </Button>
          <div className="h-3.5 w-px bg-border mx-1" />
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-sm" onClick={signOut}>
            <LogOut size={13} /> Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
