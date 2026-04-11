import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API, { formatINR } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const AMOUNTS = [10, 50, 100, 500, 1000];
const SUIT_SYMBOLS = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
const VALUE_LABELS = { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

function MiniCard({ card }) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  return (
    <div className={`playing-card bg-card border border-border ${isRed ? 'text-red-500' : ''}`}>
      <span className="text-lg font-bold">{VALUE_LABELS[card.value]}</span>
      <span className="text-xs">{SUIT_SYMBOLS[card.suit]}</span>
    </div>
  );
}

export default function LuckyHit() {
  const { refreshUser } = useAuth();
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
      setResult(data.result);
      setWinnings(data.winnings);
      if (data.winnings > 0) toast.success(`You won ${formatINR(data.winnings)}!`);
      else toast.error('Better luck next time!');
      refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4" data-testid="luckyhit-page">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="font-heading text-2xl font-bold">Lucky Hit</h1>
      </div>

      {result && (
        <Card className="animate-fly-up">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <p className={`text-sm font-medium mb-2 ${result.winner === 'a' ? 'text-success font-bold' : ''}`}>
                  Side A {result.winner === 'a' && '(Winner)'}
                </p>
                <div className="flex gap-1 justify-center">{result.side_a?.map((c, i) => <MiniCard key={i} card={c} />)}</div>
                <p className="font-mono font-bold text-xl mt-2">{result.sum_a}</p>
              </div>
              <div className="text-center">
                <p className={`text-sm font-medium mb-2 ${result.winner === 'b' ? 'text-success font-bold' : ''}`}>
                  Side B {result.winner === 'b' && '(Winner)'}
                </p>
                <div className="flex gap-1 justify-center">{result.side_b?.map((c, i) => <MiniCard key={i} card={c} />)}</div>
                <p className="font-mono font-bold text-xl mt-2">{result.sum_b}</p>
              </div>
            </div>
            {winnings !== null && (
              <div className={`text-center mt-4 text-lg font-bold ${winnings > 0 ? 'text-success' : 'text-destructive'}`} data-testid="luckyhit-result">
                {winnings > 0 ? `Won ${formatINR(winnings)}` : 'Lost'}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-sm font-medium">Pick Your Side</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'a', label: 'Side A', mult: '1.9x', color: 'bg-blue-600' },
              { value: 'b', label: 'Side B', mult: '1.9x', color: 'bg-orange-600' },
              { value: 'tie', label: 'Tie', mult: '8x', color: 'bg-game-violet' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setBetValue(opt.value)}
                className={`${opt.color} text-white rounded-lg py-4 font-bold text-sm transition-all ${betValue === opt.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105' : 'opacity-75 hover:opacity-100'}`}
                data-testid={`bet-${opt.value}`}
              >
                <div>{opt.label}</div>
                <div className="text-xs opacity-80 mt-1">{opt.mult}</div>
              </button>
            ))}
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Bet Amount</p>
            <div className="flex gap-2 flex-wrap">
              {AMOUNTS.map(a => (
                <button key={a} onClick={() => setAmount(a)}
                  className={`rounded-full px-4 py-1.5 text-sm font-mono font-medium border transition-all ${amount === a ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/50'}`}
                >{a}</button>
              ))}
            </div>
          </div>
          <Button onClick={play} disabled={!betValue || loading} className="w-full glow-gold text-lg py-3" data-testid="luckyhit-play-btn">
            {loading ? 'Dealing...' : `Play - ${formatINR(amount)}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
