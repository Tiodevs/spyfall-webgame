import { useState, useEffect } from 'react';
import { useRoom } from '../contexts/RoomContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export const GameRoom = ({ socket }) => {
  const { currentRoom, userName, users, leaveRoom, updateUsers } = useRoom();
  const [status, setStatus] = useState('');

  const handleLeaveRoom = () => {
    if (socket) {
      socket.disconnect();
      socket.connect();
    }
    leaveRoom();
  };

  useEffect(() => {
    if (!socket || !currentRoom) return;

    const handleJoinedRoom = (data) => {
      // Atualiza lista de usuários quando entra na sala
      updateUsers(data.users);
    };

    const handleUserJoined = (data) => {
      setStatus(`Novo usuário entrou na sala!`);
      updateUsers(data.users);
      setTimeout(() => setStatus(''), 3000);
    };

    const handleUserLeft = (data) => {
      setStatus(`Um usuário saiu da sala`);
      updateUsers(data.users);
      setTimeout(() => setStatus(''), 3000);
    };

    socket.on('joined-room', handleJoinedRoom);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('joined-room', handleJoinedRoom);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket, currentRoom, updateUsers]);

  if (!currentRoom) return null;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader className="text-center border-b border-border">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground uppercase tracking-wider">Código da Sala</p>
            <CardTitle className="text-5xl font-bold text-primary tracking-widest">
              {currentRoom}
            </CardTitle>
            <p className="text-muted-foreground">
              Bem-vindo, <strong className="text-foreground">{userName}</strong>!
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="space-y-6">
            {status && (
              <div className="p-4 bg-primary/10 border border-primary rounded-lg text-center text-primary font-medium animate-pulse">
                {status}
              </div>
            )}

            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">👥 Jogadores na Sala</h3>
              <Badge variant="secondary" className="text-base px-3 py-1">
                {users.length} jogador{users.length !== 1 ? 'es' : ''}
              </Badge>
            </div>
            
            <div className="space-y-2">
              {users.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 italic">
                  Aguardando jogadores...
                </p>
              ) : (
                users.map((user, index) => (
                  <div 
                    key={user.id} 
                    className={`p-4 rounded-lg border transition-colors ${
                      user.id === socket?.id 
                        ? 'bg-primary/10 border-primary' 
                        : 'bg-secondary/30 border-border hover:bg-secondary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-lg">
                        {user.name}
                        {user.id === socket?.id && (
                          <span className="ml-2 text-primary font-semibold">(Você)</span>
                        )}
                      </span>
                      <Badge variant={user.id === socket?.id ? "default" : "outline"}>
                        #{index + 1}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-5 bg-secondary/30 rounded-lg border border-border text-center">
              <p className="text-muted-foreground">
                🎯 Compartilhe o código <strong className="text-primary text-xl mx-1">{currentRoom}</strong> com seus amigos!
              </p>
            </div>

            <Button 
              variant="destructive" 
              onClick={handleLeaveRoom}
              className="w-full text-base py-6"
            >
              🚪 Sair da Sala
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
