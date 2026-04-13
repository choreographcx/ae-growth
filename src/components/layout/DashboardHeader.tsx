import { useState, useMemo, useCallback } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Menu, Download, CalendarIcon, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, subYears, endOfYear } from 'date-fns';
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
  { label: 'This Year', from: startOfYear(new Date()), to: new Date() },
  { label: 'Last Year', from: startOfYear(subYears(new Date(), 1)), to: endOfYear(subYears(new Date(), 1)) },
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

  const fromFormat = range.from.getFullYear() === range.to.getFullYear() ? 'MMM d' : 'MMM d, yyyy';
  const displayText = `${format(range.from, fromFormat)} – ${format(range.to, 'MMM d, yyyy')}`;

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
    enabledPlatforms, client,
    selectedPlatforms, setSelectedPlatforms,
    selectedCampaigns, setSelectedCampaigns,
    selectedObjectives, setSelectedObjectives,
  } = useDashboard();
  const isMobile = useIsMobile();
  const { signOut } = useAuth();

  const allCampaigns = useMemo(() => {
    return enabledPlatforms.flatMap(p => generateCampaigns(p));
  }, [enabledPlatforms]);

  const campaignNames = useMemo(() => [...new Set(allCampaigns.map(c => c.name))], [allCampaigns]);

  const platformOptions = useMemo(
    () => enabledPlatforms.map(k => client.platforms[k].label),
    [enabledPlatforms, client.platforms]
  );

  const hasFilters = selectedPlatforms.length > 0 || selectedCampaigns.length > 0 || selectedObjectives.length > 0;

  const handleExportPDF = useCallback(async () => {
    const el = document.getElementById('dashboard-main-content');
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollY: -window.scrollY,
        windowHeight: el.scrollHeight,
        height: el.scrollHeight,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const pdfWidth = 297; // A4 landscape width in mm
      const pdfHeight = 210; // A4 landscape height in mm
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const pages = Math.ceil(imgHeight * ratio / pdfHeight);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      for (let i = 0; i < pages; i++) {
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -(i * pdfHeight), imgWidth * ratio, imgHeight * ratio);
      }

      pdf.save(`dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF export failed', err);
    }
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border px-3 md:px-5">
      <div className={`flex items-center justify-between gap-2 ${isMobile ? 'h-12' : 'h-12'}`}>
        <div className="flex items-center gap-2 min-w-0">
          {isMobile && (
            <button onClick={onMenuClick} className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0">
              <Menu size={18} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {!isMobile && (
            <>
              <DateRangePicker />
              <div className="h-3.5 w-px bg-border mx-1" />
              <MultiSelectFilter label="Platforms" options={platformOptions} selected={selectedPlatforms} onChange={setSelectedPlatforms} />
              <MultiSelectFilter label="Campaigns" options={campaignNames} selected={selectedCampaigns} onChange={setSelectedCampaigns} />
              <MultiSelectFilter label="Objectives" options={objectives} selected={selectedObjectives} onChange={setSelectedObjectives} />
              {hasFilters && (
                <button
                  onClick={() => { setSelectedPlatforms([]); setSelectedCampaigns([]); setSelectedObjectives([]); }}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors ml-0.5"
                >
                  Clear
                </button>
              )}
              <div className="h-3.5 w-px bg-border mx-1" />
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-[11px]" onClick={handleExportPDF}><Download size={11} /> Export PDF</Button>
              <div className="h-3.5 w-px bg-border mx-1" />
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-[11px]" onClick={signOut}>
                <LogOut size={12} /> Sign out
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
