import { useState, useEffect } from 'react';
import API from '../lib/api';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { ShieldCheck } from 'lucide-react';

export default function TermsModal({ onAccepted }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.get('/terms/status').then(r => {
      if (!r.data.accepted) setOpen(true);
    }).catch(() => {});
  }, []);

  const accept = async () => {
    setLoading(true);
    try {
      await API.post('/terms/accept');
      setOpen(false);
      onAccepted?.();
    } catch {} finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" />Terms & Conditions</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Welcome to Cooe Gaming Platform</p>
            <p>By using this platform, you agree to the following terms:</p>
            <p><strong>1. Eligibility:</strong> You must be 18 years or older to use this platform. Gaming services are intended for entertainment purposes.</p>
            <p><strong>2. Account:</strong> You are responsible for maintaining the security of your account credentials. One account per person.</p>
            <p><strong>3. Deposits & Withdrawals:</strong> All deposits are processed via secure payment gateways. Withdrawals may require KYC verification for amounts exceeding platform thresholds.</p>
            <p><strong>4. Fair Play:</strong> All game results are determined by provably fair algorithms. Any attempt to manipulate or exploit game mechanics will result in account termination.</p>
            <p><strong>5. Responsible Gaming:</strong> We encourage responsible gaming. You can set daily/weekly bet limits in your profile settings. If you feel you have a gambling problem, please use the self-exclusion feature.</p>
            <p><strong>6. Privacy:</strong> We collect and process your data in accordance with our Privacy Policy. Your personal information is encrypted and securely stored.</p>
            <p><strong>7. Bonuses:</strong> All bonuses and promotions are subject to specific terms and wagering requirements as specified.</p>
            <p><strong>8. Limitation of Liability:</strong> The platform is provided "as is". We are not liable for any losses incurred during gameplay.</p>
            <p><strong>9. Changes:</strong> We reserve the right to modify these terms at any time. Continued use constitutes acceptance.</p>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={accept} disabled={loading} className="w-full glow-gold" data-testid="accept-terms-btn">
            {loading ? 'Accepting...' : 'I Accept the Terms & Conditions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
