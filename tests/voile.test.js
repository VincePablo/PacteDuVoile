import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerEtat } from '../src/systems/state.js';
import { ajouterDechirure, expositionAction, temoinsQuiVoient } from '../src/systems/voile.js';
import { gagner, nomRang } from '../src/systems/faction.js';

const temoins = [{ x: 0, y: 0 }, { x: 3, y: 0 }];

test('le bruit élargit le champ de vision des témoins', () => {
  assert.equal(temoinsQuiVoient(temoins, 9, 0, 0, 6).length, 1);
  assert.equal(temoinsQuiVoient(temoins, 9, 0, 2, 6).length, 2);
});

test('une arme humaine ne déchire pas le Voile, une magie si', () => {
  assert.equal(expositionAction({ surnat: 0, bruit: 3 }, 1, 0, temoins, 6).montant, 0);
  assert.equal(expositionAction({ surnat: 3, bruit: 0 }, 1, 0, temoins, 6).montant, 25); // 2 témoins × 3 × 5, plafonné
});

test('les mêmes actes sanctionnent un ange avant un démon', () => {
  const ange = creerEtat('raphael');
  const demon = creerEtat('lucifer');
  gagner(ange, 100);
  gagner(demon, 100);
  const actes = [15, 15, 15, 15];
  const sanctionsAnge = actes.flatMap((m) => ajouterDechirure(ange, m)).filter((e) => e.type === 'sanction');
  const sanctionsDemon = actes.flatMap((m) => ajouterDechirure(demon, m)).filter((e) => e.type === 'sanction');
  assert.equal(sanctionsAnge.length, 1);
  assert.equal(sanctionsDemon.length, 0);
});

test('la Grâce à 0 déclenche la pénitence et bloque la progression', () => {
  const ange = creerEtat('matthias');
  gagner(ange, 20); // 16 de Grâce (gain lent ×0,8)
  const evts = ajouterDechirure(ange, 60);
  assert.ok(evts.some((e) => e.type === 'penitence'));
  assert.equal(ange.penitence, true);
  assert.equal(gagner(ange, 50).gain, 0);
});

test('un démon qui ne peut pas payer son amende est rétrogradé', () => {
  const demon = creerEtat('mammon');
  gagner(demon, 40); // 50 de Corruption → rang 1
  assert.equal(nomRang(demon), 'Tourmenteur');
  demon.ressource.points = 5;
  const evts = ajouterDechirure(demon, 90);
  assert.ok(evts.some((e) => e.type === 'sanction' && /rétrogradé/.test(e.texte)));
  assert.equal(nomRang(demon), 'Diablotin');
});

test('la 3e Force exposée attire une patrouille', () => {
  const loup = creerEtat('loups');
  const evts = ajouterDechirure(loup, 80);
  assert.ok(evts.some((e) => e.patrouille));
  assert.ok(loup.voile.dechirure < 45, 'la jauge redescend après la sanction');
});
