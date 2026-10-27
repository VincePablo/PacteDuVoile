// Moteur de combat tactique au tour par tour. Logique pure, sans Phaser : utilisé par CombatScene,
// par la simulation d'équilibrage et par les tests.
import { ARMES, PORTEES, porteeCompetence } from '../data/weapons.js';
import { ESCOUADES } from '../data/factions.js';
import { ENNEMIS } from '../data/enemies.js';
import { valeurCompetence } from './valeur.js';
import { accessibles, cheminDepuis, cle } from './pathfinding.js';
import { creerRng } from './rng.js';

export const PA_MAX = 6;
export const PM_MAX = 3;
export const MAX_TOURS = 30;

export const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const statMod = (u, stat) => 1 + ((u.stats?.[stat] ?? 6) - 6) * 0.03;

// Effets décomptés au début du tour de leur porteur (bonus) ou à la fin (malus).
const DECOMPTE_DEBUT = ['buff', 'parade', 'bestial'];
const DECOMPTE_FIN = ['affaiblit', 'vulnerable', 'aveugle', 'immobilise', 'etourdi', 'manipule', 'provoque', 'maudit'];
const NEGATIFS = ['dot', 'affaiblit', 'vulnerable', 'aveugle', 'immobilise', 'etourdi', 'manipule', 'maudit'];

let prochainId = 1;

// ---------------------------------------------------------------- Création

function preparerCompetence(comp, source) {
  const portee = comp.portee || source.portee;
  return {
    ...comp,
    armeId: source.armeId ?? null,
    stat: comp.stat ?? source.stat,
    bruit: comp.bruit ?? source.bruit ?? 0,
    surnat: comp.surnat ?? source.surnat ?? 0,
    magie: source.magie ?? false,
    portee,
    multPortee: source.multPortee ?? 1,
    valeur: valeurCompetence(comp, source.multPortee ?? 1),
  };
}

export function competencesArme(armeId) {
  const arme = ARMES[armeId];
  return arme.competences.map((c) =>
    preparerCompetence(c, {
      armeId,
      stat: arme.stat,
      bruit: arme.bruit,
      surnat: arme.surnat,
      magie: arme.magie,
      portee: porteeCompetence(armeId, c),
      multPortee: PORTEES[arme.portee].mult,
    }),
  );
}

export function pvMaxDe(stats, escouadeId, rang = 0) {
  let pv = 70 + stats.force * 3 + stats.volonte * 2 + rang * 10;
  const passif = escouadeId && ESCOUADES[escouadeId].passif;
  if (passif?.id === 'discipline') pv = Math.round(pv * (1 + passif.params.pv));
  return pv;
}

export function creerJoueur({ escouade, arme2 = null, rang = 0, penitence = false, fioles = 0, x = 0, y = 0, nom = 'Vous' }) {
  const esc = ESCOUADES[escouade];
  const stats = { ...esc.stats };
  stats[ARMES[esc.arme].stat] += rang; // chaque rang renforce la caractéristique de l'arme imposée
  if (penitence) for (const k in stats) stats[k] -= 1;
  const competences = [...competencesArme(esc.arme)];
  if (arme2 && arme2 !== esc.arme) competences.push(...competencesArme(arme2));
  const p = esc.pouvoir;
  competences.push(
    preparerCompetence(
      { ...p, type: 'pouvoir', pouvoir: true, effets: {}, pa: p.id === 'rituel' && esc.passif.id === 'erudition' ? p.pa - esc.passif.params.reductionRituel : p.pa },
      { stat: 'volonte', bruit: 0, surnat: p.surnat ?? 1, magie: (p.surnat ?? 0) > 0, portee: p.portee || { min: 0, max: 0 } },
    ),
  );
  competences.push(
    preparerCompetence(
      { id: 'fiole', nom: 'Fiole de soin', type: 'objet', objet: true, pa: 2, recharge: 0, cible: 'soi', effets: { heal: 30 } },
      { stat: 'volonte', bruit: 0, surnat: 0, portee: { min: 0, max: 0 } },
    ),
  );
  const pvMax = pvMaxDe(stats, escouade, rang);
  // Charge : une arme imposée de corps à corps donne +1 PM, pour compenser le temps passé à s'approcher.
  const pmMax = PM_MAX + (ARMES[esc.arme].portee === 'cac' ? 1 : 0);
  return {
    id: 'joueur', nom, camp: 'joueur', ia: false, principal: true, escouade, faction: esc.faction, armePrincipale: esc.arme,
    x, y, stats, pvMax, pv: pvMax, paMax: PA_MAX, pmMax, pa: PA_MAX, pm: pmMax,
    competences, recharges: {}, effets: [], bouclier: 0, facing: { x: 0, y: 1 }, tags: [],
    passif: esc.passif.id, pp: esc.passif.params, fioles, sansCrit: 0, utilise: {}, vivant: true, couleur: 0xffffff,
  };
}

