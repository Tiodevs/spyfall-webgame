import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';

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
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">📋 Salas Disponíveis</CardTitle>
      </CardHeader>
      <CardContent>
        {rooms.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 italic">
            Nenhuma sala disponível. Crie uma nova sala!
          </p>
        ) : (
          <div className="space-y-2">
            {rooms.map((room) => (
              <div 
                key={room.code} 
                className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border hover:bg-secondary/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-primary">{room.code}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(room.createdAt).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <Badge variant="secondary">
                  {room.userCount} jogador{room.userCount !== 1 ? 'es' : ''}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
