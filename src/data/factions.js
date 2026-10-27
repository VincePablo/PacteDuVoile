// Factions, escouades, ressources et Pacte du Voile.
// Noms issus de la tradition religieuse, de la démonologie publique (Binsfeld, 1589) et de la mythologie ;
// la caractérisation est originale. Remplacez ce fichier pour changer d'univers.

export const SEUILS_RANG = [0, 40, 100, 180, 280];

export const FACTIONS = {
  anges: {
    nom: 'Anges',
    couleur: 0xf2d16b,
    objectif: 'Libérer les humains de leurs péchés.',
    desc: 'Plus puissants, mais le Pacte du Voile les punit durement. Chaque faute coûte de la Grâce, qui est aussi leur progression.',
    pointsStats: 26,
    ressource: 'Grâce',
    gainMult: 0.8,
    voile: { avertissement: 30, sanction: 60 },
    sanction: 'Blâme : −25 Grâce. À 0 Grâce : pénitence (progression bloquée, −1 à toutes les caractéristiques).',
    rangs: ['Ange', 'Archange', 'Principauté', 'Puissance', 'Vertu'],
    depense: { id: 'miracle', nom: 'Miracle', cout: 20, desc: 'Se relever à 50 % des PV, une fois par combat.' },
  },
  demons: {
    nom: 'Démons',
    couleur: 0xc0392b,
    objectif: 'Corrompre les humains.',
    desc: 'Caractéristiques normales, mais une grande latitude face au Voile. La Corruption rapporte promotions et butin.',
    pointsStats: 22,
    ressource: 'Corruption',
    gainMult: 1.25,
    voile: { avertissement: 60, sanction: 90 },
    sanction: 'Amende : −15 Corruption. Si vous ne pouvez pas payer : rétrogradation d’un grade.',
    rangs: ['Diablotin', 'Tourmenteur', 'Tentateur', 'Baron', 'Duc'],
    depense: { id: 'marche', nom: 'Marché infernal', cout: 10, desc: 'Acheter une fiole de soin.' },
  },
  troisieme: {
    nom: '3e Force',
    couleur: 0x5dade2,
    objectif: 'Chaque escouade suit son propre agenda.',
    desc: 'Créatures mythologiques indépendantes, parfois rivales. Une exposition attire les chasseurs des deux camps.',
    pointsStats: 24,
    ressource: 'Renommée',
    gainMult: 1.0,
    voile: { avertissement: 45, sanction: 75 },
    sanction: 'Une patrouille d’anges et de démons vous prend en chasse.',
    rangs: null, // propres à chaque escouade
    depense: { id: 'faveur', nom: 'Faveur', cout: 15, desc: 'Faire venir un allié pour un combat.' },
  },
};

const pct = (x) => `${Math.round(x * 100)} %`;

// passif.desc et pouvoir.desc sont des fonctions des paramètres : texte(passif) les affiche.
export const texte = (capacite) => capacite.desc(capacite.params);

