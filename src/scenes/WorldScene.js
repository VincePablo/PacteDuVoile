// Exploration du quartier : déplacement au clic, PNJ, témoins, indices, rencontres, cycle jour/nuit.
import { QUARTIER, creerGrille } from '../data/maps.js';
import { ESCOUADES, FACTIONS } from '../data/factions.js';
import { MARQUEURS, OBJETS, PNJ } from '../data/quests.js';
import { chemin, DIRECTIONS } from '../systems/pathfinding.js';
import { versEcran, versGrille, losange, profondeur } from '../systems/iso.js';
import { estNuit, sauvegarder } from '../systems/state.js';
import { decroissance, reduireDechirure } from '../systems/voile.js';
import { depenser, idFaction } from '../systems/faction.js';
import { objetDisponible, rencontreDisponible, traiter, variante } from '../systems/quests.js';
import * as hud from '../ui/hud.js';
import { creerPion, dessinerTerrain, etiquette, placer } from './rendu.js';
import { afficherNotes } from './notes.js';

const NB_PASSANTS_JOUR = 8;
const NB_PASSANTS_NUIT = 3;
const RAYON_TEMOINS = 7;
const PRIX_FIOLE = FACTIONS.demons.depense.cout;
const POUVOIRS_HORS_COMBAT = {
  potDeVin: { libelle: 'Pot-de-vin (−20 Déchirure, 5 Corruption)', recharge: 90, cout: 5 },
  hypnose: { libelle: 'Hypnose d’un témoin (−10 Déchirure)', recharge: 90, cout: 0 },
};

export class WorldScene extends Phaser.Scene {
  constructor() {
    super('monde');
  }

  init(data) {
    this.notesEntree = data?.notes ?? [];
  }

  create() {
    this.etat = this.registry.get('etat');
    this.grille = creerGrille(QUARTIER.lignes);
    this.occupe = new Map();
    this.enMouvement = false;
    dessinerTerrain(this, this.grille);
    this.surbrillance = this.add.graphics().setDepth(-900);

    this.creerPnj();
    this.objets = {};
    this.marqueurs = {};
    this.creerPassants();
    this.joueur = creerPion(this, { type: 'joueur', escouade: this.etat.escouade });
    placer(this.joueur, this.etat.position.x, this.etat.position.y);

    const cam = this.cameras.main;
    cam.setZoom(this.scale.width < 720 ? 0.85 : 1.25);
    cam.startFollow(this.joueur, true, 0.12, 0.12);
    this.nuit = this.add.rectangle(0, 0, 10, 10, 0x1a2a6c, 0).setOrigin(0).setScrollFactor(0).setDepth(200000).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.ajusterNuit();
    this.scale.on('resize', this.ajusterNuit, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.ajusterNuit, this));

    this.input.on('pointerdown', (p) => this.clic(p));
    this.input.on('pointermove', (p) => this.survol(p));
    this.input.keyboard.on('keydown-J', () => !hud.fenetreOuverte() && hud.journal(this.etat));

