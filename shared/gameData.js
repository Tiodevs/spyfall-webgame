import { shuffle } from './utils.js';

const DEFAULT_PACK = 'default';
const BIZARRO_PACK = 'bizarro';

const TIMER_OPTIONS = [4, 6, 8];
const MIN_PLAYERS_FOR_TWO_SPIES = 6;
const MIN_PLAYERS_TO_START = 3;

const DEFAULT_ROOM_SETTINGS = {
  timerMinutes: 6,
  spyCount: 1,
  locationPack: DEFAULT_PACK
};

const LOCATION_PACKS = [
  { id: DEFAULT_PACK, label: 'Padrão', description: '24 locais variados — o deck clássico' },
  { id: BIZARRO_PACK, label: 'Bizarro', description: 'Cenários absurdos e personagens estranhos' }
];

const DEFAULT_LOCATIONS = [
  { id: 1, name: 'Aeroporto', icon: '✈️', roles: ['Piloto', 'Comissário', 'Passageiro', 'Segurança', 'Controlador', 'Mecânico', 'Turista', 'Agente de viagens'] },
  { id: 2, name: 'Banco', icon: '🏦', roles: ['Gerente', 'Caixa', 'Segurança', 'Cliente', 'Consultor', 'Assaltante disfarçado', 'Contador', 'Mensageiro'] },
  { id: 3, name: 'Praia', icon: '🏖️', roles: ['Salva-vidas', 'Turista', 'Vendedor ambulante', 'Surfista', 'Fotógrafo', 'Garçom', 'Criança', 'Pescador'] },
  { id: 4, name: 'Cassino', icon: '🎰', roles: ['Dealer', 'Jogador', 'Segurança', 'Croupier', 'Camaroneiro', 'Contador de cartas', 'Gerente', 'Turista'] },
  { id: 5, name: 'Circo', icon: '🎪', roles: ['Palhaço', 'Acrobata', 'Domador', 'Mágico', 'Apresentador', 'Bilheteiro', 'Público', 'Malabarista'] },
  { id: 6, name: 'Hospital', icon: '🏥', roles: ['Médico', 'Enfermeiro', 'Paciente', 'Cirurgião', 'Recepcionista', 'Visitante', 'Paramédico', 'Anestesista'] },
  { id: 7, name: 'Hotel', icon: '🏨', roles: ['Recepcionista', 'Hóspede', 'Camareira', 'Concierge', 'Gerente', 'Mensageiro', 'Chef', 'Segurança'] },
  { id: 8, name: 'Escola', icon: '🏫', roles: ['Professor', 'Aluno', 'Diretor', 'Bibliotecário', 'Porteiro', 'Merendeira', 'Monitor', 'Pais de aluno'] },
  { id: 9, name: 'Restaurante', icon: '🍽️', roles: ['Chef', 'Garçom', 'Cliente', 'Sommelier', 'Caixa', 'Maitre', 'Cozinheiro', 'Crítico gastronômico'] },
  { id: 10, name: 'Supermercado', icon: '🛒', roles: ['Caixa', 'Repositor', 'Cliente', 'Gerente', 'Fiscal', 'Açougueiro', 'Entregador', 'Promotor'] },
  { id: 11, name: 'Teatro', icon: '🎭', roles: ['Ator', 'Diretor', 'Bilheteiro', 'Público', 'Cenógrafo', 'Iluminador', 'Figurinista', 'Crítico'] },
  { id: 12, name: 'Museu', icon: '🏛️', roles: ['Curador', 'Visitante', 'Segurança', 'Guia', 'Restaurador', 'Estudante', 'Fotógrafo', 'Diretor'] },
  { id: 13, name: 'Estádio de Futebol', icon: '⚽', roles: ['Jogador', 'Árbitro', 'Torcedor', 'Comentarista', 'Médico', 'Segurança', 'Vendedor', 'Técnico'] },
  { id: 14, name: 'Delegacia', icon: '🚔', roles: ['Detetive', 'Delegado', 'Suspeito', 'Testemunha', 'Escrivão', 'Agente', 'Perito', 'Advogado'] },
  { id: 15, name: 'Navio Cruzeiro', icon: '🚢', roles: ['Capitão', 'Marinheiro', 'Passageiro', 'Músico', 'Chef', 'Médico', 'Bartender', 'Turista'] },
  { id: 16, name: 'Spa', icon: '💆', roles: ['Massagista', 'Cliente', 'Recepcionista', 'Esteticista', 'Gerente', 'Terapeuta', 'Instrutor de yoga', 'Visitante'] },
  { id: 17, name: 'Estação Espacial', icon: '🚀', roles: ['Astronauta', 'Engenheiro', 'Cientista', 'Comandante', 'Médico', 'Técnico', 'Piloto', 'Pesquisador'] },
  { id: 18, name: 'Submarino', icon: '🛥️', roles: ['Capitão', 'Sonarista', 'Marinheiro', 'Cientista', 'Cozinheiro', 'Mecânico', 'Oficial', 'Passageiro VIP'] },
  { id: 19, name: 'Base Militar', icon: '🎖️', roles: ['General', 'Soldado', 'Médico', 'Espião inimigo', 'Piloto', 'Comunicador', 'Instrutor', 'Visitante'] },
  { id: 20, name: 'Igreja', icon: '⛪', roles: ['Padre', 'Freira', 'Coroinha', 'Fiel', 'Organista', 'Visitante', 'Cantor', 'Sacristão'] },
  { id: 21, name: 'Universidade', icon: '🎓', roles: ['Professor', 'Aluno', 'Reitor', 'Bibliotecário', 'Pesquisador', 'Monitor', 'Visitante', 'Coordenador'] },
  { id: 22, name: 'Fazenda', icon: '🌾', roles: ['Fazendeiro', 'Vaqueiro', 'Veterinário', 'Tratorista', 'Visitante', 'Comprador', 'Caseiro', 'Agricultor'] },
  { id: 23, name: 'Estúdio de TV', icon: '📺', roles: ['Apresentador', 'Câmera', 'Diretor', 'Convidado', 'Maquiador', 'Produtor', 'Repórter', 'Público'] },
  { id: 24, name: 'Parque de Diversões', icon: '🎡', roles: ['Operador', 'Visitante', 'Vendedor', 'Segurança', 'Mascote', 'Manutenção', 'Fotógrafo', 'Gerente'] }
];

