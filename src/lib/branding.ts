/**
 * Shared branding utilities — apply user-customized colors, logos and favicon
 * to the document so they take effect across the entire app (dashboard,
 * auth pages, pending-approval screen, etc.). Branding is also cached in
 * localStorage so unauthenticated pages can render the correct logo/colors
 * before Supabase data is loaded.
 */

export interface BrandingConfig {
  logoUrl: string;
  darkLogoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  sidebarStyle: 'dark' | 'light' | 'brand';
  chartPalette: 'vibrant' | 'muted' | 'monochrome' | 'brand';
  cardRadius: 'small' | 'medium' | 'large';
}

export const DEFAULT_BRANDING: BrandingConfig = {
  logoUrl: '',
  darkLogoUrl: '',
  faviconUrl: '',
  primaryColor: '#0fa968',
  secondaryColor: '#3b82f6',
  accentColor: '#f59e0b',
  sidebarStyle: 'dark',
  chartPalette: 'vibrant',
  cardRadius: 'medium',
};

const STORAGE_KEY = 'app:branding';

export function isValidHex(v: string | undefined | null): v is string {
  return !!v && /^#[0-9a-fA-F]{6}$/.test(v);
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Apply branding CSS variables, sidebar style, card radius, and favicon to
 * the document root. Safe to call repeatedly.
 */
export function applyBrandingToRoot(branding: Partial<BrandingConfig> | undefined | null) {
  if (typeof document === 'undefined') return;
  const b = { ...DEFAULT_BRANDING, ...(branding ?? {}) };
  const root = document.documentElement;

  if (isValidHex(b.primaryColor)) {
    const hsl = hexToHsl(b.primaryColor);
    if (hsl) {
      const val = `${hsl.h} ${hsl.s}% ${hsl.l}%`;
      root.style.setProperty('--primary', val);
      root.style.setProperty('--accent', val);
      root.style.setProperty('--ring', val);
      root.style.setProperty('--sidebar-primary', val);
      root.style.setProperty('--sidebar-ring', val);
    }
  }

  if (isValidHex(b.accentColor)) {
    const hsl = hexToHsl(b.accentColor);
    if (hsl) {
      root.style.setProperty('--warning', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    }
  }

  // Card radius
  const radiusMap = { small: '0.375rem', medium: '0.75rem', large: '1rem' };
  root.style.setProperty('--radius', radiusMap[b.cardRadius] || '0.75rem');

  // Sidebar style
  if (b.sidebarStyle === 'light') {
    root.style.setProperty('--sidebar-background', '0 0% 100%');
    root.style.setProperty('--sidebar-foreground', '222 47% 11%');
    root.style.setProperty('--sidebar-border', '214 32% 91%');
  } else if (b.sidebarStyle === 'brand' && isValidHex(b.primaryColor)) {
    const hsl = hexToHsl(b.primaryColor);
    if (hsl) {
      root.style.setProperty('--sidebar-background', `${hsl.h} ${hsl.s}% ${Math.max(hsl.l - 20, 8)}%`);
      root.style.setProperty('--sidebar-foreground', '210 40% 96%');
      root.style.setProperty('--sidebar-border', `${hsl.h} ${hsl.s}% ${Math.max(hsl.l - 15, 12)}%`);
    }
  } else {
    root.style.setProperty('--sidebar-background', '222 47% 11%');
    root.style.setProperty('--sidebar-foreground', '210 40% 96%');
    root.style.setProperty('--sidebar-border', '217 33% 17%');
  }

  // Favicon
  if (b.faviconUrl) {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = b.faviconUrl;
  }
}

/** Persist branding to localStorage so pre-auth pages can render with the right look. */
export function cacheBranding(branding: Partial<BrandingConfig> | undefined | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!branding) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
    }
  } catch {
    /* ignore quota / private mode errors */
  }
}

export function loadCachedBranding(): BrandingConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return { ...DEFAULT_BRANDING, ...JSON.parse(raw) };
  } catch {
    return null;
  }
}

/** Apply cached branding immediately on app boot, before any data loads. */
export function bootstrapBranding() {
  const cached = loadCachedBranding();
  if (cached) applyBrandingToRoot(cached);
}