export function creerEnnemi(type, x, y, camp = 'ennemi') {
  const def = ENNEMIS[type];
  const competences = def.competences.map((c) =>
    preparerCompetence(c, { stat: c.portee.max > 1 ? 'volonte' : 'force', bruit: 1, surnat: 1, portee: c.portee, multPortee: c.portee.max > 1 ? 0.85 : 1 }),
  );
  return {
    id: `${type}-${prochainId++}`, type, nom: def.nom, camp, ia: true, x, y,
    stats: { ...def.stats }, pvMax: def.pv, pv: def.pv, paMax: PA_MAX, pmMax: def.pm, pa: PA_MAX, pm: def.pm,
    competences, recharges: {}, effets: [], bouclier: 0, facing: { x: 0, y: -1 }, tags: def.tags || [],
    passif: null, pp: {}, fioles: 0, sansCrit: 0, utilise: {}, vivant: true, couleur: def.couleur, boss: !!def.boss,
  };
}

// grille : { w, h, bloque(x, y) }. Options : graine, nuit, temoins (gérés par voile.js).
export function creerCombat({ grille, unites, graine = Date.now(), nuit = false }) {
  const rng = creerRng(graine);
  const c = { grille, unites, rng, nuit, tour: 1, index: 0, fini: null, evenements: [], ordre: [] };
  c.ordre = [...unites].sort(
    (a, b) => b.stats.agilite + b.stats.perception + rng() - (a.stats.agilite + a.stats.perception + rng()),
  );
  debutTour(c);
  return c;
}

// ---------------------------------------------------------------- Requêtes

export const courant = (c) => c.ordre[c.index];
export const vivants = (c) => c.unites.filter((u) => u.vivant);
export const uniteEn = (c, x, y) => c.unites.find((u) => u.vivant && u.x === x && u.y === y);
export const ennemisDe = (c, u) => c.unites.filter((v) => v.vivant && v.camp !== u.camp);
export const alliesDe = (c, u) => c.unites.filter((v) => v.vivant && v.camp === u.camp);
export const aEffet = (u, type) => u.effets.some((e) => e.type === type);

export function caseBloquee(c, x, y) {
  return x < 0 || y < 0 || x >= c.grille.w || y >= c.grille.h || c.grille.bloque(x, y);
}

// Ligne de vue : échantillonne le segment entre les centres des cases ; obstacles et unités bloquent.
export function ligneDeVue(c, a, b, ignorer = null) {
  const d = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  if (d <= 1) return true;
  const pas = d * 4;
  for (let i = 1; i < pas; i++) {
    const t = i / pas;
    const x = Math.round(a.x + (b.x - a.x) * t);
    const y = Math.round(a.y + (b.y - a.y) * t);
    if ((x === a.x && y === a.y) || (x === b.x && y === b.y)) continue;
    if (caseBloquee(c, x, y)) return false;
    const u = uniteEn(c, x, y);
    if (u && u !== ignorer) return false;
  }
  return true;
}

export function casesDeplacement(c, u) {
  return accessibles(u, u.pm, (x, y) => caseBloquee(c, x, y) || !!uniteEn(c, x, y));
}

function cibleForcee(c, u) {
  const p = u.effets.find((e) => e.type === 'provoque');
  if (!p) return null;
  const v = c.unites.find((w) => w.id === p.par && w.vivant);
  return v || null;
}

// Vérifie qu'une compétence peut être lancée par u (placé en `depuis`, par défaut sa position) sur (x, y).
export function peutLancer(c, u, comp, x, y, depuis = u) {
  if (c.fini || !u.vivant) return false;
  if (comp.pa > u.pa) return false;
  if (u.recharges[comp.id] > 0) return false;
  if (comp.objet && u.fioles <= 0) return false;
  if (comp.pouvoir && !pouvoirDisponible(c, u, comp)) return false;
  if (comp.cible === 'soi') return x === depuis.x && y === depuis.y;
  const d = Math.abs(x - depuis.x) + Math.abs(y - depuis.y);
  const cibleU = uniteEn(c, x, y);
  if (comp.cible === 'allie') {
    if (!cibleU || (cibleU.camp !== u.camp && cibleU !== u)) return false;
    if (cibleU === u) return x === depuis.x && y === depuis.y;
  } else if (comp.cible === 'ennemi') {
    if (!cibleU || cibleU === u) return false;
    if (cibleU.camp === u.camp && !aEffet(u, 'manipule')) return false;
    const forcee = cibleForcee(c, u);
    if (forcee && forcee !== cibleU) return false;
  } else if (comp.cible === 'case') {
    if (caseBloquee(c, x, y)) return false;
  }
  if (d < comp.portee.min || d > comp.portee.max) return false;
  return ligneDeVue(c, depuis, { x, y }, u);
}

