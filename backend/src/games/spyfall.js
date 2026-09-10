import {
  DEFAULT_ROOM_SETTINGS,
  MIN_PLAYERS_TO_START,
  pickRandomLocation,
  pickSpyIds,
  assignRoles,
  validateRoomSettings,
  isSpy,
  findLocationById,
  serializeLocationForClient
} from '../../../shared/gameData.js';
import { GAME_TYPES } from '../../../shared/catalog.js';

export const id = GAME_TYPES.SPYFALL;
export const defaultSettings = DEFAULT_ROOM_SETTINGS;
export const minPlayers = MIN_PLAYERS_TO_START;

export function validateSettings(settings, connectedCount) {
  return validateRoomSettings(settings, connectedCount);
}

export function serializeGame(room, playerId, ctx) {
  const gs = room.gameState;
  if (!gs?.isPlaying) return null;

  const playerIsSpy = isSpy(gs, playerId);
  return {
    isPlaying: true,
    gameType: id,
    startedAt: gs.startedAt,
    duration: gs.duration,
    playersCount: ctx.getConnectedCount(room),
    isSpy: playerIsSpy,
    spyCount: gs.spyIds.length,
    location: playerIsSpy ? null : serializeLocationForClient(gs.location),
    role: playerIsSpy ? null : (gs.roles[playerId] ?? null),
    locationPack: gs.locationPack,
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
          totalPlayers: ctx.getConnectedCount(room),
          myVote: gs.finalVoting.votes[playerId] ?? null
        }
      : null
  };
}

function getAccusationVoteStats(room, accusation) {
  const spyIds = room.gameState.spyIds;
  const agentsWhoCanVote = room.users.filter(
    u =>
      u.connected &&
      u.playerId !== accusation.accusedId &&
      !spyIds.includes(u.playerId)
  );
  const totalVotesNeeded = agentsWhoCanVote.length;
  const currentVotes = Object.keys(accusation.votes).length;
  return { agentsWhoCanVote, totalVotesNeeded, currentVotes };
}

export function endGame(room, roomCode, reason, extra, ctx) {
  ctx.clearGameTimer(room);
  const gameState = room.gameState;
  room.gameState = null;

  const spyIds = gameState?.spyIds || [];
  const spyNames = spyIds.map(id => room.users.find(u => u.playerId === id)?.name).filter(Boolean);

  ctx.io.to(roomCode).emit('game-ended', {
    roomCode,
    gameType: id,
    spyIds,
    spyId: spyIds[0] ?? null,
    spyNames,
    spyName: spyNames[0],
    location: serializeLocationForClient(gameState?.location),
    reason,
    scores: room.scores,
    ...extra
  });
}

