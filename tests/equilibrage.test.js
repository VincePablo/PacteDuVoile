import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMES } from '../src/data/weapons.js';
import { ESCOUADES, FACTIONS } from '../src/data/factions.js';
import { cibleArme, rotationArme } from '../src/systems/valeur.js';
import { simulerTout } from '../tools/simulate.js';

const moyenne = (l) => l.reduce((a, b) => a + b, 0) / l.length;

test('budget théorique : chaque arme à ±10 % de la valeur attendue (portée × rôle × correction)', () => {
  for (const id in ARMES) {
    const r = rotationArme(id);
    const c = cibleArme(id);
    assert.ok(Math.abs(r.dmgParPA / c.dmgParPA - 1) <= 0.1, `${id} : dégâts ${(r.dmgParPA / c.dmgParPA - 1) * 100}%`);
    assert.ok(Math.abs(r.valeurParPA / c.valeurParPA - 1) <= 0.1, `${id} : valeur ${(r.valeurParPA / c.valeurParPA - 1) * 100}%`);
  }
});

test('chaque escouade a une arme imposée unique et la bonne somme de caractéristiques', () => {
  const armes = Object.values(ESCOUADES).map((e) => e.arme);
  assert.equal(new Set(armes).size, 12);
  for (const [id, e] of Object.entries(ESCOUADES)) {
    const total = Object.values(e.stats).reduce((a, b) => a + b, 0);
    assert.equal(total, FACTIONS[e.faction].pointsStats, id);
  }
});

test('simulation : chaque escouade et chaque arme gagnent entre 40 et 60 % des combats', () => {
  const r = simulerTout(40);
  const parArme = {};
  for (const esc in r) {
    const m = moyenne(Object.values(r[esc]));
    assert.ok(m >= 0.4 && m <= 0.6, `${esc} : ${Math.round(m * 100)} %`);
    for (const a in r[esc]) (parArme[a] ??= []).push(r[esc][a]);
  }
  for (const a in parArme) {
    const m = moyenne(parArme[a]);
    assert.ok(m >= 0.4 && m <= 0.6, `${a} : ${Math.round(m * 100)} %`);
  }
});
