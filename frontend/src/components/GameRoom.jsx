import { useState, useEffect } from 'react';
import { useRoom } from '../contexts/RoomContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Users, LogOut, Crown, Play, Eye, EyeOff, MapPin } from 'lucide-react';

export const GameRoom = ({ socket }) => {
  const { currentRoom, userName, users, leaveRoom, updateUsers } = useRoom();
  const [status, setStatus] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [gameState, setGameState] = useState(null); // { isSpy, location, playersCount }

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

  useEffect(() => {
    if (!socket || !currentRoom) return;

    const handleJoinedRoom = (data) => {
      updateUsers(data.users);
      setIsHost(data.hostId === socket.id);
    };

    const handleUserJoined = (data) => {
      setStatus(`Novo usuário entrou na sala!`);
      updateUsers(data.users);
      setIsHost(data.hostId === socket.id);
      setTimeout(() => setStatus(''), 3000);
    };

    const handleUserLeft = (data) => {
      setStatus(`Um usuário saiu da sala`);
      updateUsers(data.users);
      setIsHost(data.hostId === socket.id);
      setTimeout(() => setStatus(''), 3000);
    };

    const handleGameStarted = (data) => {
      setGameState({
        isSpy: data.isSpy,
        location: data.location,
        playersCount: data.playersCount
      });
    };

    const handleGameEnded = (data) => {
      setGameState(null);
      setStatus(`Partida encerrada! O espião era ${data.spyName}. Local: ${data.location?.name}`);
      setTimeout(() => setStatus(''), 8000);
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
    socket.on('error', handleError);

    return () => {
      socket.off('joined-room', handleJoinedRoom);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('game-started', handleGameStarted);
      socket.off('game-ended', handleGameEnded);
      socket.off('error', handleError);
    };
  }, [socket, currentRoom, updateUsers]);

  if (!currentRoom) return null;

  // Tela de jogo em andamento
  if (gameState) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader className="text-center border-b border-zinc-800">
            <div className="space-y-4">
              <Badge variant="secondary" className="text-sm px-4 py-1">
                Partida em Andamento
              </Badge>
              
              {gameState.isSpy ? (
                <div className="space-y-4 py-4">
                  <div className="w-20 h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
                    <EyeOff className="w-10 h-10 text-red-400" />
                  </div>
                  <CardTitle className="text-4xl font-bold text-red-400">
                    Você é o Espião!
                  </CardTitle>
                  <p className="text-zinc-400 max-w-md mx-auto">
                    Descubra o local fazendo perguntas aos outros jogadores. 
                    Não deixe que descubram que você é o espião!
                  </p>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="w-20 h-20 mx-auto bg-[#01DEB2]/20 rounded-full flex items-center justify-center">
                    <Eye className="w-10 h-10 text-[#01DEB2]" />
                  </div>
                  <CardTitle className="text-4xl font-bold text-[#01DEB2]">
                    Você é Cidadão
                  </CardTitle>
                  <div className="bg-zinc-800/50 rounded-lg p-6 border border-zinc-700 max-w-sm mx-auto">
                    <p className="text-sm text-zinc-400 uppercase tracking-wider mb-2">O Local é:</p>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-4xl">{gameState.location?.icon}</span>
                      <span className="text-2xl font-bold text-zinc-100">{gameState.location?.name}</span>
                    </div>
                  </div>
                  <p className="text-zinc-400 max-w-md mx-auto">
                    Responda às perguntas sem revelar o local. 
                    Tente descobrir quem é o espião!
                  </p>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Jogadores
                </h3>
                <Badge variant="secondary">
                  {gameState.playersCount} jogadores
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {users.map((user) => (
                  <div 
                    key={user.id} 
                    className={`p-3 rounded-lg border text-center ${
                      user.id === socket?.id 
                        ? 'bg-[#01DEB2]/10 border-[#01DEB2]/30' 
                        : 'bg-zinc-800/50 border-zinc-700'
                    }`}
                  >
                    <span className="font-medium text-zinc-100">
                      {user.name}
                      {user.id === socket?.id && (
                        <span className="text-[#01DEB2] text-sm ml-1">(Você)</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {isHost && (
                <Button 
                  variant="destructive" 
                  onClick={handleEndGame}
                  className="w-full text-base py-6"
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
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader className="text-center border-b border-zinc-800">
          <div className="space-y-2">
            <p className="text-sm text-zinc-400 uppercase tracking-wider">Código da Sala</p>
            <CardTitle className="text-5xl font-bold text-[#01DEB2] tracking-widest">
              {currentRoom}
            </CardTitle>
            <p className="text-zinc-400">
              Bem-vindo, <strong className="text-zinc-100">{userName}</strong>!
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="space-y-6">
            {status && (
              <div className={`p-4 rounded-lg text-center font-medium ${
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
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" />
                Jogadores na Sala
              </h3>
              <Badge variant="secondary" className="text-base px-3 py-1">
                {users.length} jogador{users.length !== 1 ? 'es' : ''}
              </Badge>
            </div>
            
            <div className="space-y-2">
              {users.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 italic">
                  Aguardando jogadores...
                </p>
              ) : (
                users.map((user) => (
                  <div 
                    key={user.id} 
                    className={`p-4 rounded-lg border transition-colors ${
                      user.id === socket?.id 
                        ? 'bg-[#01DEB2]/10 border-[#01DEB2]/30' 
                        : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-lg text-zinc-100 flex items-center gap-2">
                        {user.name}
                        {user.id === socket?.id && (
                          <span className="text-[#01DEB2] font-semibold">(Você)</span>
                        )}
                      </span>
                      {user.isHost && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
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
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 text-center">
                <p className="text-zinc-400">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Aguardando mais jogadores... (mínimo 3)
                </p>
              </div>
            )}

            {isHost && users.length >= 3 && (
              <Button 
                onClick={handleStartGame}
                className="w-full text-lg py-6"
              >
                <Play className="w-5 h-5 mr-2" />
                Começar Partida
              </Button>
            )}

            <Button 
              variant="destructive" 
              onClick={handleLeaveRoom}
              className="w-full text-base py-6"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Sair da Sala
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
