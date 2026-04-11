import { useState, useEffect, useCallback } from 'react';
import API, { formatINR } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Users, DollarSign, Gamepad2, TrendingUp, Search, Ban, Plus, Minus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [dash, setDash] = useState(null);
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [gameStats, setGameStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [balanceModal, setBalanceModal] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      const { data } = await API.get('/admin/dashboard');
      setDash(data);
    } catch {}
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await API.get(`/admin/users?search=${search}`);
      setUsers(data.users || []);
      setTotalUsers(data.total);
    } catch {}
  }, [search]);

  const loadTransactions = useCallback(async () => {
    try {
      const { data } = await API.get('/admin/transactions');
      setTransactions(data.transactions || []);
    } catch {}
  }, []);

  const loadGameStats = useCallback(async () => {
    try {
      const { data } = await API.get('/admin/game-stats');
      setGameStats(data.game_stats || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadDashboard();
    loadUsers();
    loadTransactions();
    loadGameStats();
  }, [loadDashboard, loadUsers, loadTransactions, loadGameStats]);

  const handleBan = async (userId) => {
    try {
      const { data } = await API.post(`/admin/users/${userId}/ban`);
      toast.success(data.message);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    }
  };

  const handleAdjustBalance = async () => {
    if (!balanceModal || !adjustAmount) return;
    setLoading(true);
    try {
      await API.post(`/admin/users/${balanceModal}/balance`, { amount: Number(adjustAmount), reason: adjustReason });
      toast.success('Balance adjusted');
      setBalanceModal(null);
      setAdjustAmount('');
      setAdjustReason('');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4" data-testid="admin-page">
      <h1 className="font-heading text-2xl font-bold">Admin Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: dash?.total_users || 0, icon: Users, color: 'text-primary' },
          { label: 'Revenue', value: formatINR(dash?.total_revenue || 0), icon: DollarSign, color: 'text-success' },
          { label: 'Total Bets', value: dash?.total_bets || 0, icon: Gamepad2, color: 'text-game-violet' },
          { label: 'Pending Withdrawals', value: dash?.pending_withdrawals || 0, icon: TrendingUp, color: 'text-game-gold' },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="font-mono text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" data-testid="admin-tab-users">Users</TabsTrigger>
          <TabsTrigger value="transactions" data-testid="admin-tab-txns">Transactions</TabsTrigger>
          <TabsTrigger value="games" data-testid="admin-tab-games">Game Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
                data-testid="admin-search-users"
              />
            </div>
            <Button variant="outline" onClick={loadUsers} data-testid="admin-search-btn">Search</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="font-mono">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u._id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell className="font-mono">{formatINR(u.balance)}</TableCell>
                      <TableCell>
                        {u.is_banned ? <Badge variant="destructive">Banned</Badge> : <Badge variant="outline">Active</Badge>}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => setBalanceModal(u._id)} data-testid={`admin-adjust-${u._id}`}>
                          <DollarSign className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleBan(u._id)} data-testid={`admin-ban-${u._id}`}>
                          <Ban className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-3 text-sm text-muted-foreground">Total: {totalUsers} users</div>
            </CardContent>
          </Card>

          {/* Balance Adjustment Modal */}
          {balanceModal && (
            <Card className="animate-fly-up border-primary/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Adjust Balance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                <Input type="number" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} placeholder="Amount (negative to deduct)" data-testid="admin-adjust-amount" />
                <Input value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Reason" data-testid="admin-adjust-reason" />
                <div className="flex gap-2">
                  <Button onClick={handleAdjustBalance} disabled={loading} className="flex-1" data-testid="admin-adjust-submit">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Apply
                  </Button>
                  <Button variant="outline" onClick={() => setBalanceModal(null)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead className="font-mono">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No transactions</TableCell></TableRow>
                  ) : transactions.map((txn, i) => (
                    <TableRow key={i}>
                      <TableCell className="capitalize">{txn.type}</TableCell>
                      <TableCell className="font-mono">{formatINR(txn.amount)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{txn.status}</Badge></TableCell>
                      <TableCell className="text-sm">{new Date(txn.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="games">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Game</TableHead>
                    <TableHead className="font-mono">Total Bets</TableHead>
                    <TableHead className="font-mono">Wagered</TableHead>
                    <TableHead className="font-mono">Won by Players</TableHead>
                    <TableHead className="font-mono">Platform Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gameStats.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No game data</TableCell></TableRow>
                  ) : gameStats.map((g, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium capitalize">{g._id}</TableCell>
                      <TableCell className="font-mono">{g.total_bets}</TableCell>
                      <TableCell className="font-mono">{formatINR(g.total_wagered)}</TableCell>
                      <TableCell className="font-mono">{formatINR(g.total_won)}</TableCell>
                      <TableCell className="font-mono text-success">{formatINR(g.total_wagered - g.total_won)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
