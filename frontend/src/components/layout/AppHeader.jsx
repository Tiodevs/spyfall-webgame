import { Eye, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '../ui/badge';

export const AppHeader = ({ isConnected }) => (
  <header className="relative z-10 flex items-center justify-between py-4 sm:py-6">
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
        <Eye className="h-4 w-4 text-accent" strokeWidth={2.5} />
      </div>
      <span className="font-display text-lg font-bold tracking-tight text-white sm:text-xl">
        Spyfall
      </span>
    </div>

    <Badge
      variant="outline"
      className={`gap-1.5 border-white/10 bg-white/5 px-3 py-1 font-medium ${
        isConnected ? 'text-accent' : 'text-muted-foreground'
      }`}
    >
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
          Online
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          Offline
        </>
      )}
    </Badge>
  </header>
);
