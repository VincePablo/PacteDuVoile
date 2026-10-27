// Dessin du terrain et des pions, entièrement en code (pas d'images à charger).
import { TUILES } from '../data/maps.js';
import { FACTIONS, ESCOUADES } from '../data/factions.js';
import { TH, TW, assombrir, bloc, losange, profondeur, versEcran } from '../systems/iso.js';

const varier = (couleur, x, y) => {
  const n = ((x * 73856093) ^ (y * 19349663)) & 7;
  return assombrir(couleur, 0.94 + n * 0.012);
};

export function dessinerTerrain(scene, grille) {
  const sol = scene.add.graphics().setDepth(-1000);
  const objets = [];
  for (let y = 0; y < grille.h; y++) {
    for (let x = 0; x < grille.w; x++) {
      const t = grille.tuile(x, y);
      const def = TUILES[t] ?? TUILES['#'];
      const p = versEcran(x, y);
      const base = def.hauteur ? TUILES[t === 'T' || t === 'b' ? 'g' : ','].couleur : def.couleur;
      losange(sol, p.x, p.y, varier(base, x, y), 1, { couleur: 0x000000, alpha: 0.12 });
      if (t === '.' && (x + y) % 6 === 0) losange(sol, p.x, p.y, 0xffffff, 0.04);
      if (def.hauteur) {
        const g = scene.add.graphics().setDepth(profondeur(x, y, 5));
        if (t === 'T') {
          g.fillStyle(0x5d4037, 1).fillRect(p.x - 3, p.y - 14, 6, 14);
          g.fillStyle(varier(def.couleur, x, y), 1).fillCircle(p.x, p.y - 26, 15);
          g.fillStyle(assombrir(def.couleur, 1.25), 0.5).fillCircle(p.x - 5, p.y - 31, 6);
        } else if (t === '#') {
          bloc(g, p.x, p.y, varier(def.couleur, x, y), def.hauteur);
          // fenêtres éclairées
          if ((x * 7 + y * 3) % 4 === 0) g.fillStyle(0xf7dc6f, 0.8).fillRect(p.x - 18, p.y - 22, 5, 7);
          if ((x * 5 + y * 11) % 3 === 0) g.fillStyle(0xf7dc6f, 0.7).fillRect(p.x + 12, p.y - 20, 5, 7);
        } else {
          bloc(g, p.x, p.y, def.couleur, def.hauteur, t === 'b' ? 14 : 8);
        }
        objets.push(g);
      }
    }
  }
  return { sol, objets };
}

// Pion stylisé. type : 'joueur' | 'ennemi' | 'pnj' | 'temoin' | 'allie'.
export function creerPion(scene, { type, couleur, escouade, boss = false }) {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  const echelle = boss ? 1.35 : 1;
  g.fillStyle(0x000000, 0.35).fillEllipse(0, 0, 30 * echelle, 13 * echelle);
  const corps = type === 'joueur' ? couleurJoueur(escouade) : couleur;
  g.fillStyle(assombrir(corps, 0.7), 1).fillRoundedRect(-9 * echelle, -30 * echelle, 18 * echelle, 28 * echelle, 6);
  g.fillStyle(corps, 1).fillRoundedRect(-8 * echelle, -30 * echelle, 16 * echelle, 24 * echelle, 6);
  g.fillStyle(type === 'temoin' || type === 'pnj' ? 0xf0d9b5 : assombrir(corps, 1.2), 1).fillCircle(0, -37 * echelle, 7 * echelle);
  if (type === 'ennemi') {
    g.fillStyle(0xff3b3b, 1).fillCircle(-3 * echelle, -38 * echelle, 1.6).fillCircle(3 * echelle, -38 * echelle, 1.6);
  }
  if (type === 'joueur') embleme(g, escouade);
  if (type === 'joueur') g.lineStyle(2, 0xffffff, 0.8).strokeEllipse(0, 0, 32, 15);
  c.add(g);
  c.corps = g;
  return c;
}

function couleurJoueur(escouade) {
  const f = ESCOUADES[escouade].faction;
  return { anges: 0xf3f0e6, demons: 0x3b1f2b, troisieme: 0x234a5c }[f] ?? FACTIONS[f].couleur;
}

function embleme(g, escouade) {
  const f = ESCOUADES[escouade].faction;
  if (f === 'anges') g.lineStyle(2, 0xf7dc6f, 1).strokeEllipse(0, -48, 16, 5);
  if (f === 'demons') {
    g.fillStyle(0xc0392b, 1);
    g.fillTriangle(-6, -42, -3, -42, -7, -50);
    g.fillTriangle(6, -42, 3, -42, 7, -50);
  }
  if (escouade === 'loups') g.fillStyle(0x7f8c8d, 1).fillTriangle(-7, -41, -2, -43, -6, -49).fillTriangle(7, -41, 2, -43, 6, -49);
  if (escouade === 'vampires') g.fillStyle(0x7b241c, 1).fillTriangle(-10, -30, 10, -30, 0, -20);
  if (escouade === 'spartiates') g.fillStyle(0xc0392b, 1).fillRect(-2, -52, 4, 10);
  if (escouade === 'sorciers') g.fillStyle(0x4a235a, 1).fillTriangle(-8, -42, 8, -42, 2, -58);
}

export function placer(pion, x, y, couche = 20) {
  const p = versEcran(x, y);
  pion.setPosition(p.x, p.y);
  pion.setDepth(profondeur(x, y, couche));
}

export function texteFlottant(scene, x, y, texte, couleur = '#ffffff', taille = 15) {
  const p = versEcran(x, y);
  const t = scene.add
    .text(p.x, p.y - 56, texte, { fontFamily: 'Inter, sans-serif', fontSize: `${taille}px`, fontStyle: '700', color: couleur, stroke: '#000000', strokeThickness: 4 })
    .setOrigin(0.5)
    .setDepth(100000);
  scene.tweens.add({ targets: t, y: t.y - 30, alpha: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
}

export function etiquette(scene, texte, couleur = '#e9e6df') {
  return scene.add
    .text(0, -62, texte, { fontFamily: 'Inter, sans-serif', fontSize: '11px', color: couleur, backgroundColor: 'rgba(10,10,14,0.7)', padding: { x: 4, y: 2 } })
    .setOrigin(0.5);
}

export { TW, TH };
