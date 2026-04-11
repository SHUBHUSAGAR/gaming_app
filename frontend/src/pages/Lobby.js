import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import API from '../lib/api';
import GameCard from '../components/GameCard';
import { Trophy, TrendingUp, Gift } from 'lucide-react';
import { motion } from 'framer-motion';

const HERO_BG = "https://static.prod-images.emergentagent.com/jobs/84c54715-40c5-4abb-91e0-a509c17d56ac/images/ff90c15655af03cfb2216479a383c76a8d3a57523141096dff1f22e7a22b9156.png";

export default function Lobby() {
  const { user } = useAuth();
  const [games, setGames] = useState([]);

  useEffect(() => {
    API.get('/games/list').then(r => setGames(r.data.games)).catch(() => {});
  }, []);

  return (
    <div className="max-w-7xl mx-auto" data-testid="lobby-page">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-none sm:rounded-2xl mx-0 sm:mx-4 sm:mt-4"
      >
        <div className="absolute inset-0">
          <img src={HERO_BG} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        </div>
        <div className="relative px-6 py-10 sm:py-14 sm:px-10">
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
            Welcome back, <span className="text-primary">{user?.name}</span>
          </h1>
          <p className="text-white/70 mt-2 text-sm sm:text-base max-w-md">
            Play 5 exciting games and win big. Your luck awaits!
          </p>
          <div className="flex gap-4 mt-6">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-white text-sm font-medium">Rank: {user?.rank || 'Normal'}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
              <TrendingUp className="w-4 h-4 text-game-green" />
              <span className="text-white text-sm font-medium capitalize">VIP: {user?.vip_tier || 'Bronze'}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
              <Gift className="w-4 h-4 text-game-violet" />
              <span className="text-white text-sm font-medium">Streak: {user?.login_streak || 0} days</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Games Grid */}
      <div className="px-4 py-6">
        <h2 className="font-heading text-xl sm:text-2xl font-semibold mb-4" data-testid="games-heading">
          Popular Games
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {games.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
            >
              <GameCard game={game} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
