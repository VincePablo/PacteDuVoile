// Écran titre : fond animé du quartier, choix du camp puis de l'escouade (interface HTML).
import { QUARTIER, creerGrille } from '../data/maps.js';
import { charger, creerEtat, sauvegarder } from '../systems/state.js';
import { demarrer } from '../systems/quests.js';
import { ecranTitre, fermerEcran, viderTout } from '../ui/hud.js';
import { dessinerTerrain } from './rendu.js';
import { versEcran } from '../systems/iso.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('titre');
  }

  create() {
    viderTout();
    dessinerTerrain(this, creerGrille(QUARTIER.lignes));
    const centre = versEcran(12, 10);
    const cam = this.cameras.main;
    cam.centerOn(centre.x, centre.y);
    cam.setZoom(0.9);
    this.tweens.add({ targets: cam, scrollX: cam.scrollX + 120, duration: 20000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const sauvegarde = charger();
    ecranTitre({
      sauvegarde,
      onContinuer: () => this.lancer(sauvegarde),
      onNouvelle: (escouade) => {
        const etat = creerEtat(escouade);
        demarrer(etat, 'tutoriel');
        sauvegarder(etat);
        this.lancer(etat);
      },
    });
  }

  lancer(etat) {
    fermerEcran();
    this.registry.set('etat', etat);
    this.scene.start('monde', { notes: [] });
  }
}
