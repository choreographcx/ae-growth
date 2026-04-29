import { useEffect, useMemo, useState } from 'react';
import { Filter, ChevronRight, ArrowLeft, Search, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useDashboard } from '@/context/DashboardContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { PlatformKey } from '@/types/dashboard';
import { CARD_TYPE_LABELS, CARD_TYPE_ORDER, CardType } from '@/lib/cardType';

interface MobileFilterSheetProps {
  showPlatformsFilter: boolean;
  scopeToPlatform?: PlatformKey;
}

type FilterKey = 'platforms' | 'cardTypes' | 'markets' | 'channels' | 'campaigns' | 'objectives';

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
    selectedCardTypes, setSelectedCardTypes,
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

  // Card-type bucket UI works on labels; we map back to keys before storing.
  const cardTypeOptions = useMemo(() => CARD_TYPE_ORDER.map(k => CARD_TYPE_LABELS[k]), []);
  const cardTypeLabelToKey = useMemo(() => {
    const m = new Map<string, CardType>();
    for (const k of CARD_TYPE_ORDER) m.set(CARD_TYPE_LABELS[k], k);
    return m;
  }, []);
  const selectedCardTypeLabels = useMemo(
    () => selectedCardTypes.map(k => CARD_TYPE_LABELS[k]),
    [selectedCardTypes],
  );
  const setSelectedCardTypeLabels = (labels: string[]) => {
    const next: CardType[] = [];
    for (const l of labels) {
      const k = cardTypeLabelToKey.get(l);
      if (k) next.push(k);
    }
    setSelectedCardTypes(next);
  };

  const filters: FilterDef[] = useMemo(() => {
    const list: FilterDef[] = [];
    if (showPlatformsFilter) {
      list.push({ key: 'platforms', label: 'Platforms', options: platformOptions, selected: selectedPlatforms, setSelected: setSelectedPlatforms });
    }
    list.push({ key: 'cardTypes', label: 'Card Type', options: cardTypeOptions, selected: selectedCardTypeLabels, setSelected: setSelectedCardTypeLabels });
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
    cardTypeOptions, selectedCardTypeLabels,
    marketOptions, selectedMarkets, setSelectedMarkets,
    channelOptions, selectedChannels, setSelectedChannels,
    campaignNames, selectedCampaigns, setSelectedCampaigns,
    objectiveOptions, selectedObjectives, setSelectedObjectives,
  ]);

  const totalSelected =
    (showPlatformsFilter ? selectedPlatforms.length : 0) +
    selectedCardTypes.length +
    selectedMarkets.length + selectedChannels.length +
    selectedCampaigns.length + selectedObjectives.length;

  const clearAll = () => {
    if (showPlatformsFilter) setSelectedPlatforms([]);
    setSelectedCardTypes([]);
    setSelectedMarkets([]);
    setSelectedChannels([]);
    setSelectedCampaigns([]);
    setSelectedObjectives([]);
  };

  const activeFilter = activeKey ? filters.find(f => f.key === activeKey) ?? null : null;

  const isMobile = useIsMobile();

  const triggerButton = (
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
  );

  const body = !activeFilter ? (
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
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{triggerButton}</SheetTrigger>
        <SheetContent
          side="bottom"
          className="p-0 rounded-t-2xl max-h-[85vh] flex flex-col"
        >
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="p-0 w-fit min-w-[320px] max-w-[90vw] max-h-[80vh] flex flex-col overflow-hidden rounded-xl"
      >
        {body}
      </PopoverContent>
    </Popover>
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
  const activeChips = filters.filter(f => f.selected.length > 0);
  return (
    <>
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="text-center text-base font-semibold">Filter</div>
      </div>
      {activeChips.length > 0 && (
        <div className="px-4 pt-3 pb-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Active</span>
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeChips.map(f => {
              const value = summarize(f.selected);
              const full = `${f.label}: ${f.selected.join(', ')}`;
              return (
                <span
                  key={f.key}
                  title={full}
                  className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 pl-2 pr-1 py-0.5 max-w-[220px] text-[11px]"
                >
                  <span className="text-muted-foreground/70">{f.label}:</span>
                  <span className="text-foreground font-medium truncate">{value}</span>
                  <button
                    type="button"
                    onClick={() => f.setSelected([])}
                    aria-label={`Clear ${f.label}`}
                    className="ml-0.5 p-0.5 rounded-full hover:bg-muted-foreground/15 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={11} />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
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

function summarize(values: string[]): string {
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]}, ${values[1]}`;
  return `${values[0]} +${values.length - 1}`;
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