export function casesCiblables(c, u, comp) {
  const res = [];
  if (comp.cible === 'soi') return peutLancer(c, u, comp, u.x, u.y) ? [{ x: u.x, y: u.y }] : [];
  const max = comp.portee.max;
  for (let x = u.x - max; x <= u.x + max; x++) {
    for (let y = u.y - max; y <= u.y + max; y++) {
      if (caseBloquee(c, x, y)) continue;
      const d = Math.abs(x - u.x) + Math.abs(y - u.y);
      if (d < comp.portee.min || d > max) continue;
      if (comp.cible === 'case' ? peutLancer(c, u, comp, x, y) : ligneDeVue(c, u, { x, y }, u)) res.push({ x, y, valide: peutLancer(c, u, comp, x, y) });
    }
  }
  return res;
}

function pouvoirDisponible(c, u, comp) {
  if (comp.unique && u.utilise[comp.id]) return false;
  if (comp.id === 'molonLabe') return u.pv < u.pvMax * comp.params.seuil;
  if (comp.id === 'devorer') return true; // la condition de PV de la cible est vérifiée au lancement
  return true;
}

// ---------------------------------------------------------------- Déroulement des tours

function evenement(c, e) {
  c.evenements.push(e);
}

export function debutTour(c) {
  const u = courant(c);
  if (!u) return;
  u.ia_phase = null;
  u.ia_manipFait = false;
  u.critCeTour = false;
  evenement(c, { type: 'tour', unite: u.id, tour: c.tour });

  // Rituel préparé au tour précédent
  for (const r of u.effets.filter((e) => e.type === 'rituel')) {
    evenement(c, { type: 'rituel', unite: u.id, x: r.x, y: r.y });
    for (const v of ennemisDe(c, u)) {
      if (Math.abs(v.x - r.x) + Math.abs(v.y - r.y) <= r.zone) infliger(c, u, v, Math.round(r.dmg * statMod(u, 'volonte') * multiplicateur(c, u, v)));
    }
  }
  u.effets = u.effets.filter((e) => e.type !== 'rituel');

  // Dégâts et soins sur la durée
  for (const e of u.effets.filter((x) => x.type === 'dot' || x.type === 'hot')) {
    if (e.type === 'dot') infliger(c, null, u, e.dmg, { source: 'dot' });
    else soigner(c, u, e.soin);
    e.tours -= 1;
  }
  u.effets = u.effets.filter((e) => !((e.type === 'dot' || e.type === 'hot') && e.tours <= 0));
  if (u.passif === 'regeneration' && aEffet(u, 'bestial')) soigner(c, u, Math.round(u.pvMax * u.pp.soin));
  if (!u.vivant || c.fini) {
    if (!c.fini) finTour(c);
    return;
  }

  for (const e of u.effets) if (DECOMPTE_DEBUT.includes(e.type)) e.tours -= 1;
  u.effets = u.effets.filter((e) => !(DECOMPTE_DEBUT.includes(e.type) && e.tours <= 0));

  u.pa = u.paMax;
  u.pm = u.pmMax + (u.effets.find((e) => e.type === 'bestial')?.pmBonus ?? 0);
  const retard = u.effets.find((e) => e.type === 'retard');
  if (retard) {
    u.pa = Math.max(0, u.pa - retard.pa);
    u.effets = u.effets.filter((e) => e !== retard);
  }
  if (aEffet(u, 'immobilise')) u.pm = 0;
  for (const id in u.recharges) u.recharges[id] = Math.max(0, u.recharges[id] - 1);
  u.etourdi = aEffet(u, 'etourdi');
  if (u.etourdi) evenement(c, { type: 'texte', unite: u.id, texte: 'Étourdi' });
}

export function finTour(c) {
  const u = courant(c);
  if (u) {
    for (const e of u.effets) if (DECOMPTE_FIN.includes(e.type)) e.tours -= 1;
    u.effets = u.effets.filter((e) => !(DECOMPTE_FIN.includes(e.type) && e.tours <= 0));
    if (u.passif === 'elu') u.sansCrit = u.critCeTour ? 0 : u.sansCrit + 1;
  }
  if (c.fini) return;
  let essais = 0;
  do {
    c.index += 1;
    if (c.index >= c.ordre.length) {
      c.index = 0;
      c.tour += 1;
      if (c.tour > MAX_TOURS) {
        c.fini = 'defaite';
        evenement(c, { type: 'fin', resultat: 'defaite', raison: 'temps' });
        return;
      }
    }
  } while (!courant(c).vivant && essais++ < c.ordre.length * 2);
  debutTour(c);
}

// ---------------------------------------------------------------- Actions

export function deplacer(c, u, x, y) {
  const carte = casesDeplacement(c, u);
  const n = carte.get(cle(x, y));
  if (!n || n.cout === 0 || n.cout > u.pm) return null;
  const parcours = cheminDepuis(carte, x, y);
  let prec = { x: u.x, y: u.y };
  for (const p of parcours) {
    u.facing = { x: Math.sign(p.x - prec.x), y: Math.sign(p.y - prec.y) };
    prec = p;
  }
  u.x = x;
  u.y = y;
  u.pm -= n.cout;
  evenement(c, { type: 'deplacement', unite: u.id, chemin: parcours });
  return parcours;
}

