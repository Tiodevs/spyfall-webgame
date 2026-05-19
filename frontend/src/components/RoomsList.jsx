import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog';
import { List, LogIn, Clock, Users } from 'lucide-react';

export const RoomsList = ({ socket, playerId, onRoomJoined }) => {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [userName, setUserName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [pendingRoomCode, setPendingRoomCode] = useState(null);

  useEffect(() => {
    if (!socket) return;

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

    const handleRoomSync = (data) => {
      if (pendingRoomCode && data.roomCode === pendingRoomCode) {
        if (onRoomJoined) {
          onRoomJoined(data.roomCode, userName.trim(), data.users);
        }
        setIsDialogOpen(false);
        setUserName('');
        setSelectedRoom(null);
        setPendingRoomCode(null);
        setStatus('');
      }
    };

    const handleError = (data) => {
      setStatus(data.message);
      setPendingRoomCode(null);
      setTimeout(() => setStatus(''), 5000);
    };

    socket.on('rooms-updated', handleRoomsUpdated);
    socket.on('room-sync', handleRoomSync);
    socket.on('error', handleError);

    return () => {
      socket.off('rooms-updated', handleRoomsUpdated);
      socket.off('room-sync', handleRoomSync);
      socket.off('error', handleError);
    };
  }, [socket, userName, playerId, onRoomJoined, pendingRoomCode]);

  const handleOpenDialog = (room) => {
    setSelectedRoom(room);
    setIsDialogOpen(true);
    setStatus('');
  };

  const handleJoinRoom = () => {
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

    setPendingRoomCode(selectedRoom.code);
    socket.emit('join-room', {
      roomCode: selectedRoom.code,
      userName: userName.trim(),
      playerId
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJoinRoom();
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <List className="h-5 w-5 text-accent" />
            Salas Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {rooms.length === 0 ? (
            <p className="py-10 text-center text-sm italic text-muted">
              Nenhuma sala disponível. Crie uma nova sala!
            </p>
          ) : (
            <div className="space-y-2">
              {rooms.map((room) => (
                <div
                  key={room.code}
                  className="group flex flex-col gap-3 rounded-sm border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-accent/20 hover:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-display text-lg font-bold tracking-widest text-accent">
                      {room.code}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Clock className="h-3 w-3" />
                      {new Date(room.createdAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {room.userCount} jogador{room.userCount !== 1 ? 'es' : ''}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleOpenDialog(room)}
                    disabled={!socket}
                    className="w-full sm:w-auto"
                  >
                    <LogIn className="mr-1 h-4 w-4" />
                    Entrar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="border-white/10 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Entrar na Sala{' '}
              <span className="text-accent">{selectedRoom?.code}</span>
            </DialogTitle>
            <DialogDescription>
              Digite seu nome para entrar na partida.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="dialogUserName">Seu Nome</Label>
              <Input
                id="dialogUserName"
                placeholder="Como os outros vão te chamar?"
                maxLength={20}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>

            {status && (
              <div className="rounded-sm border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-400">
                {status}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleJoinRoom} disabled={!userName.trim()} className="w-full sm:w-auto">
              <LogIn className="mr-2 h-4 w-4" />
              Entrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
