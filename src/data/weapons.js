// Les 12 armes. Chaque arme : 3 compétences (base 2 PA, forte 4 PA / recharge 2, utilitaire 3 PA / recharge 3).
// Budget : dégâts par PA = 11,5 × multiplicateur de portée × multiplicateur de rôle × correction ;
// valeur totale par PA (dégâts + utilité) = 13,8 × multiplicateur de portée × correction. Voir src/systems/valeur.js.
// Les multiplicateurs de portée et les corrections par arme viennent de la simulation (tools/simulate.js) :
// la portée vaut plus en jeu que prévu sur le papier (on frappe sans être frappé), d'où 0,77 et 0,46.
//
// Effets reconnus (src/systems/combat.js) :
//   offensifs, appliqués à la cible : dmg, zone, dot{dmg,tours}, drain, etourdit, immobilise, recul, attire,
//     manipule, affaiblit{pct,tours}, vulnerable{pct,tours}, aveugle, provoque, retard, critDos, dosMult,
//     falloff (distance au-delà de laquelle les dégâts sont divisés par 2), ignoreBouclier, maudit
//   de soutien, appliqués à la cible si elle est alliée, sinon au lanceur : heal, hot{soin,tours}, bouclier,
//     buff{pct,tours}, parade{pct,tours}, pm, purifie
//   coutPV : PV payés par le lanceur.
// bruit (0-3) attire les témoins ; surnat (0-3) déchire le Voile si un témoin voit l'action.

export const PORTEES = {
  cac: { nom: 'Corps à corps', min: 1, max: 1, mult: 1.0 },
  courte: { nom: 'Courte', min: 2, max: 4, mult: 0.77 },
  longue: { nom: 'Longue', min: 4, max: 8, mult: 0.46 },
};

export const ROLES = {
  burst: { nom: 'Burst', mult: 1.2 },
  discret: { nom: 'Discret / soutenu', mult: 1.0 },
  controle: { nom: 'Contrôle / défense', mult: 0.85 },
  soutien: { nom: 'Soutien', mult: 0.7 },
};

export const STATS = { force: 'Force', agilite: 'Agilité', volonte: 'Volonté', perception: 'Perception' };