export function multiplicateur(c, src, cible) {
  let m = 1;
  for (const e of src.effets) {
    if (e.type === 'buff') m += e.pct / 100;
    if (e.type === 'affaiblit') m -= e.pct / 100;
    if (e.type === 'bestial') m += e.bonus;
  }
  if (src.passif === 'orgueil' && src.pv > src.pvMax * src.pp.seuil) m += src.pp.bonus;
  if (src.passif === 'nuit') m += c.nuit ? src.pp.nuit : src.pp.jour;
  if (src.passif === 'justice' && cible?.tags.includes('predateur')) m += src.pp.bonus;
  if (cible) {
    for (const e of cible.effets) {
      if (e.type === 'vulnerable') m += e.pct / 100;
      if (e.type === 'parade') m -= e.pct / 100;
    }
  }
  return Math.max(0.1, m);
}

function deDos(attaquant, cible) {
  return (attaquant.x - cible.x) * cible.facing.x + (attaquant.y - cible.y) * cible.facing.y < 0;
}

export function infliger(c, src, cible, montant, opts = {}) {
  if (!cible.vivant || montant <= 0) return 0;
  let reste = Math.round(montant);
  if (cible.bouclier > 0 && !opts.ignoreBouclier) {
    const absorbe = Math.min(cible.bouclier, reste);
    cible.bouclier -= absorbe;
    reste -= absorbe;
  }
  cible.pv -= reste;
  evenement(c, { type: 'degats', unite: cible.id, montant: Math.round(montant), crit: !!opts.crit, source: opts.source });
  if (cible.pv <= 0) mourir(c, cible, src);
  return reste;
}

export function soigner(c, u, montant) {
  if (!u.vivant || montant <= 0) return 0;
  const avant = u.pv;
  u.pv = Math.min(u.pvMax, u.pv + Math.round(montant));
  if (u.pv > avant) evenement(c, { type: 'soin', unite: u.id, montant: u.pv - avant });
  return u.pv - avant;
}

function mourir(c, u, tueur) {
  if (u.miracle) {
    u.miracle = false;
    u.pv = Math.round(u.pvMax * 0.5);
    evenement(c, { type: 'miracle', unite: u.id });
    return;
  }
  u.pv = 0;
  u.vivant = false;
  u.effets = [];
  evenement(c, { type: 'mort', unite: u.id, tueur: tueur?.id ?? null });
  if (tueur?.passif === 'appetit' && tueur.vivant) {
    tueur.pm += tueur.pp.pm;
    evenement(c, { type: 'texte', unite: tueur.id, texte: `+${tueur.pp.pm} PM` });
  }
  verifierFin(c);
}

export function verifierFin(c) {
  if (c.fini) return c.fini;
  if (!c.unites.some((u) => u.camp === 'ennemi' && u.vivant)) c.fini = 'victoire';
  else if (!c.unites.some((u) => u.principal && u.vivant)) c.fini = 'defaite';
  if (c.fini) evenement(c, { type: 'fin', resultat: c.fini });
  return c.fini;
}

function ajouterEffet(c, cible, effet) {
  if (['etourdi', 'immobilise', 'manipule'].includes(effet.type) && cible.passif === 'discipline' && c.rng() < cible.pp.resistance) {
    evenement(c, { type: 'texte', unite: cible.id, texte: 'Résiste !' });
    return;
  }
  const existant = cible.effets.find((e) => e.type === effet.type && e.type !== 'dot' && e.type !== 'hot');
  if (existant) Object.assign(existant, effet, { tours: Math.max(existant.tours ?? 0, effet.tours ?? 0) });
  else cible.effets.push({ ...effet });
}

function pousser(c, cible, depuis, cases) {
  const dx = Math.sign(cible.x - depuis.x);
  const dy = dx !== 0 && Math.abs(cible.x - depuis.x) >= Math.abs(cible.y - depuis.y) ? 0 : Math.sign(cible.y - depuis.y);
  const vx = dy === 0 ? dx : 0;
  for (let i = 0; i < cases; i++) {
    const nx = cible.x + vx;
    const ny = cible.y + dy;
    if (caseBloquee(c, nx, ny) || uniteEn(c, nx, ny)) break;
    cible.x = nx;
    cible.y = ny;
  }
  evenement(c, { type: 'teleport', unite: cible.id, x: cible.x, y: cible.y });
}

function attirer(c, cible, vers) {
  let garde = 10;
  while (dist(cible, vers) > 1 && garde-- > 0) {
    const options = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dy]) => ({ x: cible.x + dx, y: cible.y + dy }))
      .filter((p) => !caseBloquee(c, p.x, p.y) && !uniteEn(c, p.x, p.y) && dist(p, vers) < dist(cible, vers));
    if (!options.length) break;
    cible.x = options[0].x;
    cible.y = options[0].y;
  }
  evenement(c, { type: 'teleport', unite: cible.id, x: cible.x, y: cible.y });
}

