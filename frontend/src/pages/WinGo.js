import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API, { getWsUrl, formatINR } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Clock, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const AMOUNTS = [10, 50, 100, 500, 1000];
const COLORS = [
  { value: 'red', label: 'Red', bg: 'bg-game-red', text: 'text-white', mult: '2x' },
  { value: 'green', label: 'Green', bg: 'bg-game-green', text: 'text-white', mult: '2x' },
  { value: 'violet', label: 'Violet', bg: 'bg-game-violet', text: 'text-white', mult: '4.5x' },
];
const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function getResultColor(color) {
  if (color?.includes('red') && color?.includes('violet')) return 'bg-gradient-to-r from-game-red to-game-violet';
  if (color?.includes('green') && color?.includes('violet')) return 'bg-gradient-to-r from-game-green to-game-violet';
  if (color === 'red') return 'bg-game-red';
  if (color === 'green') return 'bg-game-green';
  return 'bg-game-violet';
}

export default function WinGo() {
  const { refreshUser } = useAuth();
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

  const loadHistory = useCallback(async () => {
    try {
      const [h, b] = await Promise.all([API.get('/games/wingo/history'), API.get('/games/wingo/my-bets')]);
      setHistory(h.data.rounds || []);
      setMyBets(b.data.bets || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadHistory();
    const ws = new WebSocket(getWsUrl('/api/ws/wingo'));
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
      } else if (msg.type === 'result') {
        setBettingOpen(false);
        setLastResult(msg.result);
        setTimer(0);
        clearInterval(timerRef.current);
        loadHistory();
        refreshUser();
      }
    };
    ws.onerror = () => toast.error('Connection error');
    return () => { ws.close(); clearInterval(timerRef.current); };
  }, [loadHistory, refreshUser]);

  const placeBet = async () => {
    if (!betValue || !round?.id) return;
    setLoading(true);
    try {
      const { data } = await API.post('/games/wingo/bet', {
        round_id: round.id, bet_type: betType, bet_value: betValue, amount
      });
      toast.success(`Bet placed: ${betType} = ${betValue} for ${formatINR(amount)}`);
      refreshUser();
      loadHistory();
      setBetValue('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to place bet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4" data-testid="wingo-page">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="font-heading text-2xl font-bold">Win Go</h1>
        <Badge variant="outline" className="ml-auto">Round #{round?.round_number || '...'}</Badge>
      </div>

      {/* Timer + Status */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">{bettingOpen ? 'Betting Open' : 'Waiting...'}</span>
            </div>
            <div className={`game-timer text-3xl font-bold ${timer <= 5 && bettingOpen ? 'text-destructive animate-pulse' : 'text-primary'}`} data-testid="wingo-timer">
              {String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}
            </div>
          </div>

          {/* Last Result */}
          {lastResult && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-center justify-between animate-fly-up" data-testid="wingo-last-result">
              <span className="text-sm font-medium">Result:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg">{lastResult.price}</span>
                <div className={`result-dot ${getResultColor(lastResult.color)}`}>{lastResult.number}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Strip */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1" data-testid="wingo-history-strip">
        {history.slice(0, 20).map((r, i) => (
          <div key={i} className={`result-dot shrink-0 ${getResultColor(r.result?.color)}`}>
            {r.result?.number}
          </div>
        ))}
      </div>

      {/* Betting Area */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Color Bets */}
          <div>
            <p className="text-sm font-medium mb-2">Pick a Color</p>
            <div className="grid grid-cols-3 gap-2">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => { setBetType('color'); setBetValue(c.value); }}
                  className={`${c.bg} ${c.text} rounded-lg py-3 font-bold text-sm transition-all ${betType === 'color' && betValue === c.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105' : 'opacity-80 hover:opacity-100'}`}
                  disabled={!bettingOpen}
                  data-testid={`bet-${c.value}`}
                >
                  {c.label} ({c.mult})
                </button>
              ))}
            </div>
          </div>

          {/* Number Bets */}
          <div>
            <p className="text-sm font-medium mb-2">Pick a Number <span className="text-muted-foreground">(9x)</span></p>
            <div className="grid grid-cols-5 gap-2">
              {NUMBERS.map(n => (
                <button
                  key={n}
                  onClick={() => { setBetType('number'); setBetValue(String(n)); }}
                  className={`rounded-lg py-2.5 font-mono font-bold text-sm border transition-all ${betType === 'number' && betValue === String(n) ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}
                  disabled={!bettingOpen}
                  data-testid={`bet-num-${n}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <p className="text-sm font-medium mb-2">Bet Amount</p>
            <div className="flex gap-2 flex-wrap">
              {AMOUNTS.map(a => (
                <button
                  key={a} onClick={() => setAmount(a)}
                  className={`rounded-full px-4 py-1.5 text-sm font-mono font-medium border transition-all ${amount === a ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/50'}`}
                  data-testid={`amount-${a}`}
                >
                  {a}
                </button>
              ))}
              <Input
                type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))}
                className="w-24 h-8 font-mono text-sm" min={10} max={10000}
                data-testid="amount-custom"
              />
            </div>
          </div>

          <Button
            onClick={placeBet} disabled={!bettingOpen || !betValue || loading}
            className="w-full glow-gold text-lg py-3" data-testid="place-bet-btn"
          >
            {loading ? 'Placing...' : `Place Bet - ${formatINR(amount)}`}
          </Button>
        </CardContent>
      </Card>

      {/* My Bets */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-heading font-semibold">My Bets</h3>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {myBets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No bets yet</p>
            ) : myBets.slice(0, 10).map((bet, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <Badge variant={bet.status === 'won' ? 'default' : bet.status === 'lost' ? 'destructive' : 'secondary'} className="text-xs">
                    {bet.status}
                  </Badge>
                  <span className="text-sm">{bet.bet_type}: {bet.bet_value}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm font-medium">{formatINR(bet.amount)}</span>
                  {bet.winnings > 0 && <span className="text-success text-xs ml-2">+{formatINR(bet.winnings)}</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
