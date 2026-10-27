// Interface en HTML par-dessus le canevas Phaser : écran titre, HUD, dialogues, fenêtres, barre de combat.
import { ARMES, PORTEES, ROLES, STATS } from '../data/weapons.js';
import { ESCOUADES, FACTIONS, texte } from '../data/factions.js';
import { QUETES } from '../data/quests.js';
import { factionDe, nomRang, prochainSeuil } from '../systems/faction.js';
import { estNuit, DUREE_DEMI_CYCLE } from '../systems/state.js';
import { texteEtape } from '../systems/quests.js';
import { OBJETS, INDICE_BONUS } from '../data/quests.js';

const racine = () => document.getElementById('ui');

export function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat(Infinity)) if (e != null && e !== false) n.append(e instanceof Node ? e : document.createTextNode(String(e)));
  return n;
}

function couche(nom) {
  let c = racine().querySelector(`[data-couche="${nom}"]`);
  if (!c) {
    c = el('div', { 'data-couche': nom, style: 'position:absolute;inset:0;pointer-events:none' });
    racine().append(c);
  }
  return c;
}
const remplir = (nom, ...enfants) => {
  const c = couche(nom);
  c.replaceChildren(...enfants);
  for (const e of c.children) e.style.pointerEvents = 'auto';
  return c;
};
export const viderCouche = (nom) => couche(nom).replaceChildren();
export function viderTout() {
  racine().replaceChildren();
}

export function definirFaction(faction) {
  document.documentElement.dataset.faction = faction || '';
}

// ---------------------------------------------------------------- Descriptions

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

export function decrireCompetence(comp) {
  if (comp.pouvoir) return texte(comp);
  if (comp.objet) return `Soigne ${comp.effets.heal} PV.`;
  const e = comp.effets;
  const morceaux = [];
  if (e.dmg) morceaux.push(`${e.dmg} dégâts${e.zone ? ` en zone (rayon ${e.zone})` : ''}`);
  if (e.dot) morceaux.push(`+${e.dot.dmg} dégâts par tour pendant ${pluriel(e.dot.tours, 'tour')}`);
  if (e.heal) morceaux.push(`soigne ${e.heal} PV`);
  if (e.hot) morceaux.push(`soigne ${e.hot.soin} PV par tour pendant ${pluriel(e.hot.tours, 'tour')}`);
  if (e.bouclier) morceaux.push(`bouclier de ${e.bouclier}`);
  if (e.drain) morceaux.push(`vole ${Math.round(e.drain * 100)} % des dégâts en PV`);
  if (e.coutPV) morceaux.push(`coûte ${e.coutPV} PV`);
  if (e.etourdit) morceaux.push(`étourdit ${pluriel(e.etourdit, 'tour')}`);
  if (e.immobilise) morceaux.push(`immobilise ${pluriel(e.immobilise, 'tour')}`);
  if (e.recul) morceaux.push(`repousse de ${e.recul} cases`);
  if (e.attire) morceaux.push('attire la cible au contact');
  if (e.manipule) morceaux.push('la cible frappe l’un de ses alliés à son prochain tour');
  if (e.affaiblit) morceaux.push(`la cible fait −${e.affaiblit.pct} % de dégâts (${pluriel(e.affaiblit.tours, 'tour')})`);
  if (e.vulnerable) morceaux.push(`la cible subit +${e.vulnerable.pct} % de dégâts (${pluriel(e.vulnerable.tours, 'tour')})`);
  if (e.aveugle) morceaux.push(`aveugle : 50 % d’échec (${pluriel(e.aveugle, 'tour')})`);
  if (e.provoque) morceaux.push(`provoque : la cible doit vous attaquer (${pluriel(e.provoque, 'tour')})`);
  if (e.buff) morceaux.push(`+${e.buff.pct} % de dégâts (${pluriel(e.buff.tours, 'tour')})`);
  if (e.parade) morceaux.push(`−${e.parade.pct} % de dégâts reçus (${pluriel(e.parade.tours, 'tour')})`);
  if (e.pm) morceaux.push(`+${e.pm} PM`);
  if (e.purifie) morceaux.push('retire les malus');
  if (e.critDos) morceaux.push(`+${Math.round(e.critDos * 100)} % de critique de dos`);
  if (e.dosMult) morceaux.push(`×${e.dosMult} de dos`);
  if (e.falloff) morceaux.push(`−50 % au-delà de ${e.falloff} cases`);
  if (e.ignoreBouclier) morceaux.push('ignore les boucliers');
  const phrase = morceaux.join(', ');
  return phrase.charAt(0).toUpperCase() + phrase.slice(1) + '.';
}