function appliquerSoutien(c, lanceur, cible, e) {
  const soins = lanceur.passif === 'mainGuerisseuse' ? 1 + lanceur.pp.soins : 1;
  if (e.heal) soigner(c, cible, e.heal * statMod(lanceur, 'volonte') * soins);
  if (e.hot) ajouterEffet(c, cible, { type: 'hot', soin: Math.round(e.hot.soin * statMod(lanceur, 'volonte') * soins), tours: e.hot.tours });
  if (e.bouclier) {
    cible.bouclier += Math.round(e.bouclier * statMod(lanceur, 'volonte'));
    evenement(c, { type: 'texte', unite: cible.id, texte: `Bouclier ${cible.bouclier}` });
  }
  if (e.buff) ajouterEffet(c, cible, { type: 'buff', pct: e.buff.pct, tours: e.buff.tours });
  if (e.parade) ajouterEffet(c, cible, { type: 'parade', pct: e.parade.pct, tours: e.parade.tours });
  if (e.pm) {
    cible.pm += e.pm;
    evenement(c, { type: 'texte', unite: cible.id, texte: `+${e.pm} PM` });
  }
  if (e.purifie) cible.effets = cible.effets.filter((x) => !NEGATIFS.includes(x.type));
}

// Lance la compétence `compId` de u sur (x, y). Retourne true si l'action a eu lieu.
export function lancer(c, u, compId, x, y) {
  const comp = u.competences.find((k) => k.id === compId);
  if (!comp || !peutLancer(c, u, comp, x, y)) return false;
  u.pa -= comp.pa;
  if (comp.recharge) u.recharges[comp.id] = comp.recharge;
  if (comp.unique) u.utilise[comp.id] = true;
  if (comp.objet) u.fioles -= 1;
  if (x !== u.x || y !== u.y) {
    const dx = x - u.x;
    const dy = y - u.y;
    u.facing = Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
  }
  const bestial = aEffet(u, 'bestial');
  evenement(c, {
    type: 'competence', unite: u.id, comp: comp.id, nom: comp.nom, x, y,
    bruit: bestial ? Math.max(comp.bruit, 2) : comp.bruit,
    surnat: bestial ? 3 : comp.surnat,
  });

  if (comp.pouvoir) {
    appliquerPouvoir(c, u, comp, x, y);
    verifierFin(c);
    return true;
  }

  const e = comp.effets;
  const cibleU = uniteEn(c, x, y);
  const amie = cibleU && cibleU.camp === u.camp && !aEffet(u, 'manipule');
  if (comp.cible === 'soi' || comp.cible === 'allie' || amie) {
    appliquerSoutien(c, u, cibleU || u, e);
  } else {
    const cibles = e.zone
      ? c.unites.filter((v) => v.vivant && v.camp !== u.camp && Math.abs(v.x - x) + Math.abs(v.y - y) <= e.zone)
      : cibleU ? [cibleU] : [];
    if (aEffet(u, 'manipule') && cibleU && !cibles.includes(cibleU)) cibles.push(cibleU);
    let totalInflige = 0;
    for (const v of cibles) {
      if (e.dmg) {
        if (aEffet(u, 'aveugle') && c.rng() < 0.5) {
          evenement(c, { type: 'texte', unite: v.id, texte: 'Raté' });
          continue;
        }
        let montant = e.dmg * statMod(u, comp.stat) * multiplicateur(c, u, v) * c.rng.entre(0.9, 1.1);
        const dos = deDos(u, v);
        if (e.falloff && dist(u, v) > e.falloff) montant *= 0.5;
        if (e.dosMult && dos) montant *= e.dosMult;
        let critique = 0.05 + (u.stats.agilite - 6) * 0.01 + (u.passif === 'elu' ? u.pp.critParTour * u.sansCrit : 0);
        if (e.critDos && dos) critique += e.critDos;
        const crit = c.rng() < critique;
        if (crit) {
          montant *= 1.5;
          u.critCeTour = true;
        }
        totalInflige += infliger(c, u, v, montant, { crit, ignoreBouclier: e.ignoreBouclier });
      }
      if (!v.vivant) continue;
      if (e.dot) ajouterEffet(c, v, { type: 'dot', dmg: Math.round(e.dot.dmg * statMod(u, comp.stat)), tours: e.dot.tours });
      if (e.maudit) ajouterEffet(c, v, { type: 'maudit', tours: 3 });
      if (e.etourdit) ajouterEffet(c, v, { type: 'etourdi', tours: e.etourdit });
      if (e.immobilise) ajouterEffet(c, v, { type: 'immobilise', tours: e.immobilise });
      if (e.manipule) ajouterEffet(c, v, { type: 'manipule', tours: e.manipule });
      if (e.affaiblit) ajouterEffet(c, v, { type: 'affaiblit', ...e.affaiblit });
      if (e.vulnerable) ajouterEffet(c, v, { type: 'vulnerable', ...e.vulnerable });
      if (e.aveugle) ajouterEffet(c, v, { type: 'aveugle', tours: e.aveugle });
      if (e.provoque) ajouterEffet(c, v, { type: 'provoque', par: u.id, tours: e.provoque });
      if (e.retard) ajouterEffet(c, v, { type: 'retard', pa: e.retard });
      if (e.recul) pousser(c, v, u, e.recul);
      if (e.attire) attirer(c, v, u);
    }
    if (e.drain && totalInflige > 0) soigner(c, u, totalInflige * e.drain);
    appliquerSoutien(c, u, u, e);
  }
  if (e.coutPV) {
    u.pv = Math.max(1, u.pv - e.coutPV);
    evenement(c, { type: 'degats', unite: u.id, montant: e.coutPV, source: 'cout' });
  }
  verifierFin(c);
  return true;
}

