import { useState, useEffect } from 'react';

export const CreateRoom = ({ socket, onRoomJoined }) => {
  const [userName, setUserName] = useState('');
  const [status, setStatus] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const handleCreateRoom = () => {
    if (!socket || !userName.trim()) {
      setStatus('Por favor, digite seu nome');
      setTimeout(() => setStatus(''), 3000);
      return;
    }

    if (userName.trim().length < 2 || userName.trim().length > 20) {
      setStatus('Nome deve ter entre 2 e 20 caracteres');
      setTimeout(() => setStatus(''), 3000);
      return;
    }

    socket.emit('create-room');
  };

  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (data) => {
      setRoomCode(data.roomCode);
      setStatus(`Sala criada! Entrando...`);
      // Auto-join na sala criada com o nome
      socket.emit('join-room', { roomCode: data.roomCode, userName: userName.trim() });
    };

    const handleJoinedRoom = (data) => {
      if (onRoomJoined) {
        onRoomJoined(data.roomCode, userName.trim());
      }
    };

    socket.on('room-created', handleRoomCreated);
    socket.on('joined-room', handleJoinedRoom);

    return () => {
      socket.off('room-created', handleRoomCreated);
      socket.off('joined-room', handleJoinedRoom);
    };
  }, [socket, userName, onRoomJoined]);

  return (
    <div className="card">
      <h2>Criar Nova Sala</h2>
      <div className="input-group">
        <label htmlFor="createUserName">Seu Nome:</label>
        <input
          type="text"
          id="createUserName"
          placeholder="Digite seu nome"
          maxLength="20"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          disabled={!socket}
        />
      </div>
      <button onClick={handleCreateRoom} disabled={!socket || !userName.trim()}>
        🎮 Criar Sala
      </button>
      {status && <div className={`status ${status.includes('caracteres') ? 'error' : 'success'}`}>{status}</div>}
    </div>
  );
};
