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

// Lista de locais para o jogo Spyfall
const LOCATIONS = [
  { id: 1, name: 'Aeroporto', icon: '✈️' },
  { id: 2, name: 'Banco', icon: '🏦' },
  { id: 3, name: 'Praia', icon: '🏖️' },
  { id: 4, name: 'Cassino', icon: '🎰' },
  { id: 5, name: 'Circo', icon: '🎪' },
  { id: 6, name: 'Hospital', icon: '🏥' },
  { id: 7, name: 'Hotel', icon: '🏨' },
  { id: 8, name: 'Escola', icon: '🏫' },
  { id: 9, name: 'Restaurante', icon: '🍽️' },
  { id: 10, name: 'Supermercado', icon: '🛒' },
  { id: 11, name: 'Teatro', icon: '🎭' },
  { id: 12, name: 'Museu', icon: '🏛️' },
  { id: 13, name: 'Estádio de Futebol', icon: '⚽' },
  { id: 14, name: 'Delegacia', icon: '🚔' },
  { id: 15, name: 'Navio Cruzeiro', icon: '🚢' },
  { id: 16, name: 'Spa', icon: '💆' },
  { id: 17, name: 'Estação Espacial', icon: '🚀' },
  { id: 18, name: 'Submarino', icon: '🛥️' },
  { id: 19, name: 'Base Militar', icon: '🎖️' },
  { id: 20, name: 'Igreja', icon: '⛪' },
  { id: 21, name: 'Universidade', icon: '🎓' },
  { id: 22, name: 'Fazenda', icon: '🌾' },
  { id: 23, name: 'Estúdio de TV', icon: '📺' },
  { id: 24, name: 'Parque de Diversões', icon: '🎡' },
];

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

  // Iniciar partida (apenas host pode fazer isso)
  socket.on('start-game', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Sala não encontrada' });
      return;
    }
    
    // Verifica se é o host
    if (room.hostId !== socket.id) {
      socket.emit('error', { message: 'Apenas o host pode iniciar a partida' });
      return;
    }
    
    // Verifica se há jogadores suficientes (mínimo 3)
    if (room.users.length < 3) {
      socket.emit('error', { message: 'São necessários pelo menos 3 jogadores' });
      return;
    }
    
    // Sorteia o espião
    const spyIndex = Math.floor(Math.random() * room.users.length);
    const spyId = room.users[spyIndex].id;
    
    // Sorteia o local
    const locationIndex = Math.floor(Math.random() * LOCATIONS.length);
    const location = LOCATIONS[locationIndex];
    
    // Duração da partida em milissegundos (6 minutos)
    const GAME_DURATION = 6 * 60 * 1000;
    const startedAt = Date.now();
    
    // Armazena estado do jogo na sala
    room.gameState = {
      isPlaying: true,
      spyId: spyId,
      location: location,
      startedAt: startedAt,
      duration: GAME_DURATION
    };
    
    // Timer para encerrar automaticamente
    room.gameTimer = setTimeout(() => {
      if (room.gameState?.isPlaying) {
        const gameState = room.gameState;
        room.gameState = null;
        room.gameTimer = null;
        
        console.log(`Partida encerrada automaticamente na sala ${roomCode} (tempo esgotado)`);
        
        io.to(roomCode).emit('game-ended', {
          roomCode,
          spyId: gameState?.spyId,
          spyName: room.users.find(u => u.id === gameState?.spyId)?.name,
          location: gameState?.location,
          reason: 'timeout'
        });
      }
    }, GAME_DURATION);
    
    console.log(`Partida iniciada na sala ${roomCode}. Espião: ${spyId}, Local: ${location.name}`);
    
    // Envia para cada jogador seu papel
    room.users.forEach(user => {
      const isSpy = user.id === spyId;
      
      io.to(user.socketId).emit('game-started', {
        roomCode,
        isSpy,
        location: isSpy ? null : location,
        playersCount: room.users.length,
        startedAt: startedAt,
        duration: GAME_DURATION
      });
    });
  });

  // Encerrar partida
  socket.on('end-game', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Sala não encontrada' });
      return;
    }
    
    // Verifica se é o host
    if (room.hostId !== socket.id) {
      socket.emit('error', { message: 'Apenas o host pode encerrar a partida' });
      return;
    }
    
    // Limpa o timer se existir
    if (room.gameTimer) {
      clearTimeout(room.gameTimer);
      room.gameTimer = null;
    }
    
    // Limpa estado do jogo
    const gameState = room.gameState;
    room.gameState = null;
    
    console.log(`Partida encerrada na sala ${roomCode}`);
    
    // Notifica todos os jogadores
    io.to(roomCode).emit('game-ended', {
      roomCode,
      spyId: gameState?.spyId,
      spyName: room.users.find(u => u.id === gameState?.spyId)?.name,
      location: gameState?.location,
      reason: 'host'
    });
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
          // Limpa o timer se existir
          if (room.gameTimer) {
            clearTimeout(room.gameTimer);
          }
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