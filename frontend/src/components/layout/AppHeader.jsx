import { Wifi, WifiOff, BookOpen } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Logo } from '../brand/Logo';

export const AppHeader = ({ isConnected, onOpenGuide, onGoHome, showGuide = true }) => (
  <header className="relative z-10 flex items-center justify-between py-4 sm:py-6">
    <button
      type="button"
      onClick={onGoHome}
      className="flex items-center gap-3 rounded-sm text-left transition-opacity hover:opacity-90"
    >
      <Logo className="h-9 w-9" />
      <span className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">
        Roda
      </span>
    </button>

    <div className="flex items-center gap-2 sm:gap-3">
      {showGuide && onOpenGuide && (
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
