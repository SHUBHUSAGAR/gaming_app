# Cooe Game Platform - PRD

## Original Problem Statement
Build a comprehensive real-money gaming web application called "Cooe Game" - a multi-game casino platform targeting the Indian market with 5 games, admin panel, wallet system, and more.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + Framer Motion
- **Backend**: FastAPI (Python) + MongoDB (Motor async driver)
- **Payments**: Stripe via emergentintegrations library
- **Auth**: JWT (bcrypt + PyJWT) with httpOnly cookies
- **Real-time**: Native WebSocket (FastAPI built-in)
- **Theme**: Dark/Light mode with CSS variables + class toggle

## User Personas
1. **Player**: Registers, deposits funds, plays games, withdraws winnings
2. **Admin**: Manages users, monitors game stats, approves withdrawals, adjusts balances

## Core Requirements
- 5 games: Win Go, Aviator, AB Fun, Lucky Hit, Soccer Go
- JWT email/password authentication
- Stripe-powered deposit system (INR)
- WebSocket real-time for Win Go and Aviator
- Admin dashboard with user/game/transaction management
- Dark & Light theme toggle
- Referral system with bonus

## What's Been Implemented (April 11, 2026)

### Backend
- Full JWT auth (register, login, logout, refresh, me, brute force protection)
- Admin seeding on startup
- Wallet system (balance, transactions, withdraw)
- Stripe Checkout integration (5 deposit packages: 100-5000 INR)
- Win Go game (60s rounds, WebSocket, color/number betting, auto result processing)
- Aviator game (crash game, WebSocket, real-time multiplier, cash out)
- AB Fun (Andar Bahar instant play)
- Lucky Hit (Card comparison instant play)
- Soccer Go (Dice soccer instant play)
- Admin endpoints (dashboard, users, transactions, game stats, ban/unban, balance adjust)
- Leaderboard and Profile endpoints
- Background game loops (asyncio tasks)

### Frontend
- Login/Register pages with form validation
- Game Lobby with hero banner and game grid
- Win Go page (WebSocket timer, color/number betting, results strip, bet history)
- Aviator page (WebSocket multiplier, bet/cashout, crash history)
- AB Fun page (Andar/Bahar/Tie betting, card display)
- Lucky Hit page (Side A/B/Tie, card comparison display)
- Soccer Go page (Team A/B/Draw, dice display)
- Wallet page (Stripe deposit, withdraw, transaction history)
- Profile page (stats, referral code, VIP tier)
- Admin Dashboard (stats cards, users table, transactions, game stats)
- Dark/Light theme toggle with localStorage persistence
- Responsive design (mobile bottom nav, desktop top nav)

## Prioritized Backlog
### P0 (Critical)
- [x] All 5 games functional
- [x] Auth system
- [x] Wallet + Stripe
- [x] Admin panel

### P1 (High)
- [ ] KYC verification for withdrawals
- [ ] Push notifications (FCM)
- [ ] Daily login bonus rewards
- [ ] VIP tier auto-upgrade based on deposits
- [ ] Password reset via email

### P2 (Medium)
- [ ] Game result history with charts/analytics
- [ ] Referral tracking dashboard
- [ ] Announcement/marquee system
- [ ] Player leaderboard UI page
- [ ] Game-specific settings in admin

### P3 (Nice to have)
- [ ] Progressive Web App (PWA) setup
- [ ] Android WebView APK build
- [ ] Multi-language support
- [ ] Sound effects for games
- [ ] Promotional banner system

## Next Tasks
1. Add KYC verification flow
2. Implement daily login bonus rewards
3. Build leaderboard UI page
4. Add push notifications
5. Implement password reset via email
