import { useCallback, useState } from 'react';
import { useSocket } from './hooks/useSocket';
import { RoomProvider, useRoom } from './contexts/RoomContext';
import { GameLobby } from './components/hub/GameLobby';
import { GameHub } from './components/hub/GameHub';
import { GameRoom } from './components/GameRoom';
import { GameGuideDialog } from './components/GameGuideDialog';
import { AppBackground } from './components/layout/AppBackground';
import { AppHeader } from './components/layout/AppHeader';

function AppContent() {
  const {
    currentRoom,
    playerId,
    selectedGame,
    selectGame,
    clearSelectedGame,
    joinRoom,
    updateUsers,
    getSession
  } = useRoom();
  const [guideOpen, setGuideOpen] = useState(false);

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

  const handleRoomJoined = (roomCode, name, users, gameType) => {
    joinRoom(roomCode, name, gameType);
    if (users) {
      updateUsers(users);
    }
  };

  const handleGoHome = () => {
    if (currentRoom) return;
    clearSelectedGame();
  };

  const showReconnectBanner = currentRoom && (!isConnected || isReconnecting);
  const onHub = !currentRoom && !selectedGame;
  const onLobby = !currentRoom && Boolean(selectedGame);
  const activeGameType = selectedGame;

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <AppBackground />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-10 sm:px-6 lg:px-8">
        <AppHeader
          isConnected={isConnected && !isReconnecting}
          onOpenGuide={() => setGuideOpen(true)}
          onGoHome={handleGoHome}
          showGuide={Boolean(selectedGame || currentRoom)}
        />

        <GameGuideDialog
          open={guideOpen}
          onOpenChange={setGuideOpen}
          gameType={activeGameType}
        />

        <main className="flex-1 space-y-8 sm:space-y-10">
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

          {onHub && isConnected && (
            <GameHub onSelectGame={selectGame} />
          )}

          {onLobby && isConnected && (
            <GameLobby
              gameType={selectedGame}
              socket={socket}
              playerId={playerId}
              onRoomJoined={handleRoomJoined}
              onBack={clearSelectedGame}
            />
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
