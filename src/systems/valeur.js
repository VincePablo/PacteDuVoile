// Valeur théorique des compétences : sert à l'équilibrage (tests) et à l'IA.
import { ARMES, PORTEES, ROLES } from '../data/weapons.js';

export const REFERENCE = {
  degatsParPA: 11.5, // dégâts par PA d'une arme de corps à corps au rôle « discret »
  valeurParPA: 13.8, // valeur totale (dégâts + utilité) par PA au corps à corps
  dpsEnnemi: 30, // dégâts par tour d'un ennemi de référence
  dpsPropre: 25, // dégâts par tour du joueur de référence
};

// 1 tour de contrôle = 1 attaque de base de l'arme (2 PA × 11,5 × portée).
export const valeurControle = (multPortee) => 23 * multPortee;

export function valeurCompetence(comp, multPortee = 1) {
  const e = comp.effets || {};
  const C = valeurControle(multPortee);
  const zone = e.zone ? 1.5 : 1;
  let dmg = 0;
  let util = 0;
  if (e.dmg) dmg += e.dmg * zone;
  if (e.dot) dmg += e.dot.dmg * e.dot.tours * 0.9 * zone;
  if (e.drain && e.dmg) util += e.dmg * e.drain;
  if (e.coutPV) util -= e.coutPV;
  if (e.etourdit) util += C * e.etourdit;
  if (e.manipule) util += 2 * C * e.manipule;
  if (e.immobilise) util += 0.5 * C * e.immobilise;
  if (e.recul) util += 0.5 * C;
  if (e.attire) util += 0.5 * C;
  if (e.provoque) util += 0.5 * C * e.provoque;
  if (e.retard) util += e.retard * 5;
  if (e.affaiblit) util += (e.affaiblit.pct / 100) * REFERENCE.dpsEnnemi * e.affaiblit.tours;
  if (e.vulnerable) util += (e.vulnerable.pct / 100) * REFERENCE.dpsPropre * e.vulnerable.tours;
  if (e.aveugle) util += 0.5 * REFERENCE.dpsEnnemi * e.aveugle;
  if (e.critDos) util += (e.dmg || 0) * e.critDos * 0.5 * 0.5; // proba d'être de dos × bonus critique
  if (e.dosMult) util += (e.dmg || 0) * (e.dosMult - 1) * 0.5;
  if (e.ignoreBouclier) util += 2;
  if (e.heal) util += e.heal;
  if (e.hot) util += e.hot.soin * e.hot.tours * 0.9;
  if (e.bouclier) util += e.bouclier * 0.8;
  if (e.buff) util += (e.buff.pct / 100) * REFERENCE.dpsPropre * e.buff.tours;
  if (e.parade) util += (e.parade.pct / 100) * REFERENCE.dpsEnnemi * e.parade.tours;
  if (e.pm) util += 4 * e.pm;
  if (e.purifie) util += 10;
  return { dmg, util, total: dmg + util };
}

// Rotation type sur N tours avec 6 PA : forte dès que possible, puis utilitaire, puis base.
export function rotationArme(armeId, tours = 6, paParTour = 6) {
  const arme = ARMES[armeId];
  const mult = PORTEES[arme.portee].mult;
  const recharges = {};
  let dmg = 0;
  let total = 0;
  let paDepenses = 0;
  const ordre = ['forte', 'utilitaire', 'base'];
  for (let t = 0; t < tours; t++) {
    for (const id in recharges) recharges[id] = Math.max(0, recharges[id] - 1);
    let pa = paParTour;
    let lance = true;
    while (lance) {
      lance = false;
      for (const type of ordre) {
        const comp = arme.competences.find((c) => c.type === type);
        if (comp.pa <= pa && !(recharges[comp.id] > 0)) {
          const v = valeurCompetence(comp, mult);
          dmg += v.dmg;
          total += v.total;
          pa -= comp.pa;
          paDepenses += comp.pa;
          if (comp.recharge) recharges[comp.id] = comp.recharge;
          lance = true;
          break;
        }
      }
    }
  }
  return { dmgParPA: dmg / paDepenses, valeurParPA: total / paDepenses };
}

export function cibleArme(armeId) {
  const arme = ARMES[armeId];
  const mult = PORTEES[arme.portee].mult;
  const correction = arme.correction ?? 1;
  return {
    dmgParPA: REFERENCE.degatsParPA * mult * ROLES[arme.role].mult * correction,
    valeurParPA: REFERENCE.valeurParPA * mult * correction,
  };
}
