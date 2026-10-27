// Contenu du prototype : PNJ, objets, rencontres et quêtes du quartier.
// Un texte peut être une chaîne, ou un objet de variantes : { [escouade], [faction], defaut }.
import { ESCOUADES } from './factions.js';

export const PNJ = {
  contact: {
    x: 13, y: 8, couleur: 0xecf0f1,
    nom: { anges: 'Frère Anselme', demons: 'Madame Vex', troisieme: 'Le vieux Marius' },
    defaut: {
      anges: 'Que la paix soit sur vous. Et la discrétion, surtout.',
      demons: 'Tu traînes, mon chou. L’Enfer n’attend pas.',
      troisieme: 'Les anges et les démons se croient seuls au monde. Laissons-les y croire.',
    },
  },
  notaire: {
    x: 19, y: 4, couleur: 0x95a5a6, nom: 'Maître Gaspard Brémond',
    defaut: 'Je… pardonnez-moi. Je n’ai pas dormi depuis trois semaines.',
  },
  secretaire: {
    x: 16, y: 5, couleur: 0xd7bde2, nom: 'Lucie, la secrétaire',
    defaut: 'Maître Brémond reçoit sur rendez-vous. Il est… très occupé, en ce moment.',
    seduction: 'Entre nous ? Il sort toutes les nuits vers trois heures. Il revient les poches pleines et les yeux vides.',
  },
  marchand: {
    x: 21, y: 13, couleur: 0xf5b041, nom: 'Le prêteur sur gages',
    defaut: 'Je n’achète rien et je ne vends rien. Pas à vous, en tout cas.',
    demons: 'Ah, un client de la maison d’en bas. Une fiole ? Tarif habituel : 10 de Corruption.',
  },
};

export const OBJETS = {
  agenda: { x: 20, y: 3, nom: 'Agenda du notaire', indice: 'Chaque nuit, la même mention : « R.V. 3 h, rue Lafayette ».' },
  somniferes: { x: 17, y: 6, nom: 'Boîte de somnifères', indice: 'Une boîte vide, achetée il y a trois jours. Elle n’a visiblement servi à rien.' },
  coffre: { x: 22, y: 5, nom: 'Coffre-fort', indice: 'Le coffre est plein de billets neufs. Il manque l’acte de propriété du 12, rue Lafayette.' },
  lettre: { x: 8, y: 5, nom: 'Lettre froissée', indice: '« Vous m’avez vendu vos nuits. Je viens chercher le reste. Le Collectionneur. »' },
  camera: { x: 3, y: 8, nom: 'Téléphone abandonné', indice: 'La vidéo de votre dernier écart. Vous l’effacez, et la rumeur meurt avec elle.', penitence: true },
};

export const INDICE_BONUS = 'Indice de votre escouade : le Collectionneur n’achète pas des objets. Il achète des nuits de sommeil, et paie en argent comptant.';

// Marqueurs de rencontre dans le quartier. `quete` : visible seulement quand cette étape est en cours.
export const MARQUEURS = {
  parc1: { x: 3, y: 2, arene: 'parc', rencontre: 'parc1', quete: 'tutoriel' },
  parc2: { x: 8, y: 3, arene: 'parc', rencontre: 'parc2', quete: 'tutoriel' },
  parc3: { x: 4, y: 6, arene: 'parc', rencontre: 'parc3', quete: 'tutoriel' },
  ruelle: { x: 6, y: 13, arene: 'rue', rencontre: 'ruelle', repetable: true },
  boss: { x: 12, y: 15, arene: 'rue', rencontre: 'boss', quete: 'filrouge' },
};

