import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { Eye, HelpCircle, Sparkles, Users, Clock } from 'lucide-react';
import { GAMES } from '@shared/catalog';
import { Logo } from '../brand/Logo';
import { prefersReducedMotion } from '../../lib/motion';

const ICONS = {
  eye: Eye,
  help: HelpCircle
};

export const GameHub = ({ onSelectGame }) => {
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    if (!rootRef.current || prefersReducedMotion()) return undefined;

    const ctx = gsap.context(() => {
      gsap.from('[data-hub="logo"]', {
        scale: 0.72,
        opacity: 0,
        duration: 0.7,
        ease: 'back.out(1.7)'
      });
      gsap.from('[data-hub="copy"]', {
        y: 18,
        opacity: 0,
        duration: 0.55,
        delay: 0.12,
        ease: 'power3.out'
      });
      gsap.from('[data-hub="card"]', {
        y: 36,
        opacity: 0,
        duration: 0.55,
        stagger: 0.12,
        delay: 0.22,
        ease: 'power3.out'
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const handleEnter = (event) => {
    if (prefersReducedMotion()) return;
    if (!window.matchMedia('(hover: hover)').matches) return;
    gsap.to(event.currentTarget, { y: -6, duration: 0.25, ease: 'power2.out' });
  };

  const handleLeave = (event) => {
    if (prefersReducedMotion()) return;
    gsap.to(event.currentTarget, { y: 0, scale: 1, duration: 0.25, ease: 'power2.out' });
  };

  const handlePress = (event) => {
    if (prefersReducedMotion()) return;
    gsap.to(event.currentTarget, { scale: 0.98, duration: 0.12, ease: 'power2.out' });
  };

  const handleRelease = (event) => {
    if (prefersReducedMotion()) return;
    gsap.to(event.currentTarget, { scale: 1, duration: 0.18, ease: 'power2.out' });
  };

  return (
    <section ref={rootRef} className="space-y-8 pt-2 sm:space-y-10 sm:pt-6">
      <div className="space-y-5">
        <div data-hub="logo" className="flex items-center gap-3">
          <Logo className="h-14 w-14 shadow-[0_0_32px_-8px_rgba(170,204,0,0.55)] sm:h-16 sm:w-16" />
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent">Hub de jogos</p>
            <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
              Roda
            </h1>
          </div>
        </div>

        <div data-hub="copy" className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-sm border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            Jogos de mesa em tempo real
          </div>
          <p className="max-w-lg text-base text-muted sm:text-lg">
            Escolha um jogo, abra uma sala e jogue no mesmo sofá — o celular vira a carta secreta.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {GAMES.map((game) => {
          const Icon = ICONS[game.icon] || HelpCircle;
          return (
            <button
              key={game.id}
              type="button"
              data-hub="card"
              aria-label={`Jogar ${game.name}`}
              onClick={() => onSelectGame(game.id)}
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
              onPointerDown={handlePress}
              onPointerUp={handleRelease}
              onPointerCancel={handleRelease}
              className="glass-card group min-h-[11.5rem] w-full p-5 text-left transition-colors hover:border-accent/30 sm:p-6"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-sm border border-accent/30 bg-accent/10">
                  <Icon className="h-5 w-5 text-accent" />
                </span>
                <span className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {game.minPlayers}+
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {game.duration}
                  </span>
                </span>
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">{game.name}</h2>
              <p className="mt-1 text-sm font-medium text-accent">{game.tagline}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">{game.description}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
};
