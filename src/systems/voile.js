// Le Pacte du Voile : les humains ne doivent jamais savoir. Témoins, Déchirure, seuils et sanctions.
import { ESCOUADES } from '../data/factions.js';
import { factionDe, idFaction, retirer, retrograder } from './faction.js';

export const VISION_BASE = 6; // cases
export const PORTEE_BRUIT = 2; // cases de vision gagnées par point de bruit (le bruit attire les regards)
export const DECHIRURE_PAR_SURNAT = 5; // par témoin qui voit, par point de surnaturel
export const DECHIRURE_MAX_ACTION = 25;
export const DECROISSANCE_SECONDES = 20; // −1 de Déchirure toutes les 20 s d'exploration

export const ANGES_BLAME = 25;
export const DEMONS_AMENDE = 15;

export function visionTemoins(etat) {
  const passif = ESCOUADES[etat.escouade].passif;
  return VISION_BASE + (passif.id === 'seduction' ? passif.params.vision : 0);
}

// Témoins qui voient une action en (x, y). `ligneDeVue(temoin, point)` est optionnelle.
export function temoinsQuiVoient(temoins, x, y, bruit, vision, ligneDeVue = null) {
  return temoins.filter((t) => {
    if (t.endormi) return false;
    const d = Math.abs(t.x - x) + Math.abs(t.y - y);
    if (d > vision + bruit * PORTEE_BRUIT) return false;
    return !ligneDeVue || ligneDeVue(t, { x, y });
  });
}

export function expositionAction({ surnat, bruit }, x, y, temoins, vision, ligneDeVue) {
  if (!surnat) return { montant: 0, temoins: [] };
  const voient = temoinsQuiVoient(temoins, x, y, bruit, vision, ligneDeVue);
  return { montant: Math.min(DECHIRURE_MAX_ACTION, voient.length * surnat * DECHIRURE_PAR_SURNAT), temoins: voient };
}

// Ajoute de la Déchirure et applique les franchissements de seuil. Retourne une liste d'événements.
export function ajouterDechirure(etat, montant) {
  const evts = [];
  if (montant <= 0) return evts;
  const { avertissement, sanction } = factionDe(etat).voile;
  const avant = etat.voile.dechirure;
  etat.voile.dechirure = Math.min(100, avant + montant);
  evts.push({ type: 'dechirure', montant, total: etat.voile.dechirure });
  if (avant < avertissement && etat.voile.dechirure >= avertissement) evts.push({ type: 'avertissement' });
  if (etat.voile.dechirure >= sanction) {
    evts.push(...appliquerSanction(etat));
    etat.voile.dechirure = Math.max(0, avertissement - 10);
  }
  return evts;
}

export function reduireDechirure(etat, montant) {
  etat.voile.dechirure = Math.max(0, etat.voile.dechirure - montant);
}

export function decroissance(etat, secondes) {
  etat.voile.accumulateur = (etat.voile.accumulateur || 0) + secondes;
  while (etat.voile.accumulateur >= DECROISSANCE_SECONDES) {
    etat.voile.accumulateur -= DECROISSANCE_SECONDES;
    reduireDechirure(etat, 1);
  }
}

export function appliquerSanction(etat) {
  const faction = idFaction(etat);
  if (faction === 'anges') {
    const manque = retirer(etat, ANGES_BLAME);
    const evts = [{ type: 'sanction', faction, texte: `Blâme céleste : −${ANGES_BLAME - manque} Grâce.` }];
    if (etat.ressource.points === 0) {
      etat.penitence = true;
      evts.push({ type: 'penitence', texte: 'Votre Grâce est épuisée. Pénitence : progression bloquée et −1 à toutes les caractéristiques jusqu’à réparation.' });
    }
    return evts;
  }
  if (faction === 'demons') {
    const manque = retirer(etat, DEMONS_AMENDE);
    if (manque > 0) {
      const rang = retrograder(etat);
      return [{ type: 'sanction', faction, texte: rang ? `Amende impayée : vous êtes rétrogradé au grade de ${rang}.` : 'Amende impayée. Vous êtes déjà au plus bas.' }];
    }
    return [{ type: 'sanction', faction, texte: `Amende infernale : −${DEMONS_AMENDE} Corruption.` }];
  }
  return [{ type: 'sanction', faction, patrouille: true, texte: 'Vous avez été repéré : une patrouille d’anges et de démons vous prend en chasse !' }];
}
