# Sous le Voile

Prototype de RPG tactique isométrique au tour par tour. Anges, démons et créatures de la 3e Force se disputent un quartier ordinaire. Une seule règle les unit, le **Pacte du Voile** : les humains ne doivent jamais savoir.

L'univers est original, inspiré de l'esprit d'INS/MV. Le jeu ne reprend aucun contenu protégé : les noms viennent de la tradition religieuse, de la démonologie publique et de la mythologie. Tout le contenu se trouve dans `src/data/` et peut être remplacé.

## Jouer en local

Il faut [Node.js](https://nodejs.org) 18 ou plus récent. Il n'y a aucune dépendance à installer.

```bash
npm start
```

Ouvrez ensuite <http://localhost:8080>.

- **Exploration** : cliquez pour vous déplacer, cliquez sur un PNJ, un indice (point doré) ou une créature pour interagir. Touche **J** : journal.
- **Combat** : touches **1 à 9** ou clic pour choisir une compétence, puis clic sur la cible. **Espace** : fin du tour. **Échap** : annuler.

## Publier sur GitHub Pages

1. Créez un dépôt GitHub et poussez-y le contenu de ce dossier.
2. Dans le dépôt, ouvrez **Settings → Pages**.
3. Choisissez **Deploy from a branch**, branche `main`, dossier `/ (root)`.

Le jeu est en HTML et JavaScript sans étape de construction : GitHub Pages le sert tel quel. Phaser 3.80.1 est chargé depuis jsDelivr.

## Ce que contient le prototype

**3 factions, 12 escouades.** Chaque escouade a une arme imposée unique, un passif et un pouvoir.

| Faction | Ressource | Pacte du Voile (avertissement / sanction) |
|---|---|---|
| Anges (Matthias, Gabriel, Raphaël, Uriel) | Grâce | 30 / 60 : blâme, puis pénitence |
| Démons (Lucifer, Belzébuth, Asmodée, Mammon) | Corruption | 60 / 90 : amende, puis rétrogradation |
| 3e Force (Loups-garous, Vampires, Spartiates, Sorciers) | Renommée | 45 / 75 : une patrouille vous chasse |

**12 armes sur 3 portées.** Chaque personnage en manie deux : celle de son escouade, et une seconde choisie à la fin du tutoriel.

**3 types de quêtes.**
- **Action** : *Nettoyage de printemps* (le tutoriel).
- **Enquête** : *Le notaire qui ne dormait plus*, avec indices et déduction.
- **Fil rouge** : *L'Incident de la rue Lafayette*, avec un briefing propre à chaque escouade, l'enquête, puis un boss.

**Le Voile.**
- Des témoins entourent les combats ; leur nombre dépend des passants proches de la créature.
- Chaque compétence a deux valeurs :
  - **bruit** : élargit le champ de vision des témoins ;
  - **surnaturel** : déchire le Voile si un témoin voit l'action.
- La nuit, il y a moins de passants.

## Tests et équilibrage

```bash
npm test
```

```bash
npm run simulate
```

Les 24 tests couvrent :
- le combat : portée, ligne de vue, PA/PM, A* ;
- le Voile et ses sanctions ;
- les quêtes ;
- l'équilibrage.

La simulation fait jouer les 12 escouades avec chacune des 11 armes secondaires (40 combats par combinaison) contre une rencontre de référence :
- **Par escouade**, le taux de victoire moyen est compris entre 42 % (Mammon) et 58 % (Raphaël).
- **Par arme secondaire**, il est compris entre 44 % et 57 %.

Avec `--normaliser`, les caractéristiques de chaque escouade sont ramenées à 24 points, pour mesurer les kits seuls. Ce mode ne modélise pas le Voile, qui compense l'avantage voulu des anges.

Tous les chiffres sont regroupés dans `src/data/weapons.js` et `src/data/factions.js`. Les descriptions des passifs et des pouvoirs sont calculées à partir de ces chiffres.

## Structure

```
index.html, style.css      page et styles
src/main.js                configuration Phaser
src/scenes/                titre, exploration, combat, rendu isométrique
src/ui/hud.js              interface HTML (HUD, dialogues, déduction, choix d'arme, barre de combat)
src/systems/               logique pure, testable sans navigateur :
                           combat + IA, Voile, ressources de faction, quêtes, sauvegarde, pathfinding
src/data/                  armes, factions, ennemis, cartes, quêtes
tests/                     tests node --test
tools/                     serveur local, simulation d'équilibrage
```

La sauvegarde passe uniquement par `src/systems/state.js` (`localStorage`), pour pouvoir brancher Firebase plus tard.
