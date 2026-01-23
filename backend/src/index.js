const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const httpServer = createServer(app);

// Configuração do Socket.io com CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://localhost:3000'];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const port = process.env.PORT || 3000;

// Middleware CORS para Express
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

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

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Spyfall Backend API',
    status: 'running',
    rooms: rooms.size
  });
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
      hostId: socket.id,
      createdAt: new Date()
    };
    rooms.set(roomCode, room);
    
    console.log(`Sala criada: ${roomCode} (host: ${socket.id})`);
    
    // Retorna o código da sala para o criador
    socket.emit('room-created', { roomCode, hostId: socket.id });
    
    // Notifica todos os clientes conectados sobre a nova sala
    io.emit('rooms-updated', getRoomsList());
  });

  // Entrar em uma sala
  socket.on('join-room', ({ roomCode, userName }) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Sala não encontrada' });
      return;
    }
    
    // Validação do nome
    if (!userName || userName.trim().length === 0) {
      socket.emit('error', { message: 'Nome de usuário é obrigatório' });
      return;
    }

    if (userName.trim().length < 2 || userName.trim().length > 20) {
      socket.emit('error', { message: 'Nome deve ter entre 2 e 20 caracteres' });
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
      name: userName.trim(),
      isHost: room.hostId === socket.id,
      joinedAt: new Date()
    };
    room.users.push(user);
    
    // Adiciona o socket à room do Socket.io
    socket.join(roomCode);
    
    console.log(`Usuário ${socket.id} entrou na sala ${roomCode}`);
    
    // Notifica o usuário que entrou com sucesso
    socket.emit('joined-room', { 
      roomCode, 
      users: room.users,
      hostId: room.hostId
    });
    
    // Notifica todos os usuários da sala sobre o novo membro
    io.to(roomCode).emit('user-joined', { 
      userId: socket.id, 
      users: room.users,
      hostId: room.hostId
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
            users: room.users,
            hostId: room.hostId
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