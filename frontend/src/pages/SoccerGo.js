import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API, { formatINR } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import LiveBetsPanel from '../components/LiveBetsPanel';
import { ArrowLeft, Dice5 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const AMOUNTS = [10, 50, 100, 500, 1000];
const DICE_FACES = ['', '\u2680', '\u2681', '\u2682', '\u2683', '\u2684', '\u2685'];

function DiceDisplay({ rolls, goals, label, isWinner }) {
  return (
    <div className="text-center">
      <p className={`text-sm font-bold mb-3 ${isWinner ? 'text-success' : ''}`}>
        {label} {isWinner && '\u2714'}
      </p>
      <div className="flex gap-3 justify-center">
        {rolls.map((r, i) => (
          <div key={i} className={`dice text-3xl bg-card border-2 shadow-lg ${r >= 5 ? 'border-success text-success' : 'border-border'}`}>
            {DICE_FACES[r]}
          </div>
        ))}
      </div>
      <div className="mt-3">
        <span className="font-mono font-bold text-3xl">{goals}</span>
        <span className="text-sm text-muted-foreground ml-1">Goal{goals !== 1 ? 's' : ''}</span>
      </div>
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
      setTimeout(() => {
        setResult(data.result);
        setWinnings(data.winnings);
        if (data.winnings > 0) toast.success(`You won ${formatINR(data.winnings)}!`);
        else toast.error('Better luck next time!');
        refreshUser();
      }, 700);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally {
      setTimeout(() => setLoading(false), 700);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4" data-testid="soccergo-page">
      <div className="flex items-center gap-3 mb-3">
        <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="font-heading text-xl sm:text-2xl font-bold">Soccer Go</h1>
        <Dice5 className="w-5 h-5 text-primary" />
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
                  <p className="text-muted-foreground text-sm">Rolling dice...</p>
                </div>
              )}

              {!loading && !result && (
                <div className="text-center py-12">
                  <div className="flex justify-center gap-8 items-center opacity-30">
                    <div className="flex gap-2">
                      {[1,2,3].map(i => <div key={i} className="dice bg-muted border border-border text-2xl">{DICE_FACES[i]}</div>)}
                    </div>
                    <span className="text-2xl font-bold">VS</span>
                    <div className="flex gap-2">
                      {[4,5,6].map(i => <div key={i} className="dice bg-muted border border-border text-2xl">{DICE_FACES[i > 6 ? 1 : i]}</div>)}
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm mt-4">Pick a team and play!</p>
                </div>
              )}

              {result && (
                <div className="animate-fly-up">
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                    <DiceDisplay rolls={result.team_a?.rolls || []} goals={result.team_a?.goals || 0} label="Team A" isWinner={result.winner === 'a'} />
                    <div className="text-center">
                      <p className="font-mono font-bold text-4xl text-primary">{result.score}</p>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">{result.winner === 'draw' ? 'Draw!' : `${result.winner === 'a' ? 'Team A' : 'Team B'} Wins!`}</p>
                    </div>
                    <DiceDisplay rolls={result.team_b?.rolls || []} goals={result.team_b?.goals || 0} label="Team B" isWinner={result.winner === 'b'} />
                  </div>
                  {winnings !== null && (
                    <div className={`text-center mt-6 text-xl font-bold ${winnings > 0 ? 'text-success' : 'text-destructive'}`} data-testid="soccergo-result">
                      {winnings > 0 ? `Won ${formatINR(winnings)}!` : 'Lost!'}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Predict Winner</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'a', label: 'Team A', mult: '1.9x', color: 'bg-blue-600 hover:bg-blue-700' },
                  { value: 'draw', label: 'Draw', mult: '3.2x', color: 'bg-game-gold hover:opacity-90' },
                  { value: 'b', label: 'Team B', mult: '1.9x', color: 'bg-orange-600 hover:bg-orange-700' },
                ].map(opt => (
                  <button key={opt.value} onClick={() => { setBetType('winner'); setBetValue(opt.value); }}
                    className={`${opt.color} text-white rounded-xl py-5 font-bold transition-all shadow-lg ${betValue === opt.value && betType === 'winner' ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-background scale-[1.02]' : 'opacity-80 hover:opacity-100'}`}
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
                <Button onClick={play} disabled={!betValue || loading} className="sm:w-48 glow-gold font-bold text-base py-3" data-testid="soccergo-play-btn">
                  {loading ? 'Rolling...' : `PLAY ${formatINR(amount)}`}
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
