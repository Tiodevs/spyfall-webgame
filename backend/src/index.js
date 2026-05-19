const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const httpServer = createServer(app);

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
const GRACE_PERIOD_MS = 90 * 1000;
const GAME_DURATION = 6 * 60 * 1000;

const rooms = new Map();

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

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (rooms.has(code)) {
    return generateRoomCode();
  }
  return code;
}

function getRoomsList() {
  return Array.from(rooms.values()).map(room => ({
    code: room.code,
    userCount: room.users.filter(u => u.connected).length,
    createdAt: room.createdAt
  }));
}

function validateUserName(userName) {
  if (!userName || userName.trim().length === 0) {
    return 'Nome de usuário é obrigatório';
  }
  if (userName.trim().length < 2 || userName.trim().length > 20) {
    return 'Nome deve ter entre 2 e 20 caracteres';
  }
  return null;
}

function serializeUser(user, room) {
  return {
    playerId: user.playerId,
    id: user.playerId,
    socketId: user.socketId,
    name: user.name,
    isHost: room.hostId === user.playerId,
    connected: user.connected,
    joinedAt: user.joinedAt
  };
}

function serializeUsers(room) {
  return room.users.map(u => serializeUser(u, room));
}

function findUserBySocket(room, socketId) {
  return room.users.find(u => u.socketId === socketId);
}

function findUserByPlayerId(room, playerId) {
  return room.users.find(u => u.playerId === playerId);
}

function getPlayerIdFromSocket(room, socketId) {
  return findUserBySocket(room, socketId)?.playerId;
}

function getConnectedUsers(room) {
  return room.users.filter(u => u.connected);
}

function getConnectedCount(room) {
  return getConnectedUsers(room).length;
}

function clearGameTimer(room) {
  if (room.gameTimer) {
    clearTimeout(room.gameTimer);
    room.gameTimer = null;
  }
}

function cancelDisconnectTimer(room, playerId) {
  if (room.disconnectTimers?.[playerId]) {
    clearTimeout(room.disconnectTimers[playerId]);
    delete room.disconnectTimers[playerId];
  }
}

function migrateHost(room) {
  const connected = getConnectedUsers(room).sort(
    (a, b) => new Date(a.joinedAt) - new Date(b.joinedAt)
  );
  room.hostId = connected.length > 0 ? connected[0].playerId : null;
}

function buildRoomSync(room, playerId) {
  const gs = room.gameState;
  let game = null;

  if (gs?.isPlaying) {
    const isSpy = gs.spyId === playerId;
    game = {
      isPlaying: true,
      startedAt: gs.startedAt,
      duration: gs.duration,
      playersCount: getConnectedCount(room),
      isSpy,
      location: isSpy ? null : gs.location,
      accusation: gs.accusation
        ? {
            accuserId: gs.accusation.accuserId,
            accuserName: room.users.find(u => u.playerId === gs.accusation.accuserId)?.name,
            accusedId: gs.accusation.accusedId,
            accusedName: room.users.find(u => u.playerId === gs.accusation.accusedId)?.name,
            votes: { ...gs.accusation.votes }
          }
        : null,
      finalVoting: gs.finalVoting?.isActive
        ? {
            isActive: true,
            votesCount: Object.keys(gs.finalVoting.votes).length,
            totalPlayers: getConnectedCount(room),
            myVote: gs.finalVoting.votes[playerId] ?? null
          }
        : null
    };
  }

  return {
    roomCode: room.code,
    users: serializeUsers(room),
    hostId: room.hostId,
    scores: { ...room.scores },
    game
  };
}

function emitRoomSync(targetSocket, room, playerId) {
  targetSocket.emit('room-sync', buildRoomSync(room, playerId));
}

function broadcastRoomState(room, roomCode) {
  room.users.forEach(user => {
    if (user.connected && user.socketId) {
      const sock = io.sockets.sockets.get(user.socketId);
      if (sock) {
        emitRoomSync(sock, room, user.playerId);
      }
    }
  });
}

function getAccusationVoteStats(room, accusation) {
  const agentsWhoCanVote = room.users.filter(
    u =>
      u.connected &&
      u.playerId !== accusation.accusedId &&
      u.playerId !== room.gameState.spyId
  );
  const totalVotesNeeded = agentsWhoCanVote.length;
  const currentVotes = Object.keys(accusation.votes).length;
  return { agentsWhoCanVote, totalVotesNeeded, currentVotes };
}