const BIZARRO_LOCATIONS = [
  { id: 101, name: 'Nave alienígena', icon: '👽', roles: ['Comandante alienígena', 'Cientista ET', 'Abduzido', 'Tradutor universal', 'Engenheiro de antigravidade', 'Turista interestelar', 'Médico de tentáculos', 'Piloto'] },
  { id: 102, name: 'Castelo medieval', icon: '🏰', roles: ['Rei', 'Rainha', 'Cavaleiro', 'Feiticeiro', 'Bufão', 'Servo', 'Dragão disfarçado', 'Prisioneiro'] },
  { id: 103, name: 'Laboratório do mal', icon: '🧪', roles: ['Cientista louco', 'Assistente torto', 'Cobaia', 'Cérebro na jarra', 'Robô obediente', 'Investidor sombrio', 'Rato inteligente', 'Guarda'] },
  { id: 104, name: 'Circo abandonado', icon: '🤡', roles: ['Palhaço amaldiçoado', 'Fantasma de acrobata', 'Domador de sombras', 'Visitante perdido', 'Mágico sem alma', 'Boneco vivo', 'Caixeiro-viajante', 'Explorador urbano'] },
  { id: 105, name: 'Ilha dos piratas', icon: '🏴‍☠️', roles: ['Capitão', 'Corsário', 'Papagaio falante', 'Prisioneiro', 'Cozinheiro de barril', 'Navegador bêbado', 'Tesoureiro', 'Marujo'] },
  { id: 106, name: 'Mansão assombrada', icon: '👻', roles: ['Fantasma', 'Médium', 'Investigador paranormal', 'Mordomo suspeito', 'Herdeiro', 'Exorcista', 'Criança assombrada', 'Fotógrafo noturno'] },
  { id: 107, name: 'Dimensão espelhada', icon: '🪞', roles: ['Você invertido', 'Guia dimensional', 'Viajante perdido', 'Entidade do espelho', 'Observador silencioso', 'Porteiro entre mundos', 'Reflexo rebelde', 'Turista confuso'] },
  { id: 108, name: 'Submundo dos gatos', icon: '🐱', roles: ['Rei gato', 'Espião felino', 'Humano capturado', 'Veterinário secreto', 'Rato negociador', 'Gata da máfia', 'Gatinho mensageiro', 'Siamês oráculo'] },
  { id: 109, name: 'Fábrica de sonhos', icon: '💤', roles: ['Sonâmbulo profissional', 'Pesadelo encarregado', 'Almofadeiro-chefe', 'Inspetor de pesadelos', 'Turista onírico', 'Contador de ovelhas', 'Ladrão de sonhos', 'Terapeuta do sono'] },
  { id: 110, name: 'Tribunal dos deuses', icon: '⚡', roles: ['Zeus', 'Advogado mortal', 'Acusado divino', 'Júri de ninfas', 'Escrivão celestial', 'Testemunha mitológica', 'Mensageiro alado', 'Turista do Olimpo'] },
  { id: 111, name: 'Zoológico invertido', icon: '🦁', roles: ['Humano em exposição', 'Guia animal', 'Veterinário invertido', 'Leão com crachá', 'Visitante confuso', 'Diretor da jaula', 'Fotógrafo proibido', 'Ativista das pessoas'] },
  { id: 112, name: 'Pântano encantado', icon: '🐸', roles: ['Bruxa do brejo', 'Sapo príncipe', 'Pescador amaldiçoado', 'Luz-fátua guia', 'Turista atolado', 'Criatura do lodo', 'Herborista', 'Caçador de lendas'] },
  { id: 113, name: 'Estação do tempo', icon: '⏳', roles: ['Viajante temporal', 'Guardião do relógio', 'Paradoxo ambulante', 'Historiador do futuro', 'Turista de ontem', 'Mecânico de eras', 'Cronômetro humano', 'Bilheteiro temporal'] },
  { id: 114, name: 'Escola de vilões', icon: '🦹', roles: ['Professor do mal', 'Aluno vilão', 'Diretor sombrio', 'Herói infiltrado', 'Mentor traidor', 'Zelador das masmorras', 'Estagiário maligno', 'Consultor de monólogos'] },
  { id: 115, name: 'Buffet infinito', icon: '🍕', roles: ['Chef cósmico', 'Comensal eterno', 'Garçom dimensional', 'Crítico faminto', 'Caixa do infinito', 'Cliente sem fim', 'Nutricionista desesperado', 'Segurança do bufê'] }
];

