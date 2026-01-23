import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

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
        onRoomJoined(data.roomCode, userName.trim(), data.users);
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
    <Card className="backdrop-blur-sm bg-card/50">
      <CardHeader>
        <CardTitle className="text-2xl">Criar Nova Sala</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="createUserName">Seu Nome</Label>
          <Input
            id="createUserName"
            placeholder="Digite seu nome"
            maxLength={20}
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            disabled={!socket}
          />
        </div>
        <Button 
          onClick={handleCreateRoom} 
          disabled={!socket || !userName.trim()}
          className="w-full"
        >
          🎮 Criar Sala
        </Button>
        {status && (
          <div className={`text-sm text-center p-3 rounded-md ${
            status.includes('caracteres') 
              ? 'bg-destructive/20 text-destructive-foreground' 
              : 'bg-green-500/20 text-green-200'
          }`}>
            {status}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
