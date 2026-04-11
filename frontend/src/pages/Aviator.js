import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API, { getWsUrl, formatINR } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Plane, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function Aviator() {
  const { refreshUser } = useAuth();
  const [phase, setPhase] = useState('waiting');
  const [multiplier, setMultiplier] = useState(1.0);
  const [roundNum, setRoundNum] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [crashPoint, setCrashPoint] = useState(null);
  const [amount, setAmount] = useState(100);
  const [activeBet, setActiveBet] = useState(null);
  const [history, setHistory] = useState([]);
  const [myBets, setMyBets] = useState([]);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);
  const countdownRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [h, b] = await Promise.all([API.get('/games/aviator/history'), API.get('/games/aviator/my-bets')]);
      setHistory(h.data.rounds || []);
      setMyBets(b.data.bets || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadData();
    const ws = new WebSocket(getWsUrl('/api/ws/aviator'));
    wsRef.current = ws;
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'state') {
        setPhase(msg.phase);
        setMultiplier(msg.multiplier);
        setRoundNum(msg.round_number);
      } else if (msg.type === 'waiting') {
        setPhase('waiting');
        setMultiplier(1.0);
        setRoundNum(msg.round_number);
        setCrashPoint(null);
        setActiveBet(null);
        setCountdown(msg.countdown || 8);
        clearInterval(countdownRef.current);
        countdownRef.current = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
      } else if (msg.type === 'flying') {
        setPhase('flying');
        clearInterval(countdownRef.current);
        setCountdown(0);
      } else if (msg.type === 'tick') {
        setMultiplier(msg.multiplier);
      } else if (msg.type === 'crashed') {
        setPhase('crashed');
        setCrashPoint(msg.crash_point);
        setMultiplier(msg.crash_point);
        if (activeBet && !activeBet.cashed_out) {
          setActiveBet(null);
        }
        loadData();
        refreshUser();
      }
    };
    return () => { ws.close(); clearInterval(countdownRef.current); };
  }, [loadData, refreshUser]);

  const placeBet = async () => {
    setLoading(true);
    try {
      const { data } = await API.post('/games/aviator/bet', { amount });
      setActiveBet(data.bet);
      toast.success(`Bet placed: ${formatINR(amount)}`);
      refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const cashOut = async () => {
    if (!activeBet) return;
    setLoading(true);
    try {
      const { data } = await API.post('/games/aviator/cashout', { bet_id: activeBet.id });
      toast.success(`Cashed out at ${data.multiplier}x! Won ${formatINR(data.winnings)}`);
      setActiveBet({ ...activeBet, cashed_out: true, cashout_multiplier: data.multiplier });
      refreshUser();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const getMultiplierColor = () => {
    if (phase === 'crashed') return 'text-destructive';
    if (multiplier >= 5) return 'text-game-gold';
    if (multiplier >= 2) return 'text-game-green';
    return 'text-primary';
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4" data-testid="aviator-page">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="font-heading text-2xl font-bold">Aviator</h1>
        <Badge variant="outline" className="ml-auto">Round #{roundNum}</Badge>
      </div>

      {/* Crash History Strip */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1" data-testid="aviator-history-strip">
        {history.slice(0, 20).map((r, i) => (
          <Badge
            key={i}
            variant={r.crash_point >= 2 ? 'default' : 'secondary'}
            className={`shrink-0 font-mono text-xs ${r.crash_point >= 2 ? 'bg-game-green text-white' : ''}`}
          >
            {r.crash_point}x
          </Badge>
        ))}
      </div>

      {/* Game Display */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className={`relative h-64 sm:h-80 flex items-center justify-center ${phase === 'crashed' ? 'bg-destructive/5' : 'aviator-curve'}`}>
            {/* Background grid */}
            <div className="absolute inset-0 opacity-5" style={{
              backgroundImage: 'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }} />

            <div className="relative text-center">
              {phase === 'waiting' && (
                <div className="space-y-2 animate-fly-up" data-testid="aviator-waiting">
                  <p className="text-muted-foreground text-sm">Next round in</p>
                  <div className="game-timer text-5xl font-bold text-primary">{countdown}s</div>
                  <p className="text-xs text-muted-foreground">Place your bets now</p>
                </div>
              )}
              {phase === 'flying' && (
                <div className="space-y-2" data-testid="aviator-flying">
                  <Plane className={`w-12 h-12 mx-auto ${getMultiplierColor()} -rotate-45`} />
                  <div className={`multiplier-display text-6xl sm:text-7xl font-bold ${getMultiplierColor()}`}>
                    {multiplier.toFixed(2)}x
                  </div>
                </div>
              )}
              {phase === 'crashed' && (
                <div className="space-y-2 animate-crash" data-testid="aviator-crashed">
                  <p className="text-destructive text-sm font-medium">CRASHED!</p>
                  <div className="multiplier-display text-6xl sm:text-7xl font-bold text-destructive">
                    {crashPoint?.toFixed(2)}x
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Betting Controls */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Bet Amount</p>
            <div className="flex gap-2 flex-wrap">
              {[50, 100, 500, 1000, 2000].map(a => (
                <button
                  key={a} onClick={() => setAmount(a)}
                  className={`rounded-full px-4 py-1.5 text-sm font-mono font-medium border transition-all ${amount === a ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/50'}`}
                >
                  {a}
                </button>
              ))}
              <Input
                type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))}
                className="w-24 h-8 font-mono text-sm" min={10} max={10000}
                data-testid="aviator-amount"
              />
            </div>
          </div>

          {phase === 'waiting' && !activeBet && (
            <Button onClick={placeBet} disabled={loading} className="w-full glow-gold text-lg py-3" data-testid="aviator-bet-btn">
              {loading ? 'Placing...' : `Bet ${formatINR(amount)}`}
            </Button>
          )}
          {phase === 'flying' && activeBet && !activeBet.cashed_out && (
            <Button onClick={cashOut} disabled={loading} className="w-full bg-game-green hover:bg-game-green/90 text-white text-lg py-3" data-testid="aviator-cashout-btn">
              Cash Out at {multiplier.toFixed(2)}x ({formatINR(Math.round(activeBet.amount * multiplier))})
            </Button>
          )}
          {activeBet?.cashed_out && (
            <div className="text-center py-3 text-success font-semibold" data-testid="aviator-cashed">
              Cashed out at {activeBet.cashout_multiplier}x
            </div>
          )}
          {phase !== 'waiting' && !activeBet && (
            <div className="text-center py-3 text-muted-foreground text-sm">
              Wait for next round to bet
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Bets */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-heading font-semibold">My Bets</h3>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {myBets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No bets yet</p>
            ) : myBets.slice(0, 10).map((bet, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <Badge variant={bet.status === 'won' ? 'default' : 'destructive'} className="text-xs">{bet.status}</Badge>
                  <span className="font-mono text-sm">{formatINR(bet.amount)}</span>
                </div>
                <div className="text-right">
                  {bet.cashed_out && <span className="font-mono text-sm text-success">{bet.cashout_multiplier}x +{formatINR(bet.winnings)}</span>}
                  {!bet.cashed_out && bet.status === 'lost' && <span className="text-sm text-destructive">Lost</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
