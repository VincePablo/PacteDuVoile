// Moteur de quêtes piloté par les données (src/data/quests.js).
// traiter(etat, evenement) fait avancer les quêtes actives et retourne des notifications pour l'interface :
//   {type:'dialogue', pnj, lignes} {type:'etape', quete, texte} {type:'indice', texte} {type:'deduction', quete, etape}
//   {type:'terminee', quete, titre, gain, promotions} {type:'choixArme'} {type:'debut', quete, titre}
import { BONUS_INDICE, ESCOUADES } from '../data/factions.js';
import { INDICE_BONUS, OBJETS, QUETES } from '../data/quests.js';
import { gagner } from './faction.js';

export function creerEtatQuetes() {
  return { actives: {}, terminees: [], indices: [], vaincues: [] };
}

// Résout un texte à variantes (chaîne, tableau, fonction ou objet { escouade, faction, defaut }).
export function variante(v, etat) {
  if (v == null) return v;
  if (typeof v === 'function') return v(etat);
  if (typeof v === 'string' || Array.isArray(v)) return v;
  const faction = ESCOUADES[etat.escouade].faction;
  return variante(v[etat.escouade] ?? v[faction] ?? v.defaut, etat);
}

export const estActive = (etat, id) => !!etat.quetes.actives[id];
export const estTerminee = (etat, id) => etat.quetes.terminees.includes(id);

export function etapeCourante(etat, id) {
  const q = etat.quetes.actives[id];
  return q ? QUETES[id].etapes[q.etape] : null;
}

export function texteEtape(etat, id) {
  const e = etapeCourante(etat, id);
  if (!e) return '';
  if (e.type === 'vaincre' && e.rencontres.length > 1) {
    const faites = e.rencontres.filter((r) => etat.quetes.vaincues.includes(r)).length;
    return `${variante(e.texte, etat)} (${faites}/${e.rencontres.length})`;
  }
  if (e.type === 'examiner' && e.objets.length > 1) {
    const faits = e.objets.filter((o) => etat.quetes.indices.includes(o)).length;
    return `${variante(e.texte, etat)} (${faits}/${e.objets.length})`;
  }
  return variante(e.texte, etat);
}

export function demarrer(etat, id) {
  if (estActive(etat, id) || estTerminee(etat, id)) return [];
  etat.quetes.actives[id] = { etape: 0, tentatives: QUETES[id].etapes.find((e) => e.type === 'deduire')?.tentatives ?? 0, rate: false };
  const notes = [{ type: 'debut', quete: id, titre: QUETES[id].titre }];
  return notes.concat(entrerEtape(etat, id));
}

// La pénitence peut revenir à chaque faute : on la réinitialise avant de la relancer.
export function demarrerPenitence(etat) {
  if (estActive(etat, 'penitence')) return [];
  etat.quetes.terminees = etat.quetes.terminees.filter((q) => q !== 'penitence');
  const objets = QUETES.penitence.etapes.flatMap((e) => e.objets ?? []);
  etat.quetes.indices = etat.quetes.indices.filter((o) => !objets.includes(o));
  return demarrer(etat, 'penitence');
}

// Effets automatiques à l'entrée d'une étape (sous-quête, conditions déjà remplies).
function entrerEtape(etat, id) {
  const e = etapeCourante(etat, id);
  if (!e) return [];
  const notes = [{ type: 'etape', quete: id, texte: texteEtape(etat, id) }];
  if (e.type === 'quete') return notes.concat(demarrer(etat, e.id));
  if (e.type === 'examiner' && e.objets.every((o) => etat.quetes.indices.includes(o))) return notes.concat(avancer(etat, id));
  if (e.type === 'vaincre' && e.rencontres.every((r) => etat.quetes.vaincues.includes(r))) return notes.concat(avancer(etat, id));
  return notes;
}

function avancer(etat, id) {
  const q = etat.quetes.actives[id];
  q.etape += 1;
  if (q.etape >= QUETES[id].etapes.length) return terminer(etat, id);
  return entrerEtape(etat, id);
}

function terminer(etat, id) {
  const def = QUETES[id];
  const q = etat.quetes.actives[id];
  delete etat.quetes.actives[id];
  etat.quetes.terminees.push(id);
  const montant = Math.round((def.recompense?.ressource ?? 0) * (q.rate ? 0.5 : 1));
  if (def.penitence) etat.penitence = false;
  const { gain, promotions } = gagner(etat, montant);
  etat.inventaire.fioles += def.recompense?.fioles ?? 0;
  const notes = [{ type: 'terminee', quete: id, titre: def.titre, gain, promotions, fioles: def.recompense?.fioles ?? 0 }];
  if (def.choixArme && !etat.arme2) notes.push({ type: 'choixArme' });
  // Une quête parente qui attendait celle-ci avance.
  for (const parent in etat.quetes.actives) {
    const e = etapeCourante(etat, parent);
    if (e?.type === 'quete' && e.id === id) notes.push(...avancer(etat, parent));
  }
  if (def.suite) notes.push(...demarrer(etat, def.suite));
  return notes;
}

