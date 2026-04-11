import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import API, { formatINR } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ArrowDown, ArrowUp, CreditCard, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const PACKAGES = [
  { id: '100', amount: 100 },
  { id: '500', amount: 500 },
  { id: '1000', amount: 1000 },
  { id: '2000', amount: 2000 },
  { id: '5000', amount: 5000 },
];

export default function Wallet() {
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [selectedPkg, setSelectedPkg] = useState('500');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  const loadTransactions = useCallback(async () => {
    try {
      const { data } = await API.get('/wallet/transactions');
      setTransactions(data.transactions || []);
    } catch {}
  }, []);

  // Poll payment status on return from Stripe
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      pollPaymentStatus(sessionId);
    }
    loadTransactions();
  }, [searchParams, loadTransactions]);

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    if (attempts >= 5) {
      setPaymentStatus('timeout');
      return;
    }
    try {
      const { data } = await API.get(`/payments/status/${sessionId}`);
      if (data.payment_status === 'paid') {
        setPaymentStatus('success');
        toast.success('Deposit successful!');
        refreshUser();
        loadTransactions();
        return;
      } else if (data.status === 'expired') {
        setPaymentStatus('expired');
        return;
      }
      setPaymentStatus('pending');
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), 2000);
    } catch {
      setPaymentStatus('error');
    }
  };

  const handleDeposit = async () => {
    setLoading(true);
    try {
      const { data } = await API.post('/payments/create-checkout', {
        package_id: selectedPkg,
        origin_url: window.location.origin
      });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create checkout');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || Number(withdrawAmount) <= 0) return;
    setLoading(true);
    try {
      await API.post('/wallet/withdraw', { amount: Number(withdrawAmount), method: 'upi', upi_id: upiId });
      toast.success('Withdrawal request submitted');
      setWithdrawAmount('');
      setUpiId('');
      refreshUser();
      loadTransactions();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4" data-testid="wallet-page">
      <h1 className="font-heading text-2xl font-bold">Wallet</h1>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Total Balance</p>
          <p className="balance-display text-4xl font-bold mt-1" data-testid="wallet-balance">
            {formatINR(user?.balance || 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">INR</p>
        </CardContent>
      </Card>

      {/* Payment Status */}
      {paymentStatus && (
        <Card className="animate-fly-up">
          <CardContent className="p-4 flex items-center gap-3">
            {paymentStatus === 'success' && <><CheckCircle className="w-5 h-5 text-success" /><span className="text-success font-medium">Deposit successful!</span></>}
            {paymentStatus === 'pending' && <><Loader2 className="w-5 h-5 animate-spin text-primary" /><span>Processing payment...</span></>}
            {paymentStatus === 'expired' && <><XCircle className="w-5 h-5 text-destructive" /><span className="text-destructive">Payment expired</span></>}
            {paymentStatus === 'error' && <><XCircle className="w-5 h-5 text-destructive" /><span className="text-destructive">Payment error</span></>}
            {paymentStatus === 'timeout' && <><XCircle className="w-5 h-5 text-muted-foreground" /><span className="text-muted-foreground">Status check timed out</span></>}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="deposit">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="deposit" data-testid="tab-deposit"><ArrowDown className="w-4 h-4 mr-1" />Deposit</TabsTrigger>
          <TabsTrigger value="withdraw" data-testid="tab-withdraw"><ArrowUp className="w-4 h-4 mr-1" />Withdraw</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history"><CreditCard className="w-4 h-4 mr-1" />History</TabsTrigger>
        </TabsList>

        <TabsContent value="deposit">
          <Card>
            <CardContent className="p-4 space-y-4">
              <p className="text-sm font-medium">Select Amount (INR)</p>
              <div className="grid grid-cols-3 gap-2">
                {PACKAGES.map(pkg => (
                  <button key={pkg.id} onClick={() => setSelectedPkg(pkg.id)}
                    className={`rounded-lg py-3 font-mono font-bold text-sm border-2 transition-all ${selectedPkg === pkg.id ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}
                    data-testid={`deposit-pkg-${pkg.id}`}
                  >
                    {formatINR(pkg.amount)}
                  </button>
                ))}
              </div>
              <Button onClick={handleDeposit} disabled={loading} className="w-full glow-gold" data-testid="deposit-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Deposit {formatINR(PACKAGES.find(p => p.id === selectedPkg)?.amount || 0)}
              </Button>
              <p className="text-xs text-muted-foreground text-center">Powered by Stripe - Secure payment</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdraw">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (INR)</label>
                <Input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="Enter amount" min={10} data-testid="withdraw-amount" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">UPI ID</label>
                <Input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi" data-testid="withdraw-upi" />
              </div>
              <Button onClick={handleWithdraw} disabled={loading || !withdrawAmount} className="w-full" data-testid="withdraw-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Request Withdrawal
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No transactions yet</p>
                ) : transactions.map((txn, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2">
                      {txn.type === 'deposit' ? <ArrowDown className="w-4 h-4 text-success" /> : <ArrowUp className="w-4 h-4 text-destructive" />}
                      <div>
                        <p className="text-sm font-medium capitalize">{txn.type}</p>
                        <p className="text-xs text-muted-foreground">{new Date(txn.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono font-medium text-sm ${txn.type === 'deposit' ? 'text-success' : 'text-destructive'}`}>
                        {txn.type === 'deposit' ? '+' : '-'}{formatINR(txn.amount)}
                      </p>
                      <Badge variant="outline" className="text-[10px]">{txn.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
