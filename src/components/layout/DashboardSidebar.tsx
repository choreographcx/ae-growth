import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';
import { useAuth } from '@/hooks/useAuth';
import { platformIconEntries, PlatformIconEntry } from '@/lib/platformIcons';
import { useState } from 'react';
import { cn } from '@/lib/utils';

function NavIcon({ entry, size = 18 }: { entry: PlatformIconEntry; size?: number }) {
  if (entry.type === 'lucide') {
    const Icon = entry.icon;
    return <Icon size={size} className="shrink-0 transition-colors duration-200" />;
  }
  return <entry.Component size={size} className="shrink-0 transition-colors duration-200" />;
}

export function DashboardSidebar() {
  const { enabledPlatforms, client } = useDashboard();
  const { isAdmin } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { to: '/', label: 'Overview', entry: { type: 'lucide' as const, icon: LayoutDashboard } },
    ...enabledPlatforms.map(p => ({
      to: `/${p}`,
      label: client.platforms[p].label,
      entry: platformIconEntries[p],
    })),
    ...(isAdmin
      ? [
          { to: '/tracking-health', label: 'Tracking Health', entry: { type: 'lucide' as const, icon: Activity } },
          { to: '/admin', label: 'Admin / Settings', entry: { type: 'lucide' as const, icon: Settings } },
        ]
      : []),
  ];

  return (
    <aside className={cn(
      "sticky top-0 h-screen flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 scrollbar-thin overflow-y-auto",
      collapsed ? "w-16" : "w-60"
    )}>
      <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border">
        {!collapsed && <span className="text-lg font-bold text-sidebar-foreground tracking-tight"></span>}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-muted transition-colors">
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      <nav className="flex-1 py-2.5 px-2 space-y-0.5">
        {navItems.map(item => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink key={item.to} to={item.to} className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200",
              isActive
                ? "bg-sidebar-primary/15 text-sidebar-primary border-l-2 border-sidebar-primary shadow-[inset_0_0_0_1px_hsl(var(--sidebar-primary)/0.1)]"
                : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground border-l-2 border-transparent"
            )}>
              <NavIcon entry={item.entry} size={17} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