// Une quête par type (action, enquête, fil rouge), plus la pénitence des anges.
export const QUETES = {
  tutoriel: {
    type: 'action', titre: 'Nettoyage de printemps',
    resume: 'Des créatures rôdent dans le parc Montclair. Faites le ménage sans que les promeneurs ne voient rien.',
    etapes: [
      {
        type: 'parler', pnj: 'contact', texte: 'Parler à votre contact, au carrefour',
        dialogue: {
          anges: ['Bienvenue sur Terre, mon enfant. Trois créatures souillent le parc Montclair.', 'Purifie-les. Mais souviens-toi du Pacte : aucun humain ne doit voir ce que nous sommes. Le Ciel pardonne peu.'],
          demons: ['Te voilà, enfin. Trois bestioles sauvages squattent le parc : mauvais pour les affaires.', 'Règle ça. Et évite les témoins, hein ? Le Pacte du Voile, tout ça. On a de la marge, pas l’éternité.'],
          troisieme: ['Trois créatures sans maître chassent dans le parc. Elles attirent l’attention sur nous tous.', 'Débarrasse-nous d’elles avant que les anges ou les démons ne s’en chargent… et ne remarquent ton existence.'],
        },
      },
      { type: 'vaincre', rencontres: ['parc1', 'parc2', 'parc3'], texte: 'Éliminer les 3 créatures du parc (sans témoin, si possible)' },
      {
        type: 'parler', pnj: 'contact', texte: 'Revenir voir votre contact',
        dialogue: { defaut: ['Joli travail. Tu as le droit de choisir une seconde arme : prends ce qui complète ton style.'] },
      },
    ],
    recompense: { ressource: 20, fioles: 1 },
    suite: 'filrouge',
    choixArme: true,
  },

  filrouge: {
    type: 'filrouge', titre: 'L’Incident de la rue Lafayette',
    resume: 'Quelque chose achète les nuits des habitants du quartier. Remontez la piste jusqu’à la rue Lafayette.',
    etapes: [
      {
        type: 'parler', pnj: 'contact', texte: 'Chapitre 1 : recevoir le message de votre chef d’escouade',
        dialogue: { defaut: (etat) => [`Un message de ${ESCOUADES[etat.escouade].nom} :`, `« ${ESCOUADES[etat.escouade].briefing} »`, 'Les gens du quartier ne dorment plus. Commence par le notaire, Maître Brémond, à son étude.'] },
      },
      { type: 'quete', id: 'notaire', texte: 'Chapitre 2 : enquêter sur le notaire' },
      { type: 'vaincre', rencontres: ['boss'], texte: 'Chapitre 3 : affronter le Collectionneur, rue Lafayette' },
      {
        type: 'parler', pnj: 'contact', texte: 'Faire votre rapport',
        dialogue: {
          anges: ['Le Collectionneur est vaincu, et les nuits volées reviennent à leurs propriétaires.', 'Le quartier dormira cette nuit. C’est la plus belle des prières.'],
          demons: ['Le Collectionneur ? Un concurrent de moins. Ses contrats nous reviennent : des centaines d’âmes fatiguées, prêtes à signer n’importe quoi.', 'Tu montes en grade, mon chou.'],
          troisieme: ['Le Collectionneur est tombé, et personne ne sait que c’était nous. Les anges et les démons se rejettent la faute.', 'Exactement ce qu’il fallait.'],
        },
      },
    ],
    recompense: { ressource: 60, fioles: 2 },
  },

  notaire: {
    type: 'enquete', titre: 'Le notaire qui ne dormait plus',
    resume: 'Maître Brémond, notaire respecté, ne dort plus et s’enrichit étrangement. Découvrez pourquoi.',
    etapes: [
      {
        type: 'parler', pnj: 'notaire', texte: 'Rencontrer Maître Brémond à son étude',
        dialogue: { defaut: ['Je ne dors plus. Plus du tout. Mais je n’ai jamais été aussi riche…', 'Fouillez si vous voulez. Je n’ai plus la force de vous en empêcher.'] },
      },
      { type: 'examiner', objets: ['agenda', 'somniferes', 'coffre', 'lettre'], texte: 'Trouver 4 indices (étude et parc)' },
      {
        type: 'deduire', texte: 'Comprendre ce qui arrive au notaire',
        question: 'Pourquoi Maître Brémond ne dort-il plus ?',
        choix: [
          { id: 'maladie', texte: 'Il souffre d’une maladie rare.' },
          { id: 'vente', texte: 'Il a vendu son sommeil au Collectionneur, contre de l’argent.' },
          { id: 'poison', texte: 'Sa secrétaire l’empoisonne avec des somnifères.' },
          { id: 'fantome', texte: 'Un fantôme de la rue Lafayette le hante.' },
        ],
        reponse: 'vente',
        tentatives: 3,
      },
      {
        type: 'influencer', pnj: 'notaire',
        texte: { anges: 'Libérer le notaire de son Avarice', demons: 'Enfoncer le notaire dans son Avarice', troisieme: 'Exploiter le secret du notaire' },
        dialogue: {
          anges: ['Vous lui rappelez ce qu’il a perdu en gagnant tout cela. Il pleure, puis rit, puis brûle les billets.', 'Pour la première fois depuis des semaines, il bâille.'],
          demons: ['Vous lui murmurez qu’il peut vendre encore plus : ses rêves, ses souvenirs, ceux de sa famille.', 'Ses yeux brillent. Il signe tout ce que vous lui tendez.'],
          troisieme: ['Vous lui faites comprendre que vous savez tout. Désormais, l’étude Brémond travaillera pour votre escouade.', 'Il hoche la tête, trop épuisé pour discuter.'],
        },
      },
    ],
    recompense: { ressource: 30 },
  },

  penitence: {
    type: 'action', titre: 'Pénitence', penitence: true,
    resume: 'Un humain vous a vu. Réparez la Déchirure avant de pouvoir progresser à nouveau.',
    etapes: [
      { type: 'examiner', objets: ['camera'], texte: 'Retrouver et effacer la vidéo (près du parc)' },
      { type: 'parler', pnj: 'contact', texte: 'Confesser votre faute à votre contact', dialogue: { defaut: ['C’est réparé. Le Ciel te pardonne… pour cette fois.'] } },
    ],
    recompense: { ressource: 0 },
  },
};
