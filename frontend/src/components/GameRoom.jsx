import { useState, useEffect } from 'react';
import { useRoom } from '../contexts/RoomContext';

export const GameRoom = ({ socket }) => {
  const { currentRoom, userName, users, leaveRoom, updateUsers } = useRoom();
  const [status, setStatus] = useState('');

  const handleLeaveRoom = () => {
    if (socket) {
      socket.disconnect();
      socket.connect();
    }
    leaveRoom();
  };

  useEffect(() => {
    if (!socket || !currentRoom) return;

    const handleJoinedRoom = (data) => {
      // Atualiza lista de usuários quando entra na sala
      updateUsers(data.users);
    };

    const handleUserJoined = (data) => {
      setStatus(`Novo usuário entrou na sala!`);
      updateUsers(data.users);
      setTimeout(() => setStatus(''), 3000);
    };

    const handleUserLeft = (data) => {
      setStatus(`Um usuário saiu da sala`);
      updateUsers(data.users);
      setTimeout(() => setStatus(''), 3000);
    };

    socket.on('joined-room', handleJoinedRoom);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('joined-room', handleJoinedRoom);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket, currentRoom, updateUsers]);

  if (!currentRoom) return null;

  return (
    <div className="game-room-container">
      <div className="card current-room">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, marginBottom: '5px' }}>🎮 Sala: {currentRoom}</h2>
            <p style={{ margin: 0, color: '#666' }}>Bem-vindo, <strong>{userName}</strong>!</p>
          </div>
          <button 
            onClick={handleLeaveRoom}
            style={{ 
              width: 'auto', 
              padding: '10px 20px',
              background: '#dc3545',
              marginTop: 0
            }}
          >
            🚪 Sair da Sala
          </button>
        </div>

        {status && <div className="status info">{status}</div>}

        <div className="list-section">
          <h3>👥 Jogadores na Sala ({users.length})</h3>
          <ul className="list">
            {users.length === 0 ? (
              <li className="empty-state">Aguardando jogadores...</li>
            ) : (
              users.map((user, index) => (
                <li key={user.id} className="list-item">
                  <div>
                    <strong>{user.name}</strong>
                    {user.id === socket?.id && (
                      <span style={{ 
                        marginLeft: '10px', 
                        color: '#4caf50',
                        fontWeight: 'bold',
                        fontSize: '0.9em'
                      }}>
                        (Você)
                      </span>
                    )}
                  </div>
                  <span className="badge">#{index + 1}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div style={{ 
          marginTop: '30px', 
          padding: '20px', 
          background: '#f8f9fa', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, color: '#666' }}>
            🎯 Compartilhe o código <strong style={{ color: '#667eea', fontSize: '1.2em' }}>{currentRoom}</strong> com seus amigos!
          </p>
        </div>
      </div>
    </div>
  );
};
