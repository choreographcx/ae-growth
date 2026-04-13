import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-card-foreground">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {isSignUp ? 'Set up your dashboard access' : 'Access your paid media dashboard'}
            </p>
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
              @wppmedia.com accounts are automatically approved with no email verification required.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
