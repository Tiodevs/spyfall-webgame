import { useState, useEffect } from 'react';
import { useRoom } from '../contexts/RoomContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Users, Share2, LogOut } from 'lucide-react';

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
        <CardHeader className="text-center border-b border-zinc-800">
          <div className="space-y-2">
            <p className="text-sm text-zinc-400 uppercase tracking-wider">Código da Sala</p>
            <CardTitle className="text-5xl font-bold text-[#01DEB2] tracking-widest">
              {currentRoom}
            </CardTitle>
            <p className="text-zinc-400">
              Bem-vindo, <strong className="text-zinc-100">{userName}</strong>!
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="space-y-6">
            {status && (
              <div className="p-4 bg-[#01DEB2]/10 border border-[#01DEB2]/30 rounded-lg text-center text-[#01DEB2] font-medium animate-pulse">
                {status}
              </div>
            )}

            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" />
                Jogadores na Sala
              </h3>
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
                        ? 'bg-[#01DEB2]/10 border-[#01DEB2]/30' 
                        : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-lg text-zinc-100">
                        {user.name}
                        {user.id === socket?.id && (
                          <span className="ml-2 text-[#01DEB2] font-semibold">(Você)</span>
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

            <Button 
              variant="destructive" 
              onClick={handleLeaveRoom}
              className="w-full text-base py-6"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Sair da Sala
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