    this.time.addEvent({ delay: 1300, loop: true, callback: () => this.deplacerPassants() });
    this.time.addEvent({ delay: 5000, loop: true, callback: () => sauvegarder(this.etat) });
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.majHud() });
    this.majEntites();
    this.majHud();
    this.apresNotes(this.notesEntree);
  }

  update(_t, dt) {
    const avant = estNuit(this.etat);
    this.etat.horloge += dt / 1000;
    decroissance(this.etat, dt / 1000);
    if (avant !== estNuit(this.etat)) {
      hud.toast(estNuit(this.etat) ? 'La nuit tombe : les rues se vident.' : 'Le jour se lève : les passants reviennent.');
      this.creerPassants();
    }
    this.nuit.fillAlpha = Phaser.Math.Linear(this.nuit.fillAlpha, estNuit(this.etat) ? 0.55 : 0, 0.02);
  }

  ajusterNuit() {
    this.nuit.setSize(this.scale.width, this.scale.height);
  }

  // ------------------------------------------------------------ Entités

  creerPnj() {
    this.pnjs = {};
    const faction = idFaction(this.etat);
    for (const [id, def] of Object.entries(PNJ)) {
      const pion = creerPion(this, { type: 'pnj', couleur: def.couleur });
      const nom = typeof def.nom === 'string' ? def.nom : def.nom[faction];
      pion.add(etiquette(this, nom));
      pion.nomAffiche = nom;
      placer(pion, def.x, def.y);
      this.pnjs[id] = pion;
      this.occupe.set(`${def.x},${def.y}`, { type: 'pnj', id });
    }
  }

  creerPassants() {
    for (const p of this.passants ?? []) p.pion.destroy();
    this.passants = [];
    const n = estNuit(this.etat) ? NB_PASSANTS_NUIT : NB_PASSANTS_JOUR;
    const libres = [];
    for (let y = 0; y < this.grille.h; y++) for (let x = 0; x < this.grille.w; x++) if (!this.grille.bloque(x, y) && !this.occupe.has(`${x},${y}`)) libres.push({ x, y });
    for (let i = 0; i < n; i++) {
      const c = Phaser.Utils.Array.GetRandom(libres);
      const pion = creerPion(this, { type: 'temoin', couleur: Phaser.Utils.Array.GetRandom([0x7f8c8d, 0x5d6d7e, 0xa04000, 0x1f618d, 0x6e2c00]) });
      placer(pion, c.x, c.y);
      this.passants.push({ x: c.x, y: c.y, pion });
    }
  }

  deplacerPassants() {
    for (const p of this.passants) {
      if (Math.random() < 0.35) continue;
      const [dx, dy] = Phaser.Utils.Array.GetRandom(DIRECTIONS);
      const nx = p.x + dx;
      const ny = p.y + dy;
      if (this.grille.bloque(nx, ny) || this.occupe.has(`${nx},${ny}`) || (nx === this.etat.position.x && ny === this.etat.position.y)) continue;
      p.x = nx;
      p.y = ny;
      const e = versEcran(nx, ny);
      p.pion.setDepth(profondeur(nx, ny, 20));
      this.tweens.add({ targets: p.pion, x: e.x, y: e.y, duration: 900 });
    }
  }

  majEntites() {
    for (const o of Object.values(this.objets)) o.destroy();
    for (const m of Object.values(this.marqueurs)) m.destroy();
    this.objets = {};
    this.marqueurs = {};
    for (const k of [...this.occupe.keys()]) if (this.occupe.get(k).type !== 'pnj') this.occupe.delete(k);

    for (const [id, o] of Object.entries(OBJETS)) {
      if (!objetDisponible(this.etat, id)) continue;
      const p = versEcran(o.x, o.y);
      const g = this.add.graphics().setDepth(profondeur(o.x, o.y, 15));
      g.fillStyle(0xf7dc6f, 1).fillCircle(0, -10, 5);
      g.lineStyle(2, 0xf7dc6f, 0.6).strokeCircle(0, -10, 10);
      g.setPosition(p.x, p.y);
      this.tweens.add({ targets: g, alpha: 0.4, yoyo: true, repeat: -1, duration: 700 });
      this.objets[id] = g;
      this.occupe.set(`${o.x},${o.y}`, { type: 'objet', id });
    }
    for (const [id, m] of Object.entries(MARQUEURS)) {
      if (!rencontreDisponible(this.etat, id, m)) continue;
      const pion = creerPion(this, { type: 'ennemi', couleur: id === 'boss' ? 0xd4ac0d : 0x8e44ad, boss: id === 'boss' });
      pion.add(etiquette(this, id === 'boss' ? 'Le Collectionneur' : m.repetable ? 'Créatures (ruelle)' : 'Créature', '#ff8a80'));
      placer(pion, m.x, m.y);
      this.tweens.add({ targets: pion, scaleY: 1.06, yoyo: true, repeat: -1, duration: 600 });
      this.marqueurs[id] = pion;
      this.occupe.set(`${m.x},${m.y}`, { type: 'marqueur', id });
    }
  }

  majHud() {
    const esc = ESCOUADES[this.etat.escouade];
    const def = POUVOIRS_HORS_COMBAT[esc.pouvoir.id];
    const pret = def && (this.etat.pouvoirPret ?? 0) <= this.etat.horloge;
    hud.hudMonde(this.etat, {
      onJournal: () => hud.journal(this.etat),
      pouvoirHorsCombat: def && { libelle: pret ? def.libelle : `${esc.pouvoir.nom} (${Math.ceil(this.etat.pouvoirPret - this.etat.horloge)} s)`, pret },
      onPouvoir: () => this.pouvoirHorsCombat(),
    });
  }

  // ------------------------------------------------------------ Entrées

  pointeurVersCase(p) {
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    return versGrille(w.x, w.y);
  }

  survol(p) {
    const c = this.pointeurVersCase(p);
    this.surbrillance.clear();
    if (this.grille.bloque(c.x, c.y)) return;
    const e = versEcran(c.x, c.y);
    const cible = this.occupe.get(`${c.x},${c.y}`);
    losange(this.surbrillance, e.x, e.y, cible ? 0xf7dc6f : 0xffffff, cible ? 0.35 : 0.15);
  }

  async clic(p) {
    if (this.enMouvement || hud.fenetreOuverte()) return;
    // Un clic sur la silhouette d'un PNJ (dessinée au-dessus de sa case) le désigne aussi.
    const c = this.entiteSous(this.cameras.main.getWorldPoint(p.x, p.y)) ?? this.pointeurVersCase(p);
    if (c.x < 0 || c.y < 0 || c.x >= this.grille.w || c.y >= this.grille.h) return;
    const cible = this.occupe.get(`${c.x},${c.y}`);
    if (cible) {
      const arrivee = this.caseAdjacente(c);
      if (!arrivee) return;
      if (await this.marcherVers(arrivee)) await this.interagir(cible);
    } else if (!this.grille.bloque(c.x, c.y)) {
      await this.marcherVers(c);
    }
  }

  entiteSous(w) {
    let meilleure = null;
    for (const k of this.occupe.keys()) {
      const [x, y] = k.split(',').map(Number);
      const e = versEcran(x, y);
      if (Math.abs(w.x - e.x) < 16 && w.y > e.y - 50 && w.y < e.y + 8 && (!meilleure || x + y > meilleure.x + meilleure.y)) meilleure = { x, y };
    }
    return meilleure;
  }

  caseAdjacente(c) {
    const pos = this.etat.position;
    if (Math.abs(pos.x - c.x) + Math.abs(pos.y - c.y) === 1) return pos;
    const options = DIRECTIONS.map(([dx, dy]) => ({ x: c.x + dx, y: c.y + dy })).filter((q) => !this.bloque(q.x, q.y));
    options.sort((a, b) => Math.abs(a.x - pos.x) + Math.abs(a.y - pos.y) - (Math.abs(b.x - pos.x) + Math.abs(b.y - pos.y)));
    return options[0] ?? null;
  }

  bloque(x, y) {
    return this.grille.bloque(x, y) || this.occupe.has(`${x},${y}`);
  }

  marcherVers(c) {
    const pos = this.etat.position;
    if (pos.x === c.x && pos.y === c.y) return Promise.resolve(true);
    const parcours = chemin(pos, c, (x, y) => this.bloque(x, y));
    if (!parcours) return Promise.resolve(false);
    this.enMouvement = true;
    return new Promise((resolve) => {
      const etapes = parcours.map((q) => {
        const e = versEcran(q.x, q.y);
        return { x: e.x, y: e.y, duration: 140, onStart: () => this.joueur.setDepth(profondeur(q.x, q.y, 20)) };
      });
      this.tweens.chain({
        targets: this.joueur,
        tweens: etapes,
        onComplete: () => {
          Object.assign(this.etat.position, parcours.at(-1));
          this.enMouvement = false;
          resolve(true);
        },
      });
    });
  }

  // ------------------------------------------------------------ Interactions

  async interagir(cible) {
    if (cible.type === 'pnj') return this.parler(cible.id);
    if (cible.type === 'objet') {
      await this.apresNotes(traiter(this.etat, { type: 'examiner', objet: cible.id }));
      return;
    }
    if (cible.type === 'marqueur') return this.lancerCombat(cible.id);
  }

  async parler(id) {
    const def = PNJ[id];
    const nom = this.pnjs[id].nomAffiche;
    const notes = traiter(this.etat, { type: 'parler', pnj: id });
    const deduction = notes.find((n) => n.type === 'deduction');
    if (deduction) return this.deduire(deduction);
    if (notes.some((n) => n.type === 'dialogue')) return this.apresNotes(notes, nom);
    // Aucun dialogue de quête : réplique par défaut (et boutique pour les démons).
    const lignes = [variante(def.defaut, this.etat)];
    if (id === 'secretaire' && ESCOUADES[this.etat.escouade].passif.id === 'seduction') lignes.push(`(Séduction) ${def.seduction}`);
    if (id === 'marchand' && idFaction(this.etat) === 'demons') {
      await hud.dialogue(nom, [def.demons]);
      hud.boutique(this.etat, {
        prix: PRIX_FIOLE,
        onAcheter: () => {
          if (depenser(this.etat, PRIX_FIOLE)) {
            this.etat.inventaire.fioles += 1;
            hud.toast('Fiole achetée.', 'succes');
            this.majHud();
          }
        },
      });
      return;
    }
    await hud.dialogue(nom, lignes);
  }

  async deduire({ quete, etape }) {
    const q = this.etat.quetes.actives[quete];
    const choix = await hud.deduction(this.etat, etape, q.tentatives);
    if (!choix) return;
    const notes = traiter(this.etat, { type: 'deduire', quete, choix });
    await this.apresNotes(notes);
    if (notes[0]?.type === 'deduction_ko' && this.etat.quetes.actives[quete]) return this.deduire({ quete, etape });
  }

  async apresNotes(notes, nomPnj = null) {
    await afficherNotes(this, notes, nomPnj);
    // Choix de la 2e arme resté en suspens (page rechargée pendant le choix, par exemple).
    if (!this.etat.arme2 && this.etat.quetes.terminees.includes('tutoriel')) await afficherNotes(this, [{ type: 'choixArme' }]);
    this.majEntites();
    this.majHud();
    sauvegarder(this.etat);
    if (this.etat.patrouillePendante) {
      this.etat.patrouillePendante = false;
      hud.toast('La patrouille vous a trouvé !', 'danger');
      this.time.delayedCall(800, () => this.lancerCombat(null, { patrouille: true }));
    }
  }

  temoinsAutour(x, y) {
    return this.passants.filter((p) => Math.abs(p.x - x) + Math.abs(p.y - y) <= RAYON_TEMOINS).length;
  }

  lancerCombat(marqueurId, { patrouille = false } = {}) {
    const m = marqueurId ? MARQUEURS[marqueurId] : { arene: 'rue', rencontre: 'patrouille' };
    const pos = marqueurId ? m : this.etat.position;
    const temoins = Math.min(5, this.temoinsAutour(pos.x, pos.y));
    sauvegarder(this.etat);
    this.scene.start('combat', { marqueur: marqueurId, rencontre: m.rencontre, arene: m.arene, temoins, patrouille });
  }

  pouvoirHorsCombat() {
    const esc = ESCOUADES[this.etat.escouade];
    const def = POUVOIRS_HORS_COMBAT[esc.pouvoir.id];
    if (!def || (this.etat.pouvoirPret ?? 0) > this.etat.horloge) return;
    if (def.cout && !depenser(this.etat, def.cout)) return hud.toast(`Il vous faut ${def.cout} de Corruption.`, 'danger');
    reduireDechirure(this.etat, esc.pouvoir.params.dechirure);
    this.etat.pouvoirPret = this.etat.horloge + def.recharge;
    hud.toast(esc.pouvoir.id === 'potDeVin' ? 'Un billet glissé, un témoin qui oublie.' : 'Un regard, et le témoin s’endort.', 'succes');
    this.majHud();
  }
}