function tryResolveAccusation(room, roomCode, ctx) {
  const accusation = room.gameState?.accusation;
  if (!accusation) return;

  const { totalVotesNeeded, currentVotes } = getAccusationVoteStats(room, accusation);

  if (currentVotes < totalVotesNeeded) return;

  const votesInFavor = Object.values(accusation.votes).filter(v => v === true).length;
  const allAgree = votesInFavor === totalVotesNeeded;

  if (allAgree) {
    const spyIds = room.gameState.spyIds;
    const accusedIsSpy = spyIds.includes(accusation.accusedId);

    if (accusedIsSpy) {
      room.users.forEach(user => {
        if (
          !spyIds.includes(user.playerId) &&
          user.playerId !== accusation.accuserId &&
          accusation.votes[user.playerId] === true
        ) {
          room.scores[user.playerId] = (room.scores[user.playerId] || 0) + 1;
        }
      });
      room.scores[accusation.accuserId] = (room.scores[accusation.accuserId] || 0) + 2;

      room.gameState.spyIds = spyIds.filter(sid => sid !== accusation.accusedId);
      delete room.gameState.roles[accusation.accusedId];
      room.gameState.accusation = null;

      const caughtSpyName = room.users.find(u => u.playerId === accusation.accusedId)?.name;

      if (room.gameState.spyIds.length > 0) {
        ctx.io.to(roomCode).emit('spy-caught', {
          caughtSpyId: accusation.accusedId,
          caughtSpyName,
          remainingSpies: room.gameState.spyIds.length,
          message: `${caughtSpyName} era um espião! Ainda há espião(es) na sala.`
        });
        ctx.broadcastRoomState(room, roomCode);
        return;
      }

      ctx.clearGameTimer(room);
      endGame(room, roomCode, 'accusation', {
        accusedId: accusation.accusedId,
        accusedName: caughtSpyName,
        accusedWasSpy: true,
        accuserId: accusation.accuserId,
        accuserName: room.users.find(u => u.playerId === accusation.accuserId)?.name
      }, ctx);
      return;
    }

    ctx.clearGameTimer(room);
    spyIds.forEach(spyId => {
      room.scores[spyId] = (room.scores[spyId] || 0) + 2;
    });

    endGame(room, roomCode, 'accusation', {
      accusedId: accusation.accusedId,
      accusedName: room.users.find(u => u.playerId === accusation.accusedId)?.name,
      accusedWasSpy: false,
      accuserId: accusation.accuserId,
      accuserName: room.users.find(u => u.playerId === accusation.accuserId)?.name
    }, ctx);
  } else {
    room.gameState.accusation = null;
    ctx.io.to(roomCode).emit('accusation-failed', {
      votesInFavor,
      votesNeeded: totalVotesNeeded,
      message: 'Acusação rejeitada. O jogo continua.'
    });
  }
}

function tryCompleteFinalVoting(room, roomCode, ctx) {
  const finalVoting = room.gameState?.finalVoting;
  if (!finalVoting?.isActive) return;

  const eligibleVoters = ctx.getConnectedUsers(room);
  const votesFromEligible = eligibleVoters.filter(
    u => finalVoting.votes[u.playerId] !== undefined
  ).length;

  if (votesFromEligible < eligibleVoters.length) return;

  const spyIds = room.gameState.spyIds;
  const votesResult = {};

  Object.entries(finalVoting.votes).forEach(([voterId, targetId]) => {
    if (spyIds.includes(targetId)) {
      room.scores[voterId] = (room.scores[voterId] || 0) + 1;
      votesResult[voterId] = { votedCorrectly: true };
    } else {
      votesResult[voterId] = { votedCorrectly: false };
    }
  });

  endGame(room, roomCode, 'final-vote', { votesResult }, ctx);
}

export function startGame(room, roomCode, ctx) {
  const connectedUsers = ctx.getConnectedUsers(room);
  const settings = room.settings || { ...DEFAULT_ROOM_SETTINGS };
  const spyIds = pickSpyIds(connectedUsers, settings.spyCount);
  const location = pickRandomLocation(settings.locationPack);
  const agentIds = connectedUsers
    .filter(u => !spyIds.includes(u.playerId))
    .map(u => u.playerId);
  const roles = assignRoles(location, agentIds);
  const duration = settings.timerMinutes * 60 * 1000;
  const startedAt = Date.now();

  room.gameState = {
    isPlaying: true,
    spyIds,
    location,
    roles,
    locationPack: settings.locationPack,
    settings: { ...settings },
    startedAt,
    duration,
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

      ctx.io.to(roomCode).emit('voting-started', {
        roomCode,
        message: 'Tempo esgotado! Vote em quem você acha que é o espião.',
        totalPlayers: ctx.getConnectedCount(room)
      });

      ctx.broadcastRoomState(room, roomCode);
    }
  }, duration);

  console.log(
    `Partida iniciada na sala ${roomCode}. Espiões: ${spyIds.join(', ')}, Local: ${location.name}, Pack: ${settings.locationPack}`
  );

  ctx.broadcastRoomState(room, roomCode);
}

