import { useState, useEffect } from 'react';

export const JoinRoom = ({ socket }) => {
  const [roomCode, setRoomCode] = useState('');
  const [status, setStatus] = useState('');

  const handleJoinRoom = () => {
    if (!socket || !roomCode.trim()) {
      setStatus('Por favor, digite o código da sala');
      setTimeout(() => setStatus(''), 3000);
      return;
    }
    socket.emit('join-room', roomCode.toUpperCase());
    setRoomCode('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJoinRoom();
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleJoinedRoom = (data) => {
      setStatus(`Você entrou na sala ${data.roomCode}!`);
      setTimeout(() => setStatus(''), 5000);
    };

    const handleError = (data) => {
      setStatus(data.message);
      setTimeout(() => setStatus(''), 5000);
    };

    socket.on('joined-room', handleJoinedRoom);
    socket.on('error', handleError);

    return () => {
      socket.off('joined-room', handleJoinedRoom);
      socket.off('error', handleError);
    };
  }, [socket]);

  return (
    <div className="card">
      <h2>Entrar em Sala</h2>
      <div className="input-group">
        <label htmlFor="roomCodeInput">Código da Sala:</label>
        <input
          type="text"
          id="roomCodeInput"
          placeholder="Ex: ABCD"
          maxLength="4"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          onKeyPress={handleKeyPress}
          disabled={!socket}
        />
      </div>
      <button onClick={handleJoinRoom} disabled={!socket || !roomCode.trim()}>
        🚪 Entrar na Sala
      </button>
      {status && (
        <div className={`status ${status.includes('entrou') ? 'success' : 'error'}`}>
          {status}
        </div>
      )}
    </div>
  );
};
