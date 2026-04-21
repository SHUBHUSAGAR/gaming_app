import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API, { formatINR } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Gift, Flame, Star, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useSound } from '../contexts/SoundContext';

const DAY_LABELS = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

export default function DailyBonus() {
  const { refreshUser } = useAuth();
  const sound = useSound();
  const [status, setStatus] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [wheelAngle, setWheelAngle] = useState(0);
  const canvasRef = useRef(null);

  useEffect(() => {
    API.get('/bonus/daily-status').then(r => setStatus(r.data)).catch(() => {});
  }, []);

  const claimDaily = async () => {
    setClaiming(true);
    try {
      const { data } = await API.post('/bonus/claim-daily');
      sound.deposit();
      toast.success(data.message);
      refreshUser();
      setStatus(s => ({ ...s, streak: data.streak, claimed_today: true }));
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally {
      setClaiming(false);
    }
  };

  const spinWheel = async () => {
    setSpinning(true);
    setSpinResult(null);
    try {
      const { data } = await API.post('/bonus/spin-wheel');
      const segAngle = 360 / data.segments.length;
      const targetAngle = 360 * 5 + (360 - data.segment * segAngle - segAngle / 2);
      setWheelAngle(targetAngle);
      // Play tick sounds during spin
      for (let i = 0; i < 15; i++) { setTimeout(() => sound.spinTick(), i * 250); }
      setTimeout(() => {
        setSpinResult(data);
        setSpinning(false);
        if (data.prize > 0) { sound.bigWin(); toast.success(`Won ${formatINR(data.prize)}!`); }
        else { sound.lose(); toast('Try again tomorrow!'); }
        refreshUser();
        setStatus(s => ({ ...s, spin_available: false }));
      }, 4000);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
      setSpinning(false);
    }
  };

  if (!status) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const SEGMENTS = [5, 10, 20, 50, 100, 200, 500, 0];
  const SEG_COLORS = ['#dc2626', '#d97706', '#059669', '#7c3aed', '#2563eb', '#db2777', '#d4af37', '#64748b'];

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6" data-testid="daily-bonus-page">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2"><Gift className="w-6 h-6 text-primary" /> Daily Rewards</h1>
      </div>

      {/* Streak Calendar */}
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-orange-400" />
            <h2 className="font-heading font-semibold">Login Streak: {status.streak} days</h2>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {DAY_LABELS.map((day, i) => {
              const dayNum = i + 1;
              const reward = status.rewards?.[dayNum] || 0;
              const completed = dayNum <= status.streak;
              const current = dayNum === status.streak + 1 && !status.claimed_today;
              return (
                <motion.div
                  key={i}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className={`relative rounded-xl p-2 text-center border-2 transition-all ${
                    completed ? 'border-primary bg-primary/10' :
                    current ? 'border-primary/50 bg-primary/5 animate-pulse-glow' :
                    'border-border/30 bg-card/50'
                  }`}
                >
                  {completed && <CheckCircle className="w-3.5 h-3.5 text-primary absolute top-1 right-1" />}
                  <p className="text-[10px] text-muted-foreground">{day}</p>
                  <p className="font-mono font-bold text-sm mt-1">{reward}</p>
                  <Star className={`w-3 h-3 mx-auto mt-0.5 ${completed ? 'text-primary' : 'text-muted-foreground/30'}`} />
                </motion.div>
              );
            })}
          </div>
          <Button onClick={claimDaily} disabled={status.claimed_today || claiming} className="w-full mt-4 glow-gold" data-testid="claim-daily-btn">
            {status.claimed_today ? 'Claimed Today' : claiming ? 'Claiming...' : `Claim Day ${Math.min(status.streak + 1, 7)} Bonus (+${status.next_reward})`}
          </Button>
        </CardContent>
      </Card>

      {/* Spin the Wheel */}
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <h2 className="font-heading font-semibold text-center mb-4">Spin the Wheel</h2>
          <div className="relative w-64 h-64 mx-auto">
            {/* Wheel */}
            <div
              className="w-full h-full rounded-full border-4 border-primary/30 overflow-hidden relative"
              style={{ transform: `rotate(${wheelAngle}deg)`, transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none' }}
            >
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {SEGMENTS.map((val, i) => {
                  const angle = (360 / SEGMENTS.length) * i;
                  const rad = (angle * Math.PI) / 180;
                  const rad2 = ((angle + 360 / SEGMENTS.length) * Math.PI) / 180;
                  const x1 = 100 + 100 * Math.cos(rad);
                  const y1 = 100 + 100 * Math.sin(rad);
                  const x2 = 100 + 100 * Math.cos(rad2);
                  const y2 = 100 + 100 * Math.sin(rad2);
                  const midRad = ((angle + 360 / SEGMENTS.length / 2) * Math.PI) / 180;
                  const tx = 100 + 60 * Math.cos(midRad);
                  const ty = 100 + 60 * Math.sin(midRad);
                  return (
                    <g key={i}>
                      <path d={`M100,100 L${x1},${y1} A100,100 0 0,1 ${x2},${y2} Z`} fill={SEG_COLORS[i]} />
                      <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12" fontWeight="bold" transform={`rotate(${angle + 360 / SEGMENTS.length / 2}, ${tx}, ${ty})`}>
                        {val === 0 ? 'Try Again' : val}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary z-10" />
          </div>

          {spinResult && (
            <div className="text-center mt-4 animate-fly-up">
              <p className={`font-heading text-2xl font-bold ${spinResult.prize > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                {spinResult.prize > 0 ? `Won ${formatINR(spinResult.prize)}!` : 'Try Again Tomorrow!'}
              </p>
            </div>
          )}

          <Button onClick={spinWheel} disabled={!status.spin_available || spinning} className="w-full mt-4" data-testid="spin-wheel-btn">
            {!status.spin_available ? 'Spin Used Today' : spinning ? 'Spinning...' : 'Spin Now!'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
