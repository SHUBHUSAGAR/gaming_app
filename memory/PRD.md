# Cooe Game Platform - PRD

## Architecture
- Frontend: React 19 + Tailwind + Shadcn + Framer Motion
- Backend: FastAPI + MongoDB (Motor async) + WebSocket
- Payments: Stripe (emergentintegrations)
- Auth: JWT (bcrypt + PyJWT) httpOnly cookies

## Implemented Features (April 21, 2026)

### Player App
- JWT auth with brute force protection
- 5 Games: Win Go (4 timer modes: 30s/1min/3min/5min), Aviator (auto-bet), AB Fun, Lucky Hit, Soccer Go
- Live Bets Panel on all game pages (multiplayer simulation)
- Wallet: Stripe deposit (5 packages), withdraw, transaction history
- Dark/Light theme toggle, responsive design

### New Features (Phase 2)
- Win Go multi-timer modes (30s, 60s, 3min, 5min) with separate WebSocket channels
- Aviator auto-bet with stop-win/stop-loss/auto-cashout
- Global Leaderboard (daily/weekly/all-time + per-game filters)
- Daily Login Bonus with 7-day streak calendar
- Spin-the-Wheel daily bonus mini-game
- VIP tier system (Bronze/Silver/Gold/Diamond) with progress bar and perks
- Achievement badges (8 badges: First Deposit, First Win, 10x Winner, etc.)
- Live Feed ticker showing recent big wins across games
- Terms & Conditions acceptance modal
- Onboarding 5-step tutorial overlay
- Bet limits self-control (daily/weekly caps)
- Enhanced Profile: VIP progress, achievements, game stats, referral, bet limits

### Admin Dashboard (Sidebar Layout)
- Overview: Gradient stat cards, game performance table
- Live Monitor: Real-time active users, today bets, deposits, revenue (auto-refresh 5s)
- Users: Search, detail view, adjust balance, ban/unban, VIP/KYC status
- Payments: Pending withdrawal approve/reject queue, all transactions
- Game Controls: House edge, min/max bet, maintenance toggle per game
- Promotions: Promo code CRUD
- Announcements: Marquee/popup/notification management
- KYC Review: Approve/reject verification
- Reports: Financial metrics, game-by-game breakdown
- Settings: Platform info, danger zone

## Backlog
- P1: Email verification, password reset, push notifications
- P2: Avatar upload, sound effects, session management
- P3: PWA, Android WebView APK, multi-language
