import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { formatINR } from '../lib/api';
import { Sun, Moon, Wallet, LogOut, Shield, User, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  if (!user || user === false) return null;

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="nav-logo">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-heading font-bold text-sm">C</span>
          </div>
          <span className="font-heading font-bold text-lg hidden sm:block">Cooe</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link to="/wallet" data-testid="nav-balance">
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5 hover:border-primary/50 transition-colors">
              <Wallet className="w-3.5 h-3.5 text-primary" />
              <span className="balance-display text-sm font-semibold">{formatINR(user.balance)}</span>
            </div>
          </Link>

          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8" data-testid="theme-toggle">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1" data-testid="user-menu-trigger">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => navigate('/profile')} data-testid="menu-profile">
                <User className="w-4 h-4 mr-2" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/wallet')} data-testid="menu-wallet">
                <Wallet className="w-4 h-4 mr-2" /> Wallet
              </DropdownMenuItem>
              {user.role === 'admin' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/admin')} data-testid="menu-admin">
                    <Shield className="w-4 h-4 mr-2" /> Admin Panel
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} data-testid="menu-logout">
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
