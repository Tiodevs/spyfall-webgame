import { useCallback } from 'react';
import { useSocket } from './hooks/useSocket';
import { RoomProvider, useRoom } from './contexts/RoomContext';
import { CreateRoom } from './components/CreateRoom';
import { RoomsList } from './components/RoomsList';
import { GameRoom } from './components/GameRoom';

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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased">
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-6 sm:space-y-8">

        {!currentRoom && (
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#01DEB2]">
              Spyfall
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground px-2">
              Quem é o espião? Descubra antes que o tempo acabe.
            </p>
          </div>
        )}

        {showReconnectBanner && (
          <div className="rounded-md bg-yellow-500/15 p-3 sm:p-4 border border-yellow-500/20 text-yellow-500 text-xs sm:text-sm text-center animate-pulse">
            Reconectando ao servidor...
          </div>
        )}

        {!currentRoom && !isConnected && (
          <div className="rounded-md bg-yellow-500/15 p-3 sm:p-4 border border-yellow-500/20 text-yellow-500 text-xs sm:text-sm text-center animate-pulse">
            Conectando ao servidor...
          </div>
        )}

        {!currentRoom && isConnected && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CreateRoom socket={socket} playerId={playerId} onRoomJoined={handleRoomJoined} />
            <RoomsList socket={socket} playerId={playerId} onRoomJoined={handleRoomJoined} />
          </div>
        )}

        {currentRoom && (
          <div className="animate-in zoom-in-95 duration-300">
            <GameRoom socket={socket} playerId={playerId} />
          </div>
        )}
      </main>
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
