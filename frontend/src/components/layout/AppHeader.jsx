import { Eye, Wifi, WifiOff, BookOpen } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

export const AppHeader = ({ isConnected, onOpenGuide }) => (
  <header className="relative z-10 flex items-center justify-between py-4 sm:py-6">
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-white/10 bg-white/5">
        <Eye className="h-4 w-4 text-accent" strokeWidth={2.5} />
      </div>
      <span className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">
        Spyfall
      </span>
    </div>

    <div className="flex items-center gap-2 sm:gap-3">
      {onOpenGuide && (
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenGuide}
          className="gap-1.5 border-accent/30 text-foreground hover:bg-accent/10"
        >
          <BookOpen className="h-3.5 w-3.5 text-accent" />
          Guia
        </Button>
      )}
      <Badge
        variant="outline"
        className={`gap-1.5 border-white/10 bg-white/5 px-3 py-1 font-medium ${
          isConnected ? 'text-accent' : 'text-muted'
        }`}
      >
        {isConnected ? (
          <>
            <Wifi className="h-3 w-3" />
            <span className="sr-only sm:not-sr-only sm:inline">Online</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            <span className="sr-only sm:not-sr-only sm:inline">Offline</span>
          </>
        )}
      </Badge>
    </div>
  </header>
);
