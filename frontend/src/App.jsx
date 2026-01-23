import { useSocket } from './hooks/useSocket';
import { RoomProvider, useRoom } from './contexts/RoomContext';
import { CreateRoom } from './components/CreateRoom';
import { JoinRoom } from './components/JoinRoom';
import { RoomsList } from './components/RoomsList';
import { GameRoom } from './components/GameRoom';

function AppContent() {
  const { socket, isConnected } = useSocket();
  const { currentRoom, joinRoom, updateUsers } = useRoom();

  const handleRoomJoined = (roomCode, userName, users) => {
    joinRoom(roomCode, userName);
    if (users) {
      updateUsers(users);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased">
      <main className="flex-1 container max-w-3xl mx-auto p-4 md:py-10 space-y-8">
        
        {!currentRoom && (
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              Spyfall
            </h1>
            <p className="text-muted-foreground">
              Quem é o espião? Descubra antes que o tempo acabe.
            </p>
          </div>
        )}
        
        {!isConnected && (
            <div className="rounded-md bg-yellow-500/15 p-4 border border-yellow-500/20 text-yellow-500 text-sm text-center animate-pulse">
                Conectando ao servidor...
            </div>
        )}

        {isConnected && !currentRoom && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid gap-6 md:grid-cols-2">
              <CreateRoom socket={socket} onRoomJoined={handleRoomJoined} />
              <JoinRoom socket={socket} onRoomJoined={handleRoomJoined} />
            </div>

            <RoomsList socket={socket} />
          </div>
        )}

        {isConnected && currentRoom && (
          <div className="animate-in zoom-in-95 duration-300">
            <GameRoom socket={socket} />
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
