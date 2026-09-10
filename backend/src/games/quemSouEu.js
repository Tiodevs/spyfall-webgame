import {
  DEFAULT_ROOM_SETTINGS,
  MIN_PLAYERS_TO_START,
  validateRoomSettings,
  assignIdentities,
  findIdentityById,
  serializeIdentity,
  getIdentitiesByPack,
  pointsForGuessOrder
} from '../../../shared/quemSouEu.js';
import { GAME_TYPES } from '../../../shared/catalog.js';
import { shuffle } from '../../../shared/utils.js';

export const id = GAME_TYPES.QUEM_SOU_EU;
export const defaultSettings = DEFAULT_ROOM_SETTINGS;
export const minPlayers = MIN_PLAYERS_TO_START;

export function validateSettings(settings, connectedCount) {
  return validateRoomSettings(settings, connectedCount);
}

function activeAskerIds(room, ctx) {
  return ctx
    .getConnectedUsers(room)
    .map(u => u.playerId)
    .filter(playerId => !room.gameState.guessed[playerId]);
}

function advanceTurn(room, ctx) {
  const active = activeAskerIds(room, ctx);
  if (active.length === 0) return;
  const current = room.gameState.currentTurnId;
  const idx = active.indexOf(current);
  room.gameState.currentTurnId = idx === -1 ? active[0] : active[(idx + 1) % active.length];
}

function allGuessed(room, ctx) {
  const connected = ctx.getConnectedUsers(room);
  return connected.length > 0 && connected.every(u => room.gameState.guessed[u.playerId]);
}

function buildReveal(room) {
  const identities = {};
  Object.entries(room.gameState?.identities || {}).forEach(([playerId, identity]) => {
    identities[playerId] = serializeIdentity(identity);
  });
  return identities;
}

function buildRanking(room) {
  return Object.entries(room.gameState?.guessed || {})
    .map(([playerId, info]) => ({
      playerId,
      name: room.users.find(u => u.playerId === playerId)?.name,
      order: info.order,
      points: pointsForGuessOrder(info.order)
    }))
    .sort((a, b) => a.order - b.order);
}

function buildEndMessage(room, reason) {
  const ranking = buildRanking(room);
  const first = ranking[0];
  if (reason === 'timeout') {
    return first
      ? `O tempo acabou. ${first.name} descobriu primeiro.`
      : 'O tempo acabou. Ninguém descobriu quem era.';
  }
  if (reason === 'host') {
    return 'O host encerrou a partida. Identidades reveladas.';
  }
  if (first) {
    return `${first.name} descobriu primeiro. Todos que acertaram pontuaram.`;
  }
  return 'Partida encerrada.';
}

export function serializeGame(room, playerId, ctx) {
  const gs = room.gameState;
  if (!gs?.isPlaying) return null;

  const myGuessed = Boolean(gs.guessed[playerId]);

  return {
    isPlaying: true,
    gameType: id,
    startedAt: gs.startedAt,
    duration: gs.duration,
    packId: gs.packId,
    currentTurnId: gs.currentTurnId,
    lastAnswer: gs.lastAnswer,
    myGuessed,
    playersCount: ctx.getConnectedCount(room),
    players: room.users.map(user => {
      const guessed = Boolean(gs.guessed[user.playerId]);
      const hideOwn = user.playerId === playerId && !guessed;
      return {
        playerId: user.playerId,
        name: user.name,
        connected: user.connected,
        guessed,
        guessOrder: gs.guessed[user.playerId]?.order ?? null,
        isTurn: gs.currentTurnId === user.playerId,
        identity: hideOwn ? null : serializeIdentity(gs.identities[user.playerId])
      };
    }),
    candidates: getIdentitiesByPack(gs.packId).map(serializeIdentity)
  };
}

