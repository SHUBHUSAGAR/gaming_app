import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API, { formatINR } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ArrowLeft, Dice5 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const AMOUNTS = [10, 50, 100, 500, 1000];
const DICE_FACES = ['', '\u2680', '\u2681', '\u2682', '\u2683', '\u2684', '\u2685'];

function DiceDisplay({ rolls, goals, label, isWinner }) {
  return (
    <div className="text-center">
      <p className={`text-sm font-medium mb-2 ${isWinner ? 'text-success font-bold' : ''}`}>
        {label} {isWinner && '(Winner)'}
      </p>
      <div className="flex gap-2 justify-center">
        {rolls.map((r, i) => (
          <div key={i} className={`dice bg-card border-2 ${r >= 5 ? 'border-success text-success' : 'border-border'}`}>
            <span>{DICE_FACES[r]}</span>
          </div>
        ))}
      </div>
      <p className="font-mono font-bold text-2xl mt-2">{goals} Goal{goals !== 1 ? 's' : ''}</p>
    </div>
  );
}

export default function SoccerGo() {
  const { refreshUser } = useAuth();
  const [betType, setBetType] = useState('winner');
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
      const { data } = await API.post('/games/soccergo/play', { bet_type: betType, bet_value: betValue, amount });
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
    <div className="max-w-4xl mx-auto p-4 space-y-4" data-testid="soccergo-page">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="font-heading text-2xl font-bold">Soccer Go</h1>
        <Dice5 className="w-5 h-5 text-primary" />
      </div>

      {result && (
        <Card className="animate-fly-up">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-6">
              <DiceDisplay rolls={result.team_a?.rolls || []} goals={result.team_a?.goals || 0} label="Team A" isWinner={result.winner === 'a'} />
              <DiceDisplay rolls={result.team_b?.rolls || []} goals={result.team_b?.goals || 0} label="Team B" isWinner={result.winner === 'b'} />
            </div>
            <div className="text-center mt-4">
              <p className="font-mono font-bold text-2xl">{result.score}</p>
              <p className="text-sm text-muted-foreground capitalize">{result.winner === 'draw' ? 'Draw!' : `${result.winner === 'a' ? 'Team A' : 'Team B'} Wins!`}</p>
            </div>
            {winnings !== null && (
              <div className={`text-center mt-3 text-lg font-bold ${winnings > 0 ? 'text-success' : 'text-destructive'}`} data-testid="soccergo-result">
                {winnings > 0 ? `Won ${formatINR(winnings)}` : 'Lost'}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Predict the Winner</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'a', label: 'Team A', mult: '1.9x', color: 'bg-blue-600' },
                { value: 'draw', label: 'Draw', mult: '3.2x', color: 'bg-game-gold' },
                { value: 'b', label: 'Team B', mult: '1.9x', color: 'bg-orange-600' },
              ].map(opt => (
                <button key={opt.value} onClick={() => { setBetType('winner'); setBetValue(opt.value); }}
                  className={`${opt.color} text-white rounded-lg py-4 font-bold text-sm transition-all ${betValue === opt.value && betType === 'winner' ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105' : 'opacity-75 hover:opacity-100'}`}
                  data-testid={`bet-${opt.value}`}
                >
                  <div>{opt.label}</div>
                  <div className="text-xs opacity-80 mt-1">{opt.mult}</div>
                </button>
              ))}
            </div>
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
          <Button onClick={play} disabled={!betValue || loading} className="w-full glow-gold text-lg py-3" data-testid="soccergo-play-btn">
            {loading ? 'Rolling...' : `Play - ${formatINR(amount)}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
