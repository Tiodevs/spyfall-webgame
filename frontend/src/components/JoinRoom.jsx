import { useState, useEffect } from 'react';

export const JoinRoom = ({ socket, onRoomJoined }) => {
  const [roomCode, setRoomCode] = useState('');
  const [userName, setUserName] = useState('');
  const [status, setStatus] = useState('');

  const handleJoinRoom = () => {
    if (!socket || !roomCode.trim()) {
      setStatus('Por favor, digite o código da sala');
      setTimeout(() => setStatus(''), 3000);
      return;
    }

    if (!userName.trim()) {
      setStatus('Por favor, digite seu nome');
      setTimeout(() => setStatus(''), 3000);
      return;
    }

    if (userName.trim().length < 2 || userName.trim().length > 20) {
      setStatus('Nome deve ter entre 2 e 20 caracteres');
      setTimeout(() => setStatus(''), 3000);
      return;
    }

    socket.emit('join-room', { roomCode: roomCode.toUpperCase(), userName: userName.trim() });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJoinRoom();
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleJoinedRoom = (data) => {
      if (onRoomJoined) {
        onRoomJoined(data.roomCode, userName.trim());
      }
      setRoomCode('');
      setUserName('');
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
  }, [socket, userName, onRoomJoined]);

  return (
    <div className="card">
      <h2>Entrar em Sala</h2>
      <div className="input-group">
        <label htmlFor="joinUserName">Seu Nome:</label>
        <input
          type="text"
          id="joinUserName"
          placeholder="Digite seu nome"
          maxLength="20"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={!socket}
        />
      </div>
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
      <button onClick={handleJoinRoom} disabled={!socket || !roomCode.trim() || !userName.trim()}>
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