function tryResolveAccusation(room, roomCode) {
  const accusation = room.gameState?.accusation;
  if (!accusation) return;

  const { totalVotesNeeded, currentVotes } = getAccusationVoteStats(room, accusation);

  if (currentVotes < totalVotesNeeded) return;

  const votesInFavor = Object.values(accusation.votes).filter(v => v === true).length;
  const allAgree = votesInFavor === totalVotesNeeded;

  if (allAgree) {
    const accusedIsSpy = accusation.accusedId === room.gameState.spyId;
    clearGameTimer(room);

    if (accusedIsSpy) {
      room.users.forEach(user => {
        if (
          user.playerId !== room.gameState.spyId &&
          user.playerId !== accusation.accuserId &&
          accusation.votes[user.playerId] === true
        ) {
          room.scores[user.playerId] = (room.scores[user.playerId] || 0) + 1;
        }
      });
      room.scores[accusation.accuserId] = (room.scores[accusation.accuserId] || 0) + 2;
    } else {
      room.scores[room.gameState.spyId] = (room.scores[room.gameState.spyId] || 0) + 2;
    }

    endGame(room, roomCode, 'accusation', {
      accusedId: accusation.accusedId,
      accusedName: room.users.find(u => u.playerId === accusation.accusedId)?.name,
      accusedWasSpy: accusedIsSpy,
      accuserId: accusation.accuserId,
      accuserName: room.users.find(u => u.playerId === accusation.accuserId)?.name
    });
  } else {
    room.gameState.accusation = null;
    io.to(roomCode).emit('accusation-failed', {
      votesInFavor,
      votesNeeded: totalVotesNeeded,
      message: 'Acusação rejeitada. O jogo continua.'
    });
  }
}

function tryCompleteFinalVoting(room, roomCode) {
  const finalVoting = room.gameState?.finalVoting;
  if (!finalVoting?.isActive) return;

  const eligibleVoters = getConnectedUsers(room);
  const votesFromEligible = eligibleVoters.filter(
    u => finalVoting.votes[u.playerId] !== undefined
  ).length;

  if (votesFromEligible < eligibleVoters.length) return;

  const spyId = room.gameState.spyId;
  const votesResult = {};

  Object.entries(finalVoting.votes).forEach(([voterId, targetId]) => {
    if (targetId === spyId) {
      room.scores[voterId] = (room.scores[voterId] || 0) + 1;
      votesResult[voterId] = { votedCorrectly: true };
    } else {
      votesResult[voterId] = { votedCorrectly: false };
    }
  });

  endGame(room, roomCode, 'final-vote', { votesResult });
}

function endGame(room, roomCode, reason, extra = {}) {
  clearGameTimer(room);
  const gameState = room.gameState;
  room.gameState = null;

  const spyUser = room.users.find(u => u.playerId === gameState?.spyId);

  io.to(roomCode).emit('game-ended', {
    roomCode,
    spyId: gameState?.spyId,
    spyName: spyUser?.name,
    location: gameState?.location,
    reason,
    scores: room.scores,
    ...extra
  });
}

function handleAccusationOnPlayerRemoval(room, roomCode, removedPlayerId) {
  const accusation = room.gameState?.accusation;
  if (!accusation) return;

  if (
    accusation.accuserId === removedPlayerId ||
    accusation.accusedId === removedPlayerId
  ) {
    room.gameState.accusation = null;
    io.to(roomCode).emit('accusation-cancelled', {
      message: 'Acusação cancelada (jogador saiu da sala).'
    });
    return;
  }

  delete accusation.votes[removedPlayerId];
  tryResolveAccusation(room, roomCode);
}

function deleteRoom(room, roomCode) {
  clearGameTimer(room);
  if (room.disconnectTimers) {
    Object.values(room.disconnectTimers).forEach(t => clearTimeout(t));
  }
  rooms.delete(roomCode);
}

