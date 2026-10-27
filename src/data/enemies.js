// Ennemis. Les compétences suivent le même format que les armes (src/data/weapons.js).
// tag 'predateur' : s'en prend aux humains (passif Justice d'Uriel).

export const ENNEMIS = {
  possede: {
    nom: 'Possédé', couleur: 0x8e44ad, pv: 70, pm: 3, tags: ['predateur'],
    stats: { force: 6, agilite: 5, volonte: 5, perception: 5 },
    competences: [
      { id: 'griffure', nom: 'Griffure', pa: 2, recharge: 0, cible: 'ennemi', portee: { min: 1, max: 1 }, effets: { dmg: 11 } },
      { id: 'rage', nom: 'Rage', pa: 4, recharge: 2, cible: 'ennemi', portee: { min: 1, max: 1 }, effets: { dmg: 19 } },
    ],
  },
  goule: {
    nom: 'Goule', couleur: 0x7f8c8d, pv: 65, pm: 4, tags: ['predateur'],
    stats: { force: 6, agilite: 7, volonte: 4, perception: 5 },
    competences: [
      { id: 'morsure', nom: 'Morsure', pa: 2, recharge: 0, cible: 'ennemi', portee: { min: 1, max: 1 }, effets: { dmg: 9, dot: { dmg: 3, tours: 2 } } },
      { id: 'devore', nom: 'Dévore', pa: 4, recharge: 2, cible: 'ennemi', portee: { min: 1, max: 1 }, effets: { dmg: 16, drain: 0.5 } },
    ],
  },
  ombre: {
    nom: 'Ombre', couleur: 0x2c3e50, pv: 50, pm: 3, tags: [],
    stats: { force: 4, agilite: 6, volonte: 7, perception: 6 },
    competences: [
      { id: 'trait', nom: 'Trait d’ombre', pa: 2, recharge: 0, cible: 'ennemi', portee: { min: 2, max: 5 }, effets: { dmg: 9 } },
      { id: 'voile', nom: 'Voile noir', pa: 4, recharge: 3, cible: 'ennemi', portee: { min: 2, max: 5 }, effets: { dmg: 10, aveugle: 1 } },
    ],
  },
  cultiste: {
    nom: 'Cultiste', couleur: 0x6c3483, pv: 55, pm: 3, tags: ['predateur'],
    stats: { force: 4, agilite: 5, volonte: 7, perception: 5 },
    competences: [
      { id: 'incantation', nom: 'Incantation', pa: 2, recharge: 0, cible: 'ennemi', portee: { min: 1, max: 4 }, effets: { dmg: 8 } },
      { id: 'benediction', nom: 'Bénédiction impie', pa: 3, recharge: 3, cible: 'allie', portee: { min: 0, max: 4 }, effets: { heal: 14 } },
    ],
  },
  collectionneur: {
    nom: 'Le Collectionneur', couleur: 0xd4ac0d, pv: 240, pm: 3, tags: ['predateur'], boss: true,
    stats: { force: 8, agilite: 5, volonte: 7, perception: 6 },
    competences: [
      { id: 'saisie', nom: 'Saisie', pa: 2, recharge: 0, cible: 'ennemi', portee: { min: 1, max: 2 }, effets: { dmg: 12 } },
      { id: 'inventaire', nom: 'Inventaire', pa: 4, recharge: 2, cible: 'ennemi', portee: { min: 1, max: 4 }, effets: { dmg: 13, zone: 1 } },
      { id: 'scelle', nom: 'Scellé', pa: 3, recharge: 3, cible: 'ennemi', portee: { min: 1, max: 5 }, effets: { dmg: 6, immobilise: 1 } },
    ],
  },
  chasseurCeleste: {
    nom: 'Chasseur céleste', couleur: 0xf7dc6f, pv: 90, pm: 3, tags: [],
    stats: { force: 6, agilite: 6, volonte: 6, perception: 7 },
    competences: [
      { id: 'lance', nom: 'Lance de lumière', pa: 2, recharge: 0, cible: 'ennemi', portee: { min: 1, max: 5 }, effets: { dmg: 11 } },
      { id: 'jugement', nom: 'Jugement', pa: 4, recharge: 2, cible: 'ennemi', portee: { min: 1, max: 5 }, effets: { dmg: 20 } },
    ],
  },
  chasseurInfernal: {
    nom: 'Chasseur infernal', couleur: 0x922b21, pv: 100, pm: 3, tags: [],
    stats: { force: 7, agilite: 6, volonte: 5, perception: 5 },
    competences: [
      { id: 'fouet', nom: 'Fouet de flammes', pa: 2, recharge: 0, cible: 'ennemi', portee: { min: 1, max: 2 }, effets: { dmg: 12 } },
      { id: 'brasier', nom: 'Brasier', pa: 4, recharge: 2, cible: 'ennemi', portee: { min: 1, max: 2 }, effets: { dmg: 16, dot: { dmg: 4, tours: 2 } } },
    ],
  },
  // Allié invoqué par la Faveur de la 3e Force.
  allie: {
    nom: 'Allié de la 3e Force', couleur: 0x48c9b0, pv: 65, pm: 3, tags: [],
    stats: { force: 6, agilite: 6, volonte: 6, perception: 6 },
    competences: [
      { id: 'coup', nom: 'Coup', pa: 2, recharge: 0, cible: 'ennemi', portee: { min: 1, max: 2 }, effets: { dmg: 9 } },
    ],
  },
};

// Rencontres : listes d'ennemis. 'reference' sert à la simulation d'équilibrage.
export const RENCONTRES = {
  reference: ['goule', 'ombre'],
  parc1: ['possede'],
  parc2: ['goule'],
  parc3: ['possede', 'ombre'],
  ruelle: ['goule', 'cultiste'],
  boss: ['collectionneur', 'cultiste'],
  patrouille: ['chasseurCeleste', 'chasseurInfernal'],
};
