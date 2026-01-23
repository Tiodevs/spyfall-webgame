import { useSocket } from './hooks/useSocket';
import { RoomProvider, useRoom } from './contexts/RoomContext';
import { CreateRoom } from './components/CreateRoom';
import { JoinRoom } from './components/JoinRoom';
import { RoomsList } from './components/RoomsList';
import { GameRoom } from './components/GameRoom';
import './App.css';

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
    <div className="container">
      {!currentRoom && <h1>🕵️ Spyfall - Sistema de Salas</h1>}
      
      {!isConnected && (
        <div className="card" style={{ textAlign: 'center', background: '#fff3cd', border: '1px solid #ffc107' }}>
          <p style={{ margin: 0, color: '#856404' }}>🔄 Conectando ao servidor...</p>
        </div>
      )}

      {isConnected && !currentRoom && (
        <>
          <div className="main-grid">
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
