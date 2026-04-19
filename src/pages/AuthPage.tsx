import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { loadCachedBranding } from '@/lib/branding';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const branding = loadCachedBranding();

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
              <div className="inline-flex items-center justify-center h-14 px-4 mb-4 bg-card rounded-xl border border-border shadow-sm">
                <img
                  src={branding.logoUrl}
                  alt="Logo"
                  className="h-8 w-auto object-contain"
                />
              </div>
            ) : (
              <div className="h-14 w-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                <LogIn className="text-primary" size={24} />
              </div>
            )}
            <h1 className="text-2xl font-bold text-card-foreground">
              {isSignUp ? 'Create Account' : 'Welcome back'}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {isSignUp ? 'Set up your dashboard access' : 'Sign in to your paid media dashboard'}
            </p>
          </div>

          <div className="p-8 pt-6">

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