export const ARMES = {
  // ---------- Corps à corps ----------
  hache: {
    nom: 'Hache', portee: 'cac', role: 'burst', stat: 'force', magie: false, bruit: 1, surnat: 0,
    desc: 'Frappes lourdes et larges qui font saigner.',
    competences: [
      { id: 'taille', nom: 'Taille', type: 'base', pa: 2, recharge: 0, cible: 'ennemi', effets: { dmg: 28 } },
      { id: 'tourbillon', nom: 'Tourbillon', type: 'forte', pa: 4, recharge: 2, cible: 'ennemi', effets: { dmg: 37, zone: 1 } },
      { id: 'entaille', nom: 'Entaille', type: 'utilitaire', pa: 3, recharge: 3, cible: 'ennemi', effets: { dmg: 23, dot: { dmg: 7, tours: 3 } } },
    ],
  },
  dagues: {
    nom: 'Dagues', portee: 'cac', role: 'discret', stat: 'agilite', magie: false, bruit: 0, surnat: 0,
    desc: 'Silencieuses. Critiques dévastateurs quand on frappe de dos.',
    competences: [
      { id: 'estoc', nom: 'Estoc', type: 'base', pa: 2, recharge: 0, cible: 'ennemi', effets: { dmg: 23, critDos: 0.4 } },
      { id: 'assassinat', nom: 'Assassinat', type: 'forte', pa: 4, recharge: 2, cible: 'ennemi', effets: { dmg: 44, dosMult: 1.5 } },
      { id: 'feinte', nom: 'Feinte', type: 'utilitaire', pa: 3, recharge: 3, cible: 'ennemi', effets: { dmg: 25, pm: 2, vulnerable: { pct: 15, tours: 2 } } },
    ],
  },
  epee: {
    nom: 'Épée', portee: 'cac', role: 'controle', stat: 'force', magie: false, bruit: 1, surnat: 0,
    desc: 'Pare, riposte et force l’adversaire à se concentrer sur vous.',
    competences: [
      { id: 'frappe', nom: 'Frappe', type: 'base', pa: 2, recharge: 0, cible: 'ennemi', effets: { dmg: 22, parade: { pct: 15, tours: 1 } } },
      { id: 'riposte', nom: 'Riposte', type: 'forte', pa: 4, recharge: 2, cible: 'ennemi', effets: { dmg: 37, parade: { pct: 30, tours: 1 }, provoque: 1 } },
      { id: 'defi', nom: 'Défi', type: 'utilitaire', pa: 3, recharge: 3, cible: 'ennemi', effets: { dmg: 21, provoque: 2 } },
    ],
  },
  maledictions: {
    nom: 'Malédictions', portee: 'cac', role: 'soutien', stat: 'volonte', magie: true, bruit: 0, surnat: 2, correction: 1.2,
    desc: 'Affaiblit, tente et manipule. Une magie de contact.',
    competences: [
      { id: 'marque', nom: 'Marque maudite', type: 'base', pa: 2, recharge: 0, cible: 'ennemi', effets: { dmg: 8, dot: { dmg: 6, tours: 3 }, affaiblit: { pct: 10, tours: 2 }, maudit: true } },
      { id: 'manipulation', nom: 'Manipulation', type: 'forte', pa: 4, recharge: 3, cible: 'ennemi', effets: { dmg: 23, manipule: 1, vulnerable: { pct: 10, tours: 2 }, maudit: true } },
      { id: 'tentation', nom: 'Tentation', type: 'utilitaire', pa: 3, recharge: 3, cible: 'ennemi', portee: { min: 1, max: 3 }, effets: { dmg: 14, attire: true, dot: { dmg: 6, tours: 3 }, vulnerable: { pct: 15, tours: 2 }, maudit: true } },
    ],
  },

  // ---------- Courte portée ----------
  pompe: {
    nom: 'Fusil à pompe', portee: 'courte', role: 'burst', stat: 'force', magie: false, bruit: 3, surnat: 0, correction: 0.95,
    desc: 'Dévastateur de près, perd la moitié de ses dégâts au-delà de 3 cases.',
    competences: [
      { id: 'decharge', nom: 'Décharge', type: 'base', pa: 2, recharge: 0, cible: 'ennemi', portee: { min: 1, max: 4 }, effets: { dmg: 21, falloff: 3 } },
      { id: 'chevrotine', nom: 'Chevrotine', type: 'forte', pa: 4, recharge: 2, cible: 'ennemi', portee: { min: 1, max: 4 }, effets: { dmg: 28, zone: 1, falloff: 3 } },
      { id: 'recul', nom: 'Coup de crosse', type: 'utilitaire', pa: 3, recharge: 3, cible: 'ennemi', portee: { min: 1, max: 2 }, effets: { dmg: 25, recul: 2 } },
    ],
  },
  pistolets: {
    nom: 'Pistolets', portee: 'courte', role: 'discret', stat: 'agilite', magie: false, bruit: 2, surnat: 0, correction: 1.1,
    desc: 'Tir en mouvement : on ne reste jamais au même endroit.',
    competences: [
      { id: 'double', nom: 'Doublé', type: 'base', pa: 2, recharge: 0, cible: 'ennemi', effets: { dmg: 19, pm: 1 } },
      { id: 'rafale', nom: 'Rafale', type: 'forte', pa: 4, recharge: 2, cible: 'ennemi', effets: { dmg: 39, vulnerable: { pct: 10, tours: 2 } } },
      { id: 'mouvement', nom: 'Tir en mouvement', type: 'utilitaire', pa: 3, recharge: 3, cible: 'ennemi', effets: { dmg: 28, pm: 2 } },
    ],
  },
  sang: {
    nom: 'Magie du sang', portee: 'courte', role: 'controle', stat: 'volonte', magie: true, bruit: 0, surnat: 2,
    desc: 'Draine la vie, entrave, et se paie en PV.',
    competences: [
      { id: 'saignee', nom: 'Saignée', type: 'base', pa: 2, recharge: 0, cible: 'ennemi', effets: { dmg: 15, drain: 0.3 } },
      { id: 'pacte', nom: 'Pacte de sang', type: 'forte', pa: 4, recharge: 2, cible: 'ennemi', effets: { dmg: 37, drain: 0.3, coutPV: 8 } },
      { id: 'entrave', nom: 'Entrave', type: 'utilitaire', pa: 3, recharge: 3, cible: 'ennemi', effets: { dmg: 14, immobilise: 2 } },
    ],
  },
  lumiere: {
    nom: 'Magie de lumière', portee: 'courte', role: 'soutien', stat: 'volonte', magie: true, bruit: 1, surnat: 3, correction: 0.95,
    desc: 'Soigne vite, purifie et aveugle. Très voyante.',
    competences: [
      { id: 'rayon', nom: 'Rayon', type: 'base', pa: 2, recharge: 0, cible: 'ennemi', effets: { dmg: 14, heal: 7 } },
      { id: 'eblouissement', nom: 'Éblouissement', type: 'forte', pa: 4, recharge: 2, cible: 'ennemi', effets: { dmg: 23, aveugle: 1, heal: 6 } },
      { id: 'soin', nom: 'Soin', type: 'utilitaire', pa: 3, recharge: 3, cible: 'allie', effets: { heal: 21, purifie: true } },
    ],
  },

  // ---------- Longue portée ----------
  sniper: {
    nom: 'Sniper', portee: 'longue', role: 'burst', stat: 'perception', magie: false, bruit: 3, surnat: 0, correction: 0.9,
    desc: 'Énormes dégâts à distance, inutilisable à moins de 3 cases.',
    competences: [
      { id: 'ajuste', nom: 'Tir ajusté', type: 'base', pa: 2, recharge: 0, cible: 'ennemi', portee: { min: 3, max: 8 }, effets: { dmg: 11 } },
      { id: 'tete', nom: 'Tir en pleine tête', type: 'forte', pa: 4, recharge: 2, cible: 'ennemi', portee: { min: 3, max: 8 }, effets: { dmg: 23 } },
      { id: 'perforant', nom: 'Tir perforant', type: 'utilitaire', pa: 3, recharge: 3, cible: 'ennemi', portee: { min: 3, max: 8 }, effets: { dmg: 16, ignoreBouclier: true } },
    ],
  },
  arc: {
    nom: 'Arc', portee: 'longue', role: 'discret', stat: 'perception', magie: false, bruit: 0, surnat: 0,
    desc: 'Silencieux. Empoisonne et cloue sur place.',
    competences: [
      { id: 'fleche', nom: 'Flèche', type: 'base', pa: 2, recharge: 0, cible: 'ennemi', effets: { dmg: 10, pm: 1 } },
      { id: 'poison', nom: 'Flèche empoisonnée', type: 'forte', pa: 4, recharge: 2, cible: 'ennemi', effets: { dmg: 12, dot: { dmg: 4, tours: 3 } } },
      { id: 'clouante', nom: 'Flèche clouante', type: 'utilitaire', pa: 3, recharge: 3, cible: 'ennemi', effets: { dmg: 12, immobilise: 1 } },
    ],
  },
  elementaire: {
    nom: 'Magie élémentaire', portee: 'longue', role: 'controle', stat: 'volonte', magie: true, bruit: 2, surnat: 3,
    desc: 'Zones de feu, gel et rafales. Spectaculaire.',
    competences: [
      { id: 'eclair', nom: 'Éclair', type: 'base', pa: 2, recharge: 0, cible: 'ennemi', effets: { dmg: 9, affaiblit: { pct: 10, tours: 1 } } },
      { id: 'boule', nom: 'Boule de feu', type: 'forte', pa: 4, recharge: 2, cible: 'ennemi', effets: { dmg: 12, zone: 1, dot: { dmg: 3, tours: 2 } } },
      { id: 'gel', nom: 'Gel', type: 'utilitaire', pa: 3, recharge: 3, cible: 'ennemi', effets: { dmg: 8, etourdit: 1 } },
    ],
  },
  renforcement: {
    nom: 'Magie de renforcement', portee: 'longue', role: 'soutien', stat: 'volonte', magie: true, bruit: 0, surnat: 2, correction: 0.88,
    desc: 'Soins sur la durée, boucliers et buffs à distance.',
    competences: [
      { id: 'projectile', nom: 'Projectile d’énergie', type: 'base', pa: 2, recharge: 0, cible: 'ennemi', effets: { dmg: 9, hot: { soin: 2, tours: 3 } } },
      { id: 'regeneration', nom: 'Régénération', type: 'forte', pa: 4, recharge: 2, cible: 'ennemi', effets: { dmg: 11, hot: { soin: 3, tours: 3 }, buff: { pct: 10, tours: 2 } } },
      { id: 'egide', nom: 'Égide', type: 'utilitaire', pa: 3, recharge: 3, cible: 'allie', effets: { bouclier: 11 } },
    ],
  },
};

// Portée effective d'une compétence (surcharge éventuelle de la compétence, sinon celle de l'arme).
export function porteeCompetence(armeId, comp) {
  if (comp.portee) return comp.portee;
  const p = PORTEES[ARMES[armeId].portee];
  return { min: p.min, max: p.max };
}
