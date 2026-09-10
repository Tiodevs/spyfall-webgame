import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  HelpCircle,
  Timer,
  Users,
  Trophy,
  ThumbsUp,
  ThumbsDown,
  SkipForward,
  Target,
  Crown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { prefersReducedMotion } from '../../../lib/motion';

function formatTime(seconds) {
  if (seconds === null) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const QuemSouEuPlay = ({
  socket,
  currentRoom,
  playerId,
  users,
  scores,
  isHost,
  gameState,
  onEndGame,
  onLeave
}) => {
  const rootRef = useRef(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [status, setStatus] = useState('');
  const [guessOpen, setGuessOpen] = useState(false);
  const timerRef = useRef(null);

  const players = gameState?.players || [];
  const me = players.find(p => p.playerId === playerId);
  const current = players.find(p => p.playerId === gameState?.currentTurnId);
  const isMyTurn = gameState?.currentTurnId === playerId && !me?.guessed;
  const myGuessed = Boolean(me?.guessed);
  const canAnswer = !isMyTurn && !current?.guessed && current && current.playerId !== playerId;

  const takenIds = useMemo(() => {
    const ids = new Set();
    players.forEach(player => {
      if (player.identity && player.playerId !== playerId) {
        ids.add(player.identity.id);
      }
    });
    return ids;
  }, [players, playerId]);

  useEffect(() => {
    if (!gameState?.startedAt || !gameState?.duration) {
      setTimeRemaining(null);
      return undefined;
    }

    const updateTimer = () => {
      const elapsed = Date.now() - gameState.startedAt;
      const remaining = Math.max(0, Math.ceil((gameState.duration - elapsed) / 1000));
      setTimeRemaining(remaining);
      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.startedAt, gameState?.duration]);

  useLayoutEffect(() => {
    if (!rootRef.current || prefersReducedMotion()) return undefined;

    const ctx = gsap.context(() => {
      gsap.from('[data-qse="hero"]', {
        y: 18,
        opacity: 0,
        duration: 0.45,
        ease: 'power3.out'
      });
      gsap.from('[data-qse="card"]', {
        y: 22,
        opacity: 0,
        duration: 0.4,
        stagger: 0.06,
        delay: 0.1,
        ease: 'power2.out'
      });
      if (isMyTurn) {
        gsap.fromTo(
          '[data-qse="hero"]',
          { boxShadow: '0 0 0 0 rgba(170,204,0,0)' },
          {
            boxShadow: '0 0 28px -6px rgba(170,204,0,0.45)',
            duration: 1.1,
            yoyo: true,
            repeat: 3,
            ease: 'sine.inOut'
          }
        );
      }
    }, rootRef);

    return () => ctx.revert();
  }, [gameState?.currentTurnId, isMyTurn]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleAnswered = (data) => {
      setStatus(data.message);
      setTimeout(() => setStatus(''), 4000);
    };

    const handleGuess = (data) => {
      setStatus(data.message);
      if (data.correct && data.playerId === playerId) {
        setGuessOpen(false);
      }
      setTimeout(() => setStatus(''), 5000);
    };

    socket.on('quem-answered', handleAnswered);
    socket.on('quem-guess-result', handleGuess);

    return () => {
      socket.off('quem-answered', handleAnswered);
      socket.off('quem-guess-result', handleGuess);
    };
  }, [socket, playerId]);

  const emit = (event, payload) => {
    if (socket && currentRoom) {
      socket.emit(event, { roomCode: currentRoom, ...payload });
    }
  };

  const timerColor = timeRemaining !== null && timeRemaining <= 60
    ? 'text-red-400'
    : timeRemaining !== null && timeRemaining <= 120
      ? 'text-yellow-400'
      : 'text-accent';

  const turnName = current?.name || 'Alguém';

  return (
    <div ref={rootRef} className="w-full">
      <Card>
        <CardHeader className="border-b border-white/10 p-4 text-center sm:p-6">
          <div className="mb-4 flex items-center justify-center gap-3">
            <Badge variant="secondary" className="px-3 py-1 text-xs sm:text-sm">
              Quem sou eu?
            </Badge>
            {gameState?.duration ? (
              <div className={`flex items-center gap-1.5 rounded-sm border border-white/10 bg-white/5 px-3 py-1 ${timerColor}`}>
                <Timer className="h-4 w-4" />
                <span className="font-mono text-sm font-bold sm:text-base">{formatTime(timeRemaining)}</span>
              </div>
            ) : (
              <Badge variant="outline" className="text-xs">Sem limite</Badge>
            )}
          </div>

          <div data-qse="hero" className="space-y-3 rounded-sm border border-white/10 bg-white/[0.03] p-4 sm:p-6">
            {myGuessed ? (
              <>
                <p className="text-xs uppercase tracking-wider text-muted">Você era</p>
                <div className="text-4xl">{me?.identity?.icon}</div>
                <CardTitle className="text-2xl text-accent sm:text-3xl">{me?.identity?.name}</CardTitle>
                <p className="text-sm text-muted">Continue respondendo as perguntas dos outros.</p>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-sm bg-accent/15 sm:h-20 sm:w-20">
                  <HelpCircle className="h-8 w-8 text-accent sm:h-10 sm:w-10" />
                </div>
                <CardTitle className="text-2xl sm:text-3xl">Quem sou eu?</CardTitle>
                <p className="text-sm text-muted sm:text-base">
                  {isMyTurn
                    ? 'Sua vez. Pergunte sim ou não em voz alta — ou chute se já souber.'
                    : `Vez de ${turnName}. Você vê a identidade e responde.`}
                </p>
              </>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-4 sm:space-y-6 sm:p-6">
          {status && (
            <div className="rounded-sm border border-accent/30 bg-accent/10 p-3 text-center text-sm font-medium text-accent">
              {status}
            </div>
          )}

          {canAnswer && current?.identity && (
            <div data-qse="card" className="space-y-3 rounded-sm border border-sky-400/20 bg-sky-400/10 p-4">
              <p className="text-center text-xs uppercase tracking-wider text-sky-200">Respondam sobre</p>
              <p className="text-center font-display text-xl font-bold text-foreground">
                <span className="mr-2 text-2xl">{current.identity.icon}</span>
                {current.identity.name}
              </p>
              <p className="text-center text-sm text-muted">
                {turnName} perguntou em voz alta. Qual é a resposta?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button className="py-5" onClick={() => emit('quem-answer', { yes: true })}>
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  Sim
                </Button>
                <Button variant="destructive" className="py-5" onClick={() => emit('quem-answer', { yes: false })}>
                  <ThumbsDown className="mr-2 h-4 w-4" />
                  Não
                </Button>
              </div>
            </div>
          )}

          {isMyTurn && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1 py-5" onClick={() => setGuessOpen(true)}>
                <Target className="mr-2 h-4 w-4" />
                Adivinhar
              </Button>
              <Button variant="outline" className="flex-1 py-5" onClick={() => emit('quem-pass')}>
                <SkipForward className="mr-2 h-4 w-4" />
                Passar a vez
              </Button>
            </div>
          )}

          {guessOpen && isMyTurn && (
            <div className="space-y-3 rounded-sm border border-white/10 bg-white/[0.03] p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">Quem você acha que é?</h3>
                <Button size="sm" variant="ghost" onClick={() => setGuessOpen(false)}>Fechar</Button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(gameState.candidates || []).map((identity) => {
                  const taken = takenIds.has(identity.id);
                  return (
                    <button
                      key={identity.id}
                      type="button"
                      disabled={taken}
                      onClick={() => {
                        if (window.confirm(`Chutar "${identity.name}"? Se errar, a vez passa.`)) {
                          emit('quem-guess', { identityId: identity.id });
                        }
                      }}
                      className={`rounded-sm border p-2 text-left text-sm transition-all ${
                        taken
                          ? 'cursor-not-allowed border-white/5 bg-white/[0.02] opacity-40'
                          : 'border-white/10 bg-white/5 hover:border-accent/40 hover:bg-accent/10 active:scale-95'
                      }`}
                    >
                      <span className="mr-1 text-base">{identity.icon}</span>
                      {identity.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                Jogadores
              </h3>
              <Badge variant="secondary">{players.length}</Badge>
            </div>
            <div className="space-y-2">
              {players.map((player) => {
                const isMe = player.playerId === playerId;
                const showIdentity = player.identity && (!isMe || player.guessed);
                return (
                  <div
                    key={player.playerId}
                    data-qse="card"
                    className={`flex items-center justify-between gap-3 rounded-sm border p-3 sm:p-4 ${
                      player.isTurn
                        ? 'border-accent/40 bg-accent/10'
                        : isMe
                          ? 'border-white/15 bg-white/5'
                          : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{player.name}</span>
                        {isMe && <span className="text-xs text-accent">(Você)</span>}
                        {player.isTurn && !player.guessed && (
                          <Badge className="bg-accent/20 text-accent">Na vez</Badge>
                        )}
                        {player.guessed && (
                          <Badge variant="secondary">
                            #{player.guessOrder} descobriu
                          </Badge>
                        )}
                        {player.connected === false && (
                          <Badge variant="outline" className="text-xs text-muted">Desconectado</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {showIdentity
                          ? `${player.identity.icon} ${player.identity.name}`
                          : isMe
                            ? 'Identidade oculta'
                            : '…'}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      <Trophy className="mr-1 h-3 w-3" />
                      {scores[player.playerId] || scores[users.find(u => u.id === player.playerId)?.id] || 0}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {isHost && (
            <Button variant="destructive" onClick={onEndGame} className="w-full py-5 text-sm sm:py-6 sm:text-base">
              <Crown className="mr-2 h-4 w-4" />
              Encerrar e revelar identidades
            </Button>
          )}

          {onLeave && (
            <Button variant="outline" onClick={onLeave} className="w-full py-5 text-sm sm:py-6 sm:text-base">
              Sair da sala
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
