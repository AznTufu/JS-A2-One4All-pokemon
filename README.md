# Poke Bicrave

Le but du jeux est de captuer des pokemon qui sont générer aléatoirement et qui spawn aléatoirement, lorsque vous voulez capturer un pokemon vous utiliser une pokéball (ou mieux si vous avez de la chance) et un QTE apparait, si vous le réaliser avant le temps impartie (temps en fonction de la ball utiliser) vous capturer le pokemon et il apparaitra dans votre équipe.

## Ce jeux est un projet javascript dans lequel nous avons découvert et ajouter des fonctionnalités

- Requête vers "Pokeapi"
- QTE 
- API REST locale pour l'authentification et le leaderboard 
- Géneration aléatoire d'un pokemon 
- Géneration endroit aléatoire dans la fenetre

## Stack technique proposée

### Frontend :

- HTML / CSS / JavaScript vanilla
- SCSS pour la feuille de style source
- DOM natif et API Fetch

### Backend :

- Node.js avec Express.js
- SQLite avec better-sqlite3
- JSON Web Token avec jsonwebtoken
- bcryptjs pour le hash des mots de passe

### Lancer le projet :

- Installer les dépendances avec `npm install`
- Lancer le serveur avec `npm start`
- Ouvrir `http://localhost:3000`

## Comment essayer le jeux 
 - Cloner le projet dans votre PC
 - Lancer votre live serveur 
 - et jouer ! 
 
 Astuce : Le QTE est propose un defi mais si vous souhaiter capturer un pokemon sans le QTE, ouvrer la consol, mettez ce code : 
document.querySelectorAll('.qte-letter').forEach(l=>{
   document.querySelector('.qte').dispatchEvent(new KeyboardEvent('keydown', {'key': l.innerText}));
})
puis executer le code lorsque vous mettez le QTE apparait 