function appliquerPouvoir(c, u, comp, x, y) {
  const cible = uniteEn(c, x, y);
  const p = comp.params;
  switch (comp.id) {
    case 'tirage': {
      const tirage = Math.floor(c.rng() * 3);
      if (tirage === 0) ajouterEffet(c, u, { type: 'buff', pct: p.buff, tours: 2 });
      if (tirage === 1) u.pa += p.pa;
      if (tirage === 2) soigner(c, u, u.pvMax * p.soin);
      evenement(c, { type: 'texte', unite: u.id, texte: [`+${p.buff} % dégâts`, `+${p.pa} PA`, `Soin ${p.soin * 100} %`][tirage] });
      break;
    }
    case 'messageDivin':
      u.pa += p.pa;
      ajouterEffet(c, cible, { type: 'vulnerable', pct: p.vulnerable, tours: 2 });
      evenement(c, { type: 'texte', unite: u.id, texte: `+${p.pa} PA` });
      break;
    case 'oubliBeni':
      evenement(c, { type: 'oubli', unite: u.id, montant: p.dechirure });
      break;
    case 'flammeUriel':
      infliger(c, u, cible, p.dmg * statMod(u, 'perception') * multiplicateur(c, u, cible), { ignoreBouclier: true });
      break;
    case 'domination':
      ajouterEffet(c, cible, { type: 'manipule', tours: p.tours });
      break;
    case 'devorer':
      if (cible.pv <= cible.pvMax * p.seuil) {
        const pvMax = cible.pvMax;
        infliger(c, u, cible, cible.pv + cible.bouclier, { ignoreBouclier: true });
        soigner(c, u, pvMax * p.soin);
      } else {
        evenement(c, { type: 'texte', unite: cible.id, texte: 'Trop coriace' });
      }
      break;
    case 'volupte': {
      const maudits = ennemisDe(c, u).filter((v) => aEffet(v, 'maudit')).length;
      soigner(c, u, u.pvMax * p.soinParMaudit * maudits);
      break;
    }
    case 'potDeVin':
      ajouterEffet(c, cible, { type: 'retard', pa: p.retard });
      evenement(c, { type: 'texte', unite: cible.id, texte: `−${p.retard} PA` });
      break;
    case 'formeBestiale':
      ajouterEffet(c, u, { type: 'bestial', bonus: p.bonus, pmBonus: p.pm, tours: p.tours });
      u.pm += p.pm;
      break;
    case 'hypnose':
      ajouterEffet(c, cible, { type: 'etourdi', tours: p.tours });
      break;
    case 'molonLabe':
      u.pa += p.pa;
      evenement(c, { type: 'texte', unite: u.id, texte: `Molon labe ! +${p.pa} PA` });
      break;
    case 'rituel':
      u.effets.push({ type: 'rituel', x, y, dmg: p.dmg, zone: p.zone });
      break;
  }
}

export function fuir(c, u) {
  if (ennemisDe(c, u).some((v) => dist(u, v) <= 1)) {
    evenement(c, { type: 'texte', unite: u.id, texte: 'Impossible : ennemi au contact' });
    return false;
  }
  u.pa = 0;
  if (c.rng() < 0.6) {
    c.fini = 'fuite';
    evenement(c, { type: 'fin', resultat: 'fuite' });
    return true;
  }
  evenement(c, { type: 'texte', unite: u.id, texte: 'Fuite ratée' });
  return false;
}

export function invoquerAllie(c, u) {
  const libre = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]
    .map(([dx, dy]) => ({ x: u.x + dx, y: u.y + dy }))
    .find((p) => !caseBloquee(c, p.x, p.y) && !uniteEn(c, p.x, p.y));
  if (!libre) return null;
  const allie = creerEnnemi('allie', libre.x, libre.y, 'joueur');
  c.unites.push(allie);
  c.ordre.splice(c.index + 1, 0, allie);
  evenement(c, { type: 'invocation', unite: allie.id });
  return allie;
}

// ---------------------------------------------------------------- IA

