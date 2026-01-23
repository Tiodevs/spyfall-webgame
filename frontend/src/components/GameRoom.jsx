import { useState, useEffect, useRef } from 'react';
import { useRoom } from '../contexts/RoomContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Users, LogOut, Crown, Play, Eye, EyeOff, MapPin, X, Timer, Target, AlertTriangle, Vote, Trophy, ThumbsUp, ThumbsDown } from 'lucide-react';

// Lista de todos os locais possíveis
const ALL_LOCATIONS = [
  { id: 1, name: 'Aeroporto', icon: '✈️' },
  { id: 2, name: 'Banco', icon: '🏦' },
  { id: 3, name: 'Praia', icon: '🏖️' },
  { id: 4, name: 'Cassino', icon: '🎰' },
  { id: 5, name: 'Circo', icon: '🎪' },
  { id: 6, name: 'Hospital', icon: '🏥' },
  { id: 7, name: 'Hotel', icon: '🏨' },
  { id: 8, name: 'Escola', icon: '🏫' },
  { id: 9, name: 'Restaurante', icon: '🍽️' },
  { id: 10, name: 'Supermercado', icon: '🛒' },
  { id: 11, name: 'Teatro', icon: '🎭' },
  { id: 12, name: 'Museu', icon: '🏛️' },
  { id: 13, name: 'Estádio de Futebol', icon: '⚽' },
  { id: 14, name: 'Delegacia', icon: '🚔' },
  { id: 15, name: 'Navio Cruzeiro', icon: '🚢' },
  { id: 16, name: 'Spa', icon: '💆' },
  { id: 17, name: 'Estação Espacial', icon: '🚀' },
  { id: 18, name: 'Submarino', icon: '🛥️' },
  { id: 19, name: 'Base Militar', icon: '🎖️' },
  { id: 20, name: 'Igreja', icon: '⛪' },
  { id: 21, name: 'Universidade', icon: '🎓' },
  { id: 22, name: 'Fazenda', icon: '🌾' },
  { id: 23, name: 'Estúdio de TV', icon: '📺' },
  { id: 24, name: 'Parque de Diversões', icon: '🎡' },
];

