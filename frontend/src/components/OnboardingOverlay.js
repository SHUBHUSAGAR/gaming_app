import { useState } from 'react';
import { Button } from './ui/button';
import { X, ChevronRight, ChevronLeft, Gamepad2, Wallet, Trophy, Gift, Shield } from 'lucide-react';

const STEPS = [
  { icon: Gamepad2, title: 'Play 5 Exciting Games', desc: 'Win Go, Aviator, AB Fun, Lucky Hit, Soccer Go - each with unique mechanics and real-time multiplayer!', color: 'text-blue-400' },
  { icon: Wallet, title: 'Easy Deposits & Withdrawals', desc: 'Fund your wallet with Stripe, withdraw winnings anytime. Multiple INR packages available.', color: 'text-emerald-400' },
  { icon: Trophy, title: 'Climb the Leaderboard', desc: 'Compete with other players daily, weekly, and all-time. Top players get featured!', color: 'text-amber-400' },
  { icon: Gift, title: 'Daily Rewards & Bonuses', desc: 'Claim daily login bonuses, spin the wheel for prizes, use promo codes for extra balance.', color: 'text-violet-400' },
  { icon: Shield, title: 'Safe & Responsible', desc: 'Set your own bet limits, verified fair games, KYC-secured withdrawals. Play responsibly!', color: 'text-rose-400' },
];

export default function OnboardingOverlay({ onComplete }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const finish = () => { setVisible(false); localStorage.setItem('cooe-onboarded', 'true'); onComplete?.(); };
  const StepIcon = STEPS[step].icon;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" data-testid="onboarding-overlay">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border/50 overflow-hidden">
        {/* Progress */}
        <div className="flex gap-1 p-3">
          {STEPS.map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </div>

        {/* Content */}
        <div className="px-8 py-10 text-center">
          <div className={`w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-primary/10 ${STEPS[step].color}`}>
            <StepIcon className="w-8 h-8" />
          </div>
          <h2 className="font-heading text-xl font-bold mb-2">{STEPS[step].title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{STEPS[step].desc}</p>
        </div>

        {/* Controls */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={finish} data-testid="skip-onboarding">Skip</Button>
          <div className="flex gap-2">
            {step > 0 && <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)}><ChevronLeft className="w-4 h-4" /></Button>}
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={() => setStep(s => s + 1)} data-testid="next-onboarding">Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
            ) : (
              <Button size="sm" onClick={finish} className="glow-gold" data-testid="finish-onboarding">Get Started!</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
