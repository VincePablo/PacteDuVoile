// Combat tactique : grille isométrique, tours alternés, témoins autour de l'arène.
import { ARENES, DEPARTS, creerGrille } from '../data/maps.js';
import { RENCONTRES } from '../data/enemies.js';
import { ESCOUADES, FACTIONS } from '../data/factions.js';
import { PNJ } from '../data/quests.js';
import * as C from '../systems/combat.js';
import { cle } from '../systems/pathfinding.js';
import { losange, profondeur, versEcran, versGrille } from '../systems/iso.js';
import { estNuit, sauvegarder } from '../systems/state.js';
import { ajouterDechirure, expositionAction, reduireDechirure, visionTemoins } from '../systems/voile.js';
import { depenser, factionDe, gagner, idFaction, retirer } from '../systems/faction.js';
import { demarrerPenitence, traiter } from '../systems/quests.js';
import * as hud from '../ui/hud.js';
import { creerPion, dessinerTerrain, etiquette, placer, texteFlottant } from './rendu.js';

const BUTIN_PAR_ENNEMI = 6;
const BUTIN_BOSS = 20;
const PERTE_DEFAITE = 10;

export class CombatScene extends Phaser.Scene {
  constructor() {
    super('combat');
  }

  init(data) {
    this.params = data;
  }

  create() {
    this.etat = this.registry.get('etat');
    hud.viderCouche('hud');
    const esc = ESCOUADES[this.etat.escouade];

    // Arène : les témoins occupent des cases du bord.
    const base = creerGrille(ARENES[this.params.arene]);
    this.temoins = DEPARTS.temoins.slice(0, this.params.temoins).map((t) => ({ ...t }));
    const casesTemoins = new Set(this.temoins.map((t) => cle(t.x, t.y)));
    this.grille = { ...base, bloque: (x, y) => base.bloque(x, y) || casesTemoins.has(cle(x, y)) };
    dessinerTerrain(this, base);
    this.calque = this.add.graphics().setDepth(-900);
    this.effets = this.add.graphics().setDepth(90000);

    // Unités
    this.joueur = C.creerJoueur({
      escouade: this.etat.escouade, arme2: this.etat.arme2, rang: this.etat.ressource.rang,
      penitence: this.etat.penitence, fioles: this.etat.inventaire.fioles, ...DEPARTS.joueur,
    });
    const miracle = FACTIONS.anges.depense;
    if (esc.faction === 'anges' && !this.etat.penitence && this.etat.ressource.points >= miracle.cout) this.joueur.miracle = true;
    const ennemis = RENCONTRES[this.params.rencontre].map((t, i) => C.creerEnnemi(t, DEPARTS.ennemis[i].x, DEPARTS.ennemis[i].y));
    this.c = C.creerCombat({ grille: this.grille, unites: [this.joueur, ...ennemis], graine: Date.now(), nuit: estNuit(this.etat) });

    this.pions = new Map();
    for (const u of this.c.unites) this.creerPionUnite(u);
    for (const t of this.temoins) {
      const p = creerPion(this, { type: 'temoin', couleur: 0x7f8c8d });
      p.add(etiquette(this, 'Témoin', '#f5b7b1'));
      placer(p, t.x, t.y);
      t.pion = p;
    }

    const centre = versEcran(5, 5);
    const cam = this.cameras.main;
    cam.centerOn(centre.x, centre.y - 10);
    cam.setZoom(Phaser.Math.Clamp(Math.min(this.scale.width / 820, (this.scale.height - 190) / 470), 0.55, 1.6));

    this.selection = null;
    this.occupe = false;
    this.journal = [];
    this.notesApres = [];
    this.faveurUtilisee = false;
    this.input.on('pointermove', (p) => this.survol(p));
    this.input.on('pointerdown', (p) => this.clic(p));
    this.input.keyboard.on('keydown', (ev) => this.touche(ev));

    this.noter(`Combat ! ${ennemis.map((e) => e.nom).join(', ')}.`);
    if (this.temoins.length) hud.toast(`${this.temoins.length} témoin${this.temoins.length > 1 ? 's' : ''} autour de vous. Prudence avec le surnaturel.`, 'danger');
    if (this.joueur.miracle) this.noter(`Miracle disponible (${miracle.cout} Grâce).`);
    this.boucle().catch((err) => {
      console.error(err);
      hud.toast(`Erreur de combat : ${err.message}`, 'danger');
    });
  }

