import { useState, useEffect } from 'react';

export const CreateRoom = ({ socket }) => {
  const [status, setStatus] = useState('');

  const handleCreateRoom = () => {
    if (!socket) return;
    socket.emit('create-room');
  };

  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (data) => {
      setStatus(`Sala criada! Código: ${data.roomCode}`);
      // Auto-join na sala criada
      socket.emit('join-room', data.roomCode);
      setTimeout(() => setStatus(''), 5000);
    };

    socket.on('room-created', handleRoomCreated);

    return () => {
      socket.off('room-created', handleRoomCreated);
    };
  }, [socket]);

  return (
    <div className="card">
      <h2>Criar Nova Sala</h2>
      <button onClick={handleCreateRoom} disabled={!socket}>
        🎮 Criar Sala
      </button>
      {status && <div className="status success">{status}</div>}
    </div>
  );
};
