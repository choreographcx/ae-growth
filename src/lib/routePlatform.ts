import { PlatformKey } from '@/types/dashboard';

const ROUTE_PLATFORM_MAP: Record<string, PlatformKey> = {
  '/meta': 'meta',
  '/google': 'google',
  '/tiktok': 'tiktok',
  '/snapchat': 'snapchat',
  '/linkedin': 'linkedin',
  '/x': 'x',
  '/programmatic': 'programmatic',
};

export function getRoutePlatform(pathname: string): PlatformKey | null {
  return ROUTE_PLATFORM_MAP[pathname] ?? null;
}

export function isPlatformRoute(pathname: string): boolean {
  return pathname in ROUTE_PLATFORM_MAP;
}
