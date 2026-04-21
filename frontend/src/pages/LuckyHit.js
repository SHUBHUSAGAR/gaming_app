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
const VALUE_LABELS = { 2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'J',12:'Q',13:'K',14:'A' };

function MiniCard({ card, highlight = false }) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  return (
    <div className={`playing-card bg-card border-2 ${highlight ? 'border-primary shadow-lg shadow-primary/20' : 'border-border'} ${isRed ? 'text-red-500' : ''}`}>
      <span className="text-lg font-bold">{VALUE_LABELS[card.value]}</span>
      <span className="text-xs">{SUIT_SYMBOLS[card.suit]}</span>
    </div>
  );
}

export default function LuckyHit() {
  const { refreshUser } = useAuth();
  const sound = useSound();
  const [betValue, setBetValue] = useState('');
  const [amount, setAmount] = useState(100);
  const [result, setResult] = useState(null);
  const [winnings, setWinnings] = useState(null);
  const [loading, setLoading] = useState(false);

  const play = async () => {
    if (!betValue) return;
    setLoading(true);
    setResult(null);
    setWinnings(null);
    try {
      const { data } = await API.post('/games/luckyhit/play', { bet_type: 'side', bet_value: betValue, amount });
      setTimeout(() => {
        setResult(data.result);
        setWinnings(data.winnings);
        sound.cardFlip();
        if (data.winnings > 0) { sound.win(); toast.success(`You won ${formatINR(data.winnings)}!`); }
        else { sound.lose(); toast.error('Better luck next time!'); }
        refreshUser();
      }, 600);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4" data-testid="luckyhit-page">
      <div className="flex items-center gap-3 mb-3">
        <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="font-heading text-xl sm:text-2xl font-bold">Lucky Hit</h1>
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
                  <div className="flex justify-center gap-8">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Side A</p>
                      <div className="flex gap-1 opacity-30">
                        {[1,2,3].map(i => <div key={i} className="w-14 h-20 bg-muted rounded-lg border border-border" />)}
                      </div>
                    </div>
                    <div className="flex items-center text-2xl font-bold text-muted-foreground">VS</div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Side B</p>
                      <div className="flex gap-1 opacity-30">
                        {[1,2,3].map(i => <div key={i} className="w-14 h-20 bg-muted rounded-lg border border-border" />)}
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm mt-4">Pick a side and play!</p>
                </div>
              )}

              {result && (
                <div className="animate-fly-up">
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                    <div className="text-center">
                      <p className={`text-sm font-bold mb-2 ${result.winner === 'a' ? 'text-success' : ''}`}>
                        Side A {result.winner === 'a' && '\u2714'}
                      </p>
                      <div className="flex gap-1 justify-center">{result.side_a?.map((c, i) => <MiniCard key={i} card={c} highlight={result.winner === 'a'} />)}</div>
                      <p className={`font-mono font-bold text-3xl mt-3 ${result.winner === 'a' ? 'text-success' : ''}`}>{result.sum_a}</p>
                    </div>
                    <div className="text-2xl font-bold text-muted-foreground">VS</div>
                    <div className="text-center">
                      <p className={`text-sm font-bold mb-2 ${result.winner === 'b' ? 'text-success' : ''}`}>
                        Side B {result.winner === 'b' && '\u2714'}
                      </p>
                      <div className="flex gap-1 justify-center">{result.side_b?.map((c, i) => <MiniCard key={i} card={c} highlight={result.winner === 'b'} />)}</div>
                      <p className={`font-mono font-bold text-3xl mt-3 ${result.winner === 'b' ? 'text-success' : ''}`}>{result.sum_b}</p>
                    </div>
                  </div>
                  {winnings !== null && (
                    <div className={`text-center mt-6 text-xl font-bold ${winnings > 0 ? 'text-success' : 'text-destructive'}`} data-testid="luckyhit-result">
                      {winnings > 0 ? `Won ${formatINR(winnings)}!` : 'Lost!'}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Choose Side</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'a', label: 'Side A', mult: '1.9x', color: 'bg-blue-600 hover:bg-blue-700' },
                  { value: 'b', label: 'Side B', mult: '1.9x', color: 'bg-orange-600 hover:bg-orange-700' },
                  { value: 'tie', label: 'Tie', mult: '8x', color: 'bg-game-violet hover:opacity-90' },
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
                <Button onClick={play} disabled={!betValue || loading} className="sm:w-48 glow-gold font-bold text-base py-3" data-testid="luckyhit-play-btn">
                  {loading ? 'Dealing...' : `PLAY ${formatINR(amount)}`}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="lg:hidden">
            <LiveBetsPanel myBets={[]} gamePhase="betting" formatAmount={formatINR} compact />
          </div>
        </div>
      </div>
    </div>
  );
}
