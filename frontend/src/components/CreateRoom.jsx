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
import { Plus, Users } from 'lucide-react';

export const CreateRoom = ({ socket, playerId, onRoomJoined }) => {
  const [userName, setUserName] = useState('');
  const [status, setStatus] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingRoomCode, setPendingRoomCode] = useState(null);

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
      setPendingRoomCode(data.roomCode);
      socket.emit('join-room', {
        roomCode: data.roomCode,
        userName: userName.trim(),
        playerId
      });
    };

    const handleRoomSync = (data) => {
      if (pendingRoomCode && data.roomCode === pendingRoomCode) {
        if (onRoomJoined) {
          onRoomJoined(data.roomCode, userName.trim(), data.users);
        }
        setIsDialogOpen(false);
        setUserName('');
        setStatus('');
        setPendingRoomCode(null);
      }
    };

    const handleError = (data) => {
      setStatus(data.message);
      setPendingRoomCode(null);
      setTimeout(() => setStatus(''), 5000);
    };

    socket.on('room-created', handleRoomCreated);
    socket.on('room-sync', handleRoomSync);
    socket.on('error', handleError);

    return () => {
      socket.off('room-created', handleRoomCreated);
      socket.off('room-sync', handleRoomSync);
      socket.off('error', handleError);
    };
  }, [socket, userName, playerId, onRoomJoined, pendingRoomCode]);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="group w-full gap-2 py-6 text-base sm:text-lg">
          <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
          Criar Nova Sala
        </Button>
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-zinc-950/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Criar Nova Sala</DialogTitle>
          <DialogDescription>
            Digite seu nome para criar e entrar na sala.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="createUserName">Seu Nome</Label>
            <Input
              id="createUserName"
              placeholder="Como os outros vão te chamar?"
              maxLength={20}
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>

          {status && (
            <div
              className={`rounded-lg p-3 text-center text-sm ${
                status.includes('caracteres')
                  ? 'border border-red-500/30 bg-red-500/10 text-red-400'
                  : 'border border-accent/30 bg-accent/10 text-accent'
              }`}
            >
              {status}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={handleCreateRoom} disabled={!userName.trim()} className="w-full sm:w-auto">
            <Users className="mr-2 h-4 w-4" />
            Criar Sala
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
