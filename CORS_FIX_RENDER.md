# 🔧 Résoudre le problème CORS sur Render

## ❌ Erreur actuelle
```
Access to fetch at 'https://blindtestarena.onrender.com/api/auth/register' 
from origin 'https://blindtest-frontend-vrah.onrender.com' has been blocked by CORS policy
```

## ✅ Solution en 3 étapes

### Étape 1 : Vérifier les variables d'environnement sur Render

1. Allez sur [Render Dashboard](https://dashboard.render.com/)
2. Sélectionnez votre service **blindtestarena** (backend)
3. Allez dans l'onglet **Environment**
4. **Vérifiez/Ajoutez** cette variable :

```bash
FRONTEND_URL=https://blindtest-frontend-vrah.onrender.com
```

⚠️ **ATTENTION** : Pas de `/` à la fin de l'URL !

### Étape 2 : Forcer un redéploiement

Après avoir ajouté/modifié `FRONTEND_URL` :

1. Dans le dashboard Render du backend
2. Cliquez sur **"Manual Deploy"** → **"Deploy latest commit"**
3. Attendez que le build soit terminé (environ 2-3 minutes)

### Étape 3 : Vérifier dans les logs

Dans les logs de build, vous devriez voir :
```bash
🚀 Serveur Socket prêt sur http://0.0.0.0:3001
```

Et dans les logs runtime, vérifiez qu'il n'y a pas d'erreurs CORS.

---

## 🔍 Diagnostic

### Si le problème persiste après ces étapes :

1. **Vérifiez que le code a bien été déployé** :
   - Allez dans les logs du dernier build
   - Cherchez "Build successful"

2. **Testez l'API directement** :
   - Ouvrez : https://blindtestarena.onrender.com/api/games
   - Vous devriez voir une réponse JSON

3. **Vérifiez les headers CORS** :
   - Ouvrez la console Chrome DevTools (F12)
   - Onglet Network
   - Faites une requête
   - Regardez les headers de la réponse
   - Cherchez `Access-Control-Allow-Origin`

### Variables d'environnement complètes nécessaires

```bash
# Backend (blindtestarena.onrender.com)
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://blindtest_h8g0_user:ROhChQeSkDYj7I7XbW9xRrNzEdxqAZpB@dpg-d5fnltbuibrs73e062mg-a/blindtest_h8g0
JWT_SECRET=votre-secret-jwt-fort-min-32-caracteres
FRONTEND_URL=https://blindtest-frontend-vrah.onrender.com
EMAIL_USER=votre-email@gmail.com
EMAIL_PASS=votre-mot-de-passe-app
```

```bash
# Frontend (blindtest-frontend-vrah.onrender.com)
NEXT_PUBLIC_API_URL=https://blindtestarena.onrender.com
NEXT_PUBLIC_API_WS_URL=https://blindtestarena.onrender.com
```

---

## 🚨 Checklist finale

- [ ] `FRONTEND_URL` configurée sur le backend Render
- [ ] Backend redéployé après modification des variables
- [ ] Code le plus récent déployé (commit de309d3)
- [ ] Les deux services (frontend + backend) sont actifs
- [ ] Pas de `/` à la fin des URLs

---

## 💡 Astuce

Si vous modifiez souvent les variables d'environnement, Render les prend en compte immédiatement **mais ne redémarre pas automatiquement le service**. Il faut toujours faire un "Manual Deploy" après.

---

## 📞 Besoin d'aide ?

Si après ces 3 étapes le problème persiste, partagez :
1. Les logs du dernier build backend
2. Une capture des variables d'environnement (masquez les secrets)
3. Les headers de la requête qui échoue (F12 → Network)