export function endGame(room, roomCode, reason, extra, ctx) {
  ctx.clearGameTimer(room);
  const identities = buildReveal(room);
  const ranking = buildRanking(room);
  const message = extra.message || buildEndMessage(room, reason);
  room.gameState = null;

  ctx.io.to(roomCode).emit('game-ended', {
    roomCode,
    gameType: id,
    reason,
    identities,
    ranking,
    message,
    scores: room.scores,
    ...extra
  });
}

function maybeFinish(room, roomCode, ctx) {
  if (!room.gameState?.isPlaying) return;
  if (allGuessed(room, ctx)) {
    endGame(room, roomCode, 'all-guessed', {}, ctx);
  }
}

export function startGame(room, roomCode, ctx) {
  const connectedUsers = ctx.getConnectedUsers(room);
  const settings = room.settings || { ...DEFAULT_ROOM_SETTINGS };
  const identities = assignIdentities(connectedUsers, settings.identityPack);
  const turnOrder = shuffle(connectedUsers.map(u => u.playerId));
  const duration = settings.timerMinutes > 0 ? settings.timerMinutes * 60 * 1000 : null;
  const startedAt = Date.now();

  room.gameState = {
    isPlaying: true,
    packId: settings.identityPack,
    identities,
    guessed: {},
    guessCount: 0,
    currentTurnId: turnOrder[0],
    lastAnswer: null,
    startedAt,
    duration
  };

  if (duration) {
    room.gameTimer = setTimeout(() => {
      if (room.gameState?.isPlaying) {
        endGame(room, roomCode, 'timeout', {}, ctx);
      }
    }, duration);
  }

  console.log(
    `Quem sou eu iniciado na sala ${roomCode}. Pack: ${settings.identityPack}, jogadores: ${connectedUsers.length}`
  );

  ctx.broadcastRoomState(room, roomCode);
}

export function beforeRemovePlayer() {}

export function afterRemovePlayer(room, roomCode, playerId, _meta, ctx) {
  if (!room.gameState?.isPlaying) return { emitUserLeft: true };

  delete room.gameState.identities[playerId];
  delete room.gameState.guessed[playerId];

  const connected = ctx.getConnectedUsers(room);
  if (connected.length < minPlayers) {
    endGame(room, roomCode, 'host', { message: 'Jogadores insuficientes. Identidades reveladas.' }, ctx);
    return { emitUserLeft: true };
  }

  if (room.gameState.currentTurnId === playerId) {
    advanceTurn(room, ctx);
  } else if (!activeAskerIds(room, ctx).includes(room.gameState.currentTurnId)) {
    advanceTurn(room, ctx);
  }

  maybeFinish(room, roomCode, ctx);
  if (room.gameState?.isPlaying) {
    ctx.broadcastRoomState(room, roomCode);
  }
  return { emitUserLeft: true };
}

