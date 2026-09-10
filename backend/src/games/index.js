import * as spyfall from './spyfall.js';
import * as quemSouEu from './quemSouEu.js';
import { GAME_TYPES } from '../../../shared/catalog.js';

const engines = {
  [GAME_TYPES.SPYFALL]: spyfall,
  [GAME_TYPES.QUEM_SOU_EU]: quemSouEu
};

export function getEngine(gameType) {
  return engines[gameType] || spyfall;
}

export function listEngines() {
  return Object.values(engines);
}