function removePlayerFromRoom(
  room,
  roomCode,
  playerId,
  { skipSocketLeave = false, spyLeaveReason = 'spy-left' } = {}
) {
  const userIndex = room.users.findIndex(u => u.playerId === playerId);
  if (userIndex === -1) return;

  const user = room.users[userIndex];
  cancelDisconnectTimer(room, playerId);

  const wasSpy =
    room.gameState?.isPlaying && room.gameState.spyId === playerId;
  const spyNameForEnd = wasSpy ? user.name : undefined;
  const wasHost = room.hostId === playerId;

  if (room.gameState?.finalVoting?.votes) {
    delete room.gameState.finalVoting.votes[playerId];
  }

  handleAccusationOnPlayerRemoval(room, roomCode, playerId);

  room.users.splice(userIndex, 1);

  if (!skipSocketLeave && user.socketId) {
    const sock = io.sockets.sockets.get(user.socketId);
    if (sock) {
      sock.leave(roomCode);
      delete sock.data.roomCode;
      delete sock.data.playerId;
    }
  }

  if (wasHost) {
    migrateHost(room);
  }

  if (room.users.length === 0) {
    deleteRoom(room, roomCode);
    io.emit('rooms-updated', getRoomsList());
    return;
  }

  if (wasSpy && room.gameState?.isPlaying) {
    endGame(room, roomCode, spyLeaveReason, { spyName: spyNameForEnd });
    io.emit('rooms-updated', getRoomsList());
    return;
  }

  tryCompleteFinalVoting(room, roomCode);

  const payload = {
    playerId,
    users: serializeUsers(room),
    hostId: room.hostId,
    scores: room.scores,
    playersCount: getConnectedCount(room),
    gameActive: !!room.gameState?.isPlaying
  };

  io.to(roomCode).emit('user-left', payload);
  io.emit('rooms-updated', getRoomsList());
}

function scheduleDisconnectRemoval(room, roomCode, playerId) {
  if (!room.disconnectTimers) {
    room.disconnectTimers = {};
  }
  cancelDisconnectTimer(room, playerId);

  room.disconnectTimers[playerId] = setTimeout(() => {
    delete room.disconnectTimers[playerId];
    const current = findUserByPlayerId(room, playerId);
    if (!current || current.connected) return;

    removePlayerFromRoom(room, roomCode, playerId, {
      skipSocketLeave: true,
      spyLeaveReason: 'spy-disconnected'
    });
  }, GRACE_PERIOD_MS);
}

function attachUserToSocket(socket, room, roomCode, user) {
  if (user.socketId && user.socketId !== socket.id) {
    const oldSocket = io.sockets.sockets.get(user.socketId);
    if (oldSocket) {
      oldSocket.emit('error', { message: 'Sessão aberta em outro dispositivo' });
      oldSocket.leave(roomCode);
      delete oldSocket.data.roomCode;
      delete oldSocket.data.playerId;
    }
  }

  user.socketId = socket.id;
  user.connected = true;
  user.disconnectedAt = null;
  user.name = user.name; // preserve; updated on join if needed

  cancelDisconnectTimer(room, user.playerId);
  socket.join(roomCode);
  socket.data.roomCode = roomCode;
  socket.data.playerId = user.playerId;
}