  // ------------------------------------------------------------ Affichage

  creerPionUnite(u) {
    const type = u.principal ? 'joueur' : u.camp === 'joueur' ? 'allie' : 'ennemi';
    const pion = creerPion(this, { type, couleur: u.couleur, escouade: u.escouade, boss: u.boss });
    const barre = this.add.graphics();
    pion.add(barre);
    pion.barre = barre;
    placer(pion, u.x, u.y);
    this.pions.set(u.id, pion);
    this.majPv(u);
  }

  majPv(u) {
    const pion = this.pions.get(u.id);
    if (!pion) return;
    const b = pion.barre.clear();
    const y = u.boss ? -70 : -56;
    b.fillStyle(0x000000, 0.6).fillRect(-17, y, 34, 5);
    b.fillStyle(u.camp === 'joueur' ? 0x58d68d : 0xe74c3c, 1).fillRect(-16, y + 1, 32 * Math.max(0, u.pv / u.pvMax), 3);
    if (u.bouclier > 0) b.fillStyle(0x85c1e9, 1).fillRect(-16, y - 3, Math.min(32, u.bouclier), 2);
  }

  noter(ligne) {
    this.journal.push(ligne);
    hud.journalCombat(this.journal);
  }

  monTour() {
    return !this.c.fini && !this.occupe && C.courant(this.c) === this.joueur;
  }

  majUI() {
    const f = idFaction(this.etat);
    hud.barreCombat({
      c: this.c,
      joueur: this.joueur,
      selection: this.selection,
      monTour: this.monTour(),
      options: {
        temoins: this.temoins.length,
        fuite: this.params.patrouille,
        faveur: f === 'troisieme' && { cout: FACTIONS.troisieme.depense.cout, possible: !this.faveurUtilisee && this.etat.ressource.points >= FACTIONS.troisieme.depense.cout && !this.etat.penitence },
      },
      handlers: {
        onSelection: (id) => this.selectionner(id),
        onFin: () => this.finTour(),
        onFuir: () => this.fuir(),
        onFaveur: () => this.faveur(),
      },
    });
    this.dessinerCalque();
  }