export function traiter(etat, evt) {
  const notes = [];
  if (evt.type === 'examiner' && !etat.quetes.indices.includes(evt.objet)) {
    // Un objet n'est utile que si une quête l'attend : sinon on le laisse pour plus tard.
    const attendu = Object.keys(etat.quetes.actives).some((id) => etapeCourante(etat, id)?.objets?.includes(evt.objet));
    if (attendu) {
      etat.quetes.indices.push(evt.objet);
      notes.push({ type: 'indice', texte: `${OBJETS[evt.objet].nom} : ${OBJETS[evt.objet].indice}` });
    }
  }
  if (evt.type === 'vaincre' && !etat.quetes.vaincues.includes(evt.rencontre)) etat.quetes.vaincues.push(evt.rencontre);

  for (const id of Object.keys(etat.quetes.actives)) {
    const e = etapeCourante(etat, id);
    if (!e) continue;
    switch (e.type) {
      case 'parler':
        if (evt.type === 'parler' && evt.pnj === e.pnj) {
          notes.push({ type: 'dialogue', pnj: e.pnj, lignes: variante(e.dialogue, etat) || [] });
          notes.push(...avancer(etat, id));
        }
        break;
      case 'aller':
        if (evt.type === 'aller' && evt.zone === e.zone) notes.push(...avancer(etat, id));
        break;
      case 'vaincre':
        if (evt.type === 'vaincre' && e.rencontres.every((r) => etat.quetes.vaincues.includes(r))) notes.push(...avancer(etat, id));
        else if (evt.type === 'vaincre' && e.rencontres.includes(evt.rencontre)) notes.push({ type: 'etape', quete: id, texte: texteEtape(etat, id) });
        break;
      case 'examiner':
        if (evt.type === 'examiner' && e.objets.includes(evt.objet)) {
          if (e.objets.every((o) => etat.quetes.indices.includes(o))) {
            if (QUETES[id].type === 'enquete' && BONUS_INDICE.includes(etat.escouade)) notes.push({ type: 'indice', texte: INDICE_BONUS, bonus: true });
            notes.push(...avancer(etat, id));
          } else notes.push({ type: 'etape', quete: id, texte: texteEtape(etat, id) });
        }
        break;
      case 'deduire':
        if (evt.type === 'parler' && evt.pnj === 'notaire' && id === 'notaire') notes.push({ type: 'deduction', quete: id, etape: e });
        if (evt.type === 'deduire' && evt.quete === id) notes.push(...repondre(etat, id, e, evt.choix));
        break;
      case 'influencer':
        if (evt.type === 'parler' && evt.pnj === e.pnj) {
          notes.push({ type: 'dialogue', pnj: e.pnj, lignes: variante(e.dialogue, etat) || [] });
          notes.push(...avancer(etat, id));
        }
        break;
    }
  }
  return notes;
}

function repondre(etat, id, e, choix) {
  const q = etat.quetes.actives[id];
  if (choix === e.reponse) return [{ type: 'deduction_ok', texte: 'Vous avez vu juste.' }, ...avancer(etat, id)];
  q.tentatives -= 1;
  if (q.tentatives <= 0) {
    q.rate = true;
    return [{ type: 'deduction_ko', texte: 'Vous n’avez plus de tentatives. La vérité finit par éclater d’elle-même, mais votre récompense sera réduite de moitié.' }, ...avancer(etat, id)];
  }
  return [{ type: 'deduction_ko', texte: `Ce n’est pas ça. Il vous reste ${q.tentatives} tentative${q.tentatives > 1 ? 's' : ''}.`, restantes: q.tentatives }];
}

// Rencontres visibles dans le monde : liées à une étape « vaincre » en cours, ou répétables.
export function rencontreDisponible(etat, marqueurId, marqueur) {
  if (marqueur.repetable) return !!etat.arme2;
  if (etat.quetes.vaincues.includes(marqueur.rencontre)) return false;
  const e = etapeCourante(etat, marqueur.quete);
  return e?.type === 'vaincre' && e.rencontres.includes(marqueur.rencontre);
}

export function objetDisponible(etat, objetId) {
  if (etat.quetes.indices.includes(objetId)) return false;
  return Object.keys(etat.quetes.actives).some((id) => etapeCourante(etat, id)?.objets?.includes(objetId));
}
