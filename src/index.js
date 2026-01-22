const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const port = 3000;

// Middleware para servir arquivos estáticos
app.use(express.static('public'));
app.use(express.json());

// Armazenamento em memória das salas
// Estrutura: { roomCode: { code: string, users: [{ id: string, socketId: string }], createdAt: Date } }
const rooms = new Map();

// Função auxiliar para gerar código de sala (4 letras maiúsculas)
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Verifica se o código já existe
  if (rooms.has(code)) {
    return generateRoomCode();
  }
  return code;
}

// Função auxiliar para obter lista de salas
function getRoomsList() {
  return Array.from(rooms.values()).map(room => ({
    code: room.code,
    userCount: room.users.length,
    createdAt: room.createdAt
  }));
}

// API endpoint para listar salas
app.get('/api/rooms', (req, res) => {
  res.json(getRoomsList());
});

app.get('/', (req, res) => {
  res.send('Olá, Node.js!');
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  // Criar nova sala
  socket.on('create-room', () => {
    const roomCode = generateRoomCode();
    const room = {
      code: roomCode,
      users: [],
      createdAt: new Date()
    };
    rooms.set(roomCode, room);
    
    console.log(`Sala criada: ${roomCode}`);
    
    // Retorna o código da sala para o criador
    socket.emit('room-created', { roomCode });
    
    // Notifica todos os clientes conectados sobre a nova sala
    io.emit('rooms-updated', getRoomsList());
  });

  // Entrar em uma sala
  socket.on('join-room', (roomCode) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Sala não encontrada' });
      return;
    }
    
    // Verifica se o usuário já está na sala
    const userExists = room.users.find(u => u.socketId === socket.id);
    if (userExists) {
      socket.emit('error', { message: 'Você já está nesta sala' });
      return;
    }
    
    // Adiciona usuário à sala
    const user = {
      id: socket.id,
      socketId: socket.id,
      joinedAt: new Date()
    };
    room.users.push(user);
    
    // Adiciona o socket à room do Socket.io
    socket.join(roomCode);
    
    console.log(`Usuário ${socket.id} entrou na sala ${roomCode}`);
    
    // Notifica o usuário que entrou com sucesso
    socket.emit('joined-room', { 
      roomCode, 
      users: room.users 
    });
    
    // Notifica todos os usuários da sala sobre o novo membro
    io.to(roomCode).emit('user-joined', { 
      userId: socket.id, 
      users: room.users 
    });
    
    // Atualiza lista de salas para todos
    io.emit('rooms-updated', getRoomsList());
  });

  socket.on('disconnect', () => {
    console.log(`Usuário desconectado: ${socket.id}`);
    
    // Remove o usuário de todas as salas
    rooms.forEach((room, roomCode) => {
      const userIndex = room.users.findIndex(u => u.socketId === socket.id);
      
      if (userIndex !== -1) {
        room.users.splice(userIndex, 1);
        console.log(`Usuário ${socket.id} removido da sala ${roomCode}`);
        
        // Se a sala ficou vazia, remove a sala
        if (room.users.length === 0) {
          rooms.delete(roomCode);
          console.log(`Sala ${roomCode} removida (vazia)`);
        } else {
          // Notifica os usuários restantes na sala
          io.to(roomCode).emit('user-left', { 
            userId: socket.id, 
            users: room.users 
          });
        }
        
        // Atualiza lista de salas para todos
        io.emit('rooms-updated', getRoomsList());
      }
    });
  });
});

httpServer.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});