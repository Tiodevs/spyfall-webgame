import { shuffle } from './utils.js';

const FAMOSOS_PACK = 'famosos';
const PERSONAGENS_PACK = 'personagens';
const ANIMAIS_PACK = 'animais';

const TIMER_OPTIONS = [0, 8, 10, 12];
const MIN_PLAYERS_TO_START = 2;

const DEFAULT_ROOM_SETTINGS = {
  timerMinutes: 10,
  identityPack: FAMOSOS_PACK
};

const IDENTITY_PACKS = [
  { id: FAMOSOS_PACK, label: 'Famosos', description: 'Celebridades, artistas e atletas' },
  { id: PERSONAGENS_PACK, label: 'Personagens', description: 'Cinema, HQ, games e TV' },
  { id: ANIMAIS_PACK, label: 'Animais', description: 'Bichos do mundo todo — ótimo em família' }
];

const FAMOSOS = [
  { id: 'anitta', name: 'Anitta', icon: '🎤' },
  { id: 'neymar', name: 'Neymar', icon: '⚽' },
  { id: 'senna', name: 'Ayrton Senna', icon: '🏎️' },
  { id: 'xuxa', name: 'Xuxa', icon: '⭐' },
  { id: 'pele', name: 'Pelé', icon: '🏆' },
  { id: 'gisele', name: 'Gisele Bündchen', icon: '📸' },
  { id: 'ivete', name: 'Ivete Sangalo', icon: '🎶' },
  { id: 'ronaldinho', name: 'Ronaldinho Gaúcho', icon: '⚽' },
  { id: 'marta', name: 'Marta', icon: '⚽' },
  { id: 'rebeca', name: 'Rebeca Andrade', icon: '🤸' },
  { id: 'timmaia', name: 'Tim Maia', icon: '🎷' },
  { id: 'elis', name: 'Elis Regina', icon: '🎙️' },
  { id: 'chico', name: 'Chico Buarque', icon: '🎹' },
  { id: 'paulinho', name: 'Paulo Gustavo', icon: '🎭' },
  { id: 'whindersson', name: 'Whindersson Nunes', icon: '😂' },
  { id: 'luciano', name: 'Luciano Huck', icon: '📺' },
  { id: 'anamaria', name: 'Ana Maria Braga', icon: '☕' },
  { id: 'beyonce', name: 'Beyoncé', icon: '👑' },
  { id: 'mj', name: 'Michael Jackson', icon: '🕺' },
  { id: 'einstein', name: 'Albert Einstein', icon: '🧠' },
  { id: 'messi', name: 'Lionel Messi', icon: '🐐' },
  { id: 'cr7', name: 'Cristiano Ronaldo', icon: '⚽' },
  { id: 'taylorswift', name: 'Taylor Swift', icon: '🎸' },
  { id: 'therock', name: 'The Rock', icon: '💪' },
  { id: 'shakira', name: 'Shakira', icon: '💃' },
  { id: 'elvis', name: 'Elvis Presley', icon: '🎙️' },
  { id: 'marilyn', name: 'Marilyn Monroe', icon: '💋' },
  { id: 'chaplin', name: 'Charlie Chaplin', icon: '🎩' },
  { id: 'oprah', name: 'Oprah Winfrey', icon: '📺' },
  { id: 'spielberg', name: 'Steven Spielberg', icon: '🎬' },
  { id: 'rihanna', name: 'Rihanna', icon: '💎' },
  { id: 'keanu', name: 'Keanu Reeves', icon: '🕶️' }
];

const PERSONAGENS = [
  { id: 'harry', name: 'Harry Potter', icon: '⚡' },
  { id: 'vader', name: 'Darth Vader', icon: '🌑' },
  { id: 'mickey', name: 'Mickey Mouse', icon: '🐭' },
  { id: 'shrek', name: 'Shrek', icon: '🟢' },
  { id: 'elsa', name: 'Elsa', icon: '❄️' },
  { id: 'batman', name: 'Batman', icon: '🦇' },
  { id: 'superman', name: 'Super-Homem', icon: '🦸' },
  { id: 'spiderman', name: 'Homem-Aranha', icon: '🕸️' },
  { id: 'spongebob', name: 'Bob Esponja', icon: '🧽' },
  { id: 'pikachu', name: 'Pikachu', icon: '⚡' },
  { id: 'monica', name: 'Mônica', icon: '🎀' },
  { id: 'cebolinha', name: 'Cebolinha', icon: '💭' },
  { id: 'naruto', name: 'Naruto', icon: '🍥' },
  { id: 'goku', name: 'Goku', icon: '🟠' },
  { id: 'frodo', name: 'Frodo', icon: '💍' },
  { id: 'jack', name: 'Jack Sparrow', icon: '🏴‍☠️' },
  { id: 'wonder', name: 'Mulher-Maravilha', icon: '⚔️' },
  { id: 'ironman', name: 'Homem de Ferro', icon: '❤️' },
  { id: 'joker', name: 'Coringa', icon: '🃏' },
  { id: 'buzz', name: 'Buzz Lightyear', icon: '🚀' },
  { id: 'woody', name: 'Woody', icon: '🤠' },
  { id: 'mario', name: 'Mario', icon: '🍄' },
  { id: 'sonic', name: 'Sonic', icon: '💨' },
  { id: 'chaves', name: 'Chaves', icon: '🧒' },
  { id: 'chapolin', name: 'Chapolin Colorado', icon: '📡' },
  { id: 'snowwhite', name: 'Branca de Neve', icon: '🍎' },
  { id: 'cinderella', name: 'Cinderela', icon: '👠' },
  { id: 'hermione', name: 'Hermione Granger', icon: '📚' },
  { id: 'yoda', name: 'Yoda', icon: '🟢' },
  { id: 'minion', name: 'Minion', icon: '💛' },
  { id: 'groot', name: 'Groot', icon: '🌱' },
  { id: 'stitch', name: 'Stitch', icon: '💙' }
];

