// Affiche les notifications produites par le moteur de quêtes, le Voile et les combats.
import { ARMES } from '../data/weapons.js';
import { PNJ } from '../data/quests.js';
import { factionDe, idFaction } from '../systems/faction.js';
import * as hud from '../ui/hud.js';

export async function afficherNotes(scene, notes, nomPnj = null) {
  const etat = scene.etat;
  for (const n of notes) {
    switch (n.type) {
      case 'dialogue': {
        const def = PNJ[n.pnj];
        const nom = nomPnj ?? (typeof def.nom === 'string' ? def.nom : def.nom[idFaction(etat)]);
        await hud.dialogue(nom, n.lignes);
        break;
      }
      case 'debut':
        hud.toast(`Nouvelle quête : ${n.titre}`, 'succes');
        break;
      case 'etape':
        hud.toast(`Objectif : ${n.texte}`);
        break;
      case 'indice':
        hud.toast(n.bonus ? n.texte : `Indice trouvé. ${n.texte}`, n.bonus ? 'succes' : '');
        break;
      case 'terminee':
        hud.toast(`Quête terminée : ${n.titre}${n.gain ? ` (+${n.gain} ${factionDe(etat).ressource})` : ''}${n.fioles ? `, +${n.fioles} fiole${n.fioles > 1 ? 's' : ''}` : ''}`, 'succes');
        for (const r of n.promotions ?? []) hud.toast(`Promotion : vous êtes désormais ${r} !`, 'succes');
        break;
      case 'choixArme': {
        if (etat.arme2) break;
        const arme = await hud.choixArme(etat);
        etat.arme2 = arme;
        hud.toast(`Vous maniez désormais : ${ARMES[arme].nom}.`, 'succes');
        break;
      }
      case 'deduction_ok':
        hud.toast(n.texte, 'succes');
        break;
      case 'deduction_ko':
      case 'sanction':
      case 'penitence':
        hud.toast(n.texte, 'danger');
        break;
      case 'avertissement':
        hud.toast(`Attention : le Voile se déchire. Encore un peu et votre camp vous sanctionnera.`, 'danger');
        break;
      case 'texte':
        hud.toast(n.texte, n.genre ?? '');
        break;
    }
  }
}