function ficheCompetence(comp) {
  const portee = comp.cible === 'soi' ? 'Sur soi' : `Portée ${comp.portee.min}–${comp.portee.max}`;
  return [
    el('b', {}, comp.nom),
    el('div', {}, `${comp.pa} PA · ${portee}${comp.recharge ? ` · recharge ${comp.recharge}` : ''}`),
    el('div', {}, decrireCompetence(comp)),
    el('div', { style: 'color:var(--texte-doux);margin-top:4px' }, `Bruit ${comp.bruit ?? 0} · Surnaturel ${comp.surnat ?? 0}`),
  ];
}

function resumeArme(id) {
  const a = ARMES[id];
  return `${PORTEES[a.portee].nom} · ${ROLES[a.role].nom}`;
}

// ---------------------------------------------------------------- Écran titre

export function ecranTitre({ sauvegarde, onContinuer, onNouvelle }) {
  definirFaction(null);
  const accueil = () =>
    remplir(
      'ecran',
      el('div', { class: 'ecran' },
        el('h1', {}, 'Sous le Voile'),
        el('p', { class: 'sous-titre' }, 'Anges, démons et créatures oubliées se disputent un quartier ordinaire. Une seule règle les unit : les humains ne doivent jamais savoir.'),
        el('div', { class: 'actions' },
          sauvegarde && el('button', { class: 'btn principal', onclick: onContinuer }, `Continuer (${ESCOUADES[sauvegarde.escouade].nom})`),
          el('button', { class: sauvegarde ? 'btn' : 'btn principal', onclick: choixFaction }, 'Nouvelle partie'),
        ),
        el('p', { class: 'sous-titre', style: 'margin-top:28px;font-size:0.85rem' }, 'Cliquez pour vous déplacer. Combat au tour par tour : 6 PA et 3 PM par tour.'),
      ),
    );

  const choixFaction = () =>
    remplir(
      'ecran',
      el('div', { class: 'ecran' },
        el('button', { class: 'lien-retour', onclick: accueil }, '← Retour'),
        el('h2', { class: 'titre' }, 'Choisissez votre camp'),
        el('div', { class: 'cartes trois' },
          Object.entries(FACTIONS).map(([id, f]) =>
            el('button', { class: 'carte', 'data-faction': id, onclick: () => choixEscouade(id) },
              el('h3', {}, f.nom),
              el('div', { class: 'meta' }, f.objectif),
              el('p', {}, f.desc),
              el('dl', {},
                el('dt', {}, 'Ressource'), el('dd', {}, f.ressource),
                el('dt', {}, 'Caractéristiques'), el('dd', {}, `${f.pointsStats} points`),
                el('dt', {}, 'Voile'), el('dd', {}, `avertissement à ${f.voile.avertissement}, sanction à ${f.voile.sanction}`),
                el('dt', {}, 'Sanction'), el('dd', {}, f.sanction),
              ),
            ),
          ),
        ),
      ),
    );

  const choixEscouade = (faction) => {
    definirFaction(faction);
    remplir(
      'ecran',
      el('div', { class: 'ecran' },
        el('button', { class: 'lien-retour', onclick: () => { definirFaction(null); choixFaction(); } }, '← Changer de camp'),
        el('h2', { class: 'titre' }, `${FACTIONS[faction].nom} : choisissez votre escouade`),
        el('div', { class: 'cartes quatre' },
          Object.entries(ESCOUADES)
            .filter(([, e]) => e.faction === faction)
            .map(([id, e]) =>
              el('button', { class: 'carte', onclick: () => onNouvelle(id) },
                el('h3', {}, e.nom),
                el('div', { class: 'meta' }, e.titre),
                el('span', { class: 'pastille accent' }, ARMES[e.arme].nom),
                el('span', { class: 'pastille' }, resumeArme(e.arme)),
                el('dl', {},
                  el('dt', {}, 'Passif'), el('dd', {}, `${e.passif.nom} : ${texte(e.passif)}`),
                  el('dt', {}, 'Pouvoir'), el('dd', {}, `${e.pouvoir.nom} : ${texte(e.pouvoir)}`),
                  el('dt', {}, 'Surnaturel'), el('dd', {}, e.surnat),
                  el('dt', {}, 'Stats'), el('dd', {}, Object.entries(e.stats).map(([k, v]) => `${STATS[k].slice(0, 3)} ${v}`).join(' · ')),
                ),
              ),
            ),
        ),
      ),
    );
  };
  accueil();
}

