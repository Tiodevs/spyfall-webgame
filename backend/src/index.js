import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { isValidGameType, GAME_TYPES } from '../../shared/catalog.js';
import { getEngine, listEngines } from './games/index.js';

dotenv.config();

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

const rooms = new Map();

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

function getRoomsList(gameType) {
  return Array.from(rooms.values())
    .filter(room => !gameType || room.gameType === gameType)
    .map(room => ({
      code: room.code,
      gameType: room.gameType,
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

const ctx = {
  io,
  rooms,
  getConnectedUsers,
  getConnectedCount,
  serializeUsers,
  findUserByPlayerId,
  getPlayerIdFromSocket,
  clearGameTimer,
  broadcastRoomState: null
};

function buildRoomSync(room, playerId) {
  const engine = getEngine(room.gameType);
  const game = engine.serializeGame(room, playerId, ctx);

  return {
    roomCode: room.code,
    gameType: room.gameType,
    users: serializeUsers(room),
    hostId: room.hostId,
    scores: { ...room.scores },
    settings: { ...room.settings },
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

ctx.broadcastRoomState = broadcastRoomState;

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
  { skipSocketLeave = false, disconnected = false } = {}
) {
  const userIndex = room.users.findIndex(u => u.playerId === playerId);
  if (userIndex === -1) return;

  const user = room.users[userIndex];
  cancelDisconnectTimer(room, playerId);

  const wasHost = room.hostId === playerId;
  const engine = getEngine(room.gameType);

  engine.beforeRemovePlayer?.(room, roomCode, playerId, ctx);

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

  const result = engine.afterRemovePlayer?.(room, roomCode, playerId, { user, disconnected }, ctx) || {};

  const payload = {
    playerId,
    users: serializeUsers(room),
    hostId: room.hostId,
    scores: room.scores,
    playersCount: getConnectedCount(room),
    gameActive: !!room.gameState?.isPlaying
  };

  if (!result.skipUserLeft) {
    io.to(roomCode).emit('user-left', payload);
  }
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
      disconnected: true
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
  const gameType = typeof req.query.gameType === 'string' ? req.query.gameType : undefined;
  res.json(getRoomsList(gameType));
});

app.get('/api/games', (_req, res) => {
  res.json({ games: listEngines().map(engine => engine.id) });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Roda — hub de jogos',
    status: 'running',
    rooms: rooms.size
  });
});

io.on('connection', (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  listEngines().forEach(engine => {
    engine.registerHandlers?.(socket, ctx);
  });

  socket.on('create-room', (payload = {}) => {
    const gameType = isValidGameType(payload.gameType) ? payload.gameType : GAME_TYPES.SPYFALL;
    const engine = getEngine(gameType);
    const roomCode = generateRoomCode();
    const room = {
      code: roomCode,
      gameType,
      users: [],
      hostId: null,
      createdAt: new Date(),
      scores: {},
      settings: { ...engine.defaultSettings },
      gameState: null,
      gameTimer: null,
      disconnectTimers: {}
    };
    rooms.set(roomCode, room);

    console.log(`Sala criada: ${roomCode} (${gameType})`);
    socket.emit('room-created', { roomCode, gameType });
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

  socket.on('update-room-settings', ({ roomCode, settings }) => {
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', { message: 'Sala não encontrada' });
      return;
    }

    const playerId = getPlayerIdFromSocket(room, socket.id);
    if (room.hostId !== playerId) {
      socket.emit('error', { message: 'Apenas o host pode alterar as configurações' });
      return;
    }

    if (room.gameState?.isPlaying) {
      socket.emit('error', { message: 'Não é possível alterar configurações durante a partida' });
      return;
    }

    const engine = getEngine(room.gameType);
    const connectedCount = getConnectedCount(room);
    const validationError = engine.validateSettings(settings, connectedCount);
    if (validationError) {
      socket.emit('error', { message: validationError });
      return;
    }

    room.settings = { ...engine.defaultSettings, ...settings };
    broadcastRoomState(room, roomCode);
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

    const engine = getEngine(room.gameType);
    const connectedUsers = getConnectedUsers(room);
    if (connectedUsers.length < engine.minPlayers) {
      socket.emit('error', {
        message: `São necessários pelo menos ${engine.minPlayers} jogadores conectados`
      });
      return;
    }

    const settings = room.settings || { ...engine.defaultSettings };
    const settingsError = engine.validateSettings(settings, connectedUsers.length);
    if (settingsError) {
      socket.emit('error', { message: settingsError });
      return;
    }

    engine.startGame(room, roomCode, ctx);
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

    const engine = getEngine(room.gameType);
    engine.endGame(room, roomCode, 'host', {}, ctx);
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