export function beforeRemovePlayer(room, roomCode, playerId, ctx) {
  if (room.gameState?.finalVoting?.votes) {
    delete room.gameState.finalVoting.votes[playerId];
  }

  const accusation = room.gameState?.accusation;
  if (!accusation) return;

  if (accusation.accuserId === playerId || accusation.accusedId === playerId) {
    room.gameState.accusation = null;
    ctx.io.to(roomCode).emit('accusation-cancelled', {
      message: 'Acusação cancelada (jogador saiu da sala).'
    });
    return;
  }

  delete accusation.votes[playerId];
  tryResolveAccusation(room, roomCode, ctx);
}

export function afterRemovePlayer(room, roomCode, playerId, { user, disconnected }, ctx) {
  const wasSpy = room.gameState?.isPlaying && room.gameState.spyIds?.includes(playerId);
  const spyNameForEnd = wasSpy ? user.name : undefined;

  if (wasSpy && room.gameState?.isPlaying) {
    room.gameState.spyIds = room.gameState.spyIds.filter(sid => sid !== playerId);
    delete room.gameState.roles[playerId];

    if (room.gameState.spyIds.length === 0) {
      endGame(
        room,
        roomCode,
        disconnected ? 'spy-disconnected' : 'spy-left',
        { spyName: spyNameForEnd },
        ctx
      );
      return { skipUserLeft: true };
    }

    ctx.io.to(roomCode).emit('spy-caught', {
      caughtSpyId: playerId,
      caughtSpyName: spyNameForEnd,
      remainingSpies: room.gameState.spyIds.length,
      message: `${spyNameForEnd} saiu. Restam ${room.gameState.spyIds.length} espião(es).`
    });
    ctx.broadcastRoomState(room, roomCode);
  }

  tryCompleteFinalVoting(room, roomCode, ctx);
  return { emitUserLeft: true };
}

