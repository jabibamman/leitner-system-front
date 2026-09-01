# Leitner — front

Interface web du [système de Leitner](https://fr.wikipedia.org/wiki/Syst%C3%A8me_de_Leitner) :
on crée des cartes question/réponse, et on les révise chaque jour à une fréquence
qui dépend de la boîte où elles se trouvent.

L'interface est pensée **mobile d'abord** : elle s'utilise au pouce sur iPhone,
et peut être ajoutée à l'écran d'accueil pour s'ouvrir en plein écran comme une
application.

## Fonctionnalités

- **Accueil** : nombre de cartes à réviser aujourd'hui, progression du paquet,
  cartes acquises, résultat de la dernière session.
- **Révision** : une carte à la fois, en deux modes au choix
  - *auto-évaluation* — on lit la question, on affiche la réponse, on répond
    « oui / non » (aucun clavier, deux grandes cibles tactiles) ;
  - *saisie* — on tape la réponse, comparée sans tenir compte de la casse,
    des accents ni de la ponctuation.
- **Bibliothèque** : liste des cartes, filtre par tag, création via un
  formulaire plein écran.
- Thème clair / sombre, suivant les réglages du téléphone par défaut.

## Prérequis

- Node.js 20.19+ (22 recommandé — voir `.nvmrc`)
- pnpm 10
- Le back [`leitner-system`](https://github.com/jabibamman/leitner-system) démarré
  et accessible.

## Démarrage en local

```sh
pnpm install
cp .env.example .env.local   # puis renseigne VITE_APP_API_URL
pnpm dev
```

L'application est servie sur http://localhost:5173.

### Tester depuis son iPhone sur le réseau local

```sh
pnpm dev --host
```

Vite affiche alors une URL en `http://192.168.x.x:5173` à ouvrir depuis le
téléphone (même réseau Wi-Fi). `VITE_APP_API_URL` doit pointer vers une adresse
joignable par le téléphone, pas vers `localhost`.

## Variables d'environnement

| Variable            | Obligatoire | Description                                              |
| ------------------- | ----------- | -------------------------------------------------------- |
| `VITE_APP_API_URL`  | oui         | URL de base de l'API, **sans slash final**. Ex. `https://leitner-system.onrender.com` |

Les variables `VITE_*` sont injectées **au moment du build** : après l'avoir
modifiée sur Vercel, il faut relancer un déploiement pour qu'elle soit prise en
compte.

## Scripts

| Commande            | Effet                                             |
| ------------------- | ------------------------------------------------- |
| `pnpm dev`          | Serveur de développement                          |
| `pnpm build`        | Vérification des types + build de production       |
| `pnpm preview`      | Sert le contenu de `dist/` en local                |
| `pnpm test:e2e`     | Tests Playwright (API simulée, aucun back requis)  |

## Déploiement

### Front — Vercel

1. Importer le dépôt sur Vercel. `vercel.json` fournit déjà le framework
   (Vite), la commande de build et la réécriture SPA qui permet de recharger
   `/quiz` ou `/card` sans tomber sur une 404.
2. Ajouter la variable d'environnement `VITE_APP_API_URL` avec l'URL publique
   de l'API (environnements *Production*, *Preview* et *Development*).
3. Déployer. Node 22 est utilisé par défaut ; `.nvmrc` le fixe explicitement.

### Ajouter l'app à l'écran d'accueil (iOS)

Depuis Safari : bouton *Partager* → *Sur l'écran d'accueil*. L'app s'ouvre alors
sans la barre d'adresse, avec son icône et le respect des zones sûres (encoche,
barre d'accueil).

### Back — Render

Le back est un projet Spring Boot séparé. Deux points à vérifier avant la mise
en production, ils ne sont pas encore réglés dans le dépôt :

- **Port** — Render impose d'écouter le port fourni par la variable `PORT` ;
  `application.properties` fixe `server.port=8080`.
- **Persistance** — la base H2 est stockée dans un fichier local
  (`jdbc:h2:file:./data/leitner-system`). Sur Render, le disque est éphémère :
  les cartes sont perdues à chaque redéploiement ou redémarrage, sauf à monter
  un disque persistant ou à passer sur une base PostgreSQL managée.

Le CORS est déjà ouvert côté back (`allowedOrigins("*")`), le domaine Vercel
n'a donc rien de particulier à déclarer.

## Stack

Vue 3 (Composition API) · TypeScript · Vite · Vuetify 3 · Vue Router · Axios ·
Playwright
