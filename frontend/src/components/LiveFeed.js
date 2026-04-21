import { useState, useEffect } from 'react';
import API, { formatINR } from '../lib/api';
import { Trophy, Zap } from 'lucide-react';

export default function LiveFeed() {
  const [feed, setFeed] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    API.get('/live-feed').then(r => setFeed(r.data.feed || [])).catch(() => {});
    const interval = setInterval(() => {
      API.get('/live-feed?limit=10').then(r => setFeed(r.data.feed || [])).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (feed.length === 0) return;
    const timer = setInterval(() => setCurrentIdx(i => (i + 1) % feed.length), 3000);
    return () => clearInterval(timer);
  }, [feed.length]);

  if (feed.length === 0) return null;
  const item = feed[currentIdx];

  return (
    <div className="bg-primary/5 border-b border-primary/10 overflow-hidden" data-testid="live-feed">
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center gap-2 text-xs">
        <Zap className="w-3 h-3 text-primary shrink-0" />
        <div className="flex items-center gap-1.5 animate-fly-up" key={currentIdx}>
          <Trophy className="w-3 h-3 text-primary" />
          <span className="font-medium">{item.player}</span>
          <span className="text-muted-foreground">won</span>
          <span className="font-mono font-bold text-primary">{formatINR(item.amount)}</span>
          <span className="text-muted-foreground">in</span>
          <span className="capitalize font-medium">{item.game}</span>
        </div>
      </div>
    </div>
  );
}
