// Ressource de faction (Grâce / Corruption / Renommée) : progression, dépense active, tampon de sanction.
import { ESCOUADES, FACTIONS, SEUILS_RANG, rangsDe } from '../data/factions.js';

export const factionDe = (etat) => FACTIONS[ESCOUADES[etat.escouade].faction];
export const idFaction = (etat) => ESCOUADES[etat.escouade].faction;

// Gain de ressource. Bloqué pour un ange en pénitence. Retourne { gain, promotions: [nomDuRang] }.
export function gagner(etat, montant) {
  if (etat.penitence) return { gain: 0, promotions: [], bloque: true };
  const gain = Math.round(montant * factionDe(etat).gainMult);
  etat.ressource.points += gain;
  const promotions = [];
  while (etat.ressource.rang < SEUILS_RANG.length - 1 && etat.ressource.points >= SEUILS_RANG[etat.ressource.rang + 1]) {
    etat.ressource.rang += 1;
    promotions.push(nomRang(etat));
  }
  return { gain, promotions };
}

// Retire jusqu'à `montant` ; retourne ce qui n'a pas pu être payé.
export function retirer(etat, montant) {
  const paye = Math.min(etat.ressource.points, montant);
  etat.ressource.points -= paye;
  return montant - paye;
}

export function depenser(etat, montant) {
  if (etat.penitence || etat.ressource.points < montant) return false;
  etat.ressource.points -= montant;
  return true;
}

export function nomRang(etat) {
  return rangsDe(etat.escouade)[etat.ressource.rang];
}

export function prochainSeuil(etat) {
  return SEUILS_RANG[etat.ressource.rang + 1] ?? null;
}

export function retrograder(etat) {
  if (etat.ressource.rang === 0) return null;
  etat.ressource.rang -= 1;
  return nomRang(etat);
}
