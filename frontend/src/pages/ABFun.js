import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API, { formatINR } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import LiveBetsPanel from '../components/LiveBetsPanel';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useSound } from '../contexts/SoundContext';

const AMOUNTS = [10, 50, 100, 500, 1000];
const SUIT_SYMBOLS = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
const VALUE_LABELS = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

function PlayingCard({ card, highlight = false }) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const val = VALUE_LABELS[card.value] || card.value;
  return (
    <div className={`playing-card bg-card border-2 ${highlight ? 'border-primary shadow-lg shadow-primary/20' : 'border-border'} ${isRed ? 'text-red-500' : ''}`}>
      <span className="text-lg font-bold">{val}</span>
      <span className="text-xs">{SUIT_SYMBOLS[card.suit]}</span>
    </div>
  );
}

export default function ABFun() {
  const { refreshUser } = useAuth();
  const sound = useSound();
  const [betValue, setBetValue] = useState('');
  const [amount, setAmount] = useState(100);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [winnings, setWinnings] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);

  const play = async () => {
    if (!betValue) return;
    setLoading(true);
    setResult(null);
    setWinnings(null);
    try {
      const { data } = await API.post('/games/abfun/play', { bet_type: 'side', bet_value: betValue, amount });
      setTimeout(() => {
        setResult(data.result);
        setWinnings(data.winnings);
        sound.cardFlip();
        if (data.winnings > 0) { sound.win(); toast.success(`You won ${formatINR(data.winnings)}!`); }
        else { sound.lose(); toast.error('Better luck next time!'); }
        setGameHistory(prev => [{ result: data.result, bet: betValue, winnings: data.winnings }, ...prev].slice(0, 10));
        refreshUser();
      }, 800);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4" data-testid="abfun-page">
      <div className="flex items-center gap-3 mb-3">
        <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="font-heading text-xl sm:text-2xl font-bold">AB Fun</h1>
        <span className="text-sm text-muted-foreground ml-auto">Andar Bahar</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3">
        <div className="hidden lg:block">
          <LiveBetsPanel myBets={[]} gamePhase="betting" formatAmount={formatINR} />
        </div>

        <div className="space-y-3">
          {/* Game Display */}
          <Card className="border-2 border-border/50">
            <CardContent className="p-4 sm:p-6">
              {loading && !result && (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Dealing cards...</p>
                </div>
              )}

              {!loading && !result && (
                <div className="text-center py-12">
                  <div className="flex justify-center gap-3 mb-4 opacity-30">
                    {[1,2,3].map(i => <div key={i} className="w-14 h-20 bg-muted rounded-lg border border-border" />)}
                  </div>
                  <p className="text-muted-foreground text-sm">Select your side and play!</p>
                </div>
              )}

              {result && (
                <div className="animate-fly-up">
                  <div className="text-center mb-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Joker Card</p>
                    <div className="flex justify-center">
                      <PlayingCard card={result.joker} highlight />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className={`text-sm font-bold text-center mb-2 ${result.winner === 'andar' ? 'text-success' : ''}`}>
                        Andar {result.winner === 'andar' && '\u2714'}
                      </p>
                      <div className="flex gap-1 flex-wrap justify-center">
                        {result.andar_cards?.map((c, i) => <PlayingCard key={i} card={c} highlight={result.winner === 'andar'} />)}
                      </div>
                    </div>
                    <div>
                      <p className={`text-sm font-bold text-center mb-2 ${result.winner === 'bahar' ? 'text-success' : ''}`}>
                        Bahar {result.winner === 'bahar' && '\u2714'}
                      </p>
                      <div className="flex gap-1 flex-wrap justify-center">
                        {result.bahar_cards?.map((c, i) => <PlayingCard key={i} card={c} highlight={result.winner === 'bahar'} />)}
                      </div>
                    </div>
                  </div>
                  {winnings !== null && (
                    <div className={`text-center mt-6 text-xl font-bold ${winnings > 0 ? 'text-success' : 'text-destructive'}`} data-testid="abfun-result">
                      {winnings > 0 ? `Won ${formatINR(winnings)}!` : 'Lost!'}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Betting Controls */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Choose Side</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'andar', label: 'Andar (A)', mult: '1.9x', color: 'bg-blue-600 hover:bg-blue-700' },
                  { value: 'bahar', label: 'Bahar (B)', mult: '1.9x', color: 'bg-orange-600 hover:bg-orange-700' },
                  { value: 'tie', label: 'Tie', mult: '8.2x', color: 'bg-game-violet hover:opacity-90' },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setBetValue(opt.value)}
                    className={`${opt.color} text-white rounded-xl py-5 font-bold transition-all shadow-lg ${betValue === opt.value ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-background scale-[1.02]' : 'opacity-80 hover:opacity-100'}`}
                    data-testid={`bet-${opt.value}`}
                  >
                    <div className="text-base">{opt.label}</div>
                    <div className="text-xs opacity-80 mt-1">{opt.mult}</div>
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end pt-2">
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Bet Amount</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {AMOUNTS.map(a => (
                      <button key={a} onClick={() => setAmount(a)}
                        className={`rounded-full px-3.5 py-1 text-xs font-mono font-semibold border transition-all ${amount === a ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/50'}`}
                      >{a}</button>
                    ))}
                  </div>
                </div>
                <Button onClick={play} disabled={!betValue || loading} className="sm:w-48 glow-gold font-bold text-base py-3" data-testid="abfun-play-btn">
                  {loading ? 'Dealing...' : `PLAY ${formatINR(amount)}`}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Live Bets */}
          <div className="lg:hidden">
            <LiveBetsPanel myBets={[]} gamePhase="betting" formatAmount={formatINR} compact />
          </div>
        </div>
      </div>
    </div>
  );
}
