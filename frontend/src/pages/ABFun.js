import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API, { formatINR } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const AMOUNTS = [10, 50, 100, 500, 1000];
const SUIT_SYMBOLS = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
const VALUE_LABELS = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

function CardDisplay({ card }) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const val = VALUE_LABELS[card.value] || card.value;
  return (
    <div className={`playing-card bg-card border border-border ${isRed ? 'text-red-500' : ''}`}>
      <span className="text-lg font-bold">{val}</span>
      <span className="text-xs">{SUIT_SYMBOLS[card.suit]}</span>
    </div>
  );
}

export default function ABFun() {
  const { refreshUser } = useAuth();
  const [betValue, setBetValue] = useState('');
  const [amount, setAmount] = useState(100);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [winnings, setWinnings] = useState(null);

  const play = async () => {
    if (!betValue) return;
    setLoading(true);
    setResult(null);
    setWinnings(null);
    try {
      const { data } = await API.post('/games/abfun/play', { bet_type: 'side', bet_value: betValue, amount });
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
    <div className="max-w-4xl mx-auto p-4 space-y-4" data-testid="abfun-page">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="font-heading text-2xl font-bold">AB Fun</h1>
        <span className="text-sm text-muted-foreground ml-auto">Andar Bahar</span>
      </div>

      {/* Result Display */}
      {result && (
        <Card className="animate-fly-up">
          <CardContent className="p-4">
            <div className="text-center mb-3">
              <p className="text-sm text-muted-foreground">Joker Card</p>
              <div className="flex justify-center mt-2">
                <CardDisplay card={result.joker} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`text-sm font-medium text-center mb-2 ${result.winner === 'andar' ? 'text-success' : ''}`}>
                  Andar {result.winner === 'andar' && '(Winner)'}
                </p>
                <div className="flex gap-1 flex-wrap justify-center">
                  {result.andar_cards?.map((c, i) => <CardDisplay key={i} card={c} />)}
                </div>
              </div>
              <div>
                <p className={`text-sm font-medium text-center mb-2 ${result.winner === 'bahar' ? 'text-success' : ''}`}>
                  Bahar {result.winner === 'bahar' && '(Winner)'}
                </p>
                <div className="flex gap-1 flex-wrap justify-center">
                  {result.bahar_cards?.map((c, i) => <CardDisplay key={i} card={c} />)}
                </div>
              </div>
            </div>
            {winnings !== null && (
              <div className={`text-center mt-4 text-lg font-bold ${winnings > 0 ? 'text-success' : 'text-destructive'}`} data-testid="abfun-result">
                {winnings > 0 ? `Won ${formatINR(winnings)}` : 'Lost'}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Betting */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="text-sm font-medium">Pick Your Side</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'andar', label: 'Andar (A)', mult: '1.9x', color: 'bg-blue-600' },
              { value: 'bahar', label: 'Bahar (B)', mult: '1.9x', color: 'bg-orange-600' },
              { value: 'tie', label: 'Tie', mult: '8.2x', color: 'bg-game-violet' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setBetValue(opt.value)}
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

          <Button onClick={play} disabled={!betValue || loading} className="w-full glow-gold text-lg py-3" data-testid="abfun-play-btn">
            {loading ? 'Dealing...' : `Play - ${formatINR(amount)}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