export const fermerEcran = () => viderCouche('ecran');

// ---------------------------------------------------------------- HUD d'exploration

export function hudMonde(etat, { onJournal, onPouvoir, pouvoirHorsCombat } = {}) {
  const f = factionDe(etat);
  const esc = ESCOUADES[etat.escouade];
  definirFaction(esc.faction);
  const seuil = prochainSeuil(etat);
  const nuit = estNuit(etat);
  const minutes = Math.floor((DUREE_DEMI_CYCLE - (etat.horloge % DUREE_DEMI_CYCLE)) / 60);
  const actives = Object.keys(etat.quetes.actives).filter((id) => !(QUETES[id].etapes[etat.quetes.actives[id].etape]?.type === 'quete'));
  const pctVoile = etat.voile.dechirure;

  remplir(
    'hud',
    el('div', { class: 'hud-haut' },
      el('div', { class: 'bloc identite' },
        el('div', { class: 'nom' }, `${esc.nom}${etat.arme2 ? '' : ''}`),
        el('div', { class: 'rang' }, `${nomRang(etat)} · ${ARMES[esc.arme].nom}${etat.arme2 ? ` + ${ARMES[etat.arme2].nom}` : ''}`),
        etat.penitence && el('div', { class: 'penitence' }, 'En pénitence'),
      ),
      el('div', { class: 'bloc jauge' },
        el('div', { class: 'libelle' }, el('span', {}, f.ressource), el('span', {}, seuil ? `${etat.ressource.points} / ${seuil}` : `${etat.ressource.points}`)),
        el('div', { class: 'barre' }, el('div', { class: 'remplissage', style: `width:${seuil ? Math.min(100, (etat.ressource.points / seuil) * 100) : 100}%` })),
      ),
      el('div', { class: 'bloc jauge', title: `Avertissement à ${f.voile.avertissement}, sanction à ${f.voile.sanction}` },
        el('div', { class: 'libelle' }, el('span', {}, 'Déchirure du Voile'), el('span', {}, `${Math.round(pctVoile)}`)),
        el('div', { class: 'barre' },
          el('div', { class: 'remplissage voile', style: `width:${pctVoile}%` }),
          el('div', { class: 'repere', style: `left:${f.voile.avertissement}%` }),
          el('div', { class: 'repere', style: `left:${f.voile.sanction}%;background:var(--danger)` }),
        ),
      ),
      el('div', { class: 'bloc horloge' }, `${nuit ? '☾ Nuit' : '☀ Jour'} · encore ${minutes + 1} min`, el('br'), `Fioles : ${etat.inventaire.fioles}`),
      el('div', { class: 'bloc suivi' },
        el('h4', {}, 'Quêtes'),
        actives.length
          ? actives.map((id) => el('div', { class: 'quete' }, el('b', {}, `${QUETES[id].titre} (${libelleType(QUETES[id].type)})`), el('span', {}, texteEtape(etat, id))))
          : el('div', { class: 'quete' }, el('span', {}, 'Aucune quête en cours. La ruelle cache encore des créatures…')),
      ),
    ),
    el('div', { class: 'hud-bas' },
      el('button', { class: 'btn petit', onclick: onJournal }, 'Journal (J)'),
      pouvoirHorsCombat && el('button', { class: 'btn petit', onclick: onPouvoir, disabled: !pouvoirHorsCombat.pret }, pouvoirHorsCombat.libelle),
    ),
  );
}

const libelleType = (t) => ({ action: 'action', enquete: 'enquête', filrouge: 'fil rouge' })[t] ?? t;

// ---------------------------------------------------------------- Messages et fenêtres

export function toast(texte, genre = '') {
  let zone = racine().querySelector('.toasts');
  if (!zone) {
    zone = el('div', { class: 'toasts' });
    racine().append(zone);
  }
  const t = el('div', { class: `toast ${genre}` }, texte);
  zone.append(t);
  setTimeout(() => t.remove(), 4200);
}

export function dialogue(nom, lignes) {
  return new Promise((resolve) => {
    let i = 0;
    const suivant = () => {
      i += 1;
      if (i >= lignes.length) {
        document.removeEventListener('keydown', clavier);
        viderCouche('dialogue');
        resolve();
      } else afficher();
    };
    const clavier = (ev) => {
      if (ev.key === ' ' || ev.key === 'Enter' || ev.key === 'Escape') {
        ev.preventDefault();
        suivant();
      }
    };
    const afficher = () =>
      remplir('dialogue', el('div', { class: 'dialogue', onclick: suivant, role: 'dialog' },
        el('div', { class: 'qui' }, nom),
        el('div', { class: 'ligne' }, lignes[i]),
        el('div', { class: 'suite' }, i < lignes.length - 1 ? 'Cliquer pour continuer ▸' : 'Cliquer pour fermer'),
      ));
    if (!lignes?.length) return resolve();
    document.addEventListener('keydown', clavier);
    afficher();
  });
}

