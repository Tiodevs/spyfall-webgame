import { useState, useEffect } from 'react';
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
  DialogTrigger,
} from './ui/dialog';
import { Plus } from 'lucide-react';

export const CreateRoom = ({ socket, onRoomJoined }) => {
  const [userName, setUserName] = useState('');
  const [status, setStatus] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCreateRoom();
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (data) => {
      setStatus(`Sala criada! Entrando...`);
      // Auto-join na sala criada com o nome
      socket.emit('join-room', { roomCode: data.roomCode, userName: userName.trim() });
    };

    const handleJoinedRoom = (data) => {
      if (onRoomJoined) {
        onRoomJoined(data.roomCode, userName.trim(), data.users);
      }
      setIsDialogOpen(false);
      setUserName('');
      setStatus('');
    };

    socket.on('room-created', handleRoomCreated);
    socket.on('joined-room', handleJoinedRoom);

    return () => {
      socket.off('room-created', handleRoomCreated);
      socket.off('joined-room', handleJoinedRoom);
    };
  }, [socket, userName, onRoomJoined]);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full text-base sm:text-lg py-5 sm:py-6">
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Criar Nova Sala
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Criar Nova Sala</DialogTitle>
          <DialogDescription className="text-sm">
            Digite seu nome para criar e entrar na sala.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2 sm:py-4">
          <div className="space-y-2">
            <Label htmlFor="createUserName" className="text-sm sm:text-base">Seu Nome</Label>
            <Input
              id="createUserName"
              placeholder="Digite seu nome"
              maxLength={20}
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="text-base"
            />
          </div>
          
          {status && (
            <div className={`text-xs sm:text-sm text-center p-2 sm:p-3 rounded-md ${
              status.includes('caracteres') 
                ? 'bg-red-900/30 text-red-400 border border-red-400/30' 
                : 'bg-[#01DEB2]/10 text-[#01DEB2] border border-[#01DEB2]/30'
            }`}>
              {status}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={handleCreateRoom} disabled={!userName.trim()} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Criar Sala
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
