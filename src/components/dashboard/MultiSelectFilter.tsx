import { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function MultiSelectFilter({ label, options, selected, onChange }: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.toLowerCase().includes(q));
  }, [options, search]);

  // Focus search when popover opens, clear on close
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [open]);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter(s => s !== value)
        : [...selected, value]
    );
  };

  const clearAll = () => onChange([]);

  const displayText = selected.length === 0
    ? `All ${label}`
    : selected.length === 1
      ? selected[0]
      : `${selected.length} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 text-xs gap-1.5 justify-between min-w-[130px] max-w-[200px]",
            selected.length > 0 && "border-primary/50 bg-primary/5"
          )}
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown size={12} className="shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        {selected.length > 0 && (
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs text-muted-foreground">{selected.length} selected</span>
            <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Clear
            </button>
          </div>
        )}
        <div className="px-2 pt-2 pb-1">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              placeholder={`Search ${label.toLowerCase()}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-7 pl-7 pr-2 text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </div>
        <div className="max-h-[240px] overflow-y-auto p-1">
          {filteredOptions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">No results</p>
          )}
          {filteredOptions.map(option => {
            const isSelected = selected.includes(option);
            return (
              <button
                key={option}
                onClick={() => toggle(option)}
                className={cn(
                  "w-full flex items-center gap-2 text-left text-sm px-2.5 py-1.5 rounded-md transition-colors",
                  isSelected ? "bg-primary/10 text-foreground" : "hover:bg-muted text-foreground"
                )}
              >
                <div className={cn(
                  "h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0",
                  isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                )}>
                  {isSelected && <Check size={10} className="text-primary-foreground" />}
                </div>
                <span className="truncate">{option}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