const LOCATIONS_BY_PACK = {
  [DEFAULT_PACK]: DEFAULT_LOCATIONS,
  [BIZARRO_PACK]: BIZARRO_LOCATIONS
};

function getLocationsByPack(packId) {
  return LOCATIONS_BY_PACK[packId] || DEFAULT_LOCATIONS;
}

function findLocationById(packId, locationId) {
  return getLocationsByPack(packId).find(l => l.id === locationId);
}

function getAllLocationIdsForPack(packId) {
  return getLocationsByPack(packId).map(l => l.id);
}

function pickRandomLocation(packId) {
  const locations = getLocationsByPack(packId);
  return locations[Math.floor(Math.random() * locations.length)];
}

function assignRoles(location, agentPlayerIds) {
  const pool = shuffle(location.roles);
  const roles = {};
  agentPlayerIds.forEach((playerId, index) => {
    roles[playerId] = pool[index % pool.length];
  });
  return roles;
}

function pickSpyIds(connectedUsers, spyCount) {
  const shuffled = shuffle(connectedUsers);
  return shuffled.slice(0, spyCount).map(u => u.playerId);
}

function validateRoomSettings(settings, connectedCount) {
  if (!settings || typeof settings !== 'object') {
    return 'Configurações inválidas';
  }

  const { timerMinutes, spyCount, locationPack } = settings;

  if (!TIMER_OPTIONS.includes(timerMinutes)) {
    return 'Duração do timer inválida';
  }
  if (![1, 2].includes(spyCount)) {
    return 'Número de espiões inválido';
  }
  if (!LOCATION_PACKS.some(p => p.id === locationPack)) {
    return 'Deck de locais inválido';
  }
  if (spyCount === 2 && connectedCount < MIN_PLAYERS_FOR_TWO_SPIES) {
    return `São necessários pelo menos ${MIN_PLAYERS_FOR_TWO_SPIES} jogadores para 2 espiões`;
  }
  return null;
}

function isSpy(gameState, playerId) {
  return gameState?.spyIds?.includes(playerId) ?? false;
}

function serializeLocationForClient(location) {
  if (!location) return null;
  return { id: location.id, name: location.name, icon: location.icon };
}

export {
  DEFAULT_PACK,
  BIZARRO_PACK,
  TIMER_OPTIONS,
  MIN_PLAYERS_FOR_TWO_SPIES,
  MIN_PLAYERS_TO_START,
  DEFAULT_ROOM_SETTINGS,
  LOCATION_PACKS,
  DEFAULT_LOCATIONS,
  BIZARRO_LOCATIONS,
  LOCATIONS_BY_PACK,
  shuffle,
  getLocationsByPack,
  findLocationById,
  getAllLocationIdsForPack,
  pickRandomLocation,
  assignRoles,
  pickSpyIds,
  validateRoomSettings,
  isSpy,
  serializeLocationForClient
};
