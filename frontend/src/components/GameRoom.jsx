import { useState, useEffect, useRef } from 'react';
import { useRoom } from '../contexts/RoomContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Users, LogOut, Crown, Play, Eye, EyeOff, MapPin, X, Timer, Target, AlertTriangle, Vote, Trophy, ThumbsUp, ThumbsDown, UserCircle } from 'lucide-react';
import { getLocationsByPack, DEFAULT_ROOM_SETTINGS } from '@shared/gameData';
import { DEFAULT_ROOM_SETTINGS as QUEM_DEFAULTS } from '@shared/quemSouEu';
import { GAME_TYPES, getGameById } from '@shared/catalog';
import { RoomSettings } from './RoomSettings';
import { QuemSouEuPlay } from './games/quem-sou-eu/QuemSouEuPlay';
import { QuemSouEuSettings } from './games/quem-sou-eu/QuemSouEuSettings';

export const GameRoom = ({ socket, playerId }) => {
  const { currentRoom, userName, users, leaveRoom, updateUsers, selectedGame } = useRoom();
  const [status, setStatus] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [gameType, setGameType] = useState(selectedGame || GAME_TYPES.SPYFALL);
  const [roomSettings, setRoomSettings] = useState(() => (
    selectedGame === GAME_TYPES.QUEM_SOU_EU
      ? { ...QUEM_DEFAULTS }
      : { ...DEFAULT_ROOM_SETTINGS }
  ));
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
    if (socket && currentRoom) {
      socket.emit('leave-room', { roomCode: currentRoom });
    }
    leaveRoom();
  };

  const applyRoomSync = (data) => {
    updateUsers(data.users);
    setIsHost(data.hostId === playerId);
    if (data.scores) setScores(data.scores);
    if (data.gameType) setGameType(data.gameType);

    if (data.settings) {
      setRoomSettings(data.settings);
    }

    if (data.game?.isPlaying) {
      if (data.gameType === GAME_TYPES.QUEM_SOU_EU || data.game.gameType === GAME_TYPES.QUEM_SOU_EU) {
        setGameState(data.game);
        setAccusation(null);
        setFinalVoting(null);
        setMyVote(null);
        return;
      }

      setGameState({
        isSpy: data.game.isSpy,
        spyCount: data.game.spyCount ?? 1,
        location: data.game.location,
        role: data.game.role,
        locationPack: data.game.locationPack,
        playersCount: data.game.playersCount,
        startedAt: data.game.startedAt,
        duration: data.game.duration
      });
      setAccusation(data.game.accusation);
      setFinalVoting(data.game.finalVoting);
      setMyVote(data.game.finalVoting?.myVote ?? null);
    } else {
      setGameState(null);
      setAccusation(null);
      setFinalVoting(null);
      setMyVote(null);
      setCrossedLocations(new Set());
    }
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

    const handleRoomSync = (data) => {
      if (data.game?.isPlaying) {
        setCrossedLocations(new Set());
      }
      applyRoomSync(data);
    };

    const handleUserJoined = (data) => {
      setStatus(`Novo usuário entrou na sala!`);
      updateUsers(data.users);
      setIsHost(data.hostId === playerId);
      if (data.scores) setScores(data.scores);
      setTimeout(() => setStatus(''), 3000);
    };

    const handleUserLeft = (data) => {
      setStatus(`Um usuário saiu da sala`);
      updateUsers(data.users);
      setIsHost(data.hostId === playerId);
      if (data.scores) setScores(data.scores);
      if (gameState && data.playersCount !== undefined) {
        setGameState(prev => prev ? { ...prev, playersCount: data.playersCount } : null);
      }
      setTimeout(() => setStatus(''), 3000);
    };

    const handlePlayerDisconnected = (data) => {
      updateUsers(data.users);
      setIsHost(data.hostId === playerId);
      if (data.scores) setScores(data.scores);
      if (gameState && data.playersCount !== undefined) {
        setGameState(prev => prev ? { ...prev, playersCount: data.playersCount } : null);
      }
    };

    const handlePlayerReconnected = (data) => {
      updateUsers(data.users);
      setIsHost(data.hostId === playerId);
      if (data.scores) setScores(data.scores);
      setStatus('Um jogador reconectou.');
      setTimeout(() => setStatus(''), 3000);
    };

    const handleGameEnded = (data) => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      setTimeRemaining(null);
      setGameState(null);
      setAccusation(null);
      setFinalVoting(null);
      setMyVote(null);
      setCrossedLocations(new Set());
      if (data.scores) setScores(data.scores);

      if (data.gameType === GAME_TYPES.QUEM_SOU_EU) {
        setStatus(data.message || 'Partida encerrada. Identidades reveladas.');
        setTimeout(() => setStatus(''), 10000);
        return;
      }

      const spyNames = data.spyNames?.length
        ? data.spyNames
        : data.spyName
          ? [data.spyName]
          : [];
      const spyLabel = spyNames.length > 1
        ? `Os espiões eram ${spyNames.join(' e ')}`
        : spyNames[0]
          ? `O espião era ${spyNames[0]}`
          : 'Partida encerrada';

      let reasonText = '';
      if (data.reason === 'spy-guess') {
        if (data.spyGuessCorrect) {
          reasonText = `${data.spyName} adivinhou o local! ${spyLabel}. +2 pontos para o espião.`;
        } else {
          reasonText = `${data.spyName} errou o chute (${data.spyGuessedLocation?.name}). ${spyLabel}. +1 para os agentes.`;
        }
      } else if (data.reason === 'accusation') {
        if (data.accusedWasSpy) {
          reasonText = `Acusação correta! ${data.accuserName} pegou ${data.accusedName}. ${spyLabel}.`;
        } else {
          reasonText = `Acusação errada! ${data.accusedName} era inocente. ${spyLabel}. +2 para o(s) espião(ões).`;
        }
      } else if (data.reason === 'final-vote') {
        reasonText = `Votação final! ${spyLabel}. Local: ${data.location?.name}. +1 para quem acertou.`;
      } else if (data.reason === 'spy-disconnected' || data.reason === 'spy-left') {
        reasonText = `${spyLabel}. Local: ${data.location?.name}`;
      } else {
        reasonText = `${spyLabel}. Local: ${data.location?.name}`;
      }

      setStatus(reasonText);
      setTimeout(() => setStatus(''), 10000);
    };

    const handleSpyCaught = (data) => {
      setAccusation(null);
      setStatus(data.message);
      setTimeout(() => setStatus(''), 6000);
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
        votesNeeded: data.votesNeeded,
        votes: data.votes ?? prev.votes
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
        totalPlayers: data.totalPlayers ?? users.filter(u => u.connected !== false).length
      });
      setMyVote(null);
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
      if (
        data.message?.includes('não está nesta sala') ||
        data.message?.includes('Sala não encontrada')
      ) {
        leaveRoom();
      }
      setTimeout(() => setStatus(''), 5000);
    };

    socket.on('room-sync', handleRoomSync);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('player-disconnected', handlePlayerDisconnected);
    socket.on('player-reconnected', handlePlayerReconnected);
    socket.on('game-ended', handleGameEnded);
    socket.on('accusation-started', handleAccusationStarted);
    socket.on('accusation-vote-update', handleAccusationVoteUpdate);
    socket.on('accusation-failed', handleAccusationFailed);
    socket.on('accusation-cancelled', handleAccusationCancelled);
    socket.on('voting-started', handleVotingStarted);
    socket.on('final-vote-update', handleFinalVoteUpdate);
    socket.on('spy-caught', handleSpyCaught);
    socket.on('error', handleError);

    return () => {
      socket.off('room-sync', handleRoomSync);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('player-disconnected', handlePlayerDisconnected);
      socket.off('player-reconnected', handlePlayerReconnected);
      socket.off('game-ended', handleGameEnded);
      socket.off('accusation-started', handleAccusationStarted);
      socket.off('accusation-vote-update', handleAccusationVoteUpdate);
      socket.off('accusation-failed', handleAccusationFailed);
      socket.off('accusation-cancelled', handleAccusationCancelled);
      socket.off('voting-started', handleVotingStarted);
      socket.off('final-vote-update', handleFinalVoteUpdate);
      socket.off('spy-caught', handleSpyCaught);
      socket.off('error', handleError);
    };
  }, [socket, currentRoom, updateUsers, playerId]);

  if (!currentRoom) return null;

  const minPlayers = getGameById(gameType)?.minPlayers ?? 3;
  const connectedCount = users.filter(u => u.connected !== false).length;

  if (gameState && gameType === GAME_TYPES.QUEM_SOU_EU) {
    return (
      <QuemSouEuPlay
        socket={socket}
        currentRoom={currentRoom}
        playerId={playerId}
        users={users}
        scores={scores}
        isHost={isHost}
        gameState={gameState}
        onEndGame={handleEndGame}
        onLeave={handleLeaveRoom}
      />
    );
  }

  // ========== TELA DE VOTAÇÃO FINAL ==========
  if (finalVoting?.isActive && gameState) {
    return (
      <div className="w-full">
        <Card>
          <CardHeader className="text-center border-b border-white/10 p-4 sm:p-6">
            <div className="space-y-3">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-yellow-500/20 rounded-sm flex items-center justify-center">
                <Vote className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-bold text-yellow-400">
                Votação Final!
              </CardTitle>
              <p className="text-sm sm:text-base text-muted">
                O tempo acabou! Vote em quem você acha que é o espião.
              </p>
              <Badge variant="secondary" className="text-xs sm:text-sm">
                {finalVoting.votesCount || 0} / {finalVoting.totalPlayers || users.length} votos
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              {myVote ? (
                <div className="text-center p-4 bg-accent/10 border border-accent/30 rounded-sm">
                  <p className="text-accent font-medium">
                    Você votou em {users.find(u => u.id === myVote)?.name}
                  </p>
                  <p className="text-sm text-muted mt-1">Aguardando outros jogadores...</p>
                </div>
              ) : (
                <>
                  <p className="text-center text-muted text-sm">Selecione um jogador para votar:</p>
                  <div className="grid gap-2">
                    {users.filter(u => u.id !== playerId && u.connected !== false).map((user) => (
                      <Button
                        key={user.id}
                        variant="outline"
                        onClick={() => handleFinalVote(user.id)}
                        className="w-full justify-start text-left py-4"
                      >
                        <Target className="w-4 h-4 mr-2 text-yellow-400" />
                        {user.name}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ========== TELA DE ACUSAÇÃO EM ANDAMENTO ==========
  if (accusation && gameState) {
    const isAccuser = accusation.accuserId === playerId;
    const isAccused = accusation.accusedId === playerId;
    const isSpy = gameState.isSpy;
    const canVote = !isAccused && !isSpy && !accusation.votes?.[playerId];
    const hasVoted = accusation.votes?.[playerId] !== undefined;
    
    return (
      <div className="w-full">
        <Card>
          <CardHeader className="text-center border-b border-white/10 p-4 sm:p-6">
            <div className="space-y-3">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-orange-500/20 rounded-sm flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-orange-400" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-orange-400">
                Acusação em Andamento
              </CardTitle>
              <p className="text-sm sm:text-base text-muted">
                <strong className="text-orange-400">{accusation.accuserName}</strong> acusou{' '}
                <strong className="text-red-400">{accusation.accusedName}</strong> de ser o espião!
              </p>
              {accusation.votesCount !== undefined && (
                <Badge variant="secondary" className="text-xs sm:text-sm">
                  {accusation.votesCount} / {accusation.votesNeeded} votos necessários
                </Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              {isAccused && (
                <div className="text-center p-4 bg-red-500/10 border border-red-500/30 rounded-sm">
                  <p className="text-red-400 font-medium">Você foi acusado!</p>
                  <p className="text-sm text-muted mt-1">Aguarde a votação dos outros jogadores.</p>
                </div>
              )}
              
              {isSpy && !isAccused && (
                <div className="text-center p-4 bg-white/5 border border-white/10 rounded-sm">
                  <p className="text-muted">Aguardando votação dos agentes...</p>
                </div>
              )}
              
              {hasVoted && !isAccused && !isSpy && (
                <div className="text-center p-4 bg-accent/10 border border-accent/30 rounded-sm">
                  <p className="text-accent font-medium">Você já votou!</p>
                  <p className="text-sm text-muted mt-1">Aguardando outros jogadores...</p>
                </div>
              )}
              
              {canVote && (
                <div className="space-y-3">
                  <p className="text-center text-muted text-sm">
                    Você concorda que {accusation.accusedName} é o espião?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => handleVoteAccusation(true)}
                      className="py-4 bg-green-600 hover:bg-green-700"
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Concordo
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleVoteAccusation(false)}
                      className="py-4"
                    >
                      <ThumbsDown className="w-4 h-4 mr-2" />
                      Discordo
                    </Button>
                  </div>
                </div>
              )}
              
              {isAccuser && (
                <Button
                  variant="outline"
                  onClick={handleCancelAccusation}
                  className="w-full"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar Acusação
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela de jogo em andamento
  if (gameState) {
    const packLocations = getLocationsByPack(gameState.locationPack || 'default').map(
      ({ id, name, icon }) => ({ id, name, icon })
    );

    const timerColor = timeRemaining !== null && timeRemaining <= 60 
      ? 'text-red-400' 
      : timeRemaining !== null && timeRemaining <= 120 
        ? 'text-yellow-400' 
        : 'text-accent';
    
    return (
      <div className="w-full">
        <Card>
          <CardHeader className="text-center border-b border-white/10 p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {/* Timer e Badge */}
              <div className="flex items-center justify-center gap-3">
                <Badge variant="secondary" className="text-xs sm:text-sm px-3 sm:px-4 py-1">
                  Partida em Andamento
                </Badge>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-sm bg-white/5 border border-white/10 ${timerColor}`}>
                  <Timer className="w-4 h-4" />
                  <span className="font-mono font-bold text-sm sm:text-base">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              </div>
              
              {gameState.isSpy ? (
                <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-red-500/20 rounded-sm flex items-center justify-center">
                    <EyeOff className="w-8 h-8 sm:w-10 sm:h-10 text-red-400" />
                  </div>
                  <CardTitle className="text-2xl sm:text-4xl font-bold text-red-400">
                    {gameState.spyCount > 1 ? 'Você é um dos Espiões!' : 'Você é o Espião!'}
                  </CardTitle>
                  <p className="text-sm sm:text-base text-muted max-w-md mx-auto px-2">
                    {gameState.spyCount > 1
                      ? 'Há outro espião na sala — vocês não sabem quem é. Descubra o local sem ser pego.'
                      : 'Descubra o local fazendo perguntas aos outros jogadores. Não deixe que descubram que você é o espião!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-accent/20 rounded-sm flex items-center justify-center">
                    <Eye className="w-8 h-8 sm:w-10 sm:h-10 text-accent" />
                  </div>
                  <CardTitle className="text-2xl sm:text-4xl font-bold text-accent">
                    Você é Cidadão
                  </CardTitle>
                  <div className="bg-white/5 rounded-sm p-4 sm:p-6 border border-white/10 max-w-sm mx-auto space-y-4">
                    <div>
                      <p className="text-xs sm:text-sm text-muted uppercase tracking-wider mb-2">O Local é:</p>
                      <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                        <span className="text-3xl sm:text-4xl">{gameState.location?.icon}</span>
                        <span className="text-xl sm:text-2xl font-bold text-foreground break-words text-center">{gameState.location?.name}</span>
                      </div>
                    </div>
                    {gameState.role && (
                      <div className="border-t border-white/10 pt-4">
                        <p className="text-xs sm:text-sm text-muted uppercase tracking-wider mb-2">Seu cargo:</p>
                        <p className="text-lg sm:text-xl font-bold text-accent flex items-center justify-center gap-2">
                          <UserCircle className="h-5 w-5" />
                          {gameState.role}
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-sm sm:text-base text-muted max-w-md mx-auto px-2">
                    Use seu cargo nas respostas. Tente descobrir quem é o espião!
                  </p>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4 sm:space-y-6">
              {/* Status */}
              {status && (
                <div className="p-3 rounded-sm text-center text-sm font-medium bg-accent/10 border border-accent/30 text-accent">
                  {status}
                </div>
              )}

              {/* Jogadores com opção de acusar */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                    Jogadores
                  </h3>
                  <Badge variant="secondary" className="text-xs sm:text-sm">
                    {gameState.playersCount} jogadores
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {users.map((user) => {
                    const isMe = user.id === playerId;
                    const canAccuse = !gameState.isSpy && !isMe; // Apenas agentes podem acusar, não a si mesmos
                    
                    return (
                      <div 
                        key={user.id} 
                        className={`p-3 sm:p-4 rounded-sm border flex items-center justify-between ${
                          isMe 
                            ? 'bg-accent/10 border-accent/30' 
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm sm:text-base text-foreground">
                            {user.name}
                          </span>
                          {isMe && (
                            <span className="text-accent text-xs">(Você)</span>
                          )}
                          {user.connected === false && (
                            <Badge variant="outline" className="text-xs text-muted border-white/15">
                              Desconectado
                            </Badge>
                          )}
                          {/* Mostrar pontuação */}
                          <Badge variant="outline" className="text-xs ml-1">
                            <Trophy className="w-3 h-3 mr-1" />
                            {scores[user.id] || 0}
                          </Badge>
                        </div>
                        
                        {canAccuse && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartAccusation(user.id)}
                            className="text-orange-400 border-orange-400/50 hover:bg-orange-400/10"
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Acusar
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lista de Locais Possíveis */}
              <div className="border-t border-white/10 pt-4 sm:pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                    {gameState.isSpy ? 'Chutar Local' : 'Locais Possíveis'}
                  </h3>
                  <span className="text-xs sm:text-sm text-muted">
                    {gameState.isSpy ? 'Escolha para chutar' : 'Toque para riscar'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {packLocations.map((location) => {
                    const isCrossed = crossedLocations.has(location.id);
                    
                    // Se for espião, mostra botões de chutar
                    if (gameState.isSpy) {
                      return (
                        <button
                          key={location.id}
                          onClick={() => {
                            if (confirm(`Você tem certeza que quer chutar "${location.name}"? Se errar, os agentes ganham pontos!`)) {
                              handleSpyGuess(location.id);
                            }
                          }}
                          className={`p-2 sm:p-3 rounded-sm border text-left transition-all ${
                            isCrossed
                              ? 'bg-white/[0.02] border-white/10/50 opacity-50'
                              : 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 active:scale-95'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg sm:text-xl">{location.icon}</span>
                            <span className={`text-xs sm:text-sm font-medium ${
                              isCrossed ? 'line-through text-muted' : 'text-foreground'
                            }`}>
                              {location.name}
                            </span>
                          </div>
                        </button>
                      );
                    }
                    
                    // Se for agente, mostra lista para riscar
                    return (
                      <button
                        key={location.id}
                        onClick={() => toggleCrossLocation(location.id)}
                        className={`p-2 sm:p-3 rounded-sm border text-left transition-all ${
                          isCrossed
                            ? 'bg-white/[0.02] border-white/10/50 opacity-50'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 active:scale-95'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg sm:text-xl">{location.icon}</span>
                          <span className={`text-xs sm:text-sm font-medium text-foreground ${
                            isCrossed ? 'line-through text-muted' : ''
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
                    className="mt-3 text-xs sm:text-sm text-muted hover:text-foreground flex items-center gap-1 mx-auto"
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
    <div className="w-full">
      <Card>
        <CardHeader className="text-center border-b border-white/10 p-4 sm:p-6">
          <div className="space-y-2">
            <p className="text-xs sm:text-sm text-muted uppercase tracking-wider">
              {getGameById(gameType)?.name || 'Sala'} · Código
            </p>
            <CardTitle className="text-3xl sm:text-5xl font-bold text-accent tracking-widest">
              {currentRoom}
            </CardTitle>
            <p className="text-sm sm:text-base text-muted">
              Bem-vindo, <strong className="text-foreground">{userName}</strong>!
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            {status && (
              <div className={`p-3 sm:p-4 rounded-sm text-center text-sm sm:text-base font-medium ${
                status.includes('encerrada') 
                  ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                  : status.includes('necessários')
                  ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                  : 'bg-accent/10 border border-accent/30 text-accent animate-pulse'
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
                    className={`p-3 sm:p-4 rounded-sm border transition-colors ${
                      user.id === playerId 
                        ? 'bg-accent/10 border-accent/30' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-base sm:text-lg text-foreground flex items-center gap-1 sm:gap-2 flex-wrap break-words min-w-0">
                        <span className="break-all">{user.name}</span>
                        {user.id === playerId && (
                          <span className="text-accent font-semibold text-sm">(Você)</span>
                        )}
                        {user.connected === false && (
                          <Badge variant="outline" className="text-xs text-muted border-white/15">
                            Desconectado
                          </Badge>
                        )}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {scores[user.id] > 0 && (
                          <Badge variant="secondary" className="text-xs sm:text-sm">
                            <Trophy className="w-3 h-3 mr-1 text-yellow-400" />
                            {scores[user.id]}
                          </Badge>
                        )}
                        {user.isHost && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs sm:text-sm">
                            <Crown className="w-3 h-3 mr-1" />
                            Host
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Placar - mostra se houver pontuações */}
            {Object.values(scores).some(s => s > 0) && (
              <div className="p-3 sm:p-4 bg-white/5 rounded-sm border border-white/10">
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-yellow-400">
                  <Trophy className="w-4 h-4" />
                  Placar
                </h4>
                <div className="flex flex-wrap gap-2">
                  {users
                    .filter(u => scores[u.id] > 0)
                    .sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
                    .map((user, index) => (
                      <Badge 
                        key={user.id}
                        variant={index === 0 ? "default" : "secondary"}
                        className={`text-xs sm:text-sm ${
                          index === 0 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : ''
                        }`}
                      >
                        {index === 0 && '🥇 '}
                        {index === 1 && '🥈 '}
                        {index === 2 && '🥉 '}
                        {user.name}: {scores[user.id]}
                      </Badge>
                    ))
                  }
                </div>
              </div>
            )}

            {gameType === GAME_TYPES.QUEM_SOU_EU ? (
              <QuemSouEuSettings
                socket={socket}
                roomCode={currentRoom}
                isHost={isHost}
                settings={roomSettings}
                connectedCount={connectedCount}
              />
            ) : (
              <RoomSettings
                socket={socket}
                roomCode={currentRoom}
                isHost={isHost}
                settings={roomSettings}
                connectedCount={connectedCount}
              />
            )}

            {connectedCount < minPlayers && (
              <div className="p-3 sm:p-4 bg-white/5 rounded-sm border border-white/10 text-center">
                <p className="text-sm sm:text-base text-muted">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Aguardando mais jogadores... (mínimo {minPlayers})
                </p>
              </div>
            )}

            {isHost && connectedCount >= minPlayers && (
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
