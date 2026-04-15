import { useState, useMemo, useRef, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Upload, Palette, Eye, Paintbrush, X } from 'lucide-react';
import { toast } from 'sonner';

interface BrandingConfig {
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

const DEFAULT_BRANDING: BrandingConfig = {
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

const CHART_PALETTES: Record<string, string[]> = {
  vibrant: ['#0fa968', '#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4'],
  muted: ['#6b9e8a', '#7c9cbf', '#c4727e', '#c4a35e', '#9c8abf', '#6ba8b8'],
  monochrome: ['#0fa968', '#0d8a55', '#0b6b42', '#094d30', '#073e26', '#05301d'],
  brand: ['#0fa968', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6'],
};

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
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

function generateShades(hex: string) {
  const hsl = hexToHsl(hex);
  if (!hsl) return [];
  return [
    { label: '50', hsl: `${hsl.h} ${Math.min(hsl.s + 10, 100)}% 97%` },
    { label: '100', hsl: `${hsl.h} ${Math.min(hsl.s + 5, 100)}% 93%` },
    { label: '200', hsl: `${hsl.h} ${hsl.s}% 85%` },
    { label: '300', hsl: `${hsl.h} ${hsl.s}% 72%` },
    { label: '400', hsl: `${hsl.h} ${hsl.s}% 58%` },
    { label: '500', hsl: `${hsl.h} ${hsl.s}% ${hsl.l}%` },
    { label: '600', hsl: `${hsl.h} ${hsl.s}% ${Math.max(hsl.l - 8, 10)}%` },
    { label: '700', hsl: `${hsl.h} ${hsl.s}% ${Math.max(hsl.l - 16, 8)}%` },
    { label: '800', hsl: `${hsl.h} ${Math.max(hsl.s - 5, 0)}% ${Math.max(hsl.l - 24, 6)}%` },
    { label: '900', hsl: `${hsl.h} ${Math.max(hsl.s - 10, 0)}% ${Math.max(hsl.l - 32, 4)}%` },
  ];
}

/** Apply branding CSS variables to the document root */
function applyBrandingToRoot(branding: BrandingConfig) {
  const root = document.documentElement;
  const isValid = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

  if (isValid(branding.primaryColor)) {
    const hsl = hexToHsl(branding.primaryColor);
    if (hsl) {
      const val = `${hsl.h} ${hsl.s}% ${hsl.l}%`;
      root.style.setProperty('--primary', val);
      root.style.setProperty('--accent', val);
      root.style.setProperty('--ring', val);
      root.style.setProperty('--sidebar-primary', val);
    }
  }

  if (isValid(branding.accentColor)) {
    const hsl = hexToHsl(branding.accentColor);
    if (hsl) {
      root.style.setProperty('--warning', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    }
  }

  // Card radius
  const radiusMap = { small: '0.375rem', medium: '0.75rem', large: '1rem' };
  root.style.setProperty('--radius', radiusMap[branding.cardRadius] || '0.75rem');

  // Sidebar style
  if (branding.sidebarStyle === 'light') {
    root.style.setProperty('--sidebar-background', '0 0% 100%');
    root.style.setProperty('--sidebar-foreground', '222 47% 11%');
    root.style.setProperty('--sidebar-border', '214 32% 91%');
  } else if (branding.sidebarStyle === 'brand' && isValid(branding.primaryColor)) {
    const hsl = hexToHsl(branding.primaryColor);
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
  if (branding.faviconUrl) {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = branding.faviconUrl;
  }
}

interface Props {
  branding: BrandingConfig | undefined;
  onChange: (b: BrandingConfig) => void;
}

export function BrandingThemeSection({ branding: brandingProp, onChange }: Props) {
  const branding = brandingProp ?? DEFAULT_BRANDING;

  const update = (updates: Partial<BrandingConfig>) => {
    onChange({ ...branding, ...updates });
  };

  const handleApply = useCallback(() => {
    applyBrandingToRoot(branding);
    toast.success('Colors & styles applied to dashboard');
  }, [branding]);

  const isValidHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);
  const shades = useMemo(() => isValidHex(branding.primaryColor) ? generateShades(branding.primaryColor) : [], [branding.primaryColor]);
  const palette = CHART_PALETTES[branding.chartPalette] || CHART_PALETTES.vibrant;

  const radiusMap = { small: '0.375rem', medium: '0.75rem', large: '1rem' };
  const previewRadius = radiusMap[branding.cardRadius] || '0.75rem';
  const previewPrimary = isValidHex(branding.primaryColor) ? branding.primaryColor : '#0fa968';
  const previewSecondary = isValidHex(branding.secondaryColor) ? branding.secondaryColor : '#3b82f6';

  return (
    <div className="pt-4 space-y-8">
      {/* Logo Uploads */}
      <div>
        <h4 className="text-xs font-semibold text-card-foreground uppercase tracking-wider mb-4">Logos</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <LogoUpload label="Client Logo" sublabel="Light background · PNG or SVG" value={branding.logoUrl} onChange={v => update({ logoUrl: v })} />
          <LogoUpload label="Dark Mode Logo" sublabel="Dark background · PNG or SVG" value={branding.darkLogoUrl} onChange={v => update({ darkLogoUrl: v })} dark />
          <LogoUpload label="Favicon" sublabel="32×32 · PNG, ICO, or SVG" value={branding.faviconUrl} onChange={v => update({ faviconUrl: v })} small />
        </div>
      </div>

      {/* Brand Colors */}
      <div className="pt-4 border-t border-border/50">
        <h4 className="text-xs font-semibold text-card-foreground uppercase tracking-wider mb-4">Brand Colors</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ColorInput label="Primary Color" value={branding.primaryColor} onChange={v => update({ primaryColor: v })} required />
          <ColorInput label="Secondary Color" value={branding.secondaryColor} onChange={v => update({ secondaryColor: v })} />
          <ColorInput label="Accent Color" value={branding.accentColor} onChange={v => update({ accentColor: v })} />
        </div>

        {/* Generated Shades */}
        {shades.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Generated Primary Shades</p>
            <div className="flex gap-1">
              {shades.map(s => (
                <div key={s.label} className="flex-1 text-center">
                  <div className="h-8 rounded-md border border-border/30" style={{ backgroundColor: `hsl(${s.hsl})` }} />
                  <span className="text-[9px] text-muted-foreground mt-1 block">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Style Selectors */}
      <div className="pt-4 border-t border-border/50">
        <h4 className="text-xs font-semibold text-card-foreground uppercase tracking-wider mb-4">Style</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Sidebar Style</Label>
            <Select value={branding.sidebarStyle} onValueChange={v => update({ sidebarStyle: v as any })}>
              <SelectTrigger className="mt-1.5 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="brand">Brand Color</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Chart Palette</Label>
            <Select value={branding.chartPalette} onValueChange={v => update({ chartPalette: v as any })}>
              <SelectTrigger className="mt-1.5 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vibrant">Vibrant</SelectItem>
                <SelectItem value="muted">Muted</SelectItem>
                <SelectItem value="monochrome">Monochrome</SelectItem>
                <SelectItem value="brand">Brand</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1 mt-2">
              {palette.map((c, i) => (
                <div key={i} className="w-5 h-5 rounded-full border border-border/30" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Card Corner Radius</Label>
            <div className="flex gap-2 mt-2">
              {(['small', 'medium', 'large'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => update({ cardRadius: r })}
                  className={cn(
                    'flex-1 py-2 border rounded-md text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    branding.cardRadius === r
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  )}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Theme Preview */}
      <div className="pt-4 border-t border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Eye size={14} className="text-muted-foreground" />
            <h4 className="text-xs font-semibold text-card-foreground uppercase tracking-wider">Theme Preview</h4>
          </div>
          <Button size="sm" onClick={handleApply} className="gap-1.5 h-8 text-xs">
            <Paintbrush size={12} /> Apply Colors & Styles
          </Button>
        </div>

        <div className="border border-border rounded-xl overflow-hidden bg-muted/30">
          <div className="grid grid-cols-[180px_1fr] min-h-[320px]">
            {/* Preview Sidebar */}
            <div
              className="p-4 flex flex-col gap-3"
              style={{
                backgroundColor: branding.sidebarStyle === 'dark' ? 'hsl(222, 47%, 11%)' :
                  branding.sidebarStyle === 'brand' ? previewPrimary : 'hsl(0, 0%, 100%)',
                color: branding.sidebarStyle === 'light' ? 'hsl(222, 47%, 11%)' : 'hsl(210, 40%, 96%)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                {branding.logoUrl ? (
                  <img src={branding.logoUrl} alt="Logo" className="h-6 w-auto object-contain" />
                ) : (
                  <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">
                    <Palette size={12} />
                  </div>
                )}
                <span className="text-xs font-semibold opacity-90">Dashboard</span>
              </div>
              {['Overview', 'Meta', 'Google Ads', 'Analytics'].map((item, i) => (
                <div
                  key={item}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors',
                    i === 0 ? 'opacity-100' : 'opacity-50'
                  )}
                  style={i === 0 ? {
                    backgroundColor: branding.sidebarStyle === 'light'
                      ? `${previewPrimary}15`
                      : 'rgba(255,255,255,0.1)',
                    borderLeft: `2px solid ${previewPrimary}`,
                  } : undefined}
                >
                  {item}
                </div>
              ))}
            </div>

            {/* Preview Content */}
            <div className="p-5 bg-card space-y-4">
              {/* KPI Card Preview */}
              <div className="flex gap-3">
                <div
                  className="flex-1 p-4 bg-background border border-border"
                  style={{ borderRadius: previewRadius }}
                >
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Spend</p>
                  <p className="text-xl font-bold text-card-foreground mt-1">$124,500</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0" style={{ backgroundColor: `${previewPrimary}15`, color: previewPrimary }}>
                      +12.4%
                    </Badge>
                  </div>
                </div>
                <div
                  className="flex-1 p-4 bg-background border border-border"
                  style={{ borderRadius: previewRadius }}
                >
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Conversions</p>
                  <p className="text-xl font-bold text-card-foreground mt-1">2,847</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0" style={{ backgroundColor: `${previewPrimary}15`, color: previewPrimary }}>
                      +8.2%
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Button Preview */}
              <div className="flex items-center gap-2">
                <button
                  className="px-4 py-1.5 text-xs font-medium text-white"
                  style={{ backgroundColor: previewPrimary, borderRadius: previewRadius }}
                >
                  Primary Button
                </button>
                <button
                  className="px-4 py-1.5 text-xs font-medium border border-border text-card-foreground"
                  style={{ borderRadius: previewRadius }}
                >
                  Secondary
                </button>
                <Badge
                  variant="outline"
                  className="text-[9px]"
                  style={{ borderColor: previewPrimary, color: previewPrimary }}
                >
                  Active
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[9px] border-amber-300 text-amber-600"
                >
                  Warning
                </Badge>
              </div>

              {/* Mini Chart Preview */}
              <div
                className="p-4 bg-background border border-border"
                style={{ borderRadius: previewRadius }}
              >
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Trend Chart Sample</p>
                <div className="flex items-end gap-1 h-16">
                  {[40, 55, 35, 65, 50, 72, 60, 80, 68, 90, 75, 85].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm transition-colors"
                      style={{
                        height: `${h}%`,
                        backgroundColor: palette[i % palette.length],
                        opacity: 0.8,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Table Header Preview */}
              <div
                className="border border-border overflow-hidden"
                style={{ borderRadius: previewRadius }}
              >
                <div className="grid grid-cols-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted/30 px-3 py-2 border-b border-border">
                  <span>Campaign</span><span>Spend</span><span>Conv.</span><span>CPA</span>
                </div>
                <div className="grid grid-cols-4 text-[11px] text-card-foreground px-3 py-2">
                  <span>Brand Awareness</span><span>$12,400</span><span>284</span><span>$43.66</span>
                </div>
                <div className="grid grid-cols-4 text-[11px] text-card-foreground px-3 py-2 bg-muted/[0.04]">
                  <span>Retargeting</span><span>$8,200</span><span>412</span><span>$19.90</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Logo Upload with actual file picker ─── */

function LogoUpload({ label, sublabel, value, onChange, dark, small }: {
  label: string; sublabel: string; value: string; onChange: (v: string) => void; dark?: boolean; small?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const allowed = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!allowed.includes(file.type)) {
      toast.error('Please upload a PNG, SVG, JPG, or ICO file');
      return;
    }

    // Validate size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File must be under 2 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result as string);
      toast.success(`${label} uploaded`);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    toast.success(`${label} removed`);
  };

  return (
    <div>
      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</Label>
      <p className="text-[9px] text-muted-foreground/60 mb-1.5">{sublabel}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/svg+xml,image/jpeg,image/x-icon,.ico"
        onChange={handleFile}
        className="hidden"
      />
      <div
        className={cn(
          'border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors hover:border-primary/40 relative group',
          dark ? 'bg-sidebar border-sidebar-border' : 'bg-muted/20 border-border',
          small ? 'h-20' : 'h-28',
        )}
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        tabIndex={0}
        role="button"
        aria-label={`Upload ${label}`}
      >
        {value ? (
          <>
            <img src={value} alt={label} className={cn('object-contain', small ? 'max-h-12' : 'max-h-16')} />
            <button
              onClick={handleRemove}
              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={`Remove ${label}`}
            >
              <X size={10} />
            </button>
          </>
        ) : (
          <>
            <Upload size={16} className={cn('text-muted-foreground', dark && 'text-sidebar-foreground/50')} />
            <span className={cn('text-[10px]', dark ? 'text-sidebar-foreground/50' : 'text-muted-foreground')}>
              Click to upload
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Color Input ─── */

function ColorInput({ label, value, onChange, required }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean;
}) {
  const isValid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div>
      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <div className="flex items-center gap-2 mt-1.5">
        <div
          className="w-9 h-9 rounded-lg border border-border shrink-0 cursor-pointer relative overflow-hidden"
          style={{ backgroundColor: isValid ? value : '#ffffff' }}
        >
          <input
            type="color"
            value={isValid ? value : '#000000'}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#000000"
          className="h-9 text-sm font-mono flex-1"
        />
      </div>
      {value && !isValid && (
        <p className="text-[10px] text-destructive mt-1">Invalid hex color</p>
      )}
    </div>
  );
}

export { DEFAULT_BRANDING };
export type { BrandingConfig };
