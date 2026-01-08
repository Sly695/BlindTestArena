# Guide de déploiement sur Render

## 📋 Vue d'ensemble

Votre application Blind Test se compose de deux parties :
- **Frontend** (Next.js) - dans le dossier racine
- **Backend API** (Next.js + Socket.IO) - dans le dossier `blindtest-api`

---

## 🗄️ 1. Base de données PostgreSQL

### Créer une base de données sur Render

1. Allez sur [Render Dashboard](https://dashboard.render.com/)
2. Cliquez sur **New +** → **PostgreSQL**
3. Configurez :
   - **Name** : `blindtest-db`
   - **Database** : `blindtest`
   - **User** : généré automatiquement
   - **Region** : choisissez la plus proche
   - **Plan** : Free tier
4. Cliquez sur **Create Database**
5. **Copiez l'URL interne** (Internal Database URL) pour l'utiliser dans le backend

---

## 🖥️ 2. Backend API (blindtest-api)

### Déployer le backend

1. Sur Render Dashboard, cliquez sur **New +** → **Web Service**
2. Connectez votre repository GitHub
3. Configurez :
   - **Name** : `blindtest-api`
   - **Root Directory** : `blindtest-api`
   - **Environment** : `Node`
   - **Build Command** : `npm install && npx prisma migrate deploy`
   - **Start Command** : `npm start`
   - **Plan** : Free tier

**Note** : Les migrations Prisma s'exécutent automatiquement à chaque déploiement grâce à la Build Command.

### Variables d'environnement du backend

Dans l'onglet **Environment**, ajoutez :

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://blindtest_h8g0_user:ROhChQeSkDYj7I7XbW9xRrNzEdxqAZpB@dpg-d5fnltbuibrs73e062mg-a/blindtest_h8g0
JWT_SECRET=<GENERER_UN_SECRET_FORT>
FRONTEND_URL=<URL_DE_VOTRE_FRONTEND_RENDER>

# Email (optionnel)
EMAIL_USER=votre-email@gmail.com
EMAIL_PASS=votre-mot-de-passe-app
```

**Important** :
- `DATABASE_URL` : copiez l'URL interne de votre base PostgreSQL
- `JWT_SECRET` : générez une clé secrète forte (32+ caractères aléatoires)
- `FRONTEND_URL` : vous l'obtiendrez après avoir déployé le frontend (ex: `https://blindtest.onrender.com`)

---

## 🎨 3. Frontend (Next.js)

### Déployer le frontend

1. Sur Render Dashboard, cliquez sur **New +** → **Web Service**
2. Connectez le même repository GitHub
3. Configurez :
   - **Name** : `blindtest-frontend`
   - **Root Directory** : `.` (racine)
   - **Environment** : `Node`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
   - **Plan** : Free tier

### Variables d'environnement du frontend

Dans l'onglet **Environment**, ajoutez :

```bash
NEXT_PUBLIC_API_URL=<URL_DE_VOTRE_BACKEND>
NEXT_PUBLIC_API_WS_URL=<URL_DE_VOTRE_BACKEND>
```

**Exemple** :
```bash
NEXT_PUBLIC_API_URL=https://blindtest-api.onrender.com
NEXT_PUBLIC_API_WS_URL=https://blindtest-api.onrender.com
```

---

## 🔄 4. Mettre à jour le CORS du backend

Une fois le frontend déployé, retournez dans les variables d'environnement du **backend** et mettez à jour :

```bash
FRONTEND_URL=https://blindtest-frontend.onrender.com
```

Puis redéployez le backend (Render le fera automatiquement).

---

## ✅ 5. Vérifications finales

### Tester l'API
Visitez : `https://blindtest-api.onrender.com/api/games`
Vous devriez voir une réponse JSON (même vide).

### Tester le frontend
Visitez : `https://blindtest-frontend.onrender.com`
L'application devrait s'afficher et pouvoir se connecter à l'API.

### Tester les WebSockets
Créez une partie et vérifiez que :
- Les joueurs peuvent rejoindre en temps réel
- Le chat fonctionne
- Les rounds se synchronisent

---

## 🐛 Dépannage

### Les WebSockets ne fonctionnent pas
- Vérifiez que `NEXT_PUBLIC_API_WS_URL` pointe bien vers le backend
- Render supporte WebSocket sur le plan Free, mais il peut y avoir des timeouts après 5 minutes d'inactivité

### Erreur de CORS
- Vérifiez que `FRONTEND_URL` dans le backend correspond exactement à l'URL du frontend
- Assurez-vous que les deux services sont déployés

### Base de données vide
- Allez dans le Shell du backend
- Exécutez `npx prisma migrate deploy`
- Vérifiez que `DATABASE_URL` est correcte

### Erreurs 500
- Consultez les logs dans le dashboard Render
- Vérifiez que toutes les variables d'environnement sont définies

---

##Les migrations s'appliquent automatiquement au build
- Si besoin, redéployez manuellement le backend depuis le dashboard
1. **Free tier limitations** :
   - Les services gratuits Render s'endorment après 15 minutes d'inactivité
   - Le premier chargement peut prendre 30-60 secondes
   - Les WebSockets peuvent se déconnecter après 5 minutes d'inactivité

2. **Base de données** :
   - Le plan gratuit PostgreSQL expire après 90 jours
   - Sauvegardez vos données régulièrement

3. **Sécurité** :
   - Ne committez JAMAIS vos fichiers `.env` sur Git
   - Utilisez des secrets forts pour `JWT_SECRET`
   - Changez les mots de passe par défaut

---

## 🚀 Commandes utiles

### Redéploiement manuel
- Allez dans le dashboard Render
- Cliquez sur "Manual Deploy" → "Deploy latest commit"
- Les migrations s'exécuteront automatiquement

### Vérifier les logs
- Les logs sont disponibles directement dans le dashboard Render
- Vérifiez que les migrations Prisma se sont bien exécutées dans les logs de build

---

## 📞 Support

Si vous rencontrez des problèmes :
1. Consultez les logs dans le dashboard Render
2. Vérifiez que toutes les variables d'environnement sont correctes
3. Testez l'API indépendamment avec Postman ou curl
4. Assurez-vous que les migrations Prisma sont appliquées

Bon déploiement ! 🎉
