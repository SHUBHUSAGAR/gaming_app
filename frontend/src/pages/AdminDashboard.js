import { useState, useEffect, useCallback } from 'react';
import API, { formatINR } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  LayoutDashboard, Users, CreditCard, Gamepad2, Gift, Megaphone,
  ShieldCheck, BarChart3, Settings, Search, ChevronRight,
  ArrowUpRight, ArrowDownRight, Ban, DollarSign, CheckCircle,
  XCircle, Trash2, Plus, Loader2, Eye, RefreshCw, AlertTriangle,
  Clock, TrendingUp, Wallet, Activity, PanelLeftClose, PanelLeft,
  Home
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'games', label: 'Game Controls', icon: Gamepad2 },
  { id: 'promos', label: 'Promotions', icon: Gift },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'kyc', label: 'KYC Review', icon: ShieldCheck },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminDashboard() {
  const [section, setSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden" data-testid="admin-page">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-14'} shrink-0 bg-card border-r border-border/50 flex flex-col transition-all duration-300 overflow-hidden`}>
        <div className="p-3 flex items-center justify-between border-b border-border/30">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-heading font-bold text-xs">A</span>
              </div>
              <span className="font-heading font-bold text-sm">Admin</span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-muted rounded-md transition-colors" data-testid="sidebar-toggle">
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>
        </div>
        <nav className="flex-1 py-2 space-y-0.5 px-2 overflow-y-auto scrollbar-hide">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
                section === item.id
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              data-testid={`admin-nav-${item.id}`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
              {sidebarOpen && section === item.id && <ChevronRight className="w-3 h-3 ml-auto" />}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-border/30">
          <Link to="/" className="flex items-center gap-2 px-2.5 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors">
            <Home className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>Back to App</span>}
          </Link>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-5 lg:p-8 max-w-[1400px]">
          {section === 'overview' && <OverviewSection />}
          {section === 'users' && <UsersSection />}
          {section === 'payments' && <PaymentsSection />}
          {section === 'games' && <GamesSection />}
          {section === 'promos' && <PromosSection />}
          {section === 'announcements' && <AnnouncementsSection />}
          {section === 'kyc' && <KYCSection />}
          {section === 'reports' && <ReportsSection />}
          {section === 'settings' && <SettingsSection />}
        </div>
      </main>
    </div>
  );
}

