import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';

export default function GameCard({ game }) {
  return (
    <Link
      to={`/games/${game.id}`}
      className="group block rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-lg"
      data-testid={`game-card-${game.id}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={game.thumbnail}
          alt={game.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2">
          <h3 className="font-heading font-bold text-white text-sm">{game.name}</h3>
          <p className="text-white/70 text-xs truncate">{game.description}</p>
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
          <Users className="w-3 h-3 text-game-green" />
          <span className="text-white text-[10px] font-mono font-semibold">{game.players}</span>
        </div>
      </div>
    </Link>
  );
}
