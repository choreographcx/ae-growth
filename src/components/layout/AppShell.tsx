import { ReactNode, useState, useEffect } from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import { MobileDrawer } from './MobileDrawer';
import { BackToTop } from './BackToTop';
import { useIsMobile } from '@/hooks/use-mobile';

export function AppShell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {!isMobile && <DashboardSidebar />}
      {isMobile && <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
      <div className="flex flex-1 flex-col min-w-0">
        <DashboardHeader onMenuClick={() => setDrawerOpen(true)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <div className="mx-auto max-w-[1400px] animate-fade-in">
            {children}
          </div>
        </main>
      </div>
      {!isMobile && <BackToTop />}
    </div>
  );
}
