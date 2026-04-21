import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API, { getWsUrl, formatINR } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import LiveBetsPanel from '../components/LiveBetsPanel';
import { ArrowLeft, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useSound } from '../contexts/SoundContext';

const AMOUNTS = [10, 50, 100, 500, 1000];
const COLORS = [
  { value: 'red', label: 'Red', bg: 'bet-btn-red', mult: '2x' },
  { value: 'green', label: 'Green', bg: 'bet-btn-green', mult: '2x' },
  { value: 'violet', label: 'Violet', bg: 'bet-btn-violet', mult: '4.5x' },
];
const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const MODES = [
  { id: '30s', label: '30s', seconds: 25 },
  { id: '60s', label: '1min', seconds: 55 },
  { id: '180s', label: '3min', seconds: 175 },
  { id: '300s', label: '5min', seconds: 295 },
];

function getResultColor(color) {
  if (!color) return 'bg-muted';
  if (color.includes('red') && color.includes('violet')) return 'bg-gradient-to-r from-[hsl(var(--game-red))] to-[hsl(var(--game-violet))]';
  if (color.includes('green') && color.includes('violet')) return 'bg-gradient-to-r from-[hsl(var(--game-green))] to-[hsl(var(--game-violet))]';
  if (color === 'red') return 'bg-game-red';
  if (color === 'green') return 'bg-game-green';
  return 'bg-game-violet';
}