export const GameRoom = ({ socket }) => {
  const { currentRoom, userName, users, leaveRoom, updateUsers } = useRoom();
  const [status, setStatus] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [gameState, setGameState] = useState(null); // { isSpy, location, playersCount, startedAt, duration }
  const [crossedLocations, setCrossedLocations] = useState(new Set()); // IDs dos locais riscados
  const [timeRemaining, setTimeRemaining] = useState(null); // Tempo restante em segundos
  const [scores, setScores] = useState({}); // Placar: { odId: pontos }
  const [accusation, setAccusation] = useState(null); // Acusação em andamento
  const [finalVoting, setFinalVoting] = useState(null); // Votação final
  const [myVote, setMyVote] = useState(null); // Meu voto na votação final
  const timerIntervalRef = useRef(null);

  // Timer effect - calcula tempo restante localmente baseado no timestamp do servidor
  useEffect(() => {
    if (gameState?.startedAt && gameState?.duration) {
      const updateTimer = () => {
        const elapsed = Date.now() - gameState.startedAt;
        const remaining = Math.max(0, Math.ceil((gameState.duration - elapsed) / 1000));
        setTimeRemaining(remaining);
        
        if (remaining <= 0) {
          clearInterval(timerIntervalRef.current);
        }
      };
      
      // Atualiza imediatamente e depois a cada segundo
      updateTimer();
      timerIntervalRef.current = setInterval(updateTimer, 1000);
      
      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    } else {
      setTimeRemaining(null);
    }
  }, [gameState?.startedAt, gameState?.duration]);

  // Formata o tempo restante como MM:SS
  const formatTime = (seconds) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleCrossLocation = (locationId) => {
    setCrossedLocations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locationId)) {
        newSet.delete(locationId);
      } else {
        newSet.add(locationId);
      }
      return newSet;
    });
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.disconnect();
      socket.connect();
    }
    leaveRoom();
  };

  const handleStartGame = () => {
    if (socket && currentRoom) {
      socket.emit('start-game', { roomCode: currentRoom });
    }
  };

  const handleEndGame = () => {
    if (socket && currentRoom) {
      socket.emit('end-game', { roomCode: currentRoom });
    }
  };

  // Chute do espião
  const handleSpyGuess = (locationId) => {
    if (socket && currentRoom) {
      socket.emit('spy-guess', { roomCode: currentRoom, locationId });
    }
  };

  // Iniciar acusação
  const handleStartAccusation = (accusedId) => {
    if (socket && currentRoom) {
      socket.emit('start-accusation', { roomCode: currentRoom, accusedId });
    }
  };

  // Votar na acusação
  const handleVoteAccusation = (vote) => {
    if (socket && currentRoom) {
      socket.emit('vote-accusation', { roomCode: currentRoom, vote });
    }
  };

  // Cancelar acusação
  const handleCancelAccusation = () => {
    if (socket && currentRoom) {
      socket.emit('cancel-accusation', { roomCode: currentRoom });
    }
  };

  // Voto final
  const handleFinalVote = (votedForId) => {
    if (socket && currentRoom) {
      socket.emit('final-vote', { roomCode: currentRoom, votedForId });
      setMyVote(votedForId);
    }
  };

  useEffect(() => {
    if (!socket || !currentRoom) return;

    const handleJoinedRoom = (data) => {
      updateUsers(data.users);
      setIsHost(data.hostId === socket.id);
      if (data.scores) setScores(data.scores);
    };

    const handleUserJoined = (data) => {
      setStatus(`Novo usuário entrou na sala!`);
      updateUsers(data.users);
      setIsHost(data.hostId === socket.id);
      if (data.scores) setScores(data.scores);
      setTimeout(() => setStatus(''), 3000);
    };

    const handleUserLeft = (data) => {
      setStatus(`Um usuário saiu da sala`);
      updateUsers(data.users);
      setIsHost(data.hostId === socket.id);
      if (data.scores) setScores(data.scores);
      setTimeout(() => setStatus(''), 3000);
    };

    const handleGameStarted = (data) => {
      setCrossedLocations(new Set()); // Limpa os locais riscados ao iniciar nova partida
      setAccusation(null);
      setFinalVoting(null);
      setMyVote(null);
      if (data.scores) setScores(data.scores);
      setGameState({
        isSpy: data.isSpy,
        location: data.location,
        playersCount: data.playersCount,
        startedAt: data.startedAt,
        duration: data.duration
      });
    };

    const handleGameEnded = (data) => {
      // Limpa o timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      setTimeRemaining(null);
      setGameState(null);
      setAccusation(null);
      setFinalVoting(null);
      setMyVote(null);
      setCrossedLocations(new Set()); // Limpa os locais riscados ao terminar
      if (data.scores) setScores(data.scores);
      
      // Monta mensagem de resultado
      let reasonText = '';
      if (data.reason === 'spy-guess') {
        if (data.spyGuessCorrect) {
          reasonText = `O espião (${data.spyName}) adivinhou o local corretamente! +2 pontos para o espião.`;
        } else {
          reasonText = `O espião (${data.spyName}) errou o chute (tentou ${data.spyGuessedLocation?.name}). +1 ponto para todos os agentes.`;
        }
      } else if (data.reason === 'accusation') {
        if (data.accusedWasSpy) {
          reasonText = `Acusação correta! ${data.accuserName} identificou o espião (${data.spyName}). +1 para agentes, +2 extra para ${data.accuserName}.`;
        } else {
          reasonText = `Acusação errada! ${data.accusedName} era inocente. +2 pontos para o espião.`;
        }
      } else if (data.reason === 'final-vote') {
        reasonText = `Votação final encerrada! O espião era ${data.spyName}. +1 ponto para quem votou corretamente.`;
      } else {
        reasonText = `Partida encerrada! O espião era ${data.spyName}. Local: ${data.location?.name}`;
      }
      
      setStatus(reasonText);
      setTimeout(() => setStatus(''), 10000);
    };

    // Handlers de acusação
    const handleAccusationStarted = (data) => {
      setAccusation({
        accuserId: data.accuserId,
        accuserName: data.accuserName,
        accusedId: data.accusedId,
        accusedName: data.accusedName,
        votes: data.votes
      });
    };

    const handleAccusationVoteUpdate = (data) => {
      setAccusation(prev => prev ? {
        ...prev,
        votesCount: data.votesCount,
        votesNeeded: data.votesNeeded
      } : null);
    };

    const handleAccusationFailed = (data) => {
      setAccusation(null);
      setStatus(data.message);
      setTimeout(() => setStatus(''), 5000);
    };

    const handleAccusationCancelled = (data) => {
      setAccusation(null);
      setStatus(data.message);
      setTimeout(() => setStatus(''), 3000);
    };

    // Handler de votação final
    const handleVotingStarted = (data) => {
      setFinalVoting({
        isActive: true,
        votesCount: 0,
        totalPlayers: users.length
      });
      setStatus(data.message);
    };

    const handleFinalVoteUpdate = (data) => {
      setFinalVoting(prev => prev ? {
        ...prev,
        votesCount: data.votesCount,
        totalPlayers: data.totalPlayers
      } : null);
    };

    const handleError = (data) => {
      setStatus(data.message);
      setTimeout(() => setStatus(''), 5000);
    };

    socket.on('joined-room', handleJoinedRoom);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('game-started', handleGameStarted);
    socket.on('game-ended', handleGameEnded);
    socket.on('accusation-started', handleAccusationStarted);
    socket.on('accusation-vote-update', handleAccusationVoteUpdate);
    socket.on('accusation-failed', handleAccusationFailed);
    socket.on('accusation-cancelled', handleAccusationCancelled);
    socket.on('voting-started', handleVotingStarted);
    socket.on('final-vote-update', handleFinalVoteUpdate);
    socket.on('error', handleError);

    return () => {
      socket.off('joined-room', handleJoinedRoom);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('game-started', handleGameStarted);
      socket.off('game-ended', handleGameEnded);
      socket.off('accusation-started', handleAccusationStarted);
      socket.off('accusation-vote-update', handleAccusationVoteUpdate);
      socket.off('accusation-failed', handleAccusationFailed);
      socket.off('accusation-cancelled', handleAccusationCancelled);
      socket.off('voting-started', handleVotingStarted);
      socket.off('final-vote-update', handleFinalVoteUpdate);
      socket.off('error', handleError);
    };
  }, [socket, currentRoom, updateUsers, users.length]);

  if (!currentRoom) return null;

  // Tela de jogo em andamento
  if (gameState) {
    // Determina a cor do timer baseado no tempo restante
    const timerColor = timeRemaining !== null && timeRemaining <= 60 
      ? 'text-red-400' 
      : timeRemaining !== null && timeRemaining <= 120 
        ? 'text-yellow-400' 
        : 'text-[#01DEB2]';
    
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
        <Card>
          <CardHeader className="text-center border-b border-zinc-800 p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {/* Timer e Badge */}
              <div className="flex items-center justify-center gap-3">
                <Badge variant="secondary" className="text-xs sm:text-sm px-3 sm:px-4 py-1">
                  Partida em Andamento
                </Badge>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 ${timerColor}`}>
                  <Timer className="w-4 h-4" />
                  <span className="font-mono font-bold text-sm sm:text-base">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              </div>
              
              {gameState.isSpy ? (
                <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
                    <EyeOff className="w-8 h-8 sm:w-10 sm:h-10 text-red-400" />
                  </div>
                  <CardTitle className="text-2xl sm:text-4xl font-bold text-red-400">
                    Você é o Espião!
                  </CardTitle>
                  <p className="text-sm sm:text-base text-zinc-400 max-w-md mx-auto px-2">
                    Descubra o local fazendo perguntas aos outros jogadores. 
                    Não deixe que descubram que você é o espião!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-[#01DEB2]/20 rounded-full flex items-center justify-center">
                    <Eye className="w-8 h-8 sm:w-10 sm:h-10 text-[#01DEB2]" />
                  </div>
                  <CardTitle className="text-2xl sm:text-4xl font-bold text-[#01DEB2]">
                    Você é Cidadão
                  </CardTitle>
                  <div className="bg-zinc-800/50 rounded-lg p-4 sm:p-6 border border-zinc-700 max-w-sm mx-auto">
                    <p className="text-xs sm:text-sm text-zinc-400 uppercase tracking-wider mb-2">O Local é:</p>
                    <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                      <span className="text-3xl sm:text-4xl">{gameState.location?.icon}</span>
                      <span className="text-xl sm:text-2xl font-bold text-zinc-100 break-words text-center">{gameState.location?.name}</span>
                    </div>
                  </div>
                  <p className="text-sm sm:text-base text-zinc-400 max-w-md mx-auto px-2">
                    Responda às perguntas sem revelar o local. 
                    Tente descobrir quem é o espião!
                  </p>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  Jogadores
                </h3>
                <Badge variant="secondary" className="text-xs sm:text-sm">
                  {gameState.playersCount} jogadores
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {users.map((user) => (
                  <div 
                    key={user.id} 
                    className={`p-2 sm:p-3 rounded-lg border text-center ${
                      user.id === socket?.id 
                        ? 'bg-[#01DEB2]/10 border-[#01DEB2]/30' 
                        : 'bg-zinc-800/50 border-zinc-700'
                    }`}
                  >
                    <span className="font-medium text-sm sm:text-base text-zinc-100 break-words">
                      {user.name}
                      {user.id === socket?.id && (
                        <span className="text-[#01DEB2] text-xs sm:text-sm ml-1">(Você)</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* Lista de Locais Possíveis */}
              <div className="border-t border-zinc-800 pt-4 sm:pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                    Locais Possíveis
                  </h3>
                  <span className="text-xs sm:text-sm text-zinc-400">
                    Toque para riscar
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {ALL_LOCATIONS.map((location) => {
                    const isCrossed = crossedLocations.has(location.id);
                    return (
                      <button
                        key={location.id}
                        onClick={() => toggleCrossLocation(location.id)}
                        className={`p-2 sm:p-3 rounded-lg border text-left transition-all ${
                          isCrossed
                            ? 'bg-zinc-800/30 border-zinc-700/50 opacity-50'
                            : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-700/50 active:scale-95'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg sm:text-xl">{location.icon}</span>
                          <span className={`text-xs sm:text-sm font-medium text-zinc-100 ${
                            isCrossed ? 'line-through text-zinc-500' : ''
                          }`}>
                            {location.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {crossedLocations.size > 0 && (
                  <button
                    onClick={() => setCrossedLocations(new Set())}
                    className="mt-3 text-xs sm:text-sm text-zinc-400 hover:text-zinc-200 flex items-center gap-1 mx-auto"
                  >
                    <X className="w-3 h-3" />
                    Limpar todos ({crossedLocations.size} riscados)
                  </button>
                )}
              </div>

              {isHost && (
                <Button 
                  variant="destructive" 
                  onClick={handleEndGame}
                  className="w-full text-sm sm:text-base py-5 sm:py-6"
                >
                  Encerrar Partida e Revelar Espião
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela do lobby (aguardando início)
  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
      <Card>
        <CardHeader className="text-center border-b border-zinc-800 p-4 sm:p-6">
          <div className="space-y-2">
            <p className="text-xs sm:text-sm text-zinc-400 uppercase tracking-wider">Código da Sala</p>
            <CardTitle className="text-3xl sm:text-5xl font-bold text-[#01DEB2] tracking-widest">
              {currentRoom}
            </CardTitle>
            <p className="text-sm sm:text-base text-zinc-400">
              Bem-vindo, <strong className="text-zinc-100">{userName}</strong>!
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            {status && (
              <div className={`p-3 sm:p-4 rounded-lg text-center text-sm sm:text-base font-medium ${
                status.includes('encerrada') 
                  ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                  : status.includes('necessários')
                  ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                  : 'bg-[#01DEB2]/10 border border-[#01DEB2]/30 text-[#01DEB2] animate-pulse'
              }`}>
                {status}
              </div>
            )}

            <div className="flex items-center justify-between">
              <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                Jogadores na Sala
              </h3>
              <Badge variant="secondary" className="text-sm sm:text-base px-2 sm:px-3 py-1">
                {users.length} jogador{users.length !== 1 ? 'es' : ''}
              </Badge>
            </div>
            
            <div className="space-y-2">
              {users.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 sm:py-8 italic text-sm sm:text-base">
                  Aguardando jogadores...
                </p>
              ) : (
                users.map((user) => (
                  <div 
                    key={user.id} 
                    className={`p-3 sm:p-4 rounded-lg border transition-colors ${
                      user.id === socket?.id 
                        ? 'bg-[#01DEB2]/10 border-[#01DEB2]/30' 
                        : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-base sm:text-lg text-zinc-100 flex items-center gap-1 sm:gap-2 flex-wrap break-words min-w-0">
                        <span className="break-all">{user.name}</span>
                        {user.id === socket?.id && (
                          <span className="text-[#01DEB2] font-semibold text-sm">(Você)</span>
                        )}
                      </span>
                      {user.isHost && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 shrink-0 text-xs sm:text-sm">
                          <Crown className="w-3 h-3 mr-1" />
                          Host
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {users.length < 3 && (
              <div className="p-3 sm:p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 text-center">
                <p className="text-sm sm:text-base text-zinc-400">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Aguardando mais jogadores... (mínimo 3)
                </p>
              </div>
            )}

            {isHost && users.length >= 3 && (
              <Button 
                onClick={handleStartGame}
                className="w-full text-base sm:text-lg py-5 sm:py-6"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Começar Partida
              </Button>
            )}

            <Button 
              variant="destructive" 
              onClick={handleLeaveRoom}
              className="w-full text-sm sm:text-base py-5 sm:py-6"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Sair da Sala
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
