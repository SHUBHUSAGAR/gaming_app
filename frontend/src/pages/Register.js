import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatApiError } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Loader2 } from 'lucide-react';

export default function Register() {
  const { user, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', referral_code: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user && user !== false) return <Navigate to="/" />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(form.email, form.password, form.name, form.referral_code);
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto mb-4 flex items-center justify-center glow-gold">
            <span className="text-primary-foreground font-heading font-bold text-2xl">C</span>
          </div>
          <h1 className="font-heading text-3xl font-bold">Create Account</h1>
          <p className="text-muted-foreground mt-1">Get 100 bonus coins on signup!</p>
        </div>

        <Card className="border-border/50">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3" data-testid="register-error">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.name} onChange={update('name')} placeholder="Your name" required data-testid="register-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" required data-testid="register-email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={form.password} onChange={update('password')} placeholder="Min 6 characters" required data-testid="register-password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referral">Referral Code (optional)</Label>
                <Input id="referral" value={form.referral_code} onChange={update('referral_code')} placeholder="Enter code" data-testid="register-referral" />
              </div>
              <Button type="submit" className="w-full glow-gold" disabled={loading} data-testid="register-submit">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Account
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium" data-testid="goto-login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
