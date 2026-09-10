export const GAME_TYPES = {
  SPYFALL: 'spyfall',
  QUEM_SOU_EU: 'quem-sou-eu'
};

export const GAMES = [
  {
    id: GAME_TYPES.SPYFALL,
    name: 'Spyfall',
    tagline: 'Quem é o espião?',
    description:
      'Descubra o local secreto antes que o tempo acabe — ou finja que sabe, se for você o infiltrado.',
    minPlayers: 3,
    duration: '4–8 min',
    available: true,
    icon: 'eye',
    accent: '#aacc00'
  },
  {
    id: GAME_TYPES.QUEM_SOU_EU,
    name: 'Quem sou eu?',
    tagline: 'Todo mundo sabe, menos você.',
    description:
      'Uma identidade na testa. Pergunte sim ou não na sua vez e descubra quem você é — o mais rápido pontua mais.',
    minPlayers: 2,
    duration: '8–12 min',
    available: true,
    icon: 'help',
    accent: '#7dd3fc'
  }
];

export function getGameById(id) {
  return GAMES.find(game => game.id === id) ?? null;
}

export function isValidGameType(id) {
  return GAMES.some(game => game.id === id && game.available);
}
