import { TitleScene } from './scenes/TitleScene.js';
import { WorldScene } from './scenes/WorldScene.js';
import { CombatScene } from './scenes/CombatScene.js';

const jeu = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'jeu',
  backgroundColor: '#0d0e13',
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  render: { antialias: true },
  scene: [TitleScene, WorldScene, CombatScene],
});

// Accès pratique depuis la console du navigateur (débogage).
window.jeu = jeu;
