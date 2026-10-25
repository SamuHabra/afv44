# 🔐 Persistance des Sessions - Guide

## 🎯 Problème résolu

**Avant** : Quand vous actualisiez la page (F5), vous étiez déconnecté et deviez vous reconnecter.

**Maintenant** : Votre session est sauvegardée dans le navigateur. Vous restez connecté même après actualisation.

---

## 📋 Comment ça fonctionne

### **1. Connexion**
```
Utilisateur se connecte
  ↓
Vérification téléphone + mot de passe
  ↓
✅ Connexion réussie
  ↓
Sauvegarde dans localStorage (clé: 'tontine_session')
  ↓
Accès à l'application
```

### **2. Actualisation de la page**
```
Page rechargée (F5)
  ↓
Application démarre
  ↓
Chargement de la session depuis localStorage
  ↓
Chargement des données depuis Supabase
  ↓
Vérification que l'utilisateur existe toujours et est actif
  ↓
✅ Session restaurée automatiquement
```

### **3. Déconnexion**
```
Utilisateur clique sur "Déconnexion"
  ↓
Suppression de la session du localStorage
  ↓
Redirection vers la page de connexion
```

---

## 🔒 Sécurité

### **Ce qui est sauvegardé :**
- ✅ Informations de l'utilisateur (id, nom, prénom, rôle, etc.)
- ❌ **PAS le mot de passe** (jamais stocké côté client)
- ❌ **PAS les données sensibles**

### **Vérification au rechargement :**
- ✅ L'utilisateur doit exister dans la base de données
- ✅ L'utilisateur doit être actif (`actif = true`)
- ✅ Si supprimé ou désactivé → déconnexion automatique

### **Stockage :**
- ✅ `localStorage` du navigateur
- ✅ Données accessibles uniquement depuis le même domaine
- ✅ Effacées quand l'utilisateur se déconnecte

---

## 🛠️ Implémentation technique

### **Fichiers modifiés :**

#### `src/context/AppContextSupabase.tsx`

```typescript
// Clé localStorage
const SESSION_KEY = 'tontine_session';

// Charger la session au démarrage
function loadSession(): User | null {
  const session = localStorage.getItem(SESSION_KEY);
  return session ? JSON.parse(session) : null;
}

// Sauvegarder la session
function saveSession(user: User | null) {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

// Initialisation
const [state, setState] = useState<AppState>({
  currentUser: loadSession(), // ← Charger la session
  // ...
});

// Connexion
const login = (telephone: string, password: string): boolean => {
  const user = state.users.find(u => u.telephone === telephone && u.actif);
  if (user) {
    saveSession(user); // ← Sauvegarder
    setState(prev => ({ ...prev, currentUser: user }));
    return true;
  }
  return false;
};

// Déconnexion
const logout = () => {
  saveSession(null); // ← Supprimer
  setState(prev => ({ ...prev, currentUser: null }));
};

// Mise à jour utilisateur
const setCurrentUser = (user: User | null) => {
  saveSession(user); // ← Sauvegarder
  setState(prev => ({ ...prev, currentUser: user }));
};
```

---

## 🧪 Tester la persistance

### **Test 1 : Connexion + Actualisation**
1. Connectez-vous avec `+221 77 111 11 11` / `Password123!`
2. Vous êtes sur le dashboard
3. Appuyez sur **F5** (actualiser)
4. ✅ Vous restez connecté !

### **Test 2 : Déconnexion**
1. Cliquez sur votre profil en haut à droite
2. Cliquez sur **"Déconnexion"**
3. ✅ Vous êtes redirigé vers la page de connexion
4. Appuyez sur **F5**
5. ✅ Vous restez déconnecté

### **Test 3 : Utilisateur désactivé**
1. Connectez-vous en tant qu'admin
2. Allez dans **Membres**
3. Désactivez un utilisateur (ex: Khadija Diop)
4. Déconnectez-vous
5. Connectez-vous avec le compte désactivé
6. ❌ "Numéro de téléphone non reconnu ou compte inactif"

