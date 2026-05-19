import { useCallback } from 'react';
import { useSocket } from './hooks/useSocket';
import { RoomProvider, useRoom } from './contexts/RoomContext';
import { CreateRoom } from './components/CreateRoom';
import { RoomsList } from './components/RoomsList';
import { GameRoom } from './components/GameRoom';
import { AppBackground } from './components/layout/AppBackground';
import { AppHeader } from './components/layout/AppHeader';
import { Sparkles } from 'lucide-react';

function AppContent() {
  const { currentRoom, playerId, joinRoom, updateUsers, getSession } = useRoom();

  const handleReconnect = useCallback(
    (socketInstance) => {
      const session = getSession();
      if (session?.roomCode && session?.userName && session?.playerId) {
        socketInstance.emit('rejoin-room', {
          roomCode: session.roomCode,
          userName: session.userName,
          playerId: session.playerId
        });
      }
    },
    [getSession]
  );

  const { socket, isConnected, isReconnecting } = useSocket(handleReconnect);

  const handleRoomJoined = (roomCode, name, users) => {
    joinRoom(roomCode, name);
    if (users) {
      updateUsers(users);
    }
  };

  const showReconnectBanner = currentRoom && (!isConnected || isReconnecting);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <AppBackground />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col px-4 pb-10 sm:px-6 lg:px-8">
        <AppHeader isConnected={isConnected && !isReconnecting} />

        <main className="flex-1 space-y-8 sm:space-y-10">
          {!currentRoom && (
            <section className="animate-slide-up space-y-6 pt-2 sm:pt-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-sm border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-accent">
                  <Sparkles className="h-3.5 w-3.5" />
                  Jogo de dedução em tempo real
                </div>
                <h1 className="font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl">
                  <span className="text-foreground">Quem é o </span>
                  <span className="text-muted">espião?</span>
                </h1>
                <p className="max-w-md text-base text-muted sm:text-lg">
                  Descubra o local secreto antes que o tempo acabe — ou finja que sabe, se for você o infiltrado.
                </p>
              </div>
            </section>
          )}

          {showReconnectBanner && (
            <div className="glass-panel animate-pulse border-amber-500/20 bg-amber-500/10 p-4 text-center text-sm text-amber-200">
              Reconectando ao servidor...
            </div>
          )}

          {!currentRoom && !isConnected && (
            <div className="glass-panel animate-pulse p-4 text-center text-sm text-muted">
              Conectando ao servidor...
            </div>
          )}

          {!currentRoom && isConnected && (
            <div className="animate-slide-up space-y-6" style={{ animationDelay: '0.1s' }}>
              <CreateRoom socket={socket} playerId={playerId} onRoomJoined={handleRoomJoined} />
              <RoomsList socket={socket} playerId={playerId} onRoomJoined={handleRoomJoined} />
            </div>
          )}

          {currentRoom && (
            <div className="animate-fade-in">
              <GameRoom socket={socket} playerId={playerId} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <RoomProvider>
      <AppContent />
    </RoomProvider>
  );
}

export default App;
