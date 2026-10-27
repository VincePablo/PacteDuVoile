import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerGrille } from '../src/data/maps.js';
import { chemin, accessibles } from '../src/systems/pathfinding.js';
import * as C from '../src/systems/combat.js';

const vide = (w = 9, h = 9) => creerGrille(Array.from({ length: h }, () => ','.repeat(w)));

function combat(lignes, joueur, ennemis) {
  return C.creerCombat({ grille: creerGrille(lignes), unites: [joueur, ...ennemis], graine: 42 });
}

test('A* contourne un mur et trouve le plus court chemin', () => {
  const g = creerGrille(['.....', '.###.', '.....']);
  const p = chemin({ x: 0, y: 1 }, { x: 4, y: 1 }, g.bloque);
  assert.equal(p.length, 6);
  assert.deepEqual(p.at(-1), { x: 4, y: 1 });
  assert.equal(chemin({ x: 0, y: 0 }, { x: 2, y: 1 }, g.bloque), null, 'case bloquée inaccessible');
});

test('les cases accessibles respectent les PM', () => {
  const g = vide();
  const carte = accessibles({ x: 4, y: 4 }, 2, g.bloque);
  assert.equal(carte.size, 13); // losange de rayon 2
});

test('un déplacement consomme les PM et refuse au-delà', () => {
  const j = C.creerJoueur({ escouade: 'gabriel', x: 0, y: 0 });
  const e = C.creerEnnemi('possede', 8, 8);
  const c = combat(Array(9).fill(','.repeat(9)), j, [e]);
  while (C.courant(c) !== j) C.finTour(c);
  assert.equal(C.deplacer(c, j, 5, 5), null, 'trop loin');
  assert.ok(C.deplacer(c, j, 2, 1));
  assert.equal(j.pm, 0);
});

test('portée, ligne de vue et coût en PA', () => {
  // Arc (longue, 4 à 8). Un mur entre le joueur et la cible bloque la ligne de vue.
  const lignes = [',,,,,,,,,', ',,,,#,,,,', ',,,,,,,,,'];
  const j = C.creerJoueur({ escouade: 'gabriel', x: 0, y: 1 });
  const e = C.creerEnnemi('possede', 8, 1);
  const c = combat(lignes, j, [e]);
  while (C.courant(c) !== j) C.finTour(c);
  const fleche = j.competences.find((k) => k.id === 'fleche');
  assert.equal(C.peutLancer(c, j, fleche, 8, 1), false, 'mur entre les deux');
  j.y = 0;
  e.y = 0;
  assert.equal(C.peutLancer(c, j, fleche, 8, 0), true);
  e.x = 2;
  assert.equal(C.peutLancer(c, j, fleche, 2, 0), false, 'trop près pour une arme longue');
  e.x = 8;
  assert.ok(C.lancer(c, j, 'fleche', 8, 0));
  assert.equal(j.pa, 4);
  assert.ok(e.pv < e.pvMax);
});

test('les recharges empêchent de relancer une compétence forte', () => {
  const j = C.creerJoueur({ escouade: 'matthias', x: 1, y: 1 });
  const e = C.creerEnnemi('collectionneur', 2, 1);
  const c = combat(Array(4).fill(',,,,'), j, [e]);
  while (C.courant(c) !== j) C.finTour(c);
  assert.ok(C.lancer(c, j, 'tourbillon', 2, 1));
  assert.equal(C.lancer(c, j, 'tourbillon', 2, 1), false);
});

test('une victoire est détectée quand tous les ennemis tombent', () => {
  const j = C.creerJoueur({ escouade: 'uriel', x: 0, y: 0 });
  const e = C.creerEnnemi('ombre', 5, 0);
  e.pv = 1;
  const c = combat([',,,,,,,,'], j, [e]);
  while (C.courant(c) !== j) C.finTour(c);
  C.lancer(c, j, 'ajuste', 5, 0);
  assert.equal(c.fini, 'victoire');
});

test('le Miracle relève un ange une fois', () => {
  const j = C.creerJoueur({ escouade: 'raphael', x: 0, y: 0 });
  j.miracle = true;
  const e = C.creerEnnemi('possede', 1, 0);
  const c = combat([',,,'], j, [e]);
  C.infliger(c, e, j, 9999);
  assert.ok(j.vivant);
  assert.equal(j.pv, Math.round(j.pvMax * 0.5));
  C.infliger(c, e, j, 9999);
  assert.equal(j.vivant, false);
  assert.equal(c.fini, 'defaite');
});

test('l’arme imposée de corps à corps donne +1 PM', () => {
  assert.equal(C.creerJoueur({ escouade: 'matthias' }).pmMax, 4);
  assert.equal(C.creerJoueur({ escouade: 'uriel' }).pmMax, 3);
});

test('une combinaison complète se joue jusqu’au bout en IA', () => {
  const j = C.creerJoueur({ escouade: 'sorciers', arme2: 'dagues', x: 4, y: 7 });
  j.ia = true;
  const c = C.creerCombat({ grille: vide(), unites: [j, C.creerEnnemi('goule', 4, 1), C.creerEnnemi('ombre', 2, 1)], graine: 7 });
  assert.ok(['victoire', 'defaite'].includes(C.simulerCombat(c)));
});
