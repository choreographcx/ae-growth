import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, Activity, X, CalendarIcon } from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { platformIconEntries, PlatformIconEntry } from '@/lib/platformIcons';
import { cn } from '@/lib/utils';
import { DateRangePicker } from './DashboardHeader';

function NavIcon({ entry, size = 18 }: { entry: PlatformIconEntry; size?: number }) {
  if (entry.type === 'lucide') {
    const Icon = entry.icon;
    return <Icon size={size} className="shrink-0 transition-colors duration-200" />;
  }
  return <entry.Component size={size} className="shrink-0 transition-colors duration-200" />;
}

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const { enabledPlatforms, client } = useDashboard();
  const location = useLocation();

  const navItems = [
    { to: '/', label: 'Overview', entry: { type: 'lucide' as const, icon: LayoutDashboard } },
    ...enabledPlatforms.map(p => ({
      to: `/${p}`,
      label: client.platforms[p].label,
      entry: platformIconEntries[p],
    })),
    { to: '/tracking-health', label: 'Tracking Health', entry: { type: 'lucide' as const, icon: Activity } },
    { to: '/admin', label: 'Admin / Settings', entry: { type: 'lucide' as const, icon: Settings } },
  ];

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-sidebar animate-slide-in-left shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border">
          <span className="text-lg font-bold text-sidebar-foreground tracking-tight"></span>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-muted">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink key={item.to} to={item.to} onClick={onClose} className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}>
                <NavIcon entry={item.entry} size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </>
  );
}
