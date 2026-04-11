import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

const FAKE_NAMES = [
  'Raj***K', 'Pri***S', 'Ank***R', 'Vik***M', 'San***P',
  'Ami***D', 'Nee***T', 'Rah***G', 'Div***A', 'Kar***B',
  'Sne***L', 'Aru***N', 'Dee***J', 'Man***V', 'Poo***H',
  'Sur***F', 'Ash***W', 'Rit***C', 'Sha***I', 'Nav***E',
  'Gau***Q', 'Lak***U', 'Yas***X', 'Tan***Z', 'Moh***O'
];

const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=1&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=2&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=3&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=4&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=5&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=6&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=7&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=8&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=9&backgroundColor=ffd5dc',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=10&backgroundColor=ffdfbf',
];

const BET_AMOUNTS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];

function generateFakeBet(index) {
  return {
    id: `fake-${Date.now()}-${index}`,
    name: FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)],
    avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
    amount: BET_AMOUNTS[Math.floor(Math.random() * BET_AMOUNTS.length)],
    multiplier: null,
    cashout: null,
    status: 'active',
  };
}

export default function LiveBetsPanel({ 
  myBets = [], 
  gamePhase = 'betting',
  crashPoint = null,
  currentMultiplier = 1.0,
  formatAmount = (a) => a,
  compact = false
}) {
  const [fakeBets, setFakeBets] = useState([]);
  const [totalBets, setTotalBets] = useState(0);
  const intervalRef = useRef(null);

  // Generate initial fake bets
  useEffect(() => {
    const count = 8 + Math.floor(Math.random() * 15);
    const bets = Array.from({ length: count }, (_, i) => generateFakeBet(i));
    setFakeBets(bets);
    setTotalBets(count + Math.floor(Math.random() * 40) + 20);
  }, []);

  // Simulate players joining/cashing out
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setFakeBets(prev => {
        const updated = [...prev];
        // Randomly add a new player
        if (Math.random() > 0.6 && updated.length < 25) {
          updated.unshift(generateFakeBet(Date.now()));
          setTotalBets(t => t + 1);
        }
        // Randomly cash out a player during flying phase
        if (gamePhase === 'flying' && Math.random() > 0.7) {
          const activeBets = updated.filter(b => !b.cashout);
          if (activeBets.length > 0) {
            const idx = updated.indexOf(activeBets[Math.floor(Math.random() * activeBets.length)]);
            if (idx >= 0) {
              const mult = (currentMultiplier * (0.7 + Math.random() * 0.3)).toFixed(2);
              updated[idx] = { 
                ...updated[idx], 
                multiplier: mult, 
                cashout: Math.round(updated[idx].amount * mult),
                status: 'won'
              };
            }
          }
        }
        // If crashed, mark remaining as lost
        if (gamePhase === 'crashed') {
          return updated.map(b => b.cashout ? b : { ...b, status: 'lost' });
        }
        return updated.slice(0, 20);
      });
    }, 1500);

    return () => clearInterval(intervalRef.current);
  }, [gamePhase, currentMultiplier]);

  // Reset on new round
  useEffect(() => {
    if (gamePhase === 'waiting' || gamePhase === 'betting') {
      const count = 5 + Math.floor(Math.random() * 12);
      const bets = Array.from({ length: count }, (_, i) => generateFakeBet(i));
      setFakeBets(bets);
      setTotalBets(count + Math.floor(Math.random() * 40) + 20);
    }
  }, [gamePhase]);

  return (
    <div className={`bg-card border border-border rounded-xl overflow-hidden ${compact ? '' : 'h-full'}`} data-testid="live-bets-panel">
      <Tabs defaultValue="all">
        <TabsList className="w-full grid grid-cols-2 rounded-none h-9 bg-muted/50">
          <TabsTrigger value="all" className="text-xs font-semibold rounded-none">
            Bets
          </TabsTrigger>
          <TabsTrigger value="mine" className="text-xs font-semibold rounded-none">
            My Bets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Bets:</span>
            <span className="text-sm font-mono font-bold text-primary">{totalBets}</span>
          </div>
          
          {/* Header */}
          <div className="grid grid-cols-4 gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/30">
            <span>User</span>
            <span className="text-right">Bet</span>
            <span className="text-right">Mult</span>
            <span className="text-right">Cashout</span>
          </div>

          {/* Bets list */}
          <div className={`overflow-y-auto scrollbar-hide ${compact ? 'max-h-48' : 'max-h-[360px]'}`}>
            {fakeBets.map((bet, i) => (
              <div 
                key={bet.id} 
                className={`grid grid-cols-4 gap-1 px-3 py-1.5 items-center border-b border-border/10 text-xs transition-colors ${
                  bet.status === 'won' ? 'bg-success/5' : bet.status === 'lost' ? 'bg-destructive/5' : ''
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <img src={bet.avatar} alt="" className="w-5 h-5 rounded-full shrink-0" />
                  <span className="truncate font-medium">{bet.name}</span>
                </div>
                <span className="text-right font-mono font-semibold">{bet.amount}</span>
                <span className={`text-right font-mono ${bet.multiplier ? 'text-success font-bold' : 'text-muted-foreground'}`}>
                  {bet.multiplier ? `${bet.multiplier}x` : '-'}
                </span>
                <span className={`text-right font-mono ${bet.cashout ? 'text-success font-bold' : 'text-muted-foreground'}`}>
                  {bet.cashout || '-'}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="mine" className="mt-0">
          <div className={`overflow-y-auto scrollbar-hide ${compact ? 'max-h-60' : 'max-h-[400px]'}`}>
            {myBets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No bets placed yet
              </div>
            ) : myBets.map((bet, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-border/10">
                <div>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    bet.status === 'won' ? 'bg-success/20 text-success' : 
                    bet.status === 'lost' ? 'bg-destructive/20 text-destructive' : 
                    'bg-muted text-muted-foreground'
                  }`}>
                    {bet.status}
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold">{formatAmount(bet.amount)}</span>
                <span className={`font-mono text-xs ${bet.winnings > 0 ? 'text-success font-bold' : 'text-muted-foreground'}`}>
                  {bet.winnings > 0 ? `+${formatAmount(bet.winnings)}` : '-'}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
