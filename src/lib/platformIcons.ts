import { LayoutDashboard, Settings, Activity, Globe, Layers, MessageCircle, Briefcase, Tv, Megaphone, BarChart3 } from 'lucide-react';
import { PlatformKey } from '@/types/dashboard';
import { LucideIcon } from 'lucide-react';

export const platformIcons: Record<PlatformKey, LucideIcon> = {
  meta: Globe,
  google: BarChart3,
  tiktok: Tv,
  snapchat: MessageCircle,
  linkedin: Briefcase,
  x: Megaphone,
  programmatic: Layers,
};