const ANIMAIS = [
  { id: 'leao', name: 'Leão', icon: '🦁' },
  { id: 'elefante', name: 'Elefante', icon: '🐘' },
  { id: 'pinguim', name: 'Pinguim', icon: '🐧' },
  { id: 'golfinho', name: 'Golfinho', icon: '🐬' },
  { id: 'gato', name: 'Gato', icon: '🐱' },
  { id: 'cachorro', name: 'Cachorro', icon: '🐶' },
  { id: 'coruja', name: 'Coruja', icon: '🦉' },
  { id: 'jacare', name: 'Jacaré', icon: '🐊' },
  { id: 'borboleta', name: 'Borboleta', icon: '🦋' },
  { id: 'urso', name: 'Urso', icon: '🐻' },
  { id: 'girafa', name: 'Girafa', icon: '🦒' },
  { id: 'tubarao', name: 'Tubarão', icon: '🦈' },
  { id: 'abelha', name: 'Abelha', icon: '🐝' },
  { id: 'preguica', name: 'Preguiça', icon: '🦥' },
  { id: 'lobo', name: 'Lobo', icon: '🐺' },
  { id: 'raposa', name: 'Raposa', icon: '🦊' },
  { id: 'pavao', name: 'Pavão', icon: '🦚' },
  { id: 'koala', name: 'Koala', icon: '🐨' },
  { id: 'macaco', name: 'Macaco', icon: '🐵' },
  { id: 'tartaruga', name: 'Tartaruga', icon: '🐢' },
  { id: 'flamingo', name: 'Flamingo', icon: '🦩' },
  { id: 'polvo', name: 'Polvo', icon: '🐙' },
  { id: 'canguru', name: 'Canguru', icon: '🦘' },
  { id: 'pantera', name: 'Pantera', icon: '🐆' },
  { id: 'camelo', name: 'Camelo', icon: '🐪' },
  { id: 'rinoceronte', name: 'Rinoceronte', icon: '🦏' },
  { id: 'tucano', name: 'Tucano', icon: '🦜' },
  { id: 'capivara', name: 'Capivara', icon: '🐹' },
  { id: 'lhama', name: 'Lhama', icon: '🦙' },
  { id: 'tamandua', name: 'Tamanduá', icon: '🐜' },
  { id: 'arara', name: 'Arara', icon: '🦜' },
  { id: 'panda', name: 'Panda', icon: '🐼' }
];

const IDENTITIES_BY_PACK = {
  [FAMOSOS_PACK]: FAMOSOS,
  [PERSONAGENS_PACK]: PERSONAGENS,
  [ANIMAIS_PACK]: ANIMAIS
};

function getIdentitiesByPack(packId) {
  return IDENTITIES_BY_PACK[packId] || FAMOSOS;
}

function findIdentityById(packId, identityId) {
  return getIdentitiesByPack(packId).find(item => item.id === identityId) ?? null;
}

function serializeIdentity(identity) {
  if (!identity) return null;
  return { id: identity.id, name: identity.name, icon: identity.icon };
}

function assignIdentities(connectedUsers, packId) {
  const pool = shuffle(getIdentitiesByPack(packId));
  const identities = {};
  connectedUsers.forEach((user, index) => {
    identities[user.playerId] = pool[index % pool.length];
  });
  return identities;
}

function validateRoomSettings(settings, connectedCount) {
  if (!settings || typeof settings !== 'object') {
    return 'Configurações inválidas';
  }

  const { timerMinutes, identityPack } = settings;

  if (!TIMER_OPTIONS.includes(timerMinutes)) {
    return 'Duração do timer inválida';
  }
  if (!IDENTITY_PACKS.some(pack => pack.id === identityPack)) {
    return 'Deck de identidades inválido';
  }
  if (connectedCount > getIdentitiesByPack(identityPack).length) {
    return 'Há mais jogadores do que identidades neste deck';
  }
  return null;
}

function pointsForGuessOrder(order) {
  if (order === 1) return 3;
  if (order === 2) return 2;
  return 1;
}

export {
  FAMOSOS_PACK,
  PERSONAGENS_PACK,
  ANIMAIS_PACK,
  TIMER_OPTIONS,
  MIN_PLAYERS_TO_START,
  DEFAULT_ROOM_SETTINGS,
  IDENTITY_PACKS,
  FAMOSOS,
  PERSONAGENS,
  ANIMAIS,
  IDENTITIES_BY_PACK,
  getIdentitiesByPack,
  findIdentityById,
  serializeIdentity,
  assignIdentities,
  validateRoomSettings,
  pointsForGuessOrder
};
