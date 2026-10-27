// État de la partie et sauvegarde. Isolé pour pouvoir brancher Firestore plus tard :
// seules charger() et sauvegarder() touchent au stockage.
import { ESCOUADES } from '../data/factions.js';
import { QUARTIER } from '../data/maps.js';
import { creerEtatQuetes } from './quests.js';

const CLE = 'sous-le-voile:sauvegarde';
export const VERSION = 1;

export function creerEtat(escouade) {
  return {
    version: VERSION,
    escouade,
    faction: ESCOUADES[escouade].faction,
    arme2: null,
    position: { ...QUARTIER.depart },
    ressource: { points: 0, rang: 0 },
    penitence: false,
    voile: { dechirure: 0, accumulateur: 0 },
    inventaire: { fioles: 2 },
    quetes: creerEtatQuetes(),
    horloge: 0, // secondes de jeu, pour le cycle jour/nuit
    pv: null, // null = PV pleins
  };
}

export const DUREE_DEMI_CYCLE = 600; // 10 minutes de jour, 10 minutes de nuit
export const estNuit = (etat) => Math.floor(etat.horloge / DUREE_DEMI_CYCLE) % 2 === 1;

function stockage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function sauvegarder(etat) {
  try {
    stockage()?.setItem(CLE, JSON.stringify(etat));
    return true;
  } catch {
    return false;
  }
}

export function charger() {
  try {
    const brut = stockage()?.getItem(CLE);
    if (!brut) return null;
    const etat = JSON.parse(brut);
    return etat.version === VERSION && ESCOUADES[etat.escouade] ? etat : null;
  } catch {
    return null;
  }
}

export function effacer() {
  try {
    stockage()?.removeItem(CLE);
  } catch {
    // stockage indisponible : rien à effacer
  }
}
