import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ArrowLeft, Eye, HelpCircle } from 'lucide-react';
import { getGameById } from '@shared/catalog';
import { CreateRoom } from '../CreateRoom';
import { RoomsList } from '../RoomsList';
import { Button } from '../ui/button';
import { prefersReducedMotion } from '../../lib/motion';

const ICONS = {
  eye: Eye,
  help: HelpCircle
};

export const GameLobby = ({ gameType, socket, playerId, onRoomJoined, onBack }) => {
  const rootRef = useRef(null);
  const game = getGameById(gameType);
  const Icon = ICONS[game?.icon] || HelpCircle;

  useLayoutEffect(() => {
    if (!rootRef.current || prefersReducedMotion()) return undefined;

    const ctx = gsap.context(() => {
      gsap.from('[data-lobby="hero"]', {
        y: 16,
        opacity: 0,
        duration: 0.45,
        ease: 'power3.out'
      });
      gsap.from('[data-lobby="panel"]', {
        y: 24,
        opacity: 0,
        duration: 0.5,
        delay: 0.08,
        stagger: 0.08,
        ease: 'power3.out'
      });
    }, rootRef);

    return () => ctx.revert();
  }, [gameType]);

  if (!game) return null;

  return (
    <section ref={rootRef} className="space-y-6 pt-2 sm:space-y-8 sm:pt-4">
      <div data-lobby="hero" className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Todos os jogos
        </Button>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-accent/30 bg-accent/10">
            <Icon className="h-5 w-5 text-accent" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-bold uppercase leading-[0.95] tracking-tight sm:text-4xl">
              {game.name}
            </h1>
            <p className="mt-2 max-w-md text-sm text-muted sm:text-base">{game.description}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6" data-lobby="panel">
        <CreateRoom
          socket={socket}
          playerId={playerId}
          gameType={gameType}
          gameName={game.name}
          onRoomJoined={onRoomJoined}
        />
        <RoomsList
          socket={socket}
          playerId={playerId}
          gameType={gameType}
          gameName={game.name}
          onRoomJoined={onRoomJoined}
        />
      </div>
    </section>
  );
};
