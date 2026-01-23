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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 md:p-8">
      <div className="container mx-auto max-w-6xl">
        {!currentRoom && (
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-8 text-white drop-shadow-lg">
            🕵️ Spyfall
          </h1>
        )}
        
        {!isConnected && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 text-center text-yellow-200 backdrop-blur-sm">
            🔄 Conectando ao servidor...
          </div>
        )}

        {isConnected && !currentRoom && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <CreateRoom socket={socket} onRoomJoined={handleRoomJoined} />
              <JoinRoom socket={socket} onRoomJoined={handleRoomJoined} />
            </div>

            <RoomsList socket={socket} />
          </>
        )}

        {isConnected && currentRoom && (
          <GameRoom socket={socket} />
        )}
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
