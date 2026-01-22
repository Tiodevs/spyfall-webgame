import { useState, useEffect } from 'react';

export const RoomsList = ({ socket }) => {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    if (!socket) return;

    // Busca salas ao conectar
    const fetchRooms = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SOCKET_URL}/api/rooms`);
        const data = await response.json();
        setRooms(data);
      } catch (error) {
        console.error('Erro ao buscar salas:', error);
      }
    };

    fetchRooms();

    const handleRoomsUpdated = (updatedRooms) => {
      setRooms(updatedRooms);
    };

    socket.on('rooms-updated', handleRoomsUpdated);

    return () => {
      socket.off('rooms-updated', handleRoomsUpdated);
    };
  }, [socket]);

  return (
    <div className="card">
      <h2>📋 Salas Disponíveis</h2>
      <ul className="list">
        {rooms.length === 0 ? (
          <li className="empty-state">Nenhuma sala disponível. Crie uma nova sala!</li>
        ) : (
          rooms.map((room) => (
            <li key={room.code} className="list-item">
              <div>
                <strong>{room.code}</strong>
                <small style={{ color: '#999', marginLeft: '10px' }}>
                  {new Date(room.createdAt).toLocaleTimeString('pt-BR')}
                </small>
              </div>
              <span className="badge">
                {room.userCount} usuário{room.userCount !== 1 ? 's' : ''}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};
