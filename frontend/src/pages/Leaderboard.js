import { useState, useEffect } from 'react';
import API, { formatINR } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Trophy, Medal, Crown, Star, Flame, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const PERIODS = [
  { id: 'daily', label: 'Today' },
  { id: 'weekly', label: 'This Week' },
  { id: 'alltime', label: 'All Time' },
];
const GAMES = ['wingo', 'aviator', 'abfun', 'luckyhit', 'soccergo'];

const RANK_ICONS = [
  <Crown className="w-5 h-5 text-yellow-400" />,
  <Medal className="w-5 h-5 text-gray-300" />,
  <Medal className="w-5 h-5 text-amber-600" />,
];

export default function Leaderboard() {
  const [period, setPeriod] = useState('weekly');
  const [gameFilter, setGameFilter] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = gameFilter ? `/leaderboard/game/${gameFilter}` : `/leaderboard/${period}`;
    API.get(url).then(r => setData(r.data.leaderboard || [])).catch(() => setData([])).finally(() => setLoading(false));
  }, [period, gameFilter]);

  return (
    <div className="max-w-3xl mx-auto p-4" data-testid="leaderboard-page">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" /> Leaderboard
          </h1>
        </div>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => { setPeriod(p.id); setGameFilter(''); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${!gameFilter && period === p.id ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground'}`}
            data-testid={`lb-period-${p.id}`}
          >{p.label}</button>
        ))}
        <div className="w-px bg-border mx-1" />
        {GAMES.map(g => (
          <button key={g} onClick={() => setGameFilter(g)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-all ${gameFilter === g ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground'}`}
            data-testid={`lb-game-${g}`}
          >{g}</button>
        ))}
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No data for this period</div>
        ) : data.map((player, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
            <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${i < 3 ? 'bg-gradient-to-r from-primary/5 to-transparent border-primary/20' : 'bg-card/50 border-border/30'}`}>
              <div className="w-8 text-center shrink-0">
                {i < 3 ? RANK_ICONS[i] : <span className="font-mono text-sm text-muted-foreground font-bold">{i + 1}</span>}
              </div>
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="font-heading font-bold text-sm text-primary">{player.name?.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{player.name}</p>
                <p className="text-xs text-muted-foreground">{player.total_bets} bets | <span className="capitalize">{player.vip_tier || 'bronze'}</span></p>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-sm text-primary">{formatINR(player.total_won)}</p>
                <p className="text-xs text-muted-foreground">won</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