// passif.id et pouvoir.id sont interprétés par src/systems/combat.js (et voile.js / quests.js pour le hors combat).
export const ESCOUADES = {
  // ---------- Anges ----------
  matthias: {
    faction: 'anges', nom: 'Matthias', titre: 'l’élu par le sort', arme: 'hache', surnat: 'Faible',
    stats: { force: 8, agilite: 6, volonte: 5, perception: 7 },
    passif: { id: 'elu', params: { critParTour: 0.1 }, nom: 'Élu', desc: (p) => `+${pct(p.critParTour)} de critique, cumulable à chaque tour sans critique.` },
    pouvoir: { id: 'tirage', params: { buff: 40, pa: 3, soin: 0.3 }, nom: 'Tirage au sort', pa: 1, recharge: 4, cible: 'soi', surnat: 1, desc: (p) => `Un buff aléatoire parmi 3 : +${p.buff} % de dégâts, +${p.pa} PA ou soin de ${pct(p.soin)}.` },
    briefing: 'Le sort m’a désigné, comme il t’a désigné. Ne discute pas les dés, petit : lance-les.',
  },
  gabriel: {
    faction: 'anges', nom: 'Gabriel', titre: 'le messager', arme: 'arc', surnat: 'Faible',
    stats: { force: 5, agilite: 7, volonte: 6, perception: 8 },
    passif: { id: 'annonciation', params: {}, nom: 'Annonciation', desc: () => '+1 indice décisif par enquête.' },
    pouvoir: { id: 'messageDivin', params: { pa: 2, vulnerable: 15 }, nom: 'Message divin', pa: 2, recharge: 4, cible: 'ennemi', portee: { min: 1, max: 8 }, surnat: 1, desc: (p) => `+${p.pa} PA pour soi et marque la cible (+${p.vulnerable} % de dégâts reçus, 2 tours).` },
    briefing: 'J’ai un message pour toi, et il est simple : écoute avant de frapper.',
  },
  raphael: {
    faction: 'anges', nom: 'Raphaël', titre: 'le guérisseur', arme: 'lumiere', surnat: 'Élevé',
    stats: { force: 5, agilite: 6, volonte: 9, perception: 6 },
    passif: { id: 'mainGuerisseuse', params: { soins: 0.15 }, nom: 'Main guérisseuse', desc: (p) => `Soins +${pct(p.soins)}.` },
    pouvoir: { id: 'oubliBeni', params: { dechirure: 15 }, nom: 'Oubli béni', pa: 2, recharge: 4, cible: 'soi', surnat: 0, unique: true, desc: (p) => `Un témoin oublie ce qu’il a vu : −${p.dechirure} de Déchirure. Une fois par combat.` },
    briefing: 'On ne guérit pas une ville en la brûlant. Soigne, et fais oublier.',
  },
  uriel: {
    faction: 'anges', nom: 'Uriel', titre: 'le feu de Dieu', arme: 'sniper', surnat: 'Moyen',
    stats: { force: 5, agilite: 7, volonte: 6, perception: 8 },
    passif: { id: 'justice', params: { bonus: 0.05 }, nom: 'Justice', desc: (p) => `+${pct(p.bonus)} de dégâts sur les créatures qui s’en prennent aux humains.` },
    pouvoir: { id: 'flammeUriel', params: { dmg: 18 }, nom: 'Flamme d’Uriel', pa: 2, recharge: 4, cible: 'ennemi', portee: { min: 2, max: 8 }, surnat: 2, desc: (p) => `Un tir de ${p.dmg} dégâts qui ignore les boucliers.` },
    briefing: 'La justice se rend de loin, proprement. Un tir, un coupable.',
  },

  // ---------- Démons ----------
  lucifer: {
    faction: 'demons', nom: 'Lucifer', titre: 'l’Orgueil', arme: 'renforcement', surnat: 'Élevé',
    stats: { force: 5, agilite: 5, volonte: 7, perception: 5 },
    passif: { id: 'orgueil', params: { bonus: 0.05, seuil: 0.8 }, nom: 'Orgueil', desc: (p) => `+${pct(p.bonus)} de dégâts tant que vous êtes à plus de ${pct(p.seuil)} des PV.` },
    pouvoir: { id: 'domination', params: { tours: 1 }, nom: 'Domination', pa: 4, recharge: 4, cible: 'ennemi', portee: { min: 1, max: 4 }, surnat: 2, desc: (p) => `Contrôle un ennemi pendant ${p.tours} tour : il frappe ses alliés.` },
    briefing: 'Ils t’ont dit que l’orgueil était un péché. Ils avaient peur de ce que tu pourrais devenir.',
  },
  belzebuth: {
    faction: 'demons', nom: 'Belzébuth', titre: 'la Gourmandise', arme: 'pompe', surnat: 'Moyen',
    stats: { force: 7, agilite: 5, volonte: 5, perception: 5 },
    passif: { id: 'appetit', params: { pm: 1 }, nom: 'Appétit', desc: (p) => `+${p.pm} PM après avoir tué un ennemi.` },
    pouvoir: { id: 'devorer', params: { seuil: 0.2, soin: 0.25 }, nom: 'Dévorer', pa: 2, recharge: 4, cible: 'ennemi', portee: { min: 1, max: 1 }, surnat: 3, desc: (p) => `Achève une cible sous ${pct(p.seuil)} de PV et récupère ${pct(p.soin)} de ses PV max.` },
    briefing: 'Il y a tant à consommer, et si peu de temps. Mange, petit. Mange tout.',
  },
  asmodee: {
    faction: 'demons', nom: 'Asmodée', titre: 'la Luxure', arme: 'maledictions', surnat: 'Moyen',
    stats: { force: 4, agilite: 6, volonte: 8, perception: 4 },
    passif: { id: 'seduction', params: { vision: -1 }, nom: 'Séduction', desc: (p) => `Choix de dialogue supplémentaires ; les témoins voient ${-p.vision} case moins loin.` },
    pouvoir: { id: 'volupte', params: { soinParMaudit: 0.1 }, nom: 'Volupté', pa: 2, recharge: 4, cible: 'soi', surnat: 1, desc: (p) => `Récupère ${pct(p.soinParMaudit)} des PV par ennemi maudit.` },
    briefing: 'Personne ne résiste à ce qu’il désire. Trouve ce qu’ils désirent.',
  },
  mammon: {
    faction: 'demons', nom: 'Mammon', titre: 'l’Avarice', arme: 'pistolets', surnat: 'Faible',
    stats: { force: 5, agilite: 7, volonte: 4, perception: 6 },
    passif: { id: 'avarice', params: { butin: 0.3 }, nom: 'Avarice', desc: (p) => `Butin +${pct(p.butin)}.` },
    pouvoir: { id: 'potDeVin', params: { retard: 4, dechirure: 20 }, nom: 'Pot-de-vin', pa: 1, recharge: 4, cible: 'ennemi', portee: { min: 1, max: 4 }, surnat: 0, desc: (p) => `Retarde un ennemi (−${p.retard} PA à son prochain tour). Hors combat : paie un témoin (−${p.dechirure} de Déchirure).` },
    briefing: 'Tout a un prix. Surtout le silence.',
  },

  // ---------- 3e Force ----------
  loups: {
    faction: 'troisieme', nom: 'Loups-garous', titre: 'la Meute', arme: 'dagues', surnat: 'Très élevé',
    stats: { force: 8, agilite: 7, volonte: 4, perception: 5 },
    passif: { id: 'regeneration', params: { soin: 0.03 }, nom: 'Régénération', desc: (p) => `+${pct(p.soin)} des PV par tour, uniquement en forme bestiale.` },
    pouvoir: { id: 'formeBestiale', params: { bonus: 0.1, pm: 1, tours: 2 }, nom: 'Forme bestiale', pa: 2, recharge: 4, cible: 'soi', surnat: 3, desc: (p) => `+${pct(p.bonus)} de dégâts et +${p.pm} PM pendant ${p.tours} tours. Vos griffes deviennent bruyantes et surnaturelles.` },
    rangs: ['Louveteau', 'Chasseur', 'Traqueur', 'Bêta', 'Alpha'],
    briefing: 'La meute d’abord. Le territoire ensuite. Et la lune, toujours.',
  },
  vampires: {
    faction: 'troisieme', nom: 'Vampires', titre: 'la Lignée', arme: 'sang', surnat: 'Moyen',
    stats: { force: 5, agilite: 6, volonte: 8, perception: 5 },
    passif: { id: 'nuit', params: { nuit: 0.15, jour: -0.1 }, nom: 'Créature de la nuit', desc: (p) => `+${pct(p.nuit)} de dégâts la nuit, −${pct(-p.jour)} le jour.` },
    pouvoir: { id: 'hypnose', params: { tours: 1, dechirure: 10 }, nom: 'Hypnose', pa: 2, recharge: 4, cible: 'ennemi', portee: { min: 1, max: 4 }, surnat: 1, desc: (p) => `Endort un ennemi ${p.tours} tour. Hors combat : endort un témoin (−${p.dechirure} de Déchirure).` },
    rangs: ['Infant', 'Rôdeur', 'Noble', 'Ancien', 'Prince de la nuit'],
    briefing: 'Les anges et les démons se disputent les humains. Nous, nous nous contentons de dîner.',
  },
  spartiates: {
    faction: 'troisieme', nom: 'Descendants de Spartiates', titre: 'la Phalange', arme: 'epee', surnat: 'Nul',
    stats: { force: 8, agilite: 6, volonte: 5, perception: 5 },
    passif: { id: 'discipline', params: { pv: 0.25, resistance: 0.5 }, nom: 'Discipline', desc: (p) => `+${pct(p.pv)} de PV ; ${pct(p.resistance)} de chances de résister aux contrôles.` },
    pouvoir: { id: 'molonLabe', params: { pa: 2, seuil: 0.4 }, nom: 'Molon labe', pa: 0, recharge: 0, cible: 'soi', surnat: 0, unique: true, desc: (p) => `+${p.pa} PA, utilisable une fois par combat quand vos PV passent sous ${pct(p.seuil)}.` },
    rangs: ['Recrue', 'Hoplite', 'Lochagos', 'Polémarque', 'Héritier de Léonidas'],
    briefing: 'Pas de magie, pas d’ailes, pas de crocs. Juste nous. Ça a toujours suffi.',
  },
  sorciers: {
    faction: 'troisieme', nom: 'Sorciers', titre: 'le Cénacle', arme: 'elementaire', surnat: 'Élevé',
    stats: { force: 4, agilite: 5, volonte: 9, perception: 6 },
    passif: { id: 'erudition', params: { reductionRituel: 1 }, nom: 'Érudition', desc: (p) => `+1 indice par enquête ; le Rituel coûte ${p.reductionRituel} PA de moins.` },
    pouvoir: { id: 'rituel', params: { dmg: 30, zone: 2 }, nom: 'Rituel', pa: 3, recharge: 4, cible: 'case', portee: { min: 2, max: 8 }, surnat: 3, desc: (p) => `Prépare un sort : au début de votre prochain tour, ${p.dmg} dégâts dans une zone de rayon ${p.zone}.` },
    rangs: ['Apprenti', 'Adepte', 'Mage', 'Maître', 'Archimage'],
    briefing: 'Le savoir est le seul pouvoir qui ne doit rien à personne. Lis, puis agis.',
  },
};

export function rangsDe(escouadeId) {
  const esc = ESCOUADES[escouadeId];
  return esc.rangs || FACTIONS[esc.faction].rangs;
}

// Escouades qui reçoivent un indice supplémentaire en enquête.
export const BONUS_INDICE = ['gabriel', 'sorciers', 'asmodee'];
