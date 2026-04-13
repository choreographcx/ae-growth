import { useState } from 'react';
import { Menu, Download, Clock, CalendarIcon, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useDashboard } from '@/context/DashboardContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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

function DateRangePicker({ compact = false }: { compact?: boolean }) {
  const { dateRange, setDateRange } = useDashboard();
  const [open, setOpen] = useState(false);

  const activePreset = presets.find(p => p.label === dateRange);
  const [range, setRange] = useState<{ from: Date; to: Date }>(
    activePreset ? { from: activePreset.from, to: activePreset.to } : { from: subDays(new Date(), 30), to: new Date() }
  );

  const handlePreset = (preset: typeof presets[0]) => {
    setRange({ from: preset.from, to: preset.to });
    setDateRange(preset.label);
    setOpen(false);
  };

  const displayText = activePreset
    ? activePreset.label
    : `${format(range.from, 'MMM d')} – ${format(range.to, 'MMM d')}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal gap-1.5",
            compact ? "h-7 text-[11px] px-2 flex-1 min-w-0" : "h-9 text-sm w-[200px]"
          )}
        >
          <CalendarIcon size={compact ? 12 : 14} className="shrink-0 text-muted-foreground" />
          <span className="truncate">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row">
          <div className="border-b sm:border-b-0 sm:border-r border-border p-2 space-y-0.5 min-w-[140px]">
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
          <div className="p-2">
            <Calendar
              mode="range"
              selected={{ from: range.from, to: range.to }}
              onSelect={(r) => {
                if (r?.from && r?.to) {
                  setRange({ from: r.from, to: r.to });
                  setDateRange(`${format(r.from, 'MMM d')} – ${format(r.to, 'MMM d, yyyy')}`);
                  setOpen(false);
                } else if (r?.from) {
                  setRange(prev => ({ ...prev, from: r.from! }));
                }
              }}
              numberOfMonths={compact ? 1 : 2}
              className={cn("p-3 pointer-events-auto")}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const { comparePeriod, setComparePeriod, lastRefresh } = useDashboard();
  const isMobile = useIsMobile();
  const { signOut, profile } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border px-3 md:px-6">
      <div className={`flex items-center justify-between gap-2 ${isMobile ? 'h-12' : 'h-16'}`}>
        <div className="flex items-center gap-2 min-w-0">
          {isMobile && (
            <button onClick={onMenuClick} className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0">
              <Menu size={18} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isMobile && (
            <>
              <DateRangePicker />
              <Select value={comparePeriod} onValueChange={setComparePeriod}>
                <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Previous Period', 'Previous Month', 'Previous Year', 'None'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9 gap-1.5"><Download size={14} /> Export</Button>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={12} />
                <span>{lastRefresh}</span>
              </div>
              <div className="h-5 w-px bg-border mx-1" />
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">{profile?.email}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={signOut} title="Sign out">
                <LogOut size={14} />
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