export function registerHandlers(socket, ctx) {
  const requireRoom = (roomCode, socketInstance) => {
    const room = ctx.rooms.get(roomCode);
    if (!room || room.gameType !== id) return null;
    const playerId = ctx.getPlayerIdFromSocket(room, socketInstance.id);
    return { room, playerId };
  };

  socket.on('quem-answer', ({ roomCode, yes }) => {
    const resolved = requireRoom(roomCode, socket);
    if (!resolved) return;
    const { room, playerId } = resolved;

    if (!room.gameState?.isPlaying) {
      socket.emit('error', { message: 'Partida não encontrada ou não está em andamento' });
      return;
    }

    const currentTurnId = room.gameState.currentTurnId;
    if (!playerId || playerId === currentTurnId) {
      socket.emit('error', { message: 'Quem pergunta não registra a resposta' });
      return;
    }

    const voter = ctx.findUserByPlayerId(room, playerId);
    if (!voter?.connected) {
      socket.emit('error', { message: 'Você precisa estar conectado para responder' });
      return;
    }

    if (room.gameState.guessed[currentTurnId]) {
      socket.emit('error', { message: 'Este jogador já descobriu quem é' });
      return;
    }

    const asker = ctx.findUserByPlayerId(room, currentTurnId);
    room.gameState.lastAnswer = {
      yes: Boolean(yes),
      byId: playerId,
      byName: voter.name,
      forId: currentTurnId,
      forName: asker?.name
    };

    if (!yes) {
      advanceTurn(room, ctx);
    }

    ctx.io.to(roomCode).emit('quem-answered', {
      yes: Boolean(yes),
      byName: voter.name,
      forName: asker?.name,
      currentTurnId: room.gameState.currentTurnId,
      message: yes
        ? `Sim! ${asker?.name} pode perguntar de novo.`
        : `Não. A vez passa para ${ctx.findUserByPlayerId(room, room.gameState.currentTurnId)?.name}.`
    });

    ctx.broadcastRoomState(room, roomCode);
  });

  socket.on('quem-pass', ({ roomCode }) => {
    const resolved = requireRoom(roomCode, socket);
    if (!resolved) return;
    const { room, playerId } = resolved;

    if (!room.gameState?.isPlaying) {
      socket.emit('error', { message: 'Partida não encontrada ou não está em andamento' });
      return;
    }

    if (playerId !== room.gameState.currentTurnId) {
      socket.emit('error', { message: 'Só quem está na vez pode passar' });
      return;
    }

    advanceTurn(room, ctx);
    room.gameState.lastAnswer = {
      yes: null,
      byId: playerId,
      byName: ctx.findUserByPlayerId(room, playerId)?.name,
      forId: playerId,
      passed: true
    };

    ctx.io.to(roomCode).emit('quem-answered', {
      passed: true,
      currentTurnId: room.gameState.currentTurnId,
      message: `${ctx.findUserByPlayerId(room, playerId)?.name} passou a vez.`
    });

    ctx.broadcastRoomState(room, roomCode);
  });

  socket.on('quem-guess', ({ roomCode, identityId }) => {
    const resolved = requireRoom(roomCode, socket);
    if (!resolved) return;
    const { room, playerId } = resolved;

    if (!room.gameState?.isPlaying) {
      socket.emit('error', { message: 'Partida não encontrada ou não está em andamento' });
      return;
    }

    if (playerId !== room.gameState.currentTurnId) {
      socket.emit('error', { message: 'Só é possível adivinhar na sua vez' });
      return;
    }

    if (room.gameState.guessed[playerId]) {
      socket.emit('error', { message: 'Você já descobriu quem é' });
      return;
    }

    const guessed = findIdentityById(room.gameState.packId, identityId);
    if (!guessed) {
      socket.emit('error', { message: 'Identidade inválida para este deck' });
      return;
    }

    const actual = room.gameState.identities[playerId];
    const correct = actual?.id === identityId;
    const playerName = ctx.findUserByPlayerId(room, playerId)?.name;

    if (correct) {
      room.gameState.guessCount += 1;
      const order = room.gameState.guessCount;
      room.gameState.guessed[playerId] = { order, at: Date.now() };
      room.scores[playerId] = (room.scores[playerId] || 0) + pointsForGuessOrder(order);

      ctx.io.to(roomCode).emit('quem-guess-result', {
        correct: true,
        playerId,
        playerName,
        identity: serializeIdentity(actual),
        order,
        points: pointsForGuessOrder(order),
        message: `${playerName} era ${actual.icon} ${actual.name}!`
      });

      if (allGuessed(room, ctx)) {
        endGame(room, roomCode, 'all-guessed', {}, ctx);
        return;
      }

      advanceTurn(room, ctx);
      ctx.broadcastRoomState(room, roomCode);
      return;
    }

    advanceTurn(room, ctx);

    ctx.io.to(roomCode).emit('quem-guess-result', {
      correct: false,
      playerId,
      playerName,
      identityId,
      guessedName: guessed.name,
      currentTurnId: room.gameState.currentTurnId,
      message: `${playerName} errou o chute (${guessed.name}). A vez passa.`
    });

    ctx.broadcastRoomState(room, roomCode);
  });
}
