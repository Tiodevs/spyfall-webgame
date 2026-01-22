import { useSocket } from './hooks/useSocket';
import { CreateRoom } from './components/CreateRoom';
import { JoinRoom } from './components/JoinRoom';
import { RoomsList } from './components/RoomsList';
import { CurrentRoom } from './components/CurrentRoom';
import './App.css';

function App() {
  const { socket, isConnected } = useSocket();

  return (
    <div className="container">
      <h1>🕵️ Spyfall - Sistema de Salas</h1>
      
      {!isConnected && (
        <div className="card" style={{ textAlign: 'center', background: '#fff3cd', border: '1px solid #ffc107' }}>
          <p style={{ margin: 0, color: '#856404' }}>🔄 Conectando ao servidor...</p>
        </div>
      )}

      {isConnected && (
        <>
          <div className="main-grid">
            <CreateRoom socket={socket} />
            <JoinRoom socket={socket} />
          </div>

          <CurrentRoom socket={socket} />
          <RoomsList socket={socket} />
        </>
      )}
    </div>
  );
}

export default App;