function valeurIA(c, u, comp, cible, depuis = u) {
  if (comp.pouvoir) {
    switch (comp.id) {
      case 'tirage': return 35;
      case 'messageDivin': return cible ? 30 : -1;
      case 'flammeUriel': return 26;
      case 'domination': return alliesDe(c, cible).length > 1 && !aEffet(cible, 'manipule') ? 40 : -1;
      case 'devorer': return cible.pv <= cible.pvMax * comp.params.seuil ? 60 : -1;
      case 'volupte': {
        const n = ennemisDe(c, u).filter((v) => aEffet(v, 'maudit')).length;
        return Math.min(u.pvMax - u.pv, u.pvMax * comp.params.soinParMaudit * n) - 2;
      }
      case 'formeBestiale': return aEffet(u, 'bestial') ? -1 : 45;
      case 'hypnose': return aEffet(cible, 'etourdi') ? -1 : 25;
      case 'potDeVin': return 15;
      case 'molonLabe': return 30;
      case 'rituel': return ennemisDe(c, u).filter((v) => Math.abs(v.x - cible.x) + Math.abs(v.y - cible.y) <= comp.params.zone).length * 14 - 4;
      default: return -1;
    }
  }
  if (comp.objet) return u.pv < u.pvMax - 30 ? 30 : -1;
  const e = comp.effets;
  let { dmg, util } = comp.valeur;
  const soutienSoi = comp.cible === 'soi' || comp.cible === 'allie' || e.heal || e.hot;
  if (soutienSoi && u.pv > u.pvMax * 0.85 && (e.heal || e.hot)) util *= 0.2;
  if (e.bouclier && u.bouclier > 0) util *= 0.2;
  if (comp.cible === 'allie') return u.pv < u.pvMax * 0.6 ? util : util * 0.3;
  if (cible && cible.camp !== u.camp) {
    if (e.falloff && dist(depuis, cible) > e.falloff) dmg *= 0.5;
    if (e.etourdit && aEffet(cible, 'etourdi')) util *= 0.2;
    if (e.manipule && alliesDe(c, cible).length < 2) util *= 0.2;
    if (cible.pv < dmg) dmg = cible.pv + 10; // achever une cible vaut toujours le coup
  }
  return dmg + util;
}

function meilleureAction(c, u, depuis = u) {
  let meilleure = null;
  const cibles = ennemisDe(c, u);
  for (const comp of u.competences) {
    if (comp.pa > u.pa || u.recharges[comp.id] > 0) continue;
    const options = comp.cible === 'soi' || comp.cible === 'allie' ? [depuis] : comp.cible === 'case' ? cibles : cibles;
    for (const cible of options) {
      if (!peutLancer(c, u, comp, cible.x, cible.y, depuis)) continue;
      const v = valeurIA(c, u, comp, comp.cible === 'soi' || comp.cible === 'allie' ? u : cible, depuis);
      if (v > 0 && (!meilleure || v > meilleure.valeur)) meilleure = { comp, x: cible.x, y: cible.y, valeur: v };
    }
  }
  return meilleure;
}

function porteeMaxOffensive(u) {
  return Math.max(...u.competences.filter((k) => k.cible === 'ennemi' && !k.pouvoir).map((k) => k.portee.max));
}

// Distance idéale à l'ennemi le plus proche : au contact pour le corps à corps, sinon à portée sans être collé.
// Pour le joueur, c'est l'arme imposée qui décide du placement (une arme secondaire ne change pas le style de jeu).
function distanceIdeale(u) {
  const comps = u.armePrincipale ? u.competences.filter((k) => k.armeId === u.armePrincipale) : u.competences;
  const falloff = comps.find((k) => k.effets?.falloff);
  if (falloff) return Math.min(falloff.effets.falloff, 3);
  const max = Math.max(...comps.filter((k) => k.cible === 'ennemi' && !k.pouvoir).map((k) => k.portee.max), 1);
  return max <= 2 ? 1 : Math.min(max - 1, 5);
}

function evaluerCase(c, u, p) {
  const sauve = { x: u.x, y: u.y };
  u.x = p.x;
  u.y = p.y;
  let pa = u.pa;
  let score = 0;
  const utilisees = new Set();
  for (let i = 0; i < 4; i++) {
    let best = null;
    for (const comp of u.competences) {
      if (comp.pa > pa || u.recharges[comp.id] > 0 || (utilisees.has(comp.id) && comp.recharge)) continue;
      if (comp.cible !== 'ennemi' || comp.pouvoir) continue;
      for (const v of ennemisDe(c, u)) {
        if (!peutLancer(c, { ...u, pa }, comp, v.x, v.y, p)) continue;
        const val = valeurIA(c, u, comp, v, p);
        if (!best || val > best.val) best = { comp, val };
      }
    }
    if (!best) break;
    score += best.val;
    pa -= best.comp.pa;
    utilisees.add(best.comp.id);
  }
  const proche = Math.min(...ennemisDe(c, u).map((v) => dist(p, v)));
  score -= Math.abs(proche - distanceIdeale(u)) * 3;
  u.x = sauve.x;
  u.y = sauve.y;
  return score;
}

