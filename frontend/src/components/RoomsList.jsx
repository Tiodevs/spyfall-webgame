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
import { List, LogIn } from 'lucide-react';

export const RoomsList = ({ socket, onRoomJoined }) => {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [userName, setUserName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [status, setStatus] = useState('');

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

    const handleJoinedRoom = (data) => {
      if (onRoomJoined) {
        onRoomJoined(data.roomCode, userName.trim(), data.users);
      }
      setIsDialogOpen(false);
      setUserName('');
      setSelectedRoom(null);
    };

    const handleError = (data) => {
      setStatus(data.message);
      setTimeout(() => setStatus(''), 5000);
    };

    socket.on('rooms-updated', handleRoomsUpdated);
    socket.on('joined-room', handleJoinedRoom);
    socket.on('error', handleError);

    return () => {
      socket.off('rooms-updated', handleRoomsUpdated);
      socket.off('joined-room', handleJoinedRoom);
      socket.off('error', handleError);
    };
  }, [socket, userName, onRoomJoined]);

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

    socket.emit('join-room', { roomCode: selectedRoom.code, userName: userName.trim() });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJoinRoom();
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
            <List className="w-5 h-5 sm:w-6 sm:h-6" />
            Salas Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          {rooms.length === 0 ? (
            <p className="text-center text-zinc-400 py-6 sm:py-8 italic text-sm sm:text-base">
              Nenhuma sala disponível. Crie uma nova sala!
            </p>
          ) : (
            <div className="space-y-2">
              {rooms.map((room) => (
                <div 
                  key={room.code} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-lg bg-zinc-800/50 border border-zinc-700 hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-base sm:text-lg font-bold text-[#01DEB2]">{room.code}</span>
                    <span className="text-xs sm:text-sm text-zinc-400">
                      {new Date(room.createdAt).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    <Badge variant="secondary" className="text-xs sm:text-sm">
                      {room.userCount} jogador{room.userCount !== 1 ? 'es' : ''}
                    </Badge>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleOpenDialog(room)}
                    disabled={!socket}
                    className="w-full sm:w-auto"
                  >
                    <LogIn className="w-4 h-4 mr-1" />
                    Entrar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Entrar na Sala <span className="text-[#01DEB2]">{selectedRoom?.code}</span>
            </DialogTitle>
            <DialogDescription className="text-sm">
              Digite seu nome para entrar na partida.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2 sm:py-4">
            <div className="space-y-2">
              <Label htmlFor="dialogUserName" className="text-sm sm:text-base">Seu Nome</Label>
              <Input
                id="dialogUserName"
                placeholder="Digite seu nome"
                maxLength={20}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyPress={handleKeyPress}
                className="text-base"
              />
            </div>
            
            {status && (
              <div className="text-xs sm:text-sm text-center p-2 sm:p-3 rounded-md bg-red-900/30 text-red-400 border border-red-400/30">
                {status}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleJoinRoom} disabled={!userName.trim()} className="w-full sm:w-auto">
              <LogIn className="w-4 h-4 mr-2" />
              Entrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
