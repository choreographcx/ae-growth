import HeaderLogo from '@/assets/header-logo.svg';

interface LoadingOverlayProps {
  /** Optional message shown beneath the logo */
  message?: string;
  /**
   * When true, renders as a full-viewport fixed overlay with a translucent
   * backdrop. When false (default), fills the parent with `min-h-screen`
   * and a solid background — used as a route-level Suspense fallback.
   */
  fixed?: boolean;
}

/**
 * Full-screen, centered loading state featuring the brand SVG logo with a
 * gentle pulse + scale animation. Used both as a route Suspense fallback
 * (`fixed=false`) and as a blocking overlay over the dashboard while data
 * loads (`fixed=true`).
 */
export function LoadingOverlay({ message = 'Loading…', fixed = false }: LoadingOverlayProps) {
  const wrapperClass = fixed
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in'
    : 'min-h-screen flex items-center justify-center bg-background';

  return (
    <div className={wrapperClass} role="status" aria-live="polite" aria-label={message}>
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex items-center justify-center">
          {/* Soft glow ring behind the logo */}
          <span
            aria-hidden
            className="absolute h-24 w-24 rounded-full bg-primary/15 animate-loading-ring"
          />
          <img
            src={HeaderLogo}
            alt=""
            aria-hidden
            className="relative h-12 w-auto animate-loading-logo will-change-transform"
            draggable={false}
          />
        </div>
        {message && (
          <p className="text-sm font-medium text-muted-foreground tracking-wide">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default LoadingOverlay;
