import { useState, useEffect } from 'react';

export const CurrentRoom = ({ socket }) => {
  const [currentRoom, setCurrentRoom] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const handleJoinedRoom = (data) => {
      setCurrentRoom(data.roomCode);
      setUsers(data.users);
    };

    const handleUserJoined = (data) => {
      setUsers(data.users);
    };

    const handleUserLeft = (data) => {
      setUsers(data.users);
    };

    const handleDisconnect = () => {
      setCurrentRoom(null);
      setUsers([]);
    };

    socket.on('joined-room', handleJoinedRoom);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('joined-room', handleJoinedRoom);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  if (!currentRoom) return null;

  return (
    <div className="card current-room">
      <h3>📍 Você está na sala:</h3>
      <p style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#2e7d32' }}>
        {currentRoom}
      </p>

      <div className="list-section">
        <h3>👥 Usuários na Sala:</h3>
        <ul className="list">
          {users.length === 0 ? (
            <li className="empty-state">Nenhum usuário na sala</li>
          ) : (
            users.map((user, index) => (
              <li key={user.id} className="list-item">
                <div>
                  <strong>Usuário {index + 1}</strong>
                  <small style={{ color: '#999', marginLeft: '10px' }}>
                    ID: {user.id.slice(0, 8)}...
                  </small>
                </div>
                {user.id === socket?.id && (
                  <span className="badge" style={{ background: '#4caf50' }}>
                    Você
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};
