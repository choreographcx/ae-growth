import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={cn(
        "fixed bottom-6 right-6 z-40 h-8 w-8 rounded-full bg-card/80 backdrop-blur-sm text-muted-foreground border border-border/50 shadow-sm",
        "flex items-center justify-center",
        "hover:text-foreground hover:border-border hover:shadow",
        "transition-all duration-300 ease-out",
        visible ? "opacity-70 translate-y-0 pointer-events-auto hover:opacity-100" : "opacity-0 translate-y-3 pointer-events-none"
      )}
      aria-label="Back to top"
    >
      <ChevronUp size={14} strokeWidth={2} />
    </button>
  );
}
