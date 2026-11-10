import { io } from 'socket.io-client';

// Uso: node roda-game-test.mjs [url-do-backend]   (padrão: http://localhost:3010)
const URL = process.argv[2] || process.env.RODA_URL || 'http://localhost:3010';

function connect(playerId) {
  return new Promise((resolve, reject) => {
    const socket = io(URL, { transports: ['websocket'] });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
    setTimeout(() => reject(new Error(`timeout connect ${playerId}`)), 5000);
  });
}

function once(socket, event) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting ${event}`)), 5000);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

async function createAndJoin(socket, playerId, name, gameType) {
  const created = once(socket, 'room-created');
  socket.emit('create-room', { gameType });
  const { roomCode, gameType: createdType } = await created;
  const sync = once(socket, 'room-sync');
  socket.emit('join-room', { roomCode, userName: name, playerId });
  const room = await sync;
  return { roomCode, createdType, room };
}

async function join(socket, roomCode, playerId, name) {
  const sync = once(socket, 'room-sync');
  socket.emit('join-room', { roomCode, userName: name, playerId });
  return sync;
}

const results = [];

try {
  const home = await fetch(URL).then(r => r.json());
  results.push(['GET /', home.message.includes('Roda')]);

  const roomsEmpty = await fetch(`${URL}/api/rooms?gameType=spyfall`).then(r => r.json());
  results.push(['GET /api/rooms spyfall array', Array.isArray(roomsEmpty)]);

  // --- Spyfall ---
  const a = await connect('a');
  const b = await connect('b');
  const c = await connect('c');

  const spyfall = await createAndJoin(a, 'p1', 'Ana', 'spyfall');
  results.push(['spyfall gameType on create', spyfall.createdType === 'spyfall']);
  results.push(['spyfall settings have spyCount', spyfall.room.settings.spyCount === 1]);
  results.push(['spyfall settings have locationPack', spyfall.room.settings.locationPack === 'default']);

  await join(b, spyfall.roomCode, 'p2', 'Beto');
  const syncC = await join(c, spyfall.roomCode, 'p3', 'Cris');
  results.push(['spyfall 3 players', syncC.users.length === 3]);

  const startSync = Promise.all([once(a, 'room-sync'), once(b, 'room-sync'), once(c, 'room-sync')]);
  a.emit('start-game', { roomCode: spyfall.roomCode });
  const [sa, sb, sc] = await startSync;
  results.push(['spyfall playing', sa.game?.isPlaying === true]);
  results.push(['spyfall has location XOR spy', Boolean(sa.game.isSpy) !== Boolean(sa.game.location)]);
  results.push(['spyfall exactly one spy', [sa, sb, sc].filter(s => s.game.isSpy).length === 1]);
  results.push(['spyfall agents have role', [sa, sb, sc].filter(s => !s.game.isSpy).every(s => typeof s.game.role === 'string')]);
  results.push(['spyfall quem fields absent', sa.game.candidates === undefined]);

  a.emit('end-game', { roomCode: spyfall.roomCode });
  const ended = await once(a, 'game-ended');
  results.push(['spyfall end has spyNames', Array.isArray(ended.spyNames)]);
  results.push(['spyfall end gameType', ended.gameType === 'spyfall']);

  a.disconnect();
  b.disconnect();
  c.disconnect();

  // --- Quem sou eu ---
  const d = await connect('d');
  const e = await connect('e');
  const quem = await createAndJoin(d, 'q1', 'Dora', 'quem-sou-eu');
  results.push(['quem gameType', quem.createdType === 'quem-sou-eu']);
  results.push(['quem settings identityPack', quem.room.settings.identityPack === 'famosos']);
  results.push(['quem settings no spyCount', quem.room.settings.spyCount === undefined]);

  const quemJoin = await join(e, quem.roomCode, 'q2', 'Edu');
  results.push(['quem 2 players', quemJoin.users.length === 2]);

  const quemStart = Promise.all([once(d, 'room-sync'), once(e, 'room-sync')]);
  d.emit('start-game', { roomCode: quem.roomCode });
  const [qd, qe] = await quemStart;
  results.push(['quem playing', qd.game?.isPlaying === true && qd.game.gameType === 'quem-sou-eu']);
  results.push(['quem hides own identity', qd.game.players.find(p => p.playerId === 'q1').identity === null]);
  results.push(['quem shows other identity', Boolean(qd.game.players.find(p => p.playerId === 'q2').identity?.name)]);
  results.push(['quem candidates', Array.isArray(qd.game.candidates) && qd.game.candidates.length > 10]);
  results.push(['quem has turn', typeof qd.game.currentTurnId === 'string']);

  const turnId = qd.game.currentTurnId;
  const asker = turnId === 'q1' ? d : e;
  const answerer = turnId === 'q1' ? e : d;
  const askerId = turnId;
  const otherId = turnId === 'q1' ? 'q2' : 'q1';
  const otherIdentity = (turnId === 'q1' ? qd : qe).game.players.find(p => p.playerId === otherId).identity;

  const afterNo = Promise.all([once(d, 'quem-answered'), once(d, 'room-sync')]);
  answerer.emit('quem-answer', { roomCode: quem.roomCode, yes: false });
  const [answered] = await afterNo;
  results.push(['quem no passes turn', answered.yes === false && answered.currentTurnId === otherId]);

  const guesser = answered.currentTurnId === 'q1' ? d : e;
  const guesserId = answered.currentTurnId;
  const actual = (guesserId === 'q1' ? qe : qd).game.players.find(p => p.playerId === guesserId).identity;

  const guessSync = Promise.all([once(d, 'quem-guess-result'), once(d, 'room-sync').catch(() => once(d, 'game-ended'))]);
  guesser.emit('quem-guess', { roomCode: quem.roomCode, identityId: actual.id });
  const [guessResult] = await guessSync;
  results.push(['quem correct guess', guessResult.correct === true]);

  d.disconnect();
  e.disconnect();

  const spyRooms = await fetch(`${URL}/api/rooms?gameType=spyfall`).then(r => r.json());
  const quemRooms = await fetch(`${URL}/api/rooms?gameType=quem-sou-eu`).then(r => r.json());
  results.push(['rooms filtered by game', spyRooms.every(r => r.gameType === 'spyfall') && quemRooms.every(r => r.gameType === 'quem-sou-eu')]);

} catch (err) {
  console.error('TEST ERROR', err);
  results.push(['fatal', false, String(err.message || err)]);
}

const failed = results.filter(r => !r[1]);
for (const [name, ok, extra] of results) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
}
console.log(`\n${results.filter(r => r[1]).length}/${results.length} passed`);
if (failed.length) process.exit(1);
