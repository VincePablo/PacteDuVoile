// Simulation d'équilibrage : chaque escouade × chacune des 11 armes secondaires contre la rencontre de référence.
// Les PV des ennemis varient de 60 % à 140 % (échelle stratifiée) : le taux de victoire mesure donc la puissance
// de la combinaison de façon continue au lieu de basculer brutalement entre 0 et 100 %.
// Usage : node tools/simulate.js [combats par combinaison, défaut 40]
import { ARMES } from '../src/data/weapons.js';
import { ESCOUADES } from '../src/data/factions.js';
import { RENCONTRES } from '../src/data/enemies.js';
import { ARENES, DEPARTS, creerGrille } from '../src/data/maps.js';
import { creerCombat, creerEnnemi, creerJoueur, pvMaxDe, simulerCombat } from '../src/systems/combat.js';

// normaliser : ramène les caractéristiques de chaque escouade à 24 points, pour mesurer l'équilibre des kits seuls.
// L'écart voulu entre factions (Anges 26 / 3e Force 24 / Démons 22) est compensé hors combat par le Pacte du Voile,
// que la simulation ne modélise pas.
export function simulerCombinaison(escouade, arme2, n = 40, { normaliser = false, graineBase = 1 } = {}) {
  let victoires = 0;
  for (let i = 0; i < n; i++) {
    const grille = creerGrille(ARENES.reference);
    const joueur = creerJoueur({ escouade, arme2, ...DEPARTS.joueur });
    if (normaliser) normaliserStats(joueur);
    joueur.ia = true;
    const echelle = 0.6 + (0.8 * (i + 0.5)) / n;
    const ennemis = RENCONTRES.reference.map((t, k) => {
      const e = creerEnnemi(t, DEPARTS.ennemis[k].x, DEPARTS.ennemis[k].y);
      e.pvMax = e.pv = Math.round(e.pv * echelle);
      return e;
    });
    // Un combat sur deux de nuit, comme dans le jeu (cycle jour/nuit).
    const c = creerCombat({ grille, unites: [joueur, ...ennemis], graine: graineBase * 7919 + i * 104729, nuit: i % 2 === 1 });
    if (simulerCombat(c) === 'victoire') victoires++;
  }
  return victoires / n;
}

function normaliserStats(u) {
  const ecart = 24 - Object.values(u.stats).reduce((a, b) => a + b, 0);
  // Les points sont ajoutés ou retirés en partant des caractéristiques les plus hautes, puis les PV sont recalculés.
  const cles = Object.keys(u.stats).sort((a, b) => u.stats[b] - u.stats[a]);
  for (let i = 0; i < Math.abs(ecart); i++) u.stats[cles[i % 4]] += Math.sign(ecart);
  u.pvMax = u.pv = pvMaxDe(u.stats, u.escouade);
}

export function simulerTout(n = 40, options = {}) {
  const resultats = {};
  for (const esc in ESCOUADES) {
    resultats[esc] = {};
    for (const arme in ARMES) {
      if (arme === ESCOUADES[esc].arme) continue;
      resultats[esc][arme] = simulerCombinaison(esc, arme, n, options);
    }
  }
  return resultats;
}

if (process.argv[1]?.endsWith('simulate.js')) {
  const n = Number(process.argv[2]) || 40;
  const normaliser = process.argv.includes('--normaliser');
  const debut = Date.now();
  const r = simulerTout(n, { normaliser });
  const armes = Object.keys(ARMES);
  console.log('escouade     ' + armes.map((a) => a.slice(0, 5).padStart(6)).join('') + '   moy');
  const parArme = Object.fromEntries(armes.map((a) => [a, []]));
  for (const esc in r) {
    const vals = Object.values(r[esc]);
    const moy = vals.reduce((s, v) => s + v, 0) / vals.length;
    console.log(esc.padEnd(13) + armes.map((a) => (r[esc][a] === undefined ? '     -' : `${Math.round(r[esc][a] * 100)}`.padStart(6))).join('') + `${Math.round(moy * 100)}`.padStart(6));
    for (const a in r[esc]) parArme[a].push(r[esc][a]);
  }
  console.log('moy arme     ' + armes.map((a) => `${Math.round((parArme[a].reduce((s, v) => s + v, 0) / parArme[a].length) * 100)}`.padStart(6)).join(''));
  console.log(`${normaliser ? 'Caractéristiques normalisées à 24 points. ' : ''}${n} combats par combinaison, ${((Date.now() - debut) / 1000).toFixed(1)} s`);
}