function fenetre(titre, contenu, { large = false, fermable = true, onFermer } = {}) {
  const fermer = () => {
    viderCouche('fenetre');
    onFermer?.();
  };
  remplir('fenetre', el('div', { class: 'voile-fond', onclick: (e) => fermable && e.target === e.currentTarget && fermer() },
    el('div', { class: `fenetre${large ? ' large' : ''}`, role: 'dialog' },
      el('h2', {}, titre),
      contenu,
      fermable && el('div', { class: 'actions' }, el('button', { class: 'btn', onclick: fermer }, 'Fermer')),
    ),
  ));
  return fermer;
}
export const fenetreOuverte = () => couche('fenetre').children.length > 0 || couche('dialogue').children.length > 0;

export function deduction(etat, etape, restantes) {
  return new Promise((resolve) => {
    const indices = etat.quetes.indices.filter((o) => OBJETS[o] && !OBJETS[o].penitence);
    const bonus = ['gabriel', 'sorciers', 'asmodee'].includes(etat.escouade);
    fenetre(etape.question, [
      el('p', { style: 'color:var(--texte-doux);margin-top:0' }, `Vos indices (${restantes} tentative${restantes > 1 ? 's' : ''} restante${restantes > 1 ? 's' : ''}) :`),
      el('ul', { class: 'indices' },
        indices.map((o) => el('li', {}, el('b', {}, OBJETS[o].nom), ' : ', OBJETS[o].indice)),
        bonus && el('li', { class: 'bonus' }, INDICE_BONUS),
      ),
      el('div', { class: 'choix' }, etape.choix.map((c) => el('button', { onclick: () => { viderCouche('fenetre'); resolve(c.id); } }, c.texte))),
    ], { fermable: true, onFermer: () => resolve(null) });
  });
}

export function choixArme(etat) {
  return new Promise((resolve) => {
    const imposee = ARMES[ESCOUADES[etat.escouade].arme];
    const parPortee = Object.keys(PORTEES).map((p) => [p, Object.entries(ARMES).filter(([id, a]) => a.portee === p && id !== ESCOUADES[etat.escouade].arme)]);
    fenetre('Choisissez votre seconde arme', [
      el('p', { style: 'margin-top:0;color:var(--texte-doux)' },
        `Votre arme imposée : ${imposee.nom} (${resumeArme(ESCOUADES[etat.escouade].arme)}). Les armes en surbrillance couvrent une portée et un rôle que vous n’avez pas encore.`),
      parPortee.map(([p, armes]) => [
        el('h3', { style: 'margin:14px 0 8px;font-size:1rem' }, PORTEES[p].nom),
        el('div', { class: 'armes-choix' },
          armes.map(([id, a]) => {
            const recommande = a.portee !== imposee.portee && a.role !== imposee.role;
            return el('button', { class: `carte${recommande ? ' recommande' : ''}`, onclick: () => { viderCouche('fenetre'); resolve(id); } },
              el('h3', {}, a.nom),
              el('div', { class: 'meta' }, `${ROLES[a.role].nom}${a.magie ? ' · magie' : ''}`),
              el('p', {}, a.desc),
              el('ul', { class: 'competences' }, a.competences.map((c) => el('li', {}, `${c.nom} (${c.pa} PA) : ${decrireCompetence(c)}`))),
            );
          }),
        ),
      ]),
    ], { large: true, fermable: false });
  });
}

