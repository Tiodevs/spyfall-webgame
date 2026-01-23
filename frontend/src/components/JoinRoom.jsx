import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { LogIn } from 'lucide-react';

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
        onRoomJoined(data.roomCode, userName.trim(), data.users);
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
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Entrar em Sala</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="joinUserName">Seu Nome</Label>
          <Input
            id="joinUserName"
            placeholder="Digite seu nome"
            maxLength={20}
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!socket}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="roomCodeInput">Código da Sala</Label>
          <Input
            id="roomCodeInput"
            placeholder="Ex: ABCD"
            maxLength={4}
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            onKeyPress={handleKeyPress}
            disabled={!socket}
            className="uppercase"
          />
        </div>
        <Button 
          onClick={handleJoinRoom} 
          disabled={!socket || !roomCode.trim() || !userName.trim()}
          className="w-full"
        >
          <LogIn className="w-4 h-4 mr-2" />
          Entrar na Sala
        </Button>
        {status && (
          <div className={`text-sm text-center p-3 rounded-md ${
            status.includes('entrou') 
              ? 'bg-green-500/20 text-green-200' 
              : 'bg-destructive/20 text-destructive-foreground'
          }`}>
            {status}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
