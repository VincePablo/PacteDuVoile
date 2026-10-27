// Cartes. Légende : '.' rue, ',' trottoir, 'g' herbe, '#' immeuble, 'T' arbre, 'w' eau, 'b' banc, 'v' voiture.
export const BLOQUANTS = new Set(['#', 'T', 'w', 'b', 'v']);

export const TUILES = {
  '.': { couleur: 0x4a4f5a, nom: 'Rue' },
  ',': { couleur: 0x7b7f87, nom: 'Trottoir' },
  g: { couleur: 0x4e8a3e, nom: 'Herbe' },
  '#': { couleur: 0x8d6e63, nom: 'Immeuble', hauteur: 34 },
  T: { couleur: 0x2e7d32, nom: 'Arbre', hauteur: 22 },
  w: { couleur: 0x3b7dd8, nom: 'Bassin' },
  b: { couleur: 0x6d4c41, nom: 'Banc', hauteur: 6 },
  v: { couleur: 0xb03a2e, nom: 'Voiture', hauteur: 12 },
};

export function creerGrille(lignes) {
  const h = lignes.length;
  const w = lignes[0].length;
  return {
    w,
    h,
    lignes,
    tuile: (x, y) => lignes[y]?.[x] ?? '#',
    bloque: (x, y) => x < 0 || y < 0 || x >= w || y >= h || BLOQUANTS.has(lignes[y][x]),
  };
}

// Le quartier : 24 × 20. Parc au nord-ouest, étude du notaire à l'est, rue Lafayette au sud.
export const QUARTIER = {
  lignes: [
    '########################',
    '#gggggggggg,..,#########',
    '#gTggggTggg,..,#########',
    '#ggggwwgggg,..,,,,,,,,,#',
    '#gTggwwggTg,..........,#',
    '#ggggggbggg,..........,#',
    '#ggTgggggTg,..,,,,,,,.,#',
    '#gggggggggg,..,####,,.,#',
    '#,,,,,,,,,,,..,####,,.,#',
    '#...........................',
    '#...........................',
    '#,,,,,,,,,,,..,,,,,,,,.,#',
    '#####,,###,,..,###,,,,.,#',
    '#####,,###,,..,###,v,,.,#',
    '#,,,,,,,,,,,..,,,,,,,,.,#',
    '#..........v............#',
    '#.......................#',
    '#,,,,,,,,,,,,,,,,,,,,,,,#',
    '########################',
    '########################',
  ].map((l) => l.slice(0, 24).padEnd(24, '#')),
  depart: { x: 12, y: 9 },
  zones: {
    parc: { nom: 'Le parc Montclair', x1: 1, y1: 1, x2: 10, y2: 7 },
    etude: { nom: 'Étude Brémond', x1: 15, y1: 3, x2: 22, y2: 6 },
    lafayette: { nom: 'Rue Lafayette', x1: 1, y1: 14, x2: 22, y2: 16 },
  },
};

// Arènes de combat (11 × 11). Les témoins sont placés sur les cases 'o' quand il y en a.
export const ARENES = {
  parc: [
    'ggggggggggg',
    'ggTggggggTg',
    'ggggggggggg',
    'ggggwwggggg',
    'ggggwwggTgg',
    'ggggggggggg',
    'ggTgggbgggg',
    'ggggggggggg',
    'gggggggTggg',
    'gTggggggggg',
    'ggggggggggg',
  ],
  rue: [
    ',,,,,,,,,,,',
    ',,#,,,,,#,,',
    '...........',
    '...v.......',
    '...........',
    '.......v...',
    '...........',
    ',,,,,,,,,,,',
    ',,#,,b,,#,,',
    ',,,,,,,,,,,',
    ',,,,,,,,,,,',
  ],
  reference: [
    ',,,,,,,,,,,',
    ',,,,,,,,,,,',
    ',,,#,,,#,,,',
    ',,,,,,,,,,,',
    ',,,,,,,,,,,',
    ',,,,,v,,,,,',
    ',,,,,,,,,,,',
    ',,,,,,,,,,,',
    ',,,#,,,#,,,',
    ',,,,,,,,,,,',
    ',,,,,,,,,,,',
  ],
};

// Positions de départ dans une arène 11 × 11.
export const DEPARTS = {
  joueur: { x: 5, y: 9 },
  allie: { x: 4, y: 9 },
  ennemis: [{ x: 5, y: 1 }, { x: 3, y: 2 }, { x: 7, y: 2 }],
  temoins: [{ x: 0, y: 5 }, { x: 10, y: 4 }, { x: 0, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 0 }],
};
