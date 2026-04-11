import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Gamepad2, Wallet, User } from 'lucide-react';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/games/wingo', icon: Gamepad2, label: 'Games' },
  { path: '/wallet', icon: Wallet, label: 'Wallet' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user || user === false) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card/95 backdrop-blur-xl border-t border-border" data-testid="bottom-nav">
      <div className="flex items-center justify-around h-14">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              data-testid={`bottomnav-${label.toLowerCase()}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
