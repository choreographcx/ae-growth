import { Menu, Download, Clock } from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface DashboardHeaderProps {
  onMenuClick: () => void;
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const { client, clients, setClient, dateRange, setDateRange, comparePeriod, setComparePeriod, lastRefresh } = useDashboard();
  const isMobile = useIsMobile();

  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border px-4 md:px-6">
      <div className="flex items-center justify-between h-16 gap-3">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button onClick={onMenuClick} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <Menu size={20} />
            </button>
          )}
          <h1 className="text-lg font-semibold text-foreground truncate">{client.name}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isMobile && (
            <>
              <Select value={client.id} onValueChange={v => { const c = clients.find(cl => cl.id === v); if (c) setClient(c); }}>
                <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Last 7 Days', 'Last 14 Days', 'Last 30 Days', 'This Month', 'Last Month', 'Last 90 Days'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
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
            </>
          )}
        </div>
      </div>
      {isMobile && (
        <div className="flex items-center gap-2 pb-3 overflow-x-auto scrollbar-thin">
          <Select value={client.id} onValueChange={v => { const c = clients.find(cl => cl.id === v); if (c) setClient(c); }}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['Last 7 Days', 'Last 14 Days', 'Last 30 Days', 'This Month'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
    </header>
  );
}