export default function WinGo() {
  const { refreshUser } = useAuth();
  const [mode, setMode] = useState('60s');
  const [round, setRound] = useState(null);
  const [bettingOpen, setBettingOpen] = useState(false);
  const [timer, setTimer] = useState(0);
  const [betType, setBetType] = useState('color');
  const [betValue, setBetValue] = useState('');
  const [amount, setAmount] = useState(100);
  const [history, setHistory] = useState([]);
  const [myBets, setMyBets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const wsRef = useRef(null);
  const timerRef = useRef(null);
  const sound = useSound();

  const loadHistory = useCallback(async () => {
    try {
      const [h, b] = await Promise.all([API.get(`/games/wingo/history?mode=${mode}`), API.get('/games/wingo/my-bets')]);
      setHistory(h.data.rounds || []);
      setMyBets(b.data.bets || []);
    } catch {}
  }, [mode]);

  useEffect(() => {
    loadHistory();
    if (wsRef.current) wsRef.current.close();
    clearInterval(timerRef.current);
    const ws = new WebSocket(getWsUrl(`/api/ws/wingo?mode=${mode}`));
    wsRef.current = ws;
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'state' || msg.type === 'round_start') {
        setRound(msg.round || { id: msg.round_id, round_number: msg.round_number });
        setBettingOpen(msg.betting_open !== false);
        if (msg.betting_seconds) {
          setTimer(msg.betting_seconds);
          clearInterval(timerRef.current);
          timerRef.current = setInterval(() => setTimer(t => Math.max(0, t - 1)), 1000);
        }
        setLastResult(null);
      } else if (msg.type === 'closing') {
        setTimer(msg.seconds_left || 5);
        sound.timerWarning();
      } else if (msg.type === 'result') {
        setBettingOpen(false);
        setLastResult(msg.result);
        setTimer(0);
        clearInterval(timerRef.current);
        loadHistory();
        refreshUser();
      }
    };
    return () => { ws.close(); clearInterval(timerRef.current); };
  }, [mode, loadHistory, refreshUser]);

  const placeBet = async () => {
    if (!betValue || !round?.id) return;
    setLoading(true);
    try {
      await API.post(`/games/wingo/bet?mode=${mode}`, { round_id: round.id, bet_type: betType, bet_value: betValue, amount });
      sound.betPlaced();
      toast.success(`Bet placed: ${betType} = ${betValue}`);
      refreshUser();
      loadHistory();
      setBetValue('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4" data-testid="wingo-page">
      <div className="flex items-center gap-3 mb-3">
        <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="font-heading text-xl sm:text-2xl font-bold">Win Go</h1>
        <Badge variant="outline" className="ml-auto font-mono">#{round?.round_number || '...'}</Badge>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-1.5 mb-3" data-testid="wingo-mode-tabs">
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode === m.id ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-muted/50 text-muted-foreground hover:text-foreground'}`}
            data-testid={`wingo-mode-${m.id}`}
          >{m.label}</button>
        ))}
      </div>

      {/* Results Strip */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1 mb-3" data-testid="wingo-history-strip">
        {history.slice(0, 25).map((r, i) => (
          <div key={i} className={`result-dot shrink-0 ${getResultColor(r.result?.color)}`}>{r.result?.number}</div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3">
        <div className="hidden lg:block"><LiveBetsPanel myBets={myBets} gamePhase={bettingOpen ? 'betting' : 'waiting'} formatAmount={formatINR} /></div>
        <div className="space-y-3">
          {/* Timer */}
          <Card className="overflow-hidden border-2 border-border/50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${bettingOpen ? 'bg-game-green animate-pulse' : 'bg-muted-foreground'}`} />
                  <span className="text-sm font-medium">{bettingOpen ? 'Place Your Bets!' : 'Processing...'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-primary" />
                  <div className={`game-timer text-4xl sm:text-5xl font-bold ${timer <= 5 && bettingOpen ? 'text-destructive animate-pulse' : 'text-primary'}`} data-testid="wingo-timer">
                    {String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}
                  </div>
                </div>
              </div>
              {lastResult && (
                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between animate-fly-up" data-testid="wingo-last-result">
                  <div><p className="text-xs text-muted-foreground mb-1">Result</p><span className="font-mono font-bold text-2xl">{lastResult.price}</span></div>
                  <div className="flex items-center gap-3">
                    <div className={`result-dot w-12 h-12 text-sm ${getResultColor(lastResult.color)}`}>{lastResult.number}</div>
                    <span className="text-sm font-medium capitalize">{lastResult.color?.replace('_', ' & ')}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Betting */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Pick Color</p>
                <div className="grid grid-cols-3 gap-2">
                  {COLORS.map(c => (
                    <button key={c.value} onClick={() => { setBetType('color'); setBetValue(c.value); }}
                      className={`${c.bg} rounded-xl py-4 font-bold text-sm transition-all shadow-md ${betType === 'color' && betValue === c.value ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-background scale-[1.02]' : 'opacity-85 hover:opacity-100'}`}
                      disabled={!bettingOpen} data-testid={`bet-${c.value}`}>
                      <div>{c.label}</div><div className="text-xs opacity-80 mt-0.5">{c.mult}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Pick Number <span className="text-primary">(9x)</span></p>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                  {NUMBERS.map(n => (
                    <button key={n} onClick={() => { setBetType('number'); setBetValue(String(n)); }}
                      className={`rounded-lg py-2.5 font-mono font-bold text-sm border-2 transition-all ${betType === 'number' && betValue === String(n) ? 'ring-2 ring-primary bg-primary/20' : 'border-border hover:scale-105'}`}
                      disabled={!bettingOpen} data-testid={`bet-num-${n}`}>{n}</button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end pt-2">
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Amount</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {AMOUNTS.map(a => (
                      <button key={a} onClick={() => setAmount(a)}
                        className={`rounded-full px-3.5 py-1 text-xs font-mono font-semibold border transition-all ${amount === a ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/50'}`}
                      >{a}</button>
                    ))}
                  </div>
                </div>
                <Button onClick={placeBet} disabled={!bettingOpen || !betValue || loading} className="sm:w-48 glow-gold font-bold text-base py-3" data-testid="place-bet-btn">
                  {loading ? 'Placing...' : `BET ${formatINR(amount)}`}
                </Button>
              </div>
            </CardContent>
          </Card>
          <div className="lg:hidden"><LiveBetsPanel myBets={myBets} gamePhase={bettingOpen ? 'betting' : 'waiting'} formatAmount={formatINR} compact /></div>
        </div>
      </div>
    </div>
  );
}