function addOrRejoinUser(socket, room, roomCode, playerId, userName) {
  const nameError = validateUserName(userName);
  if (nameError) {
    socket.emit('error', { message: nameError });
    return false;
  }

  const trimmedName = userName.trim();
  let user = findUserByPlayerId(room, playerId);

  if (user) {
    if (user.connected && user.socketId !== socket.id) {
      const existingSocket = findUserBySocket(room, socket.id);
      if (existingSocket && existingSocket.playerId !== playerId) {
        socket.emit('error', { message: 'Você já está nesta sala com outra sessão' });
        return false;
      }
    }
    user.name = trimmedName;
    attachUserToSocket(socket, room, roomCode, user);
    return true;
  }

  if (room.gameState?.isPlaying) {
    socket.emit('error', { message: 'Partida em andamento. Não é possível entrar agora.' });
    return false;
  }

  const alreadyConnected = room.users.some(
    u => u.connected && u.socketId === socket.id
  );
  if (alreadyConnected) {
    socket.emit('error', { message: 'Você já está nesta sala' });
    return false;
  }

  if (!room.hostId) {
    room.hostId = playerId;
  }

  user = {
    playerId,
    socketId: socket.id,
    name: trimmedName,
    connected: true,
    disconnectedAt: null,
    joinedAt: new Date()
  };
  room.users.push(user);

  if (!(playerId in room.scores)) {
    room.scores[playerId] = 0;
  }

  attachUserToSocket(socket, room, roomCode, user);
  return true;
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

app.get('/api/rooms', (req, res) => {
  res.json(getRoomsList());
});

app.get('/', (req, res) => {
  res.json({
    message: 'Spyfall Backend API',
    status: 'running',
    rooms: rooms.size
  });
});

io.on('connection', (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  socket.on('create-room', () => {
    const roomCode = generateRoomCode();
    const room = {
      code: roomCode,
      users: [],
      hostId: null,
      createdAt: new Date(),
      scores: {},
      gameState: null,
      gameTimer: null,
      disconnectTimers: {}
    };
    rooms.set(roomCode, room);

    console.log(`Sala criada: ${roomCode}`);
    socket.emit('room-created', { roomCode });
    io.emit('rooms-updated', getRoomsList());
  });

  socket.on('join-room', ({ roomCode, userName, playerId }) => {
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', { message: 'Sala não encontrada' });
      return;
    }

    if (!playerId) {
      socket.emit('error', { message: 'Identificador de jogador inválido' });
      return;
    }

    const isNewJoin = !findUserByPlayerId(room, playerId);
    if (!addOrRejoinUser(socket, room, roomCode, playerId, userName)) {
      return;
    }

    console.log(`Jogador ${playerId} entrou/reentrou na sala ${roomCode}`);

    emitRoomSync(socket, room, playerId);

    if (isNewJoin) {
      socket.to(roomCode).emit('user-joined', {
        playerId,
        users: serializeUsers(room),
        hostId: room.hostId,
        scores: room.scores,
        playersCount: getConnectedCount(room)
      });
    } else {
      socket.to(roomCode).emit('player-reconnected', {
        playerId,
        users: serializeUsers(room),
        hostId: room.hostId,
        scores: room.scores
      });
    }

    io.emit('rooms-updated', getRoomsList());
  });

  socket.on('rejoin-room', ({ roomCode, userName, playerId }) => {
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', { message: 'Sala não encontrada' });
      return;
    }

    if (!playerId) {
      socket.emit('error', { message: 'Identificador de jogador inválido' });
      return;
    }

    const user = findUserByPlayerId(room, playerId);
    if (!user) {
      socket.emit('error', { message: 'Você não está nesta sala' });
      return;
    }

    if (!addOrRejoinUser(socket, room, roomCode, playerId, userName || user.name)) {
      return;
    }

    console.log(`Jogador ${playerId} reentrou na sala ${roomCode}`);
    emitRoomSync(socket, room, playerId);

    socket.to(roomCode).emit('player-reconnected', {
      playerId,
      users: serializeUsers(room),
      hostId: room.hostId,
      scores: room.scores
    });
  });

  socket.on('leave-room', ({ roomCode } = {}) => {
    const code = roomCode || socket.data.roomCode;
    const playerId = socket.data.playerId;

    if (!code || !playerId) return;

    const room = rooms.get(code);
    if (!room) return;

    removePlayerFromRoom(room, code, playerId);
  });

  socket.on('start-game', ({ roomCode }) => {
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', { message: 'Sala não encontrada' });
      return;
    }

    const playerId = getPlayerIdFromSocket(room, socket.id);
    if (room.hostId !== playerId) {
      socket.emit('error', { message: 'Apenas o host pode iniciar a partida' });
      return;
    }

    if (room.gameState?.isPlaying) {
      socket.emit('error', { message: 'Já existe uma partida em andamento' });
      return;
    }

    const connectedUsers = getConnectedUsers(room);
    if (connectedUsers.length < 3) {
      socket.emit('error', { message: 'São necessários pelo menos 3 jogadores conectados' });
      return;
    }

    const spyIndex = Math.floor(Math.random() * connectedUsers.length);
    const spyId = connectedUsers[spyIndex].playerId;

    const locationIndex = Math.floor(Math.random() * LOCATIONS.length);
    const location = LOCATIONS[locationIndex];
    const startedAt = Date.now();

    room.gameState = {
      isPlaying: true,
      spyId,
      location,
      startedAt,
      duration: GAME_DURATION,
      accusation: null,
      finalVoting: null,
      gameEnded: false
    };

    room.gameTimer = setTimeout(() => {
      if (room.gameState?.isPlaying && !room.gameState?.gameEnded) {
        room.gameState.finalVoting = {
          votes: {},
          isActive: true
        };

        console.log(`Tempo esgotado na sala ${roomCode} - Iniciando votação final`);

        io.to(roomCode).emit('voting-started', {
          roomCode,
          message: 'Tempo esgotado! Vote em quem você acha que é o espião.',
          totalPlayers: getConnectedCount(room)
        });
      }
    }, GAME_DURATION);

    console.log(`Partida iniciada na sala ${roomCode}. Espião: ${spyId}, Local: ${location.name}`);

    broadcastRoomState(room, roomCode);
  });

  socket.on('end-game', ({ roomCode }) => {
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', { message: 'Sala não encontrada' });
      return;
    }

    const playerId = getPlayerIdFromSocket(room, socket.id);
    if (room.hostId !== playerId) {
      socket.emit('error', { message: 'Apenas o host pode encerrar a partida' });
      return;
    }

    endGame(room, roomCode, 'host');
  });

  socket.on('spy-guess', ({ roomCode, locationId }) => {
    const room = rooms.get(roomCode);

    if (!room || !room.gameState?.isPlaying) {
      socket.emit('error', { message: 'Partida não encontrada ou não está em andamento' });
      return;
    }

    const playerId = getPlayerIdFromSocket(room, socket.id);
    if (room.gameState.spyId !== playerId) {
      socket.emit('error', { message: 'Apenas o espião pode chutar o local' });
      return;
    }

    clearGameTimer(room);

    const guessedLocation = LOCATIONS.find(l => l.id === locationId);
    const correctLocation = room.gameState.location;
    const isCorrect = locationId === correctLocation.id;

    if (isCorrect) {
      room.scores[playerId] = (room.scores[playerId] || 0) + 2;
    } else {
      room.users.forEach(user => {
        if (user.playerId !== room.gameState.spyId) {
          room.scores[user.playerId] = (room.scores[user.playerId] || 0) + 1;
        }
      });
    }

    const gameState = room.gameState;
    room.gameState = null;

    io.to(roomCode).emit('game-ended', {
      roomCode,
      spyId: gameState.spyId,
      spyName: room.users.find(u => u.playerId === gameState.spyId)?.name,
      location: gameState.location,
      reason: 'spy-guess',
      spyGuessedLocation: guessedLocation,
      spyGuessCorrect: isCorrect,
      scores: room.scores
    });
  });

  socket.on('start-accusation', ({ roomCode, accusedId }) => {
    const room = rooms.get(roomCode);

    if (!room || !room.gameState?.isPlaying) {
      socket.emit('error', { message: 'Partida não encontrada ou não está em andamento' });
      return;
    }

    const playerId = getPlayerIdFromSocket(room, socket.id);
    if (!playerId) return;

    if (accusedId === playerId) {
      socket.emit('error', { message: 'Você não pode acusar a si mesmo' });
      return;
    }

    if (room.gameState.accusation) {
      socket.emit('error', { message: 'Já existe uma acusação em andamento' });
      return;
    }

    const accused = room.users.find(u => u.playerId === accusedId && u.connected);
    if (!accused) {
      socket.emit('error', { message: 'Jogador não encontrado' });
      return;
    }

    room.gameState.accusation = {
      accuserId: playerId,
      accusedId,
      votes: {}
    };

    room.gameState.accusation.votes[playerId] = true;

    const accuser = findUserByPlayerId(room, playerId);

    io.to(roomCode).emit('accusation-started', {
      accuserId: playerId,
      accuserName: accuser?.name,
      accusedId,
      accusedName: accused.name,
      votes: { ...room.gameState.accusation.votes }
    });
  });

  socket.on('vote-accusation', ({ roomCode, vote }) => {
    const room = rooms.get(roomCode);

    if (!room || !room.gameState?.isPlaying || !room.gameState?.accusation) {
      socket.emit('error', { message: 'Não há acusação em andamento' });
      return;
    }

    const playerId = getPlayerIdFromSocket(room, socket.id);
    if (!playerId) return;

    const accusation = room.gameState.accusation;

    if (playerId === accusation.accusedId) {
      socket.emit('error', { message: 'O acusado não pode votar' });
      return;
    }

    if (playerId === room.gameState.spyId) {
      socket.emit('error', { message: 'O espião não pode votar na acusação' });
      return;
    }

    const voter = findUserByPlayerId(room, playerId);
    if (!voter?.connected) {
      socket.emit('error', { message: 'Você precisa estar conectado para votar' });
      return;
    }

    accusation.votes[playerId] = vote;

    const { totalVotesNeeded, currentVotes } = getAccusationVoteStats(room, accusation);

    io.to(roomCode).emit('accusation-vote-update', {
      playerId,
      playerName: voter.name,
      vote,
      votesCount: currentVotes,
      votesNeeded: totalVotesNeeded,
      votes: { ...accusation.votes }
    });

    tryResolveAccusation(room, roomCode);
  });

  socket.on('cancel-accusation', ({ roomCode }) => {
    const room = rooms.get(roomCode);

    if (!room || !room.gameState?.accusation) {
      return;
    }

    const playerId = getPlayerIdFromSocket(room, socket.id);
    if (room.gameState.accusation.accuserId !== playerId) {
      socket.emit('error', { message: 'Apenas quem fez a acusação pode cancelar' });
      return;
    }

    room.gameState.accusation = null;

    io.to(roomCode).emit('accusation-cancelled', {
      message: 'Acusação cancelada'
    });
  });

  socket.on('final-vote', ({ roomCode, votedForId }) => {
    const room = rooms.get(roomCode);

    if (!room || !room.gameState?.finalVoting?.isActive) {
      socket.emit('error', { message: 'Votação não está ativa' });
      return;
    }

    const playerId = getPlayerIdFromSocket(room, socket.id);
    if (!playerId) return;

    if (votedForId === playerId) {
      socket.emit('error', { message: 'Você não pode votar em si mesmo' });
      return;
    }

    const votedFor = room.users.find(u => u.playerId === votedForId && u.connected);
    if (!votedFor) {
      socket.emit('error', { message: 'Jogador não encontrado' });
      return;
    }

    const voter = findUserByPlayerId(room, playerId);
    if (!voter?.connected) {
      socket.emit('error', { message: 'Você precisa estar conectado para votar' });
      return;
    }

    room.gameState.finalVoting.votes[playerId] = votedForId;

    const eligibleVoters = getConnectedUsers(room);
    const votesFromEligible = eligibleVoters.filter(
      u => room.gameState.finalVoting.votes[u.playerId] !== undefined
    ).length;

    io.to(roomCode).emit('final-vote-update', {
      playerId,
      playerName: voter.name,
      votesCount: votesFromEligible,
      totalPlayers: eligibleVoters.length
    });

    tryCompleteFinalVoting(room, roomCode);
  });

  socket.on('disconnect', () => {
    console.log(`Usuário desconectado: ${socket.id}`);

    const roomCode = socket.data.roomCode;
    const playerId = socket.data.playerId;

    if (!roomCode || !playerId) {
      rooms.forEach((room, code) => {
        const user = findUserBySocket(room, socket.id);
        if (user) {
          user.connected = false;
          user.disconnectedAt = Date.now();
          user.socketId = null;

          io.to(code).emit('player-disconnected', {
            playerId: user.playerId,
            users: serializeUsers(room),
            hostId: room.hostId,
            scores: room.scores,
            playersCount: getConnectedCount(room)
          });

          scheduleDisconnectRemoval(room, code, user.playerId);
        }
      });
      return;
    }

    const room = rooms.get(roomCode);
    if (!room) return;

    const user = findUserByPlayerId(room, playerId);
    if (!user) return;

    user.connected = false;
    user.disconnectedAt = Date.now();
    user.socketId = null;

    delete socket.data.roomCode;
    delete socket.data.playerId;

    io.to(roomCode).emit('player-disconnected', {
      playerId,
      users: serializeUsers(room),
      hostId: room.hostId,
      scores: room.scores,
      playersCount: getConnectedCount(room),
      gameActive: !!room.gameState?.isPlaying
    });

    scheduleDisconnectRemoval(room, roomCode, playerId);
  });
});

httpServer.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
