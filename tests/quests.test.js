import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerEtat } from '../src/systems/state.js';
import { demarrer, demarrerPenitence, estActive, estTerminee, rencontreDisponible, traiter } from '../src/systems/quests.js';
import { MARQUEURS, OBJETS, PNJ } from '../src/data/quests.js';
import { QUARTIER, creerGrille } from '../src/data/maps.js';

const types = (notes) => notes.map((n) => n.type);

function finirTutoriel(etat) {
  demarrer(etat, 'tutoriel');
  traiter(etat, { type: 'parler', pnj: 'contact' });
  for (const r of ['parc1', 'parc2', 'parc3']) traiter(etat, { type: 'vaincre', rencontre: r });
  return traiter(etat, { type: 'parler', pnj: 'contact' });
}

test('le tutoriel se termine par le choix de la 2e arme et lance le fil rouge', () => {
  const etat = creerEtat('gabriel');
  const notes = finirTutoriel(etat);
  assert.ok(types(notes).includes('choixArme'));
  assert.ok(estTerminee(etat, 'tutoriel'));
  assert.ok(estActive(etat, 'filrouge'));
  assert.equal(etat.inventaire.fioles, 3);
});

test('les rencontres du parc ne sont visibles que pendant l’étape qui les demande', () => {
  const etat = creerEtat('uriel');
  assert.equal(rencontreDisponible(etat, 'parc1', MARQUEURS.parc1), false);
  demarrer(etat, 'tutoriel');
  traiter(etat, { type: 'parler', pnj: 'contact' });
  assert.equal(rencontreDisponible(etat, 'parc1', MARQUEURS.parc1), true);
  traiter(etat, { type: 'vaincre', rencontre: 'parc1' });
  assert.equal(rencontreDisponible(etat, 'parc1', MARQUEURS.parc1), false);
});

test('fil rouge complet : briefing, enquête (avec une déduction ratée), boss, rapport', () => {
  const etat = creerEtat('sorciers');
  finirTutoriel(etat);
  etat.arme2 = 'dagues';
  const brief = traiter(etat, { type: 'parler', pnj: 'contact' });
  assert.match(brief.find((n) => n.type === 'dialogue').lignes.join(' '), /Sorciers/);
  assert.ok(estActive(etat, 'notaire'), 'le chapitre 2 lance l’enquête');

  traiter(etat, { type: 'parler', pnj: 'notaire' });
  let notes = [];
  for (const o of ['agenda', 'somniferes', 'coffre', 'lettre']) notes = traiter(etat, { type: 'examiner', objet: o });
  assert.ok(notes.some((n) => n.bonus), 'les Sorciers reçoivent un indice de plus');

  const ko = traiter(etat, { type: 'deduire', quete: 'notaire', choix: 'fantome' });
  assert.equal(ko[0].type, 'deduction_ko');
  assert.equal(ko[0].restantes, 2);
  const ok = traiter(etat, { type: 'deduire', quete: 'notaire', choix: 'vente' });
  assert.equal(ok[0].type, 'deduction_ok');

  const issue = traiter(etat, { type: 'parler', pnj: 'notaire' });
  assert.match(issue.find((n) => n.type === 'dialogue').lignes.join(' '), /votre escouade/);
  assert.ok(estTerminee(etat, 'notaire'));
  assert.ok(rencontreDisponible(etat, 'boss', MARQUEURS.boss), 'le chapitre 3 ouvre le combat de boss');

  traiter(etat, { type: 'vaincre', rencontre: 'boss' });
  const fin = traiter(etat, { type: 'parler', pnj: 'contact' });
  assert.ok(fin.some((n) => n.type === 'terminee' && n.quete === 'filrouge'));
});

test('trois mauvaises déductions divisent la récompense par deux', () => {
  const etat = creerEtat('mammon');
  demarrer(etat, 'notaire');
  traiter(etat, { type: 'parler', pnj: 'notaire' });
  for (const o of ['agenda', 'somniferes', 'coffre', 'lettre']) traiter(etat, { type: 'examiner', objet: o });
  for (let i = 0; i < 3; i++) traiter(etat, { type: 'deduire', quete: 'notaire', choix: 'maladie' });
  const fin = traiter(etat, { type: 'parler', pnj: 'notaire' });
  const t = fin.find((n) => n.type === 'terminee');
  assert.equal(t.gain, Math.round(15 * 1.25));
});

test('la pénitence peut être relancée après avoir été accomplie', () => {
  const etat = creerEtat('raphael');
  etat.penitence = true;
  demarrerPenitence(etat);
  traiter(etat, { type: 'examiner', objet: 'camera' });
  traiter(etat, { type: 'parler', pnj: 'contact' });
  assert.equal(etat.penitence, false);
  etat.penitence = true;
  assert.ok(demarrerPenitence(etat).length > 0);
  assert.ok(estActive(etat, 'penitence'));
});

test('PNJ, objets et marqueurs sont sur des cases praticables', () => {
  const g = creerGrille(QUARTIER.lignes);
  for (const [id, p] of Object.entries({ ...PNJ, ...OBJETS, ...MARQUEURS })) {
    assert.equal(g.bloque(p.x, p.y), false, `${id} en (${p.x}, ${p.y})`);
  }
  assert.equal(g.bloque(QUARTIER.depart.x, QUARTIER.depart.y), false);
});
