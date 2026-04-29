import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { loadCachedBranding, subscribeBrandingUpdates } from '@/lib/branding';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState(() => loadCachedBranding());

  useEffect(() => {
    // Re-read branding when async hydration finishes (incognito / first visit).
    return subscribeBrandingUpdates(() => setBranding(loadCachedBranding()));
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Google sign-in failed');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const isWppDomain = email.toLowerCase().endsWith('@wppmedia.com');
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, email },
            ...(isWppDomain ? {} : { emailRedirectTo: window.location.origin }),
          },
        });
        if (error) throw error;

        if (isWppDomain) {
          toast.success('Account created! You can now sign in.');
        } else {
          toast.success('Account created! Please check your email to verify your account.');
        }
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Signed in successfully');
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Brand-tinted ambient background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            'radial-gradient(ellipse at top, hsl(var(--primary) / 0.12), transparent 60%), radial-gradient(ellipse at bottom right, hsl(var(--primary) / 0.08), transparent 55%)',
        }}
        aria-hidden
      />

      <div className="w-full max-w-md relative">
        <div className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
          {/* Branded header band */}
          <div
            className="px-8 pt-8 pb-6 text-center relative"
            style={{
              background:
                'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.02))',
              borderBottom: '1px solid hsl(var(--border))',
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{
                background:
                  'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.6), hsl(var(--primary)))',
              }}
              aria-hidden
            />
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt="Logo"
                className="h-10 w-auto object-contain mx-auto mb-4"
              />
            ) : (
              <div className="h-14 w-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                <LogIn className="text-primary" size={24} />
              </div>
            )}
            {isSignUp && (
              <h1 className="text-2xl font-bold text-card-foreground">
                Create Account
              </h1>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {isSignUp ? 'Set up your dashboard access' : 'Sign in to your paid media dashboard'}
            </p>
          </div>

          <div className="p-8 pt-6">

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 hover:bg-primary/5 hover:border-primary/30 hover:!text-[hsl(var(--primary)_/_1)] [&:hover]:[color:hsl(var(--primary)_h_var(--primary)_s_calc(var(--primary)_l_-_20%))]"
            style={{
              ['--tw-hover-brand-dark' as any]: 'hsl(var(--primary) / 1)',
            }}
            onMouseEnter={(e) => {
              const root = getComputedStyle(document.documentElement);
              const primary = root.getPropertyValue('--primary').trim(); // "H S% L%"
              const parts = primary.split(/\s+/);
              if (parts.length === 3) {
                const h = parts[0];
                const s = parts[1];
                const l = parseFloat(parts[2]);
                const darkL = Math.max(10, l - 20);
                e.currentTarget.style.color = `hsl(${h} ${s} ${darkL}%)`;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '';
            }}
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {isSignUp ? 'Sign up with Google' : 'Continue with Google'}
          </Button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Full Name</Label>
                <Input
                  className="mt-1.5"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                />
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
              <Input
                className="mt-1.5"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Password</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? 'Please wait...' : isSignUp ? (
                <><UserPlus size={16} /> Create Account</>
              ) : (
                <><LogIn size={16} /> Sign In</>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          {isSignUp && (
            <p className="mt-4 text-[11px] text-muted-foreground text-center">
              New accounts may require approval before access is granted.
            </p>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