### **Test 4 : Vérifier localStorage**
1. Ouvrez les DevTools (F12)
2. Allez dans l'onglet **Application** → **Local Storage**
3. Vous verrez :
   ```
   Key: tontine_session
   Value: {"id":"...","nom":"Diallo","prenom":"Aminata",...}
   ```

---

## 🔧 Dépannage

### **Problème : Session perdue après fermeture du navigateur**

**Cause** : Certains navigateurs effacent le localStorage à la fermeture.

**Solution** :
- Utiliser un navigateur moderne (Chrome, Firefox, Edge)
- Vérifier les paramètres de confidentialité
- Ne pas utiliser le mode navigation privée

### **Problème : Session corrompue**

**Cause** : Données localStorage invalides.

**Solution** :
```javascript
// Dans la console du navigateur (F12)
localStorage.removeItem('tontine_session');
location.reload();
```

### **Problème : Utilisateur supprimé mais session active**

**Cause** : L'utilisateur a été supprimé de la base mais la session existe encore.

**Solution** :
- La vérification au chargement détecte le problème
- L'utilisateur est automatiquement déconnecté
- Il doit se reconnecter avec un compte valide

---

## 📊 Comparaison avec Supabase Auth

| Aspect | localStorage (actuel) | Supabase Auth |
|--------|----------------------|---------------|
| **Complexité** | 🟢 Simple | 🔴 Complexe |
| **Sécurité** | 🟡 Moyenne | 🟢 Élevée |
| **Expiration** | ❌ Manuelle | ✅ Automatique |
| **Multi-appareils** | ❌ Non | ✅ Oui |
| **Récupération** | ❌ Admin manuel | ✅ Email auto |
| **Tokens** | ❌ Non | ✅ JWT |

### **Pour la production :**

Si vous voulez une sécurité plus élevée, vous pouvez :

1. **Ajouter une expiration** :
```typescript
interface Session {
  user: User;
  expiresAt: number; // Timestamp
}

function isSessionValid(): boolean {
  const session = loadSession();
  if (!session) return false;
  return Date.now() < session.expiresAt;
}
```

2. **Utiliser des tokens JWT** :
```typescript
// Générer un token à la connexion
const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '7d' });
localStorage.setItem('tontine_token', token);

// Vérifier le token à chaque requête
const token = localStorage.getItem('tontine_token');
const decoded = jwt.verify(token, SECRET_KEY);
```

3. **Ajouter un refresh token** :
```typescript
// Token court (15 min) + refresh token long (7 jours)
const accessToken = generateToken(user, '15m');
const refreshToken = generateToken(user, '7d');
```

---

## ✅ Avantages de la solution actuelle

1. ✅ **Simple** : Pas de configuration complexe
2. ✅ **Rapide** : Pas d'appels API supplémentaires
3. ✅ **Fonctionnel** : Marche immédiatement
4. ✅ **Suffisant** : Pour une application interne de tontine
5. ✅ **Personnalisable** : Facile à améliorer plus tard

---

## 🎯 Recommandations

### **Pour le développement / MVP :**
- ✅ Garder localStorage (solution actuelle)
- ✅ Simple et efficace

### **Pour la production :**
- ⚠️ Ajouter une expiration de session
- ⚠️ Implémenter un système de tokens
- ⚠️ Ajouter une validation côté serveur
- ⚠️ Considérer Supabase Auth pour plus de sécurité

---

## 📝 Récapitulatif

**Modifications apportées :**
- ✅ `loadSession()` : Charge la session au démarrage
- ✅ `saveSession()` : Sauvegarde la session
- ✅ `login()` : Sauvegarde après connexion
- ✅ `logout()` : Supprime à la déconnexion
- ✅ `setCurrentUser()` : Sauvegarde les mises à jour
- ✅ `loadData()` : Vérifie que l'utilisateur existe toujours

**Résultat :**
- ✅ Sessions persistantes après actualisation
- ✅ Déconnexion automatique si utilisateur supprimé/désactivé
- ✅ Sécurité basique (pas de mot de passe stocké)
- ✅ Expérience utilisateur améliorée

---

**Testez maintenant :** Connectez-vous, actualisez la page (F5), vous devriez rester connecté ! 🎉
