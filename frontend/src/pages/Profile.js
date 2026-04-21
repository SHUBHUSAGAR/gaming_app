import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API, { formatINR } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Progress } from '../components/ui/progress';
import { Copy, Trophy, Target, TrendingUp, Star, Shield, Crown, Award, Wallet, Flame, Zap } from 'lucide-react';
import { toast } from 'sonner';

const VIP_BADGE = "https://static.prod-images.emergentagent.com/jobs/84c54715-40c5-4abb-91e0-a509c17d56ac/images/39eada88297534abdd844e35ec8aa4199025b22c82d92d7209597194dbe31d12.png";
const AVATAR = "https://static.prod-images.emergentagent.com/jobs/84c54715-40c5-4abb-91e0-a509c17d56ac/images/35b0687b57fd1c0bb1f2edc847095ce975926d73c54f969029d851aa754ef471.png";

const BADGE_ICONS = { wallet: Wallet, trophy: Trophy, star: Star, zap: Zap, flame: Flame, 'trending-up': TrendingUp, award: Award, crown: Crown };
const VIP_COLORS = { bronze: 'from-amber-900/20', silver: 'from-gray-400/20', gold: 'from-yellow-500/20', diamond: 'from-cyan-400/20' };

export default function Profile() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [vip, setVip] = useState(null);
  const [betLimits, setBetLimits] = useState({ daily_limit: 0, weekly_limit: 0, enabled: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      API.get('/profile').then(r => setStats(r.data.stats)),
      API.get('/achievements').then(r => setAchievements(r.data.achievements || [])),
      API.get('/vip/status').then(r => setVip(r.data)),
      API.get('/settings/bet-limits').then(r => setBetLimits(r.data.limits || betLimits)),
    ]).catch(() => {});
  }, []);

  const copyReferral = () => { navigator.clipboard.writeText(user?.referral_code || ''); toast.success('Copied!'); };
  const saveLimits = async () => {
    setSaving(true);
    try { await API.post('/settings/bet-limits', betLimits); toast.success('Bet limits saved'); } catch {} finally { setSaving(false); }
  };

  const earnedCount = achievements.filter(a => a.earned).length;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4" data-testid="profile-page">
      <h1 className="font-heading text-2xl font-bold">Profile</h1>

      {/* User Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <img src={AVATAR} alt="" className="w-16 h-16 rounded-full border-2 border-primary" />
            <div className="flex-1">
              <h2 className="font-heading text-xl font-bold">{user?.name}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex gap-2 mt-2">
                <Badge className="capitalize">{user?.vip_tier || 'bronze'}</Badge>
                <Badge variant="outline" className="capitalize">{user?.rank || 'normal'}</Badge>
              </div>
            </div>
            <img src={VIP_BADGE} alt="VIP" className="w-12 h-12" />
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Trophy, label: 'Total Won', value: formatINR(user?.total_won || 0), color: 'text-primary' },
          { icon: Target, label: 'Total Bets', value: stats?.total_bets || 0, color: 'text-violet-400' },
          { icon: TrendingUp, label: 'Win Rate', value: `${stats?.win_rate || 0}%`, color: 'text-emerald-400' },
          { icon: Flame, label: 'Login Streak', value: `${user?.login_streak || 0} days`, color: 'text-orange-400' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <p className="font-mono text-lg font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* VIP Tier Progress */}
      {vip && (
        <Card className={`bg-gradient-to-r ${VIP_COLORS[vip.current_tier] || ''} to-transparent`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-semibold">VIP Status: <span className="capitalize text-primary">{vip.current_tier}</span></h3>
              </div>
              {vip.next_tier && <Badge variant="outline" className="capitalize text-xs">Next: {vip.next_tier}</Badge>}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Deposited: {formatINR(vip.total_deposited)}</span>
                {vip.next_tier && <span>{formatINR(vip.deposit_needed)} more to {vip.next_tier}</span>}
              </div>
              {vip.next_tier && <Progress value={Math.min(100, (vip.total_deposited / (vip.total_deposited + vip.deposit_needed)) * 100)} className="h-2" />}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {(vip.tiers?.[vip.current_tier]?.perks || []).map((p, i) => (
                <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievements */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Award className="w-4 h-4 text-primary" />Achievements ({earnedCount}/{achievements.length})</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {achievements.map((a, i) => {
              const Icon = BADGE_ICONS[a.icon] || Star;
              return (
                <div key={i} className={`rounded-xl p-3 text-center border-2 transition-all ${a.earned ? 'border-primary/50 bg-primary/5' : 'border-border/30 bg-muted/10 opacity-40'}`} data-testid={`achievement-${a.id}`}>
                  <Icon className={`w-6 h-6 mx-auto mb-1 ${a.earned ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="text-xs font-semibold truncate">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{a.desc}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Referral */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Referral Code</CardTitle></CardHeader>
        <CardContent className="pb-4">
          <p className="text-sm text-muted-foreground mb-2">Share & earn 50 bonus + 2% commission</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-lg px-4 py-2 font-mono font-bold text-lg tracking-wider" data-testid="referral-code">{user?.referral_code || '---'}</div>
            <button onClick={copyReferral} className="p-2 hover:bg-muted rounded-lg transition-colors" data-testid="copy-referral"><Copy className="w-5 h-5" /></button>
          </div>
        </CardContent>
      </Card>

      {/* Bet Limits */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" />Responsible Gaming - Bet Limits</CardTitle>
        </CardHeader>
        <CardContent className="pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Enable Bet Limits</span>
            <Switch checked={betLimits.enabled} onCheckedChange={v => setBetLimits(l => ({ ...l, enabled: v }))} data-testid="bet-limits-toggle" />
          </div>
          {betLimits.enabled && (
            <>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-28">Daily Max</span>
                <Input type="number" value={betLimits.daily_limit} onChange={e => setBetLimits(l => ({ ...l, daily_limit: Number(e.target.value) }))} className="w-32 font-mono" data-testid="daily-limit" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-28">Weekly Max</span>
                <Input type="number" value={betLimits.weekly_limit} onChange={e => setBetLimits(l => ({ ...l, weekly_limit: Number(e.target.value) }))} className="w-32 font-mono" data-testid="weekly-limit" />
              </div>
            </>
          )}
          <Button size="sm" onClick={saveLimits} disabled={saving} data-testid="save-bet-limits">{saving ? 'Saving...' : 'Save Limits'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