export function registerHandlers(socket, ctx) {
  const requireSpyfallRoom = (roomCode, socketInstance) => {
    const room = ctx.rooms.get(roomCode);
    if (!room || room.gameType !== id) return null;
    const playerId = ctx.getPlayerIdFromSocket(room, socketInstance.id);
    return { room, playerId };
  };

  socket.on('spy-guess', ({ roomCode, locationId }) => {
    const resolved = requireSpyfallRoom(roomCode, socket);
    if (!resolved) return;
    const { room, playerId } = resolved;

    if (!room.gameState?.isPlaying) {
      socket.emit('error', { message: 'Partida não encontrada ou não está em andamento' });
      return;
    }

    if (!room.gameState.spyIds.includes(playerId)) {
      socket.emit('error', { message: 'Apenas o espião pode chutar o local' });
      return;
    }

    ctx.clearGameTimer(room);

    const packId = room.gameState.locationPack;
    const guessedLocation = findLocationById(packId, locationId);
    if (!guessedLocation) {
      socket.emit('error', { message: 'Local inválido para este deck' });
      return;
    }

    const correctLocation = room.gameState.location;
    const isCorrect = locationId === correctLocation.id;

    if (isCorrect) {
      room.scores[playerId] = (room.scores[playerId] || 0) + 2;
    } else {
      room.users.forEach(user => {
        if (!room.gameState.spyIds.includes(user.playerId)) {
          room.scores[user.playerId] = (room.scores[user.playerId] || 0) + 1;
        }
      });
    }

    const gameState = room.gameState;
    const spyIds = gameState.spyIds;
    const spyNames = spyIds.map(sid => room.users.find(u => u.playerId === sid)?.name).filter(Boolean);
    room.gameState = null;

    ctx.io.to(roomCode).emit('game-ended', {
      roomCode,
      gameType: id,
      spyIds,
      spyId: playerId,
      spyNames,
      spyName: room.users.find(u => u.playerId === playerId)?.name,
      location: serializeLocationForClient(gameState.location),
      reason: 'spy-guess',
      spyGuessedLocation: serializeLocationForClient(guessedLocation),
      spyGuessCorrect: isCorrect,
      scores: room.scores
    });
  });

  socket.on('start-accusation', ({ roomCode, accusedId }) => {
    const resolved = requireSpyfallRoom(roomCode, socket);
    if (!resolved) return;
    const { room, playerId } = resolved;

    if (!room.gameState?.isPlaying) {
      socket.emit('error', { message: 'Partida não encontrada ou não está em andamento' });
      return;
    }

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

    const accuser = ctx.findUserByPlayerId(room, playerId);

    ctx.io.to(roomCode).emit('accusation-started', {
      accuserId: playerId,
      accuserName: accuser?.name,
      accusedId,
      accusedName: accused.name,
      votes: { ...room.gameState.accusation.votes }
    });
  });

  socket.on('vote-accusation', ({ roomCode, vote }) => {
    const resolved = requireSpyfallRoom(roomCode, socket);
    if (!resolved) return;
    const { room, playerId } = resolved;

    if (!room.gameState?.isPlaying || !room.gameState?.accusation) {
      socket.emit('error', { message: 'Não há acusação em andamento' });
      return;
    }

    if (!playerId) return;

    const accusation = room.gameState.accusation;

    if (playerId === accusation.accusedId) {
      socket.emit('error', { message: 'O acusado não pode votar' });
      return;
    }

    if (room.gameState.spyIds.includes(playerId)) {
      socket.emit('error', { message: 'O espião não pode votar na acusação' });
      return;
    }

    const voter = ctx.findUserByPlayerId(room, playerId);
    if (!voter?.connected) {
      socket.emit('error', { message: 'Você precisa estar conectado para votar' });
      return;
    }

    accusation.votes[playerId] = vote;

    const { totalVotesNeeded, currentVotes } = getAccusationVoteStats(room, accusation);

    ctx.io.to(roomCode).emit('accusation-vote-update', {
      playerId,
      playerName: voter.name,
      vote,
      votesCount: currentVotes,
      votesNeeded: totalVotesNeeded,
      votes: { ...accusation.votes }
    });

    tryResolveAccusation(room, roomCode, ctx);
  });

  socket.on('cancel-accusation', ({ roomCode }) => {
    const resolved = requireSpyfallRoom(roomCode, socket);
    if (!resolved) return;
    const { room, playerId } = resolved;

    if (!room.gameState?.accusation) {
      return;
    }

    if (room.gameState.accusation.accuserId !== playerId) {
      socket.emit('error', { message: 'Apenas quem fez a acusação pode cancelar' });
      return;
    }

    room.gameState.accusation = null;

    ctx.io.to(roomCode).emit('accusation-cancelled', {
      message: 'Acusação cancelada'
    });
  });

  socket.on('final-vote', ({ roomCode, votedForId }) => {
    const resolved = requireSpyfallRoom(roomCode, socket);
    if (!resolved) return;
    const { room, playerId } = resolved;

    if (!room.gameState?.finalVoting?.isActive) {
      socket.emit('error', { message: 'Votação não está ativa' });
      return;
    }

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

    const voter = ctx.findUserByPlayerId(room, playerId);
    if (!voter?.connected) {
      socket.emit('error', { message: 'Você precisa estar conectado para votar' });
      return;
    }

    room.gameState.finalVoting.votes[playerId] = votedForId;

    const eligibleVoters = ctx.getConnectedUsers(room);
    const votesFromEligible = eligibleVoters.filter(
      u => room.gameState.finalVoting.votes[u.playerId] !== undefined
    ).length;

    ctx.io.to(roomCode).emit('final-vote-update', {
      playerId,
      playerName: voter.name,
      votesCount: votesFromEligible,
      totalPlayers: eligibleVoters.length
    });

    tryCompleteFinalVoting(room, roomCode, ctx);
  });
}