  dessinerCalque(survol = null) {
    const g = this.calque.clear();
    if (!this.monTour()) return;
    if (this.selection) {
      const comp = this.joueur.competences.find((k) => k.id === this.selection);
      for (const cse of C.casesCiblables(this.c, this.joueur, comp)) {
        const e = versEcran(cse.x, cse.y);
        losange(g, e.x, e.y, cse.valide ? 0x5dade2 : 0x5dade2, cse.valide ? 0.4 : 0.12);
      }
      if (survol && C.peutLancer(this.c, this.joueur, comp, survol.x, survol.y)) {
        const r = comp.effets?.zone ?? (comp.id === 'rituel' ? comp.params.zone : 0);
        for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) + Math.abs(dy) > r) continue;
          const e = versEcran(survol.x + dx, survol.y + dy);
          losange(g, e.x, e.y, 0xe74c3c, 0.45);
        }
      }
      return;
    }
    const carte = C.casesDeplacement(this.c, this.joueur);
    for (const n of carte.values()) {
      if (n.cout === 0) continue;
      const e = versEcran(n.x, n.y);
      losange(g, e.x, e.y, 0x58d68d, 0.18);
    }
    if (survol && carte.has(cle(survol.x, survol.y))) {
      const e = versEcran(survol.x, survol.y);
      losange(g, e.x, e.y, 0x58d68d, 0.5);
    }
  }

  // ------------------------------------------------------------ Boucle de jeu

  attendre(ms) {
    return new Promise((r) => this.time.delayedCall(ms, r));
  }

  async boucle() {
    await this.animer();
    while (!this.c.fini) {
      const u = C.courant(this.c);
      if (u === this.joueur) {
        if (u.etourdi) {
          hud.toast('Vous êtes étourdi et passez votre tour.', 'danger');
          await this.attendre(800);
          C.finTour(this.c);
          await this.animer();
          continue;
        }
        this.majUI();
        await new Promise((res) => (this.resoudreTour = res));
      } else {
        await this.tourIA(u);
      }
    }
    this.majUI();
    await this.attendre(700);
    this.terminer();
  }

  async tourIA(u) {
    this.majUI();
    await this.attendre(300);
    for (let i = 0; i < 20 && !this.c.fini; i++) {
      const a = C.prochaineActionIA(this.c, u);
      if (a.type === 'fin') break;
      if (!C.executerAction(this.c, u, a) && a.type === 'lancer') u.ia_phase = 'repli';
      await this.animer();
      await this.attendre(180);
    }
    if (!this.c.fini) {
      C.finTour(this.c);
      await this.animer();
    }
  }

  async agir(fn) {
    this.occupe = true;
    this.calque.clear();
    fn();
    await this.animer();
    this.occupe = false;
    this.majUI();
    if (this.c.fini) this.resoudreTour?.();
  }

  async finTour() {
    if (!this.monTour()) return;
    this.selection = null;
    this.occupe = true;
    C.finTour(this.c);
    await this.animer();
    this.occupe = false;
    this.resoudreTour?.();
  }

  // ------------------------------------------------------------ Événements du moteur

  async animer() {
    while (this.c.evenements.length) {
      const evts = this.c.evenements.splice(0);
      for (const e of evts) await this.animerEvenement(e);
    }
  }

  nomDe(id) {
    const u = this.c.unites.find((v) => v.id === id);
    return u?.principal ? 'Vous' : u?.nom ?? '?';
  }

  async animerEvenement(e) {
    const u = this.c.unites.find((v) => v.id === e.unite);
    const pion = this.pions.get(e.unite);
    switch (e.type) {
      case 'tour':
        if (u === this.joueur) this.noter(`— Tour ${e.tour} : à vous —`);
        this.majUI();
        break;
      case 'deplacement':
        await new Promise((res) => {
          this.tweens.chain({
            targets: pion,
            tweens: e.chemin.map((q) => {
              const p = versEcran(q.x, q.y);
              return { x: p.x, y: p.y, duration: 110, onStart: () => pion.setDepth(profondeur(q.x, q.y, 20)) };
            }),
            onComplete: res,
          });
        });
        break;
      case 'teleport': {
        const p = versEcran(e.x, e.y);
        pion.setDepth(profondeur(e.x, e.y, 20));
        await new Promise((res) => this.tweens.add({ targets: pion, x: p.x, y: p.y, duration: 220, onComplete: res }));
        break;
      }
      case 'competence': {
        this.noter(`${this.nomDe(e.unite)} : ${e.nom}`);
        const a = versEcran(u.x, u.y);
        const b = versEcran(e.x, e.y);
        const couleur = u.camp === 'joueur' ? 0xf7dc6f : 0xe74c3c;
        this.effets.lineStyle(3, couleur, 0.9).lineBetween(a.x, a.y - 24, b.x, b.y - 24);
        this.time.delayedCall(220, () => this.effets.clear());
        if (u === this.joueur) this.verifierVoile(e);
        await this.attendre(160);
        break;
      }
      case 'degats':
        texteFlottant(this, u.x, u.y, `−${e.montant}${e.crit ? ' !' : ''}`, e.crit ? '#ffb347' : '#ff6b6b', e.crit ? 19 : 15);
        if (pion) this.tweens.add({ targets: pion, x: pion.x + 4, duration: 50, yoyo: true, repeat: 1 });
        this.majPv(u);
        await this.attendre(90);
        break;
      case 'soin':
        texteFlottant(this, u.x, u.y, `+${e.montant}`, '#58d68d');
        this.majPv(u);
        break;
      case 'texte':
        texteFlottant(this, u.x, u.y, e.texte, '#ffffff', 13);
        break;
      case 'mort':
        this.noter(`${this.nomDe(e.unite)} tombe.`);
        await new Promise((res) => this.tweens.add({ targets: pion, alpha: 0, y: pion.y + 10, duration: 400, onComplete: res }));
        break;
      case 'miracle': {
        const cout = FACTIONS.anges.depense.cout;
        depenser(this.etat, cout);
        texteFlottant(this, u.x, u.y, 'Miracle !', '#f7dc6f', 20);
        this.noter(`Miracle : vous vous relevez (−${cout} Grâce).`);
        this.majPv(u);
        break;
      }
      case 'oubli':
        reduireDechirure(this.etat, e.montant);
        hud.toast(`Oubli béni : −${e.montant} de Déchirure.`, 'succes');
        break;
      case 'rituel': {
        const p = versEcran(e.x, e.y);
        const cercle = this.add.ellipse(p.x, p.y, 320, 160, 0x9b59b6, 0.35).setDepth(90000);
        this.tweens.add({ targets: cercle, alpha: 0, duration: 600, onComplete: () => cercle.destroy() });
        break;
      }
      case 'invocation':
        this.creerPionUnite(u);
        this.noter('Un allié de la 3e Force répond à votre appel.');
        break;
      case 'fin':
        this.noter(e.resultat === 'victoire' ? 'Victoire !' : e.resultat === 'fuite' ? 'Vous prenez la fuite.' : 'Défaite…');
        break;
    }
  }

  verifierVoile(e) {
    const r = expositionAction({ surnat: e.surnat, bruit: e.bruit }, this.joueur.x, this.joueur.y, this.temoins, visionTemoins(this.etat), (t, p) => C.ligneDeVue(this.c, t, p));
    if (!r.montant) return;
    for (const t of r.temoins) texteFlottant(this, t.x, t.y, '!', '#ff6b6b', 22);
    hud.toast(`Un témoin a vu quelque chose : +${r.montant} de Déchirure.`, 'danger');
    for (const evt of ajouterDechirure(this.etat, r.montant)) {
      if (evt.type === 'avertissement' || evt.type === 'sanction' || evt.type === 'penitence') this.notesApres.push(evt);
      if (evt.type === 'sanction' || evt.type === 'penitence') hud.toast(evt.texte, 'danger');
      if (evt.type === 'penitence') this.notesApres.push(...demarrerPenitence(this.etat));
      if (evt.patrouille && !this.params.patrouille) this.etat.patrouillePendante = true;
    }
  }

  // ------------------------------------------------------------ Entrées

  case(p) {
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    return versGrille(w.x, w.y);
  }

  survol(p) {
    if (this.monTour()) this.dessinerCalque(this.case(p));
  }

  clic(p) {
    if (!this.monTour() || hud.fenetreOuverte()) return;
    const c = this.case(p);
    if (this.selection) {
      const comp = this.joueur.competences.find((k) => k.id === this.selection);
      const cible = comp.cible === 'soi' ? { x: this.joueur.x, y: this.joueur.y } : c;
      if (C.peutLancer(this.c, this.joueur, comp, cible.x, cible.y)) {
        this.selection = null;
        this.agir(() => {
          C.lancer(this.c, this.joueur, comp.id, cible.x, cible.y);
          if (comp.objet) this.etat.inventaire.fioles = this.joueur.fioles;
        });
      } else {
        this.selection = null;
        this.majUI();
      }
      return;
    }
    const carte = C.casesDeplacement(this.c, this.joueur);
    const n = carte.get(cle(c.x, c.y));
    if (n && n.cout > 0) this.agir(() => C.deplacer(this.c, this.joueur, c.x, c.y));
  }

  selectionner(id) {
    if (!this.monTour()) return;
    const comp = this.joueur.competences.find((k) => k.id === id);
    if (comp.cible === 'soi') {
      // Les compétences sur soi se lancent directement.
      if (C.peutLancer(this.c, this.joueur, comp, this.joueur.x, this.joueur.y)) {
        this.selection = null;
        this.agir(() => {
          C.lancer(this.c, this.joueur, id, this.joueur.x, this.joueur.y);
          if (comp.objet) this.etat.inventaire.fioles = this.joueur.fioles;
        });
      }
      return;
    }
    this.selection = this.selection === id ? null : id;
    this.majUI();
  }

  touche(ev) {
    if (hud.fenetreOuverte()) return;
    if (ev.code === 'Space') {
      ev.preventDefault();
      this.finTour();
    } else if (ev.key === 'Escape') {
      this.selection = null;
      this.majUI();
    } else if (/^[1-9]$/.test(ev.key)) {
      const comp = this.joueur.competences[Number(ev.key) - 1];
      if (comp) this.selectionner(comp.id);
    }
  }

  fuir() {
    if (!this.monTour()) return;
    this.agir(() => C.fuir(this.c, this.joueur)).then(() => {
      if (!this.c.fini) this.finTour();
    });
  }

  faveur() {
    if (!this.monTour() || this.faveurUtilisee) return;
    if (!depenser(this.etat, FACTIONS.troisieme.depense.cout)) return;
    this.faveurUtilisee = true;
    this.agir(() => C.invoquerAllie(this.c, this.joueur));
  }

  // ------------------------------------------------------------ Fin du combat

  terminer() {
    const etat = this.etat;
    const notes = [...this.notesApres];
    etat.inventaire.fioles = this.joueur.fioles;
    const res = this.c.fini;
    if (res === 'victoire') {
      const ennemis = this.c.unites.filter((u) => u.camp === 'ennemi');
      const passif = ESCOUADES[etat.escouade].passif;
      let butin = BUTIN_PAR_ENNEMI * ennemis.length + (ennemis.some((u) => u.boss) ? BUTIN_BOSS : 0);
      if (passif.id === 'avarice') butin = Math.round(butin * (1 + passif.params.butin));
      const g = gagner(etat, butin);
      notes.unshift({ type: 'texte', texte: g.bloque ? 'Victoire. (Pénitence : aucun gain.)' : `Victoire ! +${g.gain} ${factionDe(etat).ressource}.`, genre: 'succes' });
      for (const r of g.promotions) notes.push({ type: 'texte', texte: `Promotion : vous êtes désormais ${r} !`, genre: 'succes' });
      if (Math.random() < 0.3) {
        etat.inventaire.fioles += 1;
        notes.push({ type: 'texte', texte: 'Vous trouvez une fiole de soin.' });
      }
      if (this.params.rencontre) notes.push(...traiter(etat, { type: 'vaincre', rencontre: this.params.rencontre }));
    } else if (res === 'defaite') {
      retirer(etat, PERTE_DEFAITE);
      etat.position = { x: PNJ.contact.x, y: PNJ.contact.y + 1 };
      notes.unshift({ type: 'texte', texte: `Vaincu, vous vous réveillez près de votre contact (−${PERTE_DEFAITE} ${factionDe(etat).ressource}).`, genre: 'danger' });
    } else {
      notes.unshift({ type: 'texte', texte: 'Vous avez semé vos poursuivants.' });
    }
    sauvegarder(etat);
    hud.fermerCombat();
    this.scene.start('monde', { notes });
  }
}
