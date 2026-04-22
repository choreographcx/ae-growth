import { useEffect, useMemo, useState } from 'react';
import { Filter, ChevronRight, ArrowLeft, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useDashboard } from '@/context/DashboardContext';
import { PlatformKey } from '@/types/dashboard';

interface MobileFilterSheetProps {
  showPlatformsFilter: boolean;
  scopeToPlatform?: PlatformKey;
}

type FilterKey = 'platforms' | 'markets' | 'channels' | 'campaigns' | 'objectives';

interface FilterDef {
  key: FilterKey;
  label: string;
  options: string[];
  selected: string[];
  setSelected: (v: string[]) => void;
}

/**
 * Mobile-only filter trigger + sheet. Mirrors the desktop inline filter cluster
 * but renders as a master/detail flow inside a bottom sheet, in the same spirit
 * as native mobile shopping filters: list of categories → tap one → multi-select
 * options with search → Apply.
 */
export function MobileFilterSheet({ showPlatformsFilter, scopeToPlatform }: MobileFilterSheetProps) {
  const {
    data,
    selectedPlatforms, setSelectedPlatforms,
    selectedCampaigns, setSelectedCampaigns,
    selectedObjectives, setSelectedObjectives,
    selectedMarkets, setSelectedMarkets,
    selectedChannels, setSelectedChannels,
  } = useDashboard();

  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<FilterKey | null>(null);

  // Reset detail view whenever the sheet closes so it always opens at the list.
  useEffect(() => { if (!open) setActiveKey(null); }, [open]);

  const platformOptions = useMemo(() => data.availablePlatforms.map(p => p.label), [data.availablePlatforms]);

  const campaignNames = useMemo(() => {
    if (scopeToPlatform) return data.campaignsByPlatform[scopeToPlatform] ?? [];
    return data.availableCampaigns;
  }, [scopeToPlatform, data.campaignsByPlatform, data.availableCampaigns]);

  const objectiveOptions = useMemo(() => {
    if (scopeToPlatform) return data.objectivesByPlatform[scopeToPlatform] ?? [];
    return data.availableObjectives;
  }, [scopeToPlatform, data.objectivesByPlatform, data.availableObjectives]);

  const marketOptions = useMemo(() => {
    if (scopeToPlatform) return data.marketsByPlatform[scopeToPlatform] ?? [];
    return data.availableMarkets;
  }, [scopeToPlatform, data.marketsByPlatform, data.availableMarkets]);

  const channelOptions = useMemo(() => {
    if (scopeToPlatform) return data.channelsByPlatform[scopeToPlatform] ?? [];
    return data.availableChannels;
  }, [scopeToPlatform, data.channelsByPlatform, data.availableChannels]);

  const filters: FilterDef[] = useMemo(() => {
    const list: FilterDef[] = [];
    if (showPlatformsFilter) {
      list.push({ key: 'platforms', label: 'Platforms', options: platformOptions, selected: selectedPlatforms, setSelected: setSelectedPlatforms });
    }
    if (marketOptions.length > 0) {
      list.push({ key: 'markets', label: 'Markets', options: marketOptions, selected: selectedMarkets, setSelected: setSelectedMarkets });
    }
    if (channelOptions.length > 0) {
      list.push({ key: 'channels', label: 'Channels', options: channelOptions, selected: selectedChannels, setSelected: setSelectedChannels });
    }
    list.push({ key: 'campaigns', label: 'Campaigns', options: campaignNames, selected: selectedCampaigns, setSelected: setSelectedCampaigns });
    if (objectiveOptions.length > 0) {
      list.push({ key: 'objectives', label: 'Objectives', options: objectiveOptions, selected: selectedObjectives, setSelected: setSelectedObjectives });
    }
    return list;
  }, [
    showPlatformsFilter, platformOptions, selectedPlatforms, setSelectedPlatforms,
    marketOptions, selectedMarkets, setSelectedMarkets,
    channelOptions, selectedChannels, setSelectedChannels,
    campaignNames, selectedCampaigns, setSelectedCampaigns,
    objectiveOptions, selectedObjectives, setSelectedObjectives,
  ]);

  const totalSelected =
    (showPlatformsFilter ? selectedPlatforms.length : 0) +
    selectedMarkets.length + selectedChannels.length +
    selectedCampaigns.length + selectedObjectives.length;

  const clearAll = () => {
    if (showPlatformsFilter) setSelectedPlatforms([]);
    setSelectedMarkets([]);
    setSelectedChannels([]);
    setSelectedCampaigns([]);
    setSelectedObjectives([]);
  };

  const activeFilter = activeKey ? filters.find(f => f.key === activeKey) ?? null : null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Open filters"
          className="h-9 lg:h-8 px-2.5 gap-1.5 text-xs shrink-0 relative"
        >
          <Filter size={14} className="text-muted-foreground" />
          <span>Filter</span>
          {totalSelected > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold tabular-nums">
              {totalSelected}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="p-0 rounded-t-2xl max-h-[85vh] flex flex-col sm:rounded-2xl sm:max-w-md sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:max-h-[80vh] sm:border"
      >
        {!activeFilter ? (
          <FilterListView
            filters={filters}
            onPick={setActiveKey}
            onClose={() => setOpen(false)}
            onClear={clearAll}
            totalSelected={totalSelected}
          />
        ) : (
          <FilterDetailView
            filter={activeFilter}
            onBack={() => setActiveKey(null)}
            onApply={() => setOpen(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function FilterListView({
  filters, onPick, onClose, onClear, totalSelected,
}: {
  filters: FilterDef[];
  onPick: (k: FilterKey) => void;
  onClose: () => void;
  onClear: () => void;
  totalSelected: number;
}) {
  return (
    <>
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="text-center text-base font-semibold">Filter</div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {filters.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => onPick(f.key)}
            className="w-full flex items-center justify-between py-3 border-b border-border last:border-b-0 text-left"
          >
            <span className="text-sm font-medium text-foreground">{f.label}</span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {f.selected.length === 0 ? 'View All' : `${f.selected.length} selected`}
              <ChevronRight size={14} />
            </span>
          </button>
        ))}
      </div>
      <div className="border-t border-border px-4 py-3 flex items-center gap-2">
        {totalSelected > 0 && (
          <Button variant="ghost" className="flex-1 h-10 text-sm" onClick={onClear}>
            Clear all
          </Button>
        )}
        <Button className="flex-1 h-10 text-sm font-semibold" onClick={onClose}>
          Done
        </Button>
      </div>
    </>
  );
}

function FilterDetailView({
  filter, onBack, onApply,
}: {
  filter: FilterDef;
  onBack: () => void;
  onApply: () => void;
}) {
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<string[]>(filter.selected);

  // Re-sync draft if the user re-enters this view after external state changes.
  useEffect(() => { setDraft(filter.selected); }, [filter.key]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filter.options;
    return filter.options.filter(o => o.toLowerCase().includes(q));
  }, [filter.options, search]);

  const toggle = (v: string) => {
    setDraft(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  };

  const handleApply = () => {
    filter.setSelected(draft);
    onApply();
  };

  return (
    <>
      <div className="px-3 pt-3 pb-3 border-b border-border flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 text-center text-base font-semibold pr-8">{filter.label}</div>
      </div>
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${filter.label.toLowerCase()}...`}
            className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No results</p>
        )}
        {filtered.map(option => {
          const isSelected = draft.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className={cn(
                "w-full flex items-center gap-3 text-left px-3 py-3 rounded-md transition-colors",
                isSelected ? "bg-primary/5" : "hover:bg-muted"
              )}
            >
              <span className="flex-1 truncate text-sm text-foreground">{option}</span>
              <div className={cn(
                "h-5 w-5 rounded-[4px] border flex items-center justify-center shrink-0",
                isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
              )}>
                {isSelected && <Check size={14} className="text-primary-foreground" />}
              </div>
            </button>
          );
        })}
      </div>
      <div className="border-t border-border px-4 py-3 flex items-center gap-2">
        <Button variant="ghost" className="flex-1 h-10 text-sm" onClick={() => setDraft([])} disabled={draft.length === 0}>
          Clear
        </Button>
        <Button className="flex-1 h-10 text-sm font-semibold" onClick={handleApply}>
          Apply
        </Button>
      </div>
    </>
  );
}