// Retourne la prochaine action de l'IA : {type:'deplacer',x,y} | {type:'lancer',compId,x,y} | {type:'fin'}.
export function prochaineActionIA(c, u) {
  if (c.fini || !u.vivant || u.etourdi) return { type: 'fin' };
  if (aEffet(u, 'manipule')) return actionManipule(c, u);
  if (!ennemisDe(c, u).length) return { type: 'fin' };
  if (!u.ia_phase) u.ia_phase = 'soutien';

  if (u.ia_phase === 'soutien') {
    u.ia_phase = 'position';
    let best = null;
    for (const comp of u.competences) {
      if (comp.cible !== 'soi' || comp.pa > u.pa || u.recharges[comp.id] > 0 || !peutLancer(c, u, comp, u.x, u.y)) continue;
      const v = valeurIA(c, u, comp, u);
      if (v > 0 && (!best || v > best.v)) best = { comp, v };
    }
    if (best) {
      u.ia_phase = 'soutien';
      u.ia_soutienFait = (u.ia_soutienFait || 0) + 1;
      if (u.ia_soutienFait <= 2) return { type: 'lancer', compId: best.comp.id, x: u.x, y: u.y };
      u.ia_phase = 'position';
    }
  }
  if (u.ia_phase === 'position') {
    u.ia_soutienFait = 0;
    u.ia_phase = 'attaque';
    if (u.pm > 0) {
      const carte = casesDeplacement(c, u);
      let best = { x: u.x, y: u.y, score: evaluerCase(c, u, u) };
      for (const n of carte.values()) {
        if (n.cout === 0) continue;
        const s = evaluerCase(c, u, n) - n.cout * 0.1;
        if (s > best.score) best = { x: n.x, y: n.y, score: s };
      }
      if (best.x !== u.x || best.y !== u.y) return { type: 'deplacer', x: best.x, y: best.y };
    }
  }
  if (u.ia_phase === 'attaque') {
    const a = meilleureAction(c, u);
    if (a) return { type: 'lancer', compId: a.comp.id, x: a.x, y: a.y };
    u.ia_phase = 'repli';
  }
  if (u.ia_phase === 'repli') {
    u.ia_phase = 'fin';
    if (u.pm > 0) {
      const carte = casesDeplacement(c, u);
      const ennemis = ennemisDe(c, u);
      const distanceMin = (p) => Math.min(...ennemis.map((v) => dist(p, v)));
      const ideale = distanceIdeale(u);
      let best = null;
      for (const n of carte.values()) {
        const d = distanceMin(n);
        const s = -Math.abs(d - ideale) + (d > ideale ? 0.5 : 0);
        if (!best || s > best.s) best = { x: n.x, y: n.y, s };
      }
      if (best && (best.x !== u.x || best.y !== u.y)) return { type: 'deplacer', x: best.x, y: best.y };
    }
  }
  return { type: 'fin' };
}

function actionManipule(c, u) {
  if (u.ia_manipFait) return { type: 'fin' };
  const proies = alliesDe(c, u).filter((v) => v !== u);
  const base = u.competences.find((k) => k.cible === 'ennemi' && !k.pouvoir);
  if (!proies.length || !base) return { type: 'fin' };
  proies.sort((a, b) => dist(u, a) - dist(u, b));
  const proie = proies[0];
  if (peutLancer(c, u, base, proie.x, proie.y)) {
    u.ia_manipFait = true;
    return { type: 'lancer', compId: base.id, x: proie.x, y: proie.y };
  }
  if (u.pm > 0) {
    const carte = casesDeplacement(c, u);
    let best = null;
    for (const n of carte.values()) {
      const d = dist(n, proie);
      if (!best || d < best.d) best = { x: n.x, y: n.y, d };
    }
    if (best && (best.x !== u.x || best.y !== u.y)) return { type: 'deplacer', x: best.x, y: best.y };
  }
  u.ia_manipFait = true;
  return { type: 'fin' };
}

export function executerAction(c, u, action) {
  if (action.type === 'deplacer') return !!deplacer(c, u, action.x, action.y);
  if (action.type === 'lancer') return lancer(c, u, action.compId, action.x, action.y);
  return false;
}

// Joue intégralement le tour d'une unité IA (simulation et tests).
export function jouerTourIA(c, u) {
  for (let i = 0; i < 20 && !c.fini; i++) {
    const a = prochaineActionIA(c, u);
    if (a.type === 'fin') break;
    if (!executerAction(c, u, a) && a.type === 'lancer') u.ia_phase = 'repli';
  }
  if (!c.fini) finTour(c);
}

// Simule un combat complet, toutes les unités contrôlées par l'IA. Retourne 'victoire' | 'defaite'.
export function simulerCombat(c) {
  let garde = 2000;
  while (!c.fini && garde-- > 0) jouerTourIA(c, courant(c));
  return c.fini || 'defaite';
}
