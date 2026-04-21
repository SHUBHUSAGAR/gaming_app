# Cooe Game Platform - PRD

## Architecture
- Frontend: React 19 + Tailwind + Shadcn + Framer Motion
- Backend: FastAPI + MongoDB (Motor async) + WebSocket
- Payments: Stripe (emergentintegrations)
- Auth: JWT (bcrypt + PyJWT) httpOnly cookies

## Implemented (April 21, 2026)

### Player App
- JWT auth (register/login/logout/refresh), brute force protection
- 5 Games: Win Go (WebSocket 60s rounds), Aviator (WebSocket crash), AB Fun (Andar Bahar), Lucky Hit, Soccer Go
- Live Bets Panel on all game pages (simulated multiplayer)
- Wallet (Stripe deposit 5 packages, withdraw, transaction history)
- Profile (stats, referral code, VIP tier)
- Dark/Light theme toggle
- Responsive (mobile bottom nav, desktop top nav)

### Admin Dashboard (Creative Sidebar Layout)
- Overview: Gradient stat cards, game performance table
- Users: Search, view detail + bet history, adjust balance, ban/unban, VIP/KYC status
- Payments: Pending withdrawal approve/reject queue, all transactions
- Game Controls: House edge, min/max bet, maintenance toggle per game
- Promotions: Promo code CRUD (deposit%, flat bonus)
- Announcements: Marquee/popup/notification CRUD with active toggle
- KYC Review: Approve/reject player verification
- Reports: Financial metrics, game-by-game breakdown
- Settings: Platform info, danger zone

## Backlog
- P1: Daily login bonus rewards, password reset, push notifications
- P2: Referral tracking dashboard, leaderboard UI, player search in games
- P3: PWA setup, Android WebView APK, sound effects
