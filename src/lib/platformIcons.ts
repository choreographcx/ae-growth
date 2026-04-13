import { LayoutDashboard, Settings, Activity, Layers, Megaphone } from 'lucide-react';
import { PlatformKey } from '@/types/dashboard';
import metaIcon from '@/assets/platforms/meta.svg';
import googleAdsIcon from '@/assets/platforms/google-ads.svg';
import tiktokIcon from '@/assets/platforms/tiktok.svg';
import snapchatIcon from '@/assets/platforms/snapchat.svg';
import linkedinIcon from '@/assets/platforms/linkedin.svg';
import { LucideIcon } from 'lucide-react';

export type PlatformIconEntry =
  | { type: 'lucide'; icon: LucideIcon }
  | { type: 'svg'; src: string };

export const platformIconEntries: Record<PlatformKey, PlatformIconEntry> = {
  meta: { type: 'svg', src: metaIcon },
  google: { type: 'svg', src: googleAdsIcon },
  tiktok: { type: 'svg', src: tiktokIcon },
  snapchat: { type: 'svg', src: snapchatIcon },
  linkedin: { type: 'svg', src: linkedinIcon },
  x: { type: 'lucide', icon: Megaphone },
  programmatic: { type: 'lucide', icon: Layers },
};
