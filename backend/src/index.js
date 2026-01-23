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
      createdAt: new Date(),
      scores: {}, // Placar: { odId: pontos }
      gameState: null,
      gameTimer: null
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
    
    // Inicializa pontuação do jogador se não existir
    if (!(socket.id in room.scores)) {
      room.scores[socket.id] = 0;
    }
    
    // Adiciona o socket à room do Socket.io
    socket.join(roomCode);
    
    console.log(`Usuário ${socket.id} entrou na sala ${roomCode}`);
    
    // Notifica o usuário que entrou com sucesso
    socket.emit('joined-room', { 
      roomCode, 
      users: room.users,
      hostId: room.hostId,
      scores: room.scores
    });
    
    // Notifica todos os usuários da sala sobre o novo membro
    io.to(roomCode).emit('user-joined', { 
      userId: socket.id, 
      users: room.users,
      hostId: room.hostId,
      scores: room.scores
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
      duration: GAME_DURATION,
      // Sistema de acusação
      accusation: null, // { accuserId, accusedId, votes: { odId: bool } }
      // Votação final (quando tempo acaba)
      finalVoting: null, // { votes: { odId: votedForId }, isActive: bool }
      // Resultado do jogo
      gameEnded: false
    };
    
    // Timer para iniciar votação final automaticamente
    room.gameTimer = setTimeout(() => {
      if (room.gameState?.isPlaying && !room.gameState?.gameEnded) {
        // Inicia votação final
        room.gameState.finalVoting = {
          votes: {},
          isActive: true
        };
        
        console.log(`Tempo esgotado na sala ${roomCode} - Iniciando votação final`);
        
        io.to(roomCode).emit('voting-started', {
          roomCode,
          message: 'Tempo esgotado! Vote em quem você acha que é o espião.'
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
        duration: GAME_DURATION,
        scores: room.scores
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
      reason: 'host',
      scores: room.scores
    });
  });

  // ========== CHUTE DO ESPIÃO ==========
  // O espião tenta adivinhar o local
  socket.on('spy-guess', ({ roomCode, locationId }) => {
    const room = rooms.get(roomCode);
    
    if (!room || !room.gameState?.isPlaying) {
      socket.emit('error', { message: 'Partida não encontrada ou não está em andamento' });
      return;
    }
    
    // Verifica se é o espião
    if (room.gameState.spyId !== socket.id) {
      socket.emit('error', { message: 'Apenas o espião pode chutar o local' });
      return;
    }
    
    // Limpa timer
    if (room.gameTimer) {
      clearTimeout(room.gameTimer);
      room.gameTimer = null;
    }
    
    const guessedLocation = LOCATIONS.find(l => l.id === locationId);
    const correctLocation = room.gameState.location;
    const isCorrect = locationId === correctLocation.id;
    
    if (isCorrect) {
      // Espião acertou: +2 pontos para o espião
      room.scores[socket.id] = (room.scores[socket.id] || 0) + 2;
      console.log(`Espião acertou o local na sala ${roomCode}! +2 pontos`);
    } else {
      // Espião errou: +1 ponto para cada agente
      room.users.forEach(user => {
        if (user.id !== room.gameState.spyId) {
          room.scores[user.id] = (room.scores[user.id] || 0) + 1;
        }
      });
      console.log(`Espião errou o local na sala ${roomCode}! +1 ponto para agentes`);
    }
    
    const gameState = room.gameState;
    room.gameState = null;
    
    io.to(roomCode).emit('game-ended', {
      roomCode,
      spyId: gameState.spyId,
      spyName: room.users.find(u => u.id === gameState.spyId)?.name,
      location: gameState.location,
      reason: 'spy-guess',
      spyGuessedLocation: guessedLocation,
      spyGuessCorrect: isCorrect,
      scores: room.scores
    });
  });

  // ========== SISTEMA DE ACUSAÇÃO ==========
  // Qualquer jogador pode acusar outro (exceto a si mesmo)
  socket.on('start-accusation', ({ roomCode, accusedId }) => {
    const room = rooms.get(roomCode);
    
    if (!room || !room.gameState?.isPlaying) {
      socket.emit('error', { message: 'Partida não encontrada ou não está em andamento' });
      return;
    }
    
    // Não pode acusar a si mesmo
    if (accusedId === socket.id) {
      socket.emit('error', { message: 'Você não pode acusar a si mesmo' });
      return;
    }
    
    // Verifica se já há uma acusação em andamento
    if (room.gameState.accusation) {
      socket.emit('error', { message: 'Já existe uma acusação em andamento' });
      return;
    }
    
    // Verifica se o acusado existe na sala
    const accused = room.users.find(u => u.id === accusedId);
    if (!accused) {
      socket.emit('error', { message: 'Jogador não encontrado' });
      return;
    }
    
    // Inicia acusação - todos os agentes (exceto o acusado) devem votar
    room.gameState.accusation = {
      accuserId: socket.id,
      accusedId: accusedId,
      votes: {}
    };
    
    // O acusador automaticamente vota a favor
    room.gameState.accusation.votes[socket.id] = true;
    
    const accuser = room.users.find(u => u.id === socket.id);
    
    console.log(`Acusação iniciada na sala ${roomCode}: ${accuser?.name} acusou ${accused.name}`);
    
    io.to(roomCode).emit('accusation-started', {
      accuserId: socket.id,
      accuserName: accuser?.name,
      accusedId: accusedId,
      accusedName: accused.name,
      votes: room.gameState.accusation.votes
    });
  });

  // Votar em uma acusação (apenas agentes, exceto o acusado)
  socket.on('vote-accusation', ({ roomCode, vote }) => {
    const room = rooms.get(roomCode);
    
    if (!room || !room.gameState?.isPlaying || !room.gameState?.accusation) {
      socket.emit('error', { message: 'Não há acusação em andamento' });
      return;
    }
    
    const accusation = room.gameState.accusation;
    
    // Não pode votar se for o acusado
    if (socket.id === accusation.accusedId) {
      socket.emit('error', { message: 'O acusado não pode votar' });
      return;
    }
    
    // Espião não pode votar (só agentes votam)
    if (socket.id === room.gameState.spyId) {
      socket.emit('error', { message: 'O espião não pode votar na acusação' });
      return;
    }
    
    // Registra o voto
    accusation.votes[socket.id] = vote;
    
    // Calcula quantos agentes precisam votar (todos exceto o acusado e o espião)
    const agentsWhoCanVote = room.users.filter(u => 
      u.id !== accusation.accusedId && u.id !== room.gameState.spyId
    );
    const totalVotesNeeded = agentsWhoCanVote.length;
    const currentVotes = Object.keys(accusation.votes).length;
    
    io.to(roomCode).emit('accusation-vote-update', {
      odId: socket.id,
      odName: room.users.find(u => u.id === socket.id)?.name,
      vote: vote,
      votesCount: currentVotes,
      votesNeeded: totalVotesNeeded
    });
    
    // Verifica se todos votaram
    if (currentVotes >= totalVotesNeeded) {
      // Conta votos a favor
      const votesInFavor = Object.values(accusation.votes).filter(v => v === true).length;
      const allAgree = votesInFavor === totalVotesNeeded;
      
      if (allAgree) {
        // Todos concordam - verifica se o acusado é o espião
        const accusedIsSpy = accusation.accusedId === room.gameState.spyId;
        
        // Limpa timer
        if (room.gameTimer) {
          clearTimeout(room.gameTimer);
          room.gameTimer = null;
        }
        
        if (accusedIsSpy) {
          // Acusação correta! Agentes ganham pontos
          room.users.forEach(user => {
            if (user.id !== room.gameState.spyId) {
              // +1 ponto para todos os agentes
              room.scores[user.id] = (room.scores[user.id] || 0) + 1;
            }
          });
          // +2 pontos extras para quem fez a acusação
          room.scores[accusation.accuserId] = (room.scores[accusation.accuserId] || 0) + 2;
          
          console.log(`Acusação correta na sala ${roomCode}! Espião pego.`);
        } else {
          // Acusação errada - espião ganha 2 pontos
          room.scores[room.gameState.spyId] = (room.scores[room.gameState.spyId] || 0) + 2;
          
          console.log(`Acusação errada na sala ${roomCode}! Agente inocente acusado.`);
        }
        
        const gameState = room.gameState;
        room.gameState = null;
        
        io.to(roomCode).emit('game-ended', {
          roomCode,
          spyId: gameState.spyId,
          spyName: room.users.find(u => u.id === gameState.spyId)?.name,
          location: gameState.location,
          reason: 'accusation',
          accusedId: accusation.accusedId,
          accusedName: room.users.find(u => u.id === accusation.accusedId)?.name,
          accusedWasSpy: accusedIsSpy,
          accuserId: accusation.accuserId,
          accuserName: room.users.find(u => u.id === accusation.accuserId)?.name,
          scores: room.scores
        });
      } else {
        // Nem todos concordam - acusação falha, jogo continua
        room.gameState.accusation = null;
        
        console.log(`Acusação rejeitada na sala ${roomCode}`);
        
        io.to(roomCode).emit('accusation-failed', {
          votesInFavor,
          votesNeeded: totalVotesNeeded,
          message: 'Acusação rejeitada. O jogo continua.'
        });
      }
    }
  });

  // Cancelar acusação (apenas quem iniciou pode cancelar)
  socket.on('cancel-accusation', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    
    if (!room || !room.gameState?.accusation) {
      return;
    }
    
    if (room.gameState.accusation.accuserId !== socket.id) {
      socket.emit('error', { message: 'Apenas quem fez a acusação pode cancelar' });
      return;
    }
    
    room.gameState.accusation = null;
    
    io.to(roomCode).emit('accusation-cancelled', {
      message: 'Acusação cancelada'
    });
  });

  // ========== VOTAÇÃO FINAL ==========
  // Quando o tempo acaba, todos votam em quem acham que é o espião
  socket.on('final-vote', ({ roomCode, votedForId }) => {
    const room = rooms.get(roomCode);
    
    if (!room || !room.gameState?.finalVoting?.isActive) {
      socket.emit('error', { message: 'Votação não está ativa' });
      return;
    }
    
    // Não pode votar em si mesmo
    if (votedForId === socket.id) {
      socket.emit('error', { message: 'Você não pode votar em si mesmo' });
      return;
    }
    
    // Verifica se o votado existe
    const votedFor = room.users.find(u => u.id === votedForId);
    if (!votedFor) {
      socket.emit('error', { message: 'Jogador não encontrado' });
      return;
    }
    
    // Registra o voto
    room.gameState.finalVoting.votes[socket.id] = votedForId;
    
    const currentVotes = Object.keys(room.gameState.finalVoting.votes).length;
    const totalPlayers = room.users.length;
    
    io.to(roomCode).emit('final-vote-update', {
      odId: socket.id,
      odName: room.users.find(u => u.id === socket.id)?.name,
      votesCount: currentVotes,
      totalPlayers: totalPlayers
    });
    
    // Verifica se todos votaram
    if (currentVotes >= totalPlayers) {
      // Calcula pontos - quem votou no espião ganha 1 ponto
      const spyId = room.gameState.spyId;
      const votesResult = {};
      
      Object.entries(room.gameState.finalVoting.votes).forEach(([odId, votedForId]) => {
        if (votedForId === spyId) {
          room.scores[odId] = (room.scores[odId] || 0) + 1;
          votesResult[odId] = { votedCorrectly: true };
        } else {
          votesResult[odId] = { votedCorrectly: false };
        }
      });
      
      const gameState = room.gameState;
      room.gameState = null;
      
      console.log(`Votação final concluída na sala ${roomCode}`);
      
      io.to(roomCode).emit('game-ended', {
        roomCode,
        spyId: gameState.spyId,
        spyName: room.users.find(u => u.id === gameState.spyId)?.name,
        location: gameState.location,
        reason: 'final-vote',
        votesResult: votesResult,
        scores: room.scores
      });
    }
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
            hostId: room.hostId,
            scores: room.scores
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