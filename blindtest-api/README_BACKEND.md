# BlindTest API - Backend

Backend API pour l'application Blind Test Arena avec Next.js, Prisma et Socket.IO.

## 🚀 Démarrage rapide

### Prérequis

- Node.js 22.x ou supérieur
- PostgreSQL (local ou distant)

### Installation locale

1. Installez les dépendances :
```bash
npm install
```

2. Configurez les variables d'environnement :
```bash
cp .env.example .env
```

Modifiez `.env` avec vos valeurs :
```env
DATABASE_URL=postgresql://user:password@localhost:5432/blindtest
JWT_SECRET=votre-secret-jwt-tres-securise
FRONTEND_URL=http://localhost:3000
PORT=3001
```

3. Initialisez la base de données :
```bash
npx prisma migrate deploy
npx prisma generate
```

4. Démarrez le serveur de développement :
```bash
npm run dev
```

Le serveur démarrera sur `http://localhost:3001`

## 📁 Structure

```
blindtest-api/
├── prisma/
│   ├── schema.prisma       # Schéma de base de données
│   └── migrations/         # Migrations Prisma
├── src/
│   ├── app/               # Routes API Next.js
│   │   └── api/
│   │       ├── auth/      # Authentification
│   │       ├── games/     # Gestion des parties
│   │       ├── deezer/    # Intégration Deezer
│   │       └── users/     # Gestion des utilisateurs
│   ├── lib/
│   │   ├── gameSocket.js  # Logique WebSocket
│   │   └── prisma.js      # Client Prisma
│   └── middleware.js      # Middleware Next.js
├── server.js              # Serveur custom avec Socket.IO
└── package.json
```

## 🔧 Scripts disponibles

- `npm run dev` - Démarre le serveur en mode développement avec nodemon
- `npm start` - Démarre le serveur en production
- `npm run build` - Génère le client Prisma

## 🌐 Déploiement sur Render

Consultez le fichier [DEPLOY_RENDER.md](../DEPLOY_RENDER.md) à la racine du projet pour les instructions complètes de déploiement.

### Configuration Render (résumé)

- **Build Command** : `npm install`
- **Start Command** : `npm start`
- **Root Directory** : `blindtest-api`

### Variables d'environnement requises

```env
NODE_ENV=production
DATABASE_URL=<URL_POSTGRESQL_INTERNE_RENDER>
JWT_SECRET=<SECRET_FORT>
FRONTEND_URL=<URL_FRONTEND_RENDER>
PORT=3001
```

## 🗄️ Base de données

Le backend utilise Prisma ORM avec PostgreSQL.

### Commandes Prisma utiles

```bash
# Générer le client Prisma après modification du schema
npx prisma generate

# Créer une nouvelle migration
npx prisma migrate dev --name nom_migration

# Appliquer les migrations en production
npx prisma migrate deploy

# Ouvrir Prisma Studio (interface de gestion)
npx prisma studio
```

## 🔌 WebSocket Events

Le serveur gère plusieurs événements WebSocket pour le jeu en temps réel :

### Événements du jeu
- `game:start` - Démarrer une partie
- `game:updated` - Mise à jour de la partie
- `game:finished` - Fin de partie
- `game:synced` - Synchronisation de l'état

### Événements des rounds
- `round:created` - Nouveau round créé
- `round:phaseChanged` - Changement de phase
- `round:answerSubmitted` - Réponse soumise
- `round:pauseBeforeVote` - Pause avant vote

### Événements de vote
- `vote:submitted` - Vote soumis
- `vote:finalized` - Vote finalisé
- `modal:open` - Ouverture modale de vote

### Chat
- `send_message` - Envoyer un message
- `new_message` - Nouveau message diffusé

## 📝 Routes API

### Authentification (`/api/auth`)
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/verify` - Vérification email
- `POST /api/auth/reset` - Réinitialisation mot de passe
- `GET /api/auth/me` - Profil utilisateur

### Parties (`/api/games`)
- `GET /api/games` - Liste des parties
- `POST /api/games` - Créer une partie
- `GET /api/games/:id` - Détails d'une partie
- `POST /api/games/join` - Rejoindre une partie
- `POST /api/games/:id/leave` - Quitter une partie

### Deezer (`/api/deezer`)
- `GET /api/deezer/search` - Rechercher de la musique
- `GET /api/deezer/playlist/:id` - Détails playlist

## 🛠️ Dépannage

### Erreur de connexion à la base de données
Vérifiez que `DATABASE_URL` est correctement configurée dans `.env`

### Prisma Client non généré
Exécutez `npx prisma generate`

### Migrations non appliquées
En production : `npx prisma migrate deploy`
En dev : `npx prisma migrate dev`

### WebSocket ne fonctionne pas
Vérifiez que `FRONTEND_URL` correspond exactement à l'URL du frontend pour le CORS

## 📄 Licence

Ce projet est privé.
