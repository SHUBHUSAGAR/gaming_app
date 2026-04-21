import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API, { getWsUrl, formatINR } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import LiveBetsPanel from '../components/LiveBetsPanel';
import { ArrowLeft, Plane, Volume2, VolumeX } from 'lucide-react';
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
  const [autoBet, setAutoBet] = useState(false);
  const [stopWin, setStopWin] = useState(0);
  const [stopLoss, setStopLoss] = useState(0);
  const [autoCashout, setAutoCashout] = useState(2.0);
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
        if (activeBet && !activeBet.cashed_out) setActiveBet(null);
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
    <div className="max-w-7xl mx-auto p-3 sm:p-4" data-testid="aviator-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="font-heading text-xl sm:text-2xl font-bold">Aviator</h1>
        <Badge variant="outline" className="ml-auto font-mono">Round #{roundNum}</Badge>
      </div>

      {/* Crash History Strip */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1 mb-3" data-testid="aviator-history-strip">
        {history.slice(0, 20).map((r, i) => (
          <Badge
            key={i}
            variant={r.crash_point >= 2 ? 'default' : 'secondary'}
            className={`shrink-0 font-mono text-xs ${r.crash_point >= 2 ? 'bg-game-green text-white' : r.crash_point >= 1.5 ? 'bg-primary text-primary-foreground' : ''}`}
          >
            {r.crash_point}x
          </Badge>
        ))}
      </div>

      {/* Main Layout: Bets Panel + Game */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3">
        {/* Live Bets Panel */}
        <div className="hidden lg:block">
          <LiveBetsPanel
            myBets={myBets}
            gamePhase={phase}
            crashPoint={crashPoint}
            currentMultiplier={multiplier}
            formatAmount={formatINR}
          />
        </div>

        {/* Game + Controls */}
        <div className="space-y-3">
          {/* Game Display */}
          <Card className="overflow-hidden border-2 border-border/50">
            <CardContent className="p-0">
              <div className={`relative h-56 sm:h-72 lg:h-80 flex items-center justify-center transition-colors duration-300 ${
                phase === 'crashed' ? 'bg-destructive/5' : phase === 'flying' ? 'bg-card' : 'bg-card'
              }`}>
                {/* Background grid */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                  backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
                  backgroundSize: '40px 40px'
                }} />
                
                {/* Multiplier curve visualization */}
                {phase === 'flying' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-primary/10 to-transparent transition-all" 
                       style={{ height: `${Math.min(80, (multiplier - 1) * 15)}%` }} />
                )}

                <div className="relative text-center z-10">
                  {phase === 'waiting' && (
                    <div className="space-y-3 animate-fly-up" data-testid="aviator-waiting">
                      <div className="w-20 h-20 mx-auto opacity-50">
                        <Plane className="w-full h-full text-muted-foreground animate-pulse" />
                      </div>
                      <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">Waiting for next fly</p>
                      <div className="game-timer text-6xl font-bold text-primary">{countdown}</div>
                      <p className="text-xs text-muted-foreground">Place your bets now!</p>
                    </div>
                  )}
                  {phase === 'flying' && (
                    <div className="space-y-2" data-testid="aviator-flying">
                      <Plane className={`w-14 h-14 mx-auto ${getMultiplierColor()} -rotate-45 transition-transform`} 
                             style={{ transform: `rotate(-45deg) translateY(${-Math.min(30, (multiplier-1)*10)}px)` }} />
                      <div className={`multiplier-display text-7xl sm:text-8xl font-bold ${getMultiplierColor()} transition-colors`}>
                        {multiplier.toFixed(2)}x
                      </div>
                    </div>
                  )}
                  {phase === 'crashed' && (
                    <div className="space-y-2 animate-crash" data-testid="aviator-crashed">
                      <p className="text-destructive text-sm font-bold uppercase tracking-wider">Flew Away!</p>
                      <div className="multiplier-display text-7xl sm:text-8xl font-bold text-destructive">
                        {crashPoint?.toFixed(2)}x
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Live Bets (collapsed) */}
          <div className="lg:hidden">
            <LiveBetsPanel
              myBets={myBets}
              gamePhase={phase}
              crashPoint={crashPoint}
              currentMultiplier={multiplier}
              formatAmount={formatINR}
              compact
            />
          </div>

          {/* Betting Controls */}
          <Card>
            <CardContent className="p-4 space-y-3">
              {/* Auto-bet toggle */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Auto-Bet</label>
                <input type="checkbox" checked={autoBet} onChange={e => setAutoBet(e.target.checked)} className="accent-primary" data-testid="auto-bet-toggle" />
                {autoBet && (
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-[10px] text-muted-foreground">Stop Win:</span>
                    <Input type="number" value={stopWin} onChange={e => setStopWin(Number(e.target.value))} className="w-16 h-6 font-mono text-[10px]" placeholder="0" data-testid="stop-win" />
                    <span className="text-[10px] text-muted-foreground">Stop Loss:</span>
                    <Input type="number" value={stopLoss} onChange={e => setStopLoss(Number(e.target.value))} className="w-16 h-6 font-mono text-[10px]" placeholder="0" data-testid="stop-loss" />
                    <span className="text-[10px] text-muted-foreground">Auto Cashout:</span>
                    <Input type="number" step="0.1" value={autoCashout} onChange={e => setAutoCashout(Number(e.target.value))} className="w-16 h-6 font-mono text-[10px]" placeholder="2.0" data-testid="auto-cashout" />
                    <span className="text-[10px] text-muted-foreground">x</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                <div className="flex-1">
                  <p className="text-xs font-medium mb-2 text-muted-foreground">Bet Amount</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {[50, 100, 200, 500, 1000, 2000].map(a => (
                      <button key={a} onClick={() => setAmount(a)}
                        className={`rounded-full px-3 py-1 text-xs font-mono font-semibold border transition-all ${amount === a ? 'border-primary bg-primary text-primary-foreground scale-105' : 'border-border hover:border-primary/50'}`}
                      >{a}</button>
                    ))}
                    <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-20 h-7 font-mono text-xs" min={10} max={10000} data-testid="aviator-amount" />
                  </div>
                </div>
                <div className="sm:w-48">
                  {phase === 'waiting' && !activeBet && (
                    <Button onClick={placeBet} disabled={loading} className="w-full glow-gold font-bold text-base py-3" data-testid="aviator-bet-btn">
                      {loading ? 'Placing...' : `BET ${formatINR(amount)}`}
                    </Button>
                  )}
                  {phase === 'flying' && activeBet && !activeBet.cashed_out && (
                    <Button onClick={cashOut} disabled={loading} className="w-full bg-game-green hover:bg-game-green/90 text-white font-bold text-base py-3 animate-pulse-glow" data-testid="aviator-cashout-btn">
                      CASH OUT {multiplier.toFixed(2)}x
                      <span className="block text-xs font-normal opacity-80">{formatINR(Math.round(activeBet.amount * multiplier))}</span>
                    </Button>
                  )}
                  {activeBet?.cashed_out && (
                    <div className="text-center py-2 px-4 bg-success/10 rounded-lg">
                      <p className="text-success font-bold text-sm">Won at {activeBet.cashout_multiplier}x</p>
                    </div>
                  )}
                  {phase !== 'waiting' && !activeBet && (
                    <div className="text-center py-2 px-4 bg-muted rounded-lg">
                      <p className="text-muted-foreground text-xs">{autoBet ? 'Auto-betting next round...' : 'Wait for next round'}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
