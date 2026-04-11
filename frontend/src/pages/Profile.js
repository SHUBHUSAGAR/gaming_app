import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API, { formatINR } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Copy, Trophy, Target, TrendingUp, Star } from 'lucide-react';
import { toast } from 'sonner';

const VIP_BADGE = "https://static.prod-images.emergentagent.com/jobs/84c54715-40c5-4abb-91e0-a509c17d56ac/images/39eada88297534abdd844e35ec8aa4199025b22c82d92d7209597194dbe31d12.png";
const AVATAR = "https://static.prod-images.emergentagent.com/jobs/84c54715-40c5-4abb-91e0-a509c17d56ac/images/35b0687b57fd1c0bb1f2edc847095ce975926d73c54f969029d851aa754ef471.png";

export default function Profile() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    API.get('/profile').then(r => setStats(r.data.stats)).catch(() => {});
  }, []);

  const copyReferral = () => {
    navigator.clipboard.writeText(user?.referral_code || '');
    toast.success('Referral code copied!');
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4" data-testid="profile-page">
      <h1 className="font-heading text-2xl font-bold">Profile</h1>

      {/* User Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <img src={AVATAR} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-primary" />
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
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="font-mono text-xl font-bold">{formatINR(user?.total_won || 0)}</p>
            <p className="text-xs text-muted-foreground">Total Won</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="w-5 h-5 text-game-violet mx-auto mb-1" />
            <p className="font-mono text-xl font-bold">{stats?.total_bets || 0}</p>
            <p className="text-xs text-muted-foreground">Total Bets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 text-success mx-auto mb-1" />
            <p className="font-mono text-xl font-bold">{stats?.win_rate || 0}%</p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="w-5 h-5 text-game-gold mx-auto mb-1" />
            <p className="font-mono text-xl font-bold">{user?.login_streak || 0}</p>
            <p className="text-xs text-muted-foreground">Login Streak</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Referral Code</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-sm text-muted-foreground mb-2">Share your code and earn 50 bonus + 2% commission</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-lg px-4 py-2 font-mono font-bold text-lg tracking-wider" data-testid="referral-code">
              {user?.referral_code || '---'}
            </div>
            <button onClick={copyReferral} className="p-2 hover:bg-muted rounded-lg transition-colors" data-testid="copy-referral">
              <Copy className="w-5 h-5" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Account Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Balance</span>
            <span className="font-mono font-medium">{formatINR(user?.balance || 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Deposited</span>
            <span className="font-mono font-medium">{formatINR(user?.total_deposited || 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Wagered</span>
            <span className="font-mono font-medium">{formatINR(user?.total_wagered || 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Member Since</span>
            <span className="font-mono">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