export function journal(etat) {
  const actives = Object.keys(etat.quetes.actives);
  const indices = etat.quetes.indices.filter((o) => OBJETS[o]);
  fenetre('Journal', [
    el('h3', { style: 'margin:0 0 8px;font-size:1rem' }, 'En cours'),
    actives.length ? actives.map((id) => el('div', { class: 'carte', style: 'margin-bottom:8px' },
      el('h3', {}, QUETES[id].titre), el('div', { class: 'meta' }, libelleType(QUETES[id].type)), el('p', {}, QUETES[id].resume), el('p', {}, el('b', {}, 'Objectif : '), texteEtape(etat, id)))) : el('p', {}, 'Rien pour le moment.'),
    indices.length > 0 && [el('h3', { style: 'margin:14px 0 8px;font-size:1rem' }, 'Indices'), el('ul', { class: 'indices' }, indices.map((o) => el('li', {}, el('b', {}, OBJETS[o].nom), ' : ', OBJETS[o].indice)))],
    etat.quetes.terminees.length > 0 && [el('h3', { style: 'margin:14px 0 8px;font-size:1rem' }, 'Terminées'), el('p', {}, etat.quetes.terminees.map((id) => QUETES[id].titre).join(' · '))],
    el('h3', { style: 'margin:14px 0 8px;font-size:1rem' }, 'Le Pacte du Voile'),
    el('p', { style: 'font-size:0.9rem' }, `Chaque action surnaturelle vue par un témoin déchire le Voile. ${factionDe(etat).sanction} Le bruit attire les regards : les armes humaines ne déchirent rien, mais un coup de fusil fait tourner les têtes. La nuit, les rues sont moins fréquentées.`),
  ]);
}

export function boutique(etat, { prix, onAcheter }) {
  const maj = () => fenetre('Le prêteur sur gages', [
    el('p', {}, `Corruption disponible : ${etat.ressource.points}. Fioles : ${etat.inventaire.fioles}.`),
    el('div', { class: 'choix' }, el('button', { onclick: () => { onAcheter(); maj(); }, disabled: etat.ressource.points < prix || etat.penitence }, `Fiole de soin (+30 PV) : ${prix} Corruption`)),
  ]);
  maj();
}

// ---------------------------------------------------------------- Combat

export function barreCombat({ c, joueur, selection, monTour, options, handlers }) {
  const comps = joueur.competences;
  let touche = 0;
  remplir(
    'combat',
    el('div', { class: 'ordre' }, c.ordre.map((u) => el('div', { class: `u${u === c.ordre[c.index] ? ' actif' : ''}${u.vivant ? '' : ' mort'}` }, u.principal ? 'Vous' : u.nom))),
    el('div', { class: 'barre-combat' },
      el('div', { class: 'etat-combat' },
        el('span', { class: 'pv' }, `PV ${joueur.pv}/${joueur.pvMax}${joueur.bouclier ? ` (+${joueur.bouclier})` : ''}`),
        el('span', { class: 'pa' }, `PA ${joueur.pa}`),
        el('span', { class: 'pm' }, `PM ${joueur.pm}`),
        el('span', {}, `Tour ${c.tour}`),
        options.temoins > 0 && el('span', { style: 'color:var(--danger)' }, `${options.temoins} témoin${options.temoins > 1 ? 's' : ''}`),
        el('button', { class: 'btn petit principal', onclick: handlers.onFin, disabled: !monTour }, 'Fin du tour (Espace)'),
        options.fuite && el('button', { class: 'btn petit', onclick: handlers.onFuir, disabled: !monTour }, 'Fuir'),
        options.faveur && el('button', { class: 'btn petit', onclick: handlers.onFaveur, disabled: !monTour || !options.faveur.possible }, `Faveur (${options.faveur.cout} Renommée)`),
      ),
      el('div', { class: 'competences-combat' },
        comps.map((k) => {
          touche += 1;
          const recharge = joueur.recharges[k.id] || 0;
          const indispo = !monTour || k.pa > joueur.pa || recharge > 0 || (k.objet && joueur.fioles <= 0) || (k.unique && joueur.utilise[k.id]) || (k.id === 'molonLabe' && joueur.pv >= joueur.pvMax * k.params.seuil);
          return el('button', {
            class: `competence${selection === k.id ? ' active' : ''}${k.pouvoir ? ' pouvoir' : ''}`,
            disabled: indispo,
            onclick: () => handlers.onSelection(k.id),
            'aria-label': k.nom,
          },
            el('div', { class: 'nom-c' }, k.objet ? `${k.nom} ×${joueur.fioles}` : k.nom),
            el('div', { class: 'arme-c' }, k.pouvoir ? 'Pouvoir' : k.objet ? 'Objet' : ARMES[k.armeId]?.nom ?? ''),
            el('span', { class: 'cout' }, k.pa),
            touche <= 9 && el('span', { class: 'touche' }, touche),
            recharge > 0 && el('div', { class: 'recharge' }, recharge),
            el('div', { class: 'infobulle' }, ficheCompetence(k)),
          );
        }),
      ),
    ),
  );
}

export function journalCombat(lignes) {
  remplir('journal-combat', el('div', { class: 'journal-combat' }, lignes.slice(-14).map((l) => el('div', {}, l))));
}

export function fermerCombat() {
  viderCouche('combat');
  viderCouche('journal-combat');
}