/* ============ OVERVIEW ============ */
function OverviewSection() {
  const [data, setData] = useState(null);
  useEffect(() => { API.get('/admin/reports/overview').then(r => setData(r.data)).catch(() => {}); }, []);
  if (!data) return <LoadingSkeleton />;
  const stats = [
    { label: 'Total Users', value: data.total_users, icon: Users, trend: `${data.active_today} active today`, color: 'from-blue-600/20 to-blue-600/5', iconColor: 'text-blue-400' },
    { label: 'Platform Revenue', value: formatINR(data.platform_revenue), icon: TrendingUp, trend: `${formatINR(data.total_wagered)} wagered`, color: 'from-emerald-600/20 to-emerald-600/5', iconColor: 'text-emerald-400' },
    { label: 'Total Deposits', value: formatINR(data.total_deposits), icon: ArrowDownRight, trend: `${formatINR(data.total_withdrawals)} withdrawn`, color: 'from-amber-600/20 to-amber-600/5', iconColor: 'text-amber-400' },
    { label: 'Pending Payouts', value: data.pending_withdrawals, icon: Clock, trend: 'Needs approval', color: 'from-rose-600/20 to-rose-600/5', iconColor: 'text-rose-400' },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform overview and key metrics</p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">{new Date().toLocaleDateString()}</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => (
          <div key={i} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${s.color} border border-border/30 p-5`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className="font-mono text-3xl font-bold mt-2 tracking-tight">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Activity className="w-3 h-3" />{s.trend}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-background/50 flex items-center justify-center ${s.iconColor}`}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Game Breakdown */}
      <div className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/30">
          <h3 className="font-heading font-semibold text-sm">Game Performance</h3>
        </div>
        <div className="divide-y divide-border/20">
          {(data.game_breakdown || []).map((g, i) => {
            const rev = g.wagered - g.won;
            const margin = g.wagered > 0 ? ((rev / g.wagered) * 100).toFixed(1) : 0;
            return (
              <div key={i} className="px-5 py-3.5 flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Gamepad2 className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm capitalize">{g._id}</p>
                  <p className="text-xs text-muted-foreground">{g.bets} bets</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold">{formatINR(g.wagered)}</p>
                  <p className="text-xs text-muted-foreground">wagered</p>
                </div>
                <div className="text-right w-20">
                  <p className="font-mono text-sm font-semibold text-emerald-400">+{formatINR(rev)}</p>
                  <p className="text-xs text-muted-foreground">{margin}% margin</p>
                </div>
              </div>
            );
          })}
          {(!data.game_breakdown || data.game_breakdown.length === 0) && (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">No game data yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ USERS ============ */
function UsersSection() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustAmt, setAdjustAmt] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try { const { data } = await API.get(`/admin/users?search=${search}&limit=50`); setUsers(data.users); setTotal(data.total); } catch {}
  }, [search]);
  useEffect(() => { load(); }, [load]);

  const ban = async (id) => { try { const { data } = await API.post(`/admin/users/${id}/ban`); toast.success(data.message); load(); } catch (e) { toast.error('Failed'); } };
  const adjust = async () => {
    if (!adjustModal || !adjustAmt) return;
    setLoading(true);
    try { await API.post(`/admin/users/${adjustModal}/balance`, { amount: Number(adjustAmt), reason: adjustReason }); toast.success('Balance adjusted'); setAdjustModal(null); setAdjustAmt(''); setAdjustReason(''); load(); } catch { toast.error('Failed'); } finally { setLoading(false); }
  };
  const viewDetail = async (id) => { try { const { data } = await API.get(`/admin/users/${id}`); setSelectedUser(data); } catch {} };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} registered players</p>
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-9" data-testid="admin-search-users" />
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5 mr-1" />Refresh</Button>
      </div>
      <div className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs uppercase tracking-wider">Player</TableHead>
              <TableHead className="text-xs uppercase tracking-wider">Email</TableHead>
              <TableHead className="text-xs uppercase tracking-wider font-mono text-right">Balance</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-center">VIP</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-center">KYC</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-center">Status</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(u => (
              <TableRow key={u._id} className="group">
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                <TableCell className="font-mono text-right font-semibold">{formatINR(u.balance)}</TableCell>
                <TableCell className="text-center"><Badge variant="outline" className="text-[10px] capitalize">{u.vip_tier || 'bronze'}</Badge></TableCell>
                <TableCell className="text-center">{u.kyc_verified ? <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" /> : <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />}</TableCell>
                <TableCell className="text-center">{u.is_banned ? <Badge variant="destructive" className="text-[10px]">Banned</Badge> : <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge>}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => viewDetail(u._id)} data-testid={`admin-view-${u._id}`}><Eye className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setAdjustModal(u._id)} data-testid={`admin-adjust-${u._id}`}><DollarSign className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => ban(u._id)} data-testid={`admin-ban-${u._id}`}><Ban className="w-3.5 h-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Adjust Balance Modal */}
      <Dialog open={!!adjustModal} onOpenChange={() => setAdjustModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust Balance</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Input type="number" value={adjustAmt} onChange={e => setAdjustAmt(e.target.value)} placeholder="Amount (negative to deduct)" data-testid="admin-adjust-amount" />
            <Input value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Reason (optional)" data-testid="admin-adjust-reason" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustModal(null)}>Cancel</Button>
            <Button onClick={adjust} disabled={loading} data-testid="admin-adjust-submit">{loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Player Details: {selectedUser?.user?.name}</DialogTitle></DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { l: 'Balance', v: formatINR(selectedUser.user.balance) },
                  { l: 'Total Wagered', v: formatINR(selectedUser.user.total_wagered || 0) },
                  { l: 'Total Won', v: formatINR(selectedUser.user.total_won || 0) },
                  { l: 'Deposited', v: formatINR(selectedUser.user.total_deposited || 0) },
                ].map((s, i) => (
                  <div key={i} className="bg-muted/30 rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">{s.l}</p>
                    <p className="font-mono font-bold mt-1">{s.v}</p>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Recent Bets ({selectedUser.bets?.length || 0})</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {(selectedUser.bets || []).slice(0, 15).map((b, i) => (
                    <div key={i} className="flex justify-between text-xs px-2 py-1.5 bg-muted/20 rounded-lg">
                      <span className="capitalize">{b.game}</span>
                      <span className="font-mono">{formatINR(b.amount)}</span>
                      <Badge variant={b.status === 'won' ? 'default' : 'secondary'} className="text-[10px]">{b.status}</Badge>
                      <span className="font-mono text-emerald-400">{b.winnings > 0 ? `+${formatINR(b.winnings)}` : '-'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============ PAYMENTS ============ */
function PaymentsSection() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState('pending');
  const load = useCallback(async () => {
    const [w, t] = await Promise.all([API.get('/admin/pending-withdrawals').catch(() => ({ data: { withdrawals: [] } })), API.get('/admin/transactions?limit=50').catch(() => ({ data: { transactions: [] } }))]);
    setWithdrawals(w.data.withdrawals || []);
    setTransactions(t.data.transactions || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const approveWd = async (id) => { try { await API.post(`/admin/withdrawals/${id}/approve`); toast.success('Approved'); load(); } catch { toast.error('Failed'); } };
  const rejectWd = async (id) => { try { await API.post(`/admin/withdrawals/${id}/reject`); toast.success('Rejected & refunded'); load(); } catch { toast.error('Failed'); } };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Payment Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage deposits and withdrawal requests</p>
      </div>
      <div className="flex gap-2 mb-4">
        {['pending', 'all'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground'}`}>
            {t === 'pending' ? `Pending (${withdrawals.length})` : 'All Transactions'}
          </button>
        ))}
      </div>
      {tab === 'pending' && (
        <div className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden">
          {withdrawals.length === 0 ? (
            <div className="p-12 text-center"><CheckCircle className="w-10 h-10 mx-auto text-emerald-400 mb-3" /><p className="text-sm text-muted-foreground">No pending withdrawals</p></div>
          ) : (
            <div className="divide-y divide-border/20">
              {withdrawals.map((w, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><Wallet className="w-5 h-5 text-amber-400" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">User: {w.user_id?.slice(0, 8)}...</p>
                    <p className="text-xs text-muted-foreground">{w.method?.toUpperCase()} {w.upi_id && `- ${w.upi_id}`} | {new Date(w.created_at).toLocaleString()}</p>
                  </div>
                  <p className="font-mono text-lg font-bold">{formatINR(w.amount)}</p>
                  <div className="flex gap-1.5">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8" onClick={() => approveWd(w.id)} data-testid={`approve-wd-${i}`}><CheckCircle className="w-3.5 h-3.5 mr-1" />Approve</Button>
                    <Button size="sm" variant="destructive" className="h-8" onClick={() => rejectWd(w.id)} data-testid={`reject-wd-${i}`}><XCircle className="w-3.5 h-3.5 mr-1" />Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {tab === 'all' && (
        <div className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden">
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent">
              <TableHead className="text-xs uppercase">Type</TableHead>
              <TableHead className="text-xs uppercase font-mono text-right">Amount</TableHead>
              <TableHead className="text-xs uppercase text-center">Status</TableHead>
              <TableHead className="text-xs uppercase text-right">Date</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No transactions</TableCell></TableRow>
              ) : transactions.map((t, i) => (
                <TableRow key={i}>
                  <TableCell><div className="flex items-center gap-2">{t.type === 'deposit' ? <ArrowDownRight className="w-4 h-4 text-emerald-400" /> : t.type === 'withdrawal' ? <ArrowUpRight className="w-4 h-4 text-rose-400" /> : <DollarSign className="w-4 h-4 text-amber-400" />}<span className="capitalize text-sm">{t.type?.replace('_', ' ')}</span></div></TableCell>
                  <TableCell className="font-mono text-right font-medium">{formatINR(t.amount)}</TableCell>
                  <TableCell className="text-center"><Badge variant="outline" className="text-[10px]">{t.status}</Badge></TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/* ============ GAMES ============ */
function GamesSection() {
  const [settings, setSettings] = useState({});
  const [gameStats, setGameStats] = useState([]);
  const [saving, setSaving] = useState('');
  const load = useCallback(async () => {
    const [s, g] = await Promise.all([API.get('/admin/game-settings').catch(() => ({ data: { settings: {} } })), API.get('/admin/game-stats').catch(() => ({ data: { game_stats: [] } }))]);
    setSettings(s.data.settings || {});
    setGameStats(g.data.game_stats || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const updateSetting = async (gameId, field, value) => {
    setSaving(gameId);
    try { await API.post('/admin/game-settings', { game_id: gameId, [field]: value }); toast.success(`${gameId} ${field} updated`); load(); } catch { toast.error('Failed'); } finally { setSaving(''); }
  };

  const GAME_NAMES = { wingo: 'Win Go', aviator: 'Aviator', abfun: 'AB Fun', luckyhit: 'Lucky Hit', soccergo: 'Soccer Go' };
  const GAME_COLORS = { wingo: 'from-red-600/15', aviator: 'from-sky-600/15', abfun: 'from-violet-600/15', luckyhit: 'from-amber-600/15', soccergo: 'from-emerald-600/15' };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight">Game Controls</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Configure game parameters and house edge</p>
      </div>
      <div className="space-y-4">
        {Object.entries(settings).map(([gameId, cfg]) => {
          const stats = gameStats.find(g => g._id === gameId);
          return (
            <div key={gameId} className={`rounded-2xl border border-border/30 bg-gradient-to-r ${GAME_COLORS[gameId] || ''} to-transparent overflow-hidden`}>
              <div className="px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="w-40">
                  <p className="font-heading font-bold">{GAME_NAMES[gameId] || gameId}</p>
                  <p className="text-xs text-muted-foreground">{stats?.total_bets || 0} total bets</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20">House Edge</span>
                  <Input type="number" step="0.1" value={cfg.house_edge} onChange={e => setSettings(s => ({ ...s, [gameId]: { ...cfg, house_edge: Number(e.target.value) } }))} className="w-20 h-8 font-mono text-sm" />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16">Min Bet</span>
                  <Input type="number" value={cfg.min_bet} onChange={e => setSettings(s => ({ ...s, [gameId]: { ...cfg, min_bet: Number(e.target.value) } }))} className="w-24 h-8 font-mono text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16">Max Bet</span>
                  <Input type="number" value={cfg.max_bet} onChange={e => setSettings(s => ({ ...s, [gameId]: { ...cfg, max_bet: Number(e.target.value) } }))} className="w-24 h-8 font-mono text-sm" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Maintenance</span>
                    <Switch checked={cfg.maintenance} onCheckedChange={v => updateSetting(gameId, 'maintenance', v)} />
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-8 ml-auto" onClick={() => updateSetting(gameId, 'house_edge', cfg.house_edge)} disabled={saving === gameId}>
                  {saving === gameId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============ PROMOTIONS ============ */
function PromosSection() {
  const [codes, setCodes] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code: '', bonus_type: 'deposit_percent', bonus_value: 10, min_deposit: 100, max_uses: 100 });
  const load = useCallback(async () => { try { const { data } = await API.get('/admin/promo-codes'); setCodes(data.promo_codes || []); } catch {} }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.code) return;
    try { await API.post('/admin/promo-codes', form); toast.success('Promo code created'); setShowAdd(false); setForm({ code: '', bonus_type: 'deposit_percent', bonus_value: 10, min_deposit: 100, max_uses: 100 }); load(); } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };
  const remove = async (id) => { try { await API.delete(`/admin/promo-codes/${id}`); toast.success('Deleted'); load(); } catch { toast.error('Failed'); } };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="font-heading text-2xl font-bold tracking-tight">Promotions</h1><p className="text-sm text-muted-foreground mt-0.5">Manage promo codes and bonuses</p></div>
        <Button size="sm" onClick={() => setShowAdd(true)} data-testid="add-promo"><Plus className="w-3.5 h-3.5 mr-1" />New Code</Button>
      </div>
      {showAdd && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 mb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="CODE" className="uppercase font-mono" />
            <Select value={form.bonus_type} onValueChange={v => setForm(f => ({ ...f, bonus_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="deposit_percent">% on Deposit</SelectItem><SelectItem value="flat_bonus">Flat Bonus</SelectItem></SelectContent>
            </Select>
            <Input type="number" value={form.bonus_value} onChange={e => setForm(f => ({ ...f, bonus_value: Number(e.target.value) }))} placeholder="Value" />
            <Input type="number" value={form.min_deposit} onChange={e => setForm(f => ({ ...f, min_deposit: Number(e.target.value) }))} placeholder="Min Deposit" />
            <Input type="number" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: Number(e.target.value) }))} placeholder="Max Uses" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={create} data-testid="save-promo">Create</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}
      <div className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden">
        {codes.length === 0 ? (
          <div className="p-12 text-center"><Gift className="w-10 h-10 mx-auto text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">No promo codes yet</p></div>
        ) : (
          <div className="divide-y divide-border/20">
            {codes.map((c, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-4">
                <Badge className="font-mono text-sm px-3 py-1 bg-primary/10 text-primary border-primary/20">{c.code}</Badge>
                <div className="flex-1"><p className="text-sm">{c.bonus_type === 'deposit_percent' ? `${c.bonus_value}% on deposit` : `Flat ${formatINR(c.bonus_value)}`}</p><p className="text-xs text-muted-foreground">Min: {formatINR(c.min_deposit)} | Used: {c.used_count}/{c.max_uses}</p></div>
                <Badge variant={c.active ? 'outline' : 'secondary'} className="text-[10px]">{c.active ? 'Active' : 'Inactive'}</Badge>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ ANNOUNCEMENTS ============ */
function AnnouncementsSection() {
  const [anns, setAnns] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'marquee' });
  const load = useCallback(async () => { try { const { data } = await API.get('/admin/announcements'); setAnns(data.announcements || []); } catch {} }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.title || !form.message) return;
    try { await API.post('/admin/announcements', form); toast.success('Announcement created'); setShowAdd(false); setForm({ title: '', message: '', type: 'marquee' }); load(); } catch { toast.error('Failed'); }
  };
  const toggle = async (id) => { try { await API.put(`/admin/announcements/${id}/toggle`); load(); } catch {} };
  const remove = async (id) => { try { await API.delete(`/admin/announcements/${id}`); toast.success('Deleted'); load(); } catch {} };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="font-heading text-2xl font-bold tracking-tight">Announcements</h1><p className="text-sm text-muted-foreground mt-0.5">Scrolling marquees and notifications</p></div>
        <Button size="sm" onClick={() => setShowAdd(true)} data-testid="add-announcement"><Plus className="w-3.5 h-3.5 mr-1" />New</Button>
      </div>
      {showAdd && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 mb-4 space-y-3">
          <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" />
          <Input value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Message content" />
          <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="marquee">Marquee</SelectItem><SelectItem value="popup">Pop-up</SelectItem><SelectItem value="notification">Push Notification</SelectItem></SelectContent>
          </Select>
          <div className="flex gap-2"><Button size="sm" onClick={create}>Publish</Button><Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button></div>
        </div>
      )}
      <div className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden">
        {anns.length === 0 ? (
          <div className="p-12 text-center"><Megaphone className="w-10 h-10 mx-auto text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">No announcements</p></div>
        ) : (
          <div className="divide-y divide-border/20">
            {anns.map((a, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-4">
                <div className={`w-2 h-8 rounded-full ${a.active ? 'bg-emerald-400' : 'bg-muted-foreground/30'}`} />
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{a.title}</p><p className="text-xs text-muted-foreground truncate">{a.message}</p></div>
                <Badge variant="outline" className="text-[10px] capitalize shrink-0">{a.type}</Badge>
                <Switch checked={a.active} onCheckedChange={() => toggle(a.id)} />
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive shrink-0" onClick={() => remove(a.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ KYC ============ */
function KYCSection() {
  const [requests, setRequests] = useState([]);
  const load = useCallback(async () => { try { const { data } = await API.get('/admin/kyc-requests'); setRequests(data.kyc_requests || []); } catch {} }, []);
  useEffect(() => { load(); }, [load]);

  const approveKyc = async (id) => { try { await API.post(`/admin/kyc/${id}/approve`); toast.success('KYC approved'); load(); } catch { toast.error('Failed'); } };
  const rejectKyc = async (id) => { try { await API.post(`/admin/kyc/${id}/reject`); toast.success('KYC rejected'); load(); } catch { toast.error('Failed'); } };

  return (
    <div>
      <div className="mb-6"><h1 className="font-heading text-2xl font-bold tracking-tight">KYC Review</h1><p className="text-sm text-muted-foreground mt-0.5">Verify player identity for withdrawals</p></div>
      <div className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden">
        {requests.length === 0 ? (
          <div className="p-12 text-center"><ShieldCheck className="w-10 h-10 mx-auto text-emerald-400 mb-3" /><p className="text-sm text-muted-foreground">No pending KYC requests</p></div>
        ) : (
          <div className="divide-y divide-border/20">
            {requests.map((u, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"><span className="font-heading font-bold text-sm">{u.name?.charAt(0)}</span></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email} | Deposited: {formatINR(u.total_deposited || 0)}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{u.kyc_verified ? 'Verified' : u.kyc_rejected ? 'Rejected' : 'Pending'}</Badge>
                <div className="flex gap-1.5">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8" onClick={() => approveKyc(u._id)}><CheckCircle className="w-3.5 h-3.5 mr-1" />Approve</Button>
                  <Button size="sm" variant="destructive" className="h-8" onClick={() => rejectKyc(u._id)}><XCircle className="w-3.5 h-3.5 mr-1" />Reject</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ REPORTS ============ */
function ReportsSection() {
  const [data, setData] = useState(null);
  const [gameStats, setGameStats] = useState([]);
  useEffect(() => {
    Promise.all([API.get('/admin/reports/overview'), API.get('/admin/game-stats')]).then(([r, g]) => { setData(r.data); setGameStats(g.data.game_stats || []); }).catch(() => {});
  }, []);
  if (!data) return <LoadingSkeleton />;

  const totalMargin = data.total_wagered > 0 ? ((data.platform_revenue / data.total_wagered) * 100).toFixed(1) : 0;

  return (
    <div>
      <div className="mb-6"><h1 className="font-heading text-2xl font-bold tracking-tight">Reports</h1><p className="text-sm text-muted-foreground mt-0.5">Financial and gameplay analytics</p></div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { l: 'Total Wagered', v: formatINR(data.total_wagered), sub: `${data.total_bets} bets placed` },
          { l: 'Won by Players', v: formatINR(data.total_won_by_players), sub: 'Total payouts' },
          { l: 'Net Revenue', v: formatINR(data.platform_revenue), sub: `${totalMargin}% house margin` },
          { l: 'Total Deposits', v: formatINR(data.total_deposits), sub: 'All time' },
          { l: 'Total Withdrawals', v: formatINR(data.total_withdrawals), sub: 'Processed' },
          { l: 'Net Cash Flow', v: formatINR(data.total_deposits - data.total_withdrawals), sub: 'Deposits - Withdrawals' },
        ].map((c, i) => (
          <div key={i} className="rounded-2xl border border-border/30 bg-card/50 p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{c.l}</p>
            <p className="font-mono text-2xl font-bold mt-1.5">{c.v}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Game Breakdown Table */}
      <div className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/30"><h3 className="font-heading font-semibold text-sm">Game-by-Game Breakdown</h3></div>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead className="text-xs uppercase">Game</TableHead>
            <TableHead className="text-xs uppercase font-mono text-right">Bets</TableHead>
            <TableHead className="text-xs uppercase font-mono text-right">Wagered</TableHead>
            <TableHead className="text-xs uppercase font-mono text-right">Payouts</TableHead>
            <TableHead className="text-xs uppercase font-mono text-right">Revenue</TableHead>
            <TableHead className="text-xs uppercase text-right">Margin</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {gameStats.map((g, i) => {
              const rev = g.total_wagered - g.total_won;
              const margin = g.total_wagered > 0 ? ((rev / g.total_wagered) * 100).toFixed(1) : 0;
              return (
                <TableRow key={i}>
                  <TableCell className="font-medium capitalize">{g._id}</TableCell>
                  <TableCell className="font-mono text-right">{g.total_bets}</TableCell>
                  <TableCell className="font-mono text-right">{formatINR(g.total_wagered)}</TableCell>
                  <TableCell className="font-mono text-right">{formatINR(g.total_won)}</TableCell>
                  <TableCell className="font-mono text-right text-emerald-400 font-semibold">+{formatINR(rev)}</TableCell>
                  <TableCell className="text-right"><Badge variant="outline" className="font-mono text-[10px]">{margin}%</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ============ SETTINGS ============ */
function SettingsSection() {
  return (
    <div>
      <div className="mb-6"><h1 className="font-heading text-2xl font-bold tracking-tight">Settings</h1><p className="text-sm text-muted-foreground mt-0.5">Platform configuration</p></div>
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/30 bg-card/50 p-5">
          <h3 className="font-heading font-semibold text-sm mb-3">Platform Info</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Platform</span><span className="font-medium">Cooe Gaming</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span className="font-mono">v1.0.0</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span>INR</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payment Gateway</span><span>Stripe</span></div>
          </div>
        </div>
        <div className="rounded-2xl border border-border/30 bg-card/50 p-5">
          <h3 className="font-heading font-semibold text-sm mb-3">Admin Account</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-mono">admin@example.com</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Role</span><Badge className="text-[10px]">Super Admin</Badge></div>
          </div>
        </div>
        <div className="rounded-2xl border border-border/30 bg-card/50 p-5">
          <h3 className="font-heading font-semibold text-sm mb-3">Deposit Packages</h3>
          <div className="flex flex-wrap gap-2">
            {[100, 500, 1000, 2000, 5000].map(a => <Badge key={a} variant="outline" className="font-mono px-3 py-1">{formatINR(a)}</Badge>)}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-heading font-semibold text-sm">Danger Zone</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-3">These actions are irreversible. Proceed with caution.</p>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" className="h-8" disabled>Reset All Bets</Button>
                <Button size="sm" variant="destructive" className="h-8" disabled>Purge Transactions</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ LOADING ============ */
function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-muted/50 rounded-lg" />
      <div className="h-4 w-64 bg-muted/30 rounded-lg" />
      <div className="grid grid-cols-4 gap-4 mt-6">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-muted/20 rounded-2xl" />)}
      </div>
      <div className="h-64 bg-muted/10 rounded-2xl mt-6" />
    </div>
  );
}
